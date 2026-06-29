<?php

declare(strict_types=1);

namespace Tests\Feature\Email;

use App\Models\EmailSendLog;
use App\Models\User;
use App\Services\Email\ResendClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class ResendHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'mail.sender_alias.domain' => 'm.agentsbunny.com',
            'mail.sender_alias.default' => 'updates@m.agentsbunny.com',
            'mail.sender_alias.domain_verified' => true,
        ]);
    }

    public function test_custom_resend_key_is_encrypted_at_rest_and_masked(): void
    {
        $user = User::factory()->create();
        $user->forceFill([
            'resend_api_key' => 're_secret_live_KEY',
            'resend_last_four' => '_KEY',
        ])->save();

        // Stored column is ciphertext, not the plaintext key.
        $raw = DB::table('users')->where('id', $user->id)->value('resend_api_key');
        $this->assertNotSame('re_secret_live_KEY', $raw);

        // Decrypts transparently via the model cast.
        $this->assertSame('re_secret_live_KEY', $user->fresh()->resend_api_key);

        // Never serialised to arrays/JSON; only the masked last-four is exposed.
        $array = $user->fresh()->toArray();
        $this->assertArrayNotHasKey('resend_api_key', $array);
        $this->assertSame('_KEY', $user->fresh()->resend_last_four);
    }

    public function test_missing_api_key_gives_a_clear_error(): void
    {
        $client = app(ResendClient::class);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('No Resend API key configured.');

        $client->send(null, 'updates@m.agentsbunny.com', 'X', 'to@example.com', 'Subject', '<p>hi</p>');
    }

    public function test_unverified_platform_domain_blocks_send(): void
    {
        config(['mail.sender_alias.domain_verified' => false]);
        Http::fake();

        $client = app(ResendClient::class);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('platform sending domain is not verified');

        $client->send('re_key', 'updates@m.agentsbunny.com', 'X', 'to@example.com', 'Subject', '<p>hi</p>');
    }

    public function test_branded_domain_is_not_blocked_when_platform_unverified(): void
    {
        config(['mail.sender_alias.domain_verified' => false]);
        Http::fake(['api.resend.com/*' => Http::response(['id' => 're_branded'], 200)]);

        $client = app(ResendClient::class);
        $id = $client->send('re_key', 'agent@agentdomain.com', 'Brand', 'to@example.com', 'Subject', '<p>hi</p>');

        $this->assertSame('re_branded', $id);
    }

    public function test_resend_test_command_sends_and_logs_without_counting_quota(): void
    {
        config(['services.resend.key' => 're_platform']);
        Http::fake(['api.resend.com/*' => Http::response(['id' => 're_cmd'], 200)]);

        $this->artisan('resend:test', ['--to' => 'me@example.com'])
            ->assertExitCode(0);

        $log = EmailSendLog::where('recipient', 'me@example.com')->firstOrFail();
        $this->assertSame('test', $log->template_type);
        $this->assertSame('re_cmd', $log->provider_message_id);
        $this->assertFalse((bool) $log->counts_toward_quota);
    }

    public function test_resend_test_command_errors_clearly_when_no_key(): void
    {
        config(['services.resend.key' => null]);

        $this->artisan('resend:test', ['--to' => 'me@example.com'])
            ->assertExitCode(1);
    }

    public function test_resend_test_command_rejects_invalid_recipient(): void
    {
        $this->artisan('resend:test', ['--to' => 'not-an-email'])
            ->assertExitCode(2);
    }
}
