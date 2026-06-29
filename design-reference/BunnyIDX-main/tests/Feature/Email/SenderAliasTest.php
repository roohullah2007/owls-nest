<?php

declare(strict_types=1);

namespace Tests\Feature\Email;

use App\Models\User;
use App\Services\Email\SenderAliasService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SenderAliasTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'mail.sender_alias.domain' => 'm.agentsbunny.com',
            'mail.sender_alias.default' => 'updates@m.agentsbunny.com',
            'mail.sender_alias.default_name' => 'Agents Bunny Updates',
        ]);
    }

    private function svc(): SenderAliasService
    {
        return app(SenderAliasService::class);
    }

    public function test_alias_is_generated_safely_from_name(): void
    {
        $user = User::factory()->create(['name' => 'John  Q. Smith!!']);

        $this->assertSame('john.q.smith', $this->svc()->generateFor($user));
    }

    public function test_sanitize_strips_unsafe_characters_and_lowercases(): void
    {
        $this->assertSame('agent.brand', $this->svc()->sanitize('  Agent_Brand  '));
        // Whitespace/underscores become dots; other unsafe chars are dropped.
        $this->assertSame('abc', $this->svc()->sanitize('a@@b##c'));
        $this->assertSame('john.smith', $this->svc()->sanitize('John Smith'));
        // Nothing usable → null (caller falls back to the default sender).
        $this->assertNull($this->svc()->sanitize('!@#$%^&*'));
        $this->assertNull($this->svc()->sanitize(''));
    }

    public function test_duplicate_alias_collision_is_resolved_with_suffix(): void
    {
        $a = User::factory()->create(['name' => 'Jane Doe']);
        $b = User::factory()->create(['name' => 'Jane Doe']);

        $this->assertSame('jane.doe', $this->svc()->ensureFor($a));
        // Persisted on A → B must not collide.
        $this->assertSame('jane.doe.2', $this->svc()->generateFor($b));
    }

    public function test_invalid_or_missing_alias_falls_back_to_default_sender(): void
    {
        $user = User::factory()->create();
        $this->assertSame('updates@m.agentsbunny.com', $this->svc()->emailFor($user));

        // A tampered, non-sanitised stored alias is treated as invalid.
        $user->forceFill(['sender_alias' => 'Bad Alias!'])->save();
        $this->assertSame('updates@m.agentsbunny.com', $this->svc()->emailFor($user->fresh()));
    }

    public function test_alias_email_uses_only_the_platform_domain(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['sender_alias' => 'john.smith'])->save();

        $this->assertSame('john.smith.updates@m.agentsbunny.com', $this->svc()->emailFor($user->fresh()));
    }

    public function test_display_name_falls_back_to_default(): void
    {
        $user = User::factory()->create();
        $this->assertSame('Agents Bunny Updates', $this->svc()->displayNameFor($user));

        $user->forceFill(['sender_alias_display_name' => 'Jane Realty'])->save();
        $this->assertSame('Jane Realty', $this->svc()->displayNameFor($user->fresh()));
    }

    public function test_settings_endpoint_sanitises_and_saves_alias(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('crm.settings.sender-alias.update'), [
                'sender_alias' => 'My Alias',
                'sender_alias_display_name' => 'My Brand',
            ])
            ->assertRedirect();

        $this->assertSame('my.alias', $user->fresh()->sender_alias);
        $this->assertSame('My Brand', $user->fresh()->sender_alias_display_name);
    }

    public function test_settings_endpoint_rejects_an_alias_taken_by_another_user(): void
    {
        $owner = User::factory()->create();
        $owner->forceFill(['sender_alias' => 'taken.alias'])->save();

        $other = User::factory()->create();

        $this->actingAs($other)
            ->patch(route('crm.settings.sender-alias.update'), ['sender_alias' => 'taken.alias'])
            ->assertSessionHasErrors('sender_alias');

        $this->assertNull($other->fresh()->sender_alias);
    }

    public function test_settings_endpoint_clears_alias_when_blank(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['sender_alias' => 'something'])->save();

        $this->actingAs($user)
            ->patch(route('crm.settings.sender-alias.update'), ['sender_alias' => ''])
            ->assertRedirect();

        $this->assertNull($user->fresh()->sender_alias);
    }
}
