<?php

declare(strict_types=1);

namespace Tests\Feature\Email;

use App\Models\EmailSendLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ResendKeySettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_save_a_resend_key_stored_encrypted(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('crm.settings.resend.update'), [
                'resend_api_key' => 're_secret_abcd1234',
                'resend_from_email' => 'me@mydomain.com',
                'resend_from_name' => 'My Brand',
            ])
            ->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertTrue($user->hasBrandedResendKey());
        $this->assertSame('1234', $user->resend_last_four);
        // The model decrypts back to the original value…
        $this->assertSame('re_secret_abcd1234', $user->resend_api_key);

        // …but the raw column is NOT the plaintext key.
        $raw = DB::table('users')->where('id', $user->id)->value('resend_api_key');
        $this->assertNotSame('re_secret_abcd1234', $raw);
        $this->assertNotEmpty($raw);
    }

    public function test_saved_key_is_never_exposed_to_the_client(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['resend_api_key' => 're_secret_abcd1234', 'resend_last_four' => '1234'])->save();

        $response = $this->actingAs($user)->get(route('crm.settings.tab', 'email'));

        $response->assertOk();
        // The plaintext key must never appear in the rendered page / props.
        $this->assertStringNotContainsString('re_secret_abcd1234', $response->getContent());

        // Nor in the serialized model.
        $this->assertArrayNotHasKey('resend_api_key', $user->toArray());

        $response->assertInertia(fn ($page) => $page
            ->where('resendStatus.configured', true)
            ->where('resendStatus.last_four', '1234')
            ->missing('resendStatus.resend_api_key')
        );
    }

    public function test_test_email_button_sends_and_records_status(): void
    {
        Http::fake(['api.resend.com/*' => Http::response(['id' => 're_test_999'], 200)]);

        $user = User::factory()->create(['email' => 'agent@example.com']);
        $user->forceFill(['resend_api_key' => 're_secret_abcd1234', 'resend_last_four' => '1234'])->save();

        $this->actingAs($user)
            ->post(route('crm.settings.resend.test'))
            ->assertSessionHas('success');

        $user->refresh();
        $this->assertSame('passed', $user->resend_test_status);
        $this->assertNotNull($user->resend_last_tested_at);

        $this->assertDatabaseHas('email_send_logs', [
            'user_id' => $user->id,
            'template_type' => 'test',
            'status' => EmailSendLog::STATUS_SENT,
            'provider_message_id' => 're_test_999',
        ]);
    }

    public function test_user_can_remove_their_resend_key(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['resend_api_key' => 're_secret_abcd1234', 'resend_last_four' => '1234'])->save();

        $this->actingAs($user)
            ->delete(route('crm.settings.resend.remove'))
            ->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertFalse($user->hasBrandedResendKey());
        $this->assertNull($user->resend_last_four);
    }
}
