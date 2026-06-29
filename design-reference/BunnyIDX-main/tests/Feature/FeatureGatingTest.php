<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Server-side feature-gate coverage: Starter/free users must not reach paid
 * modules by direct URL or POST, paid (Solo/Team) users must pass, and platform
 * admins bypass. Blocked = EnsureFeature redirects back with a string `error`
 * flash; passed = no `error` flash (downstream validation is irrelevant here).
 */
class FeatureGatingTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $tier, array $extra = []): User
    {
        return User::factory()->create(['subscription_tier' => $tier] + $extra);
    }

    /** @return array<string, array{0:string,1:string,2:array}> name => [method, routeName, params] */
    private function gatedEndpoints(): array
    {
        return [
            // Action Plans + Bulk Email → feature:email
            'action-plans index' => ['get', 'crm.action-plans.index', []],
            'action-plans store' => ['post', 'crm.action-plans.store', []],
            'action-plan enroll' => ['post', 'crm.action-plan-enrollments.store', []],
            'bulk email' => ['post', 'crm.contacts.bulk-email', []],
            // AI → feature:ai
            'ai contacts query' => ['post', 'crm.ai.contacts-query', []],
            'ai deals query' => ['post', 'crm.ai.deals-query', []],
            'ai website generate' => ['post', 'crm.websites.ai.generate-all', []],
            // Phone / Voice / Power Dialer → feature:phone
            'voice call' => ['post', 'crm.voice.call', []],
            'dialer session' => ['post', 'crm.dialer.sessions.store', []],
            // IDX / MLS → feature:idx
            'idx panel' => ['get', 'crm.idx.index', []],
            'idx search store' => ['post', 'crm.idx.searches.store', []],
            'mls connection req' => ['post', 'crm.idx.connection-requests.store', []],
            // Websites → feature:websites
            'website store' => ['post', 'crm.websites.store', []],
            'onboarding' => ['get', 'crm.onboarding', []],
            'landing page create' => ['get', 'crm.landing-pages.create', []],
        ];
    }

    public function test_free_user_is_blocked_from_every_paid_module(): void
    {
        foreach ($this->gatedEndpoints() as $label => [$method, $name, $params]) {
            session()->forget('error');
            $user = $this->user('free');

            $this->actingAs($user)->{$method}(route($name, $params), []);

            $this->assertNotNull(
                session('error'),
                "Free user should be blocked from [{$label}] ({$name}) but no upgrade error was flashed.",
            );
        }
    }

    public function test_paid_user_passes_every_feature_gate(): void
    {
        foreach ($this->gatedEndpoints() as $label => [$method, $name, $params]) {
            session()->forget('error');
            $user = $this->user('pro');

            $this->actingAs($user)->{$method}(route($name, $params), []);

            // The gate must not fire. Controllers may still 422 on empty input
            // (that sets the `errors` bag, not the string `error` flash).
            $this->assertNull(
                session('error'),
                "Paid user should pass the gate for [{$label}] ({$name}) but got: ".session('error'),
            );
        }
    }

    public function test_admin_bypasses_feature_gates_even_on_free_tier(): void
    {
        foreach ($this->gatedEndpoints() as $label => [$method, $name, $params]) {
            session()->forget('error');
            $admin = $this->user('free', ['role' => 'superadmin']);

            $this->actingAs($admin)->{$method}(route($name, $params), []);

            $this->assertNull(
                session('error'),
                "Admin should bypass the gate for [{$label}] ({$name}) but got: ".session('error'),
            );
        }
    }

    public function test_trialing_user_passes_email_gate(): void
    {
        $user = $this->user('free', [
            'trial_plan' => 'pro',
            'trial_ends_at' => now()->addDays(10),
            'trial_used' => true,
        ]);

        $this->actingAs($user)->get(route('crm.action-plans.index'))->assertOk();
        $this->assertNull(session('error'));
    }

    public function test_paid_user_can_load_action_plans_index(): void
    {
        $this->actingAs($this->user('enterprise'))
            ->get(route('crm.action-plans.index'))
            ->assertOk();
    }

    public function test_json_request_to_gated_endpoint_returns_403_for_free_user(): void
    {
        $this->actingAs($this->user('free'))
            ->postJson(route('crm.ai.contacts-query'), [])
            ->assertForbidden();
    }

    public function test_team_chat_ai_assistant_is_gated_but_chat_still_works(): void
    {
        // A free member of a Team-plan team can use team chat (team.plan passes
        // via membership inheritance) but the @BunnyAI assistant must not respond
        // because the member's own plan lacks the `ai` feature — proving the AI
        // assist is gated independently of team chat itself.
        $owner = $this->user('enterprise');
        $team = Team::create(['name' => 'Test Team', 'owner_id' => $owner->id]);
        $owner->update(['team_id' => $team->id, 'active_context' => 'team']);
        $team->members()->create(['user_id' => $owner->id, 'role' => 'owner', 'is_active' => true]);

        $member = $this->user('free');
        $team->members()->create(['user_id' => $member->id, 'role' => 'agent', 'is_active' => true]);
        $member->update(['team_id' => $team->id, 'active_context' => 'team']);

        $this->actingAs($member->fresh())
            ->post(route('crm.team-chat.store'), ['body' => '@BunnyAI what is my pipeline?'])
            ->assertCreated();

        // The member's own message exists; no AI response row was created.
        $this->assertDatabaseHas('team_chat_messages', ['team_id' => $team->id, 'is_ai_response' => false]);
        $this->assertDatabaseMissing('team_chat_messages', ['team_id' => $team->id, 'is_ai_response' => true]);
    }
}
