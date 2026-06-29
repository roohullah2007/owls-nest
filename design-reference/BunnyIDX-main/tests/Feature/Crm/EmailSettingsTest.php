<?php

namespace Tests\Feature\Crm;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailSettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_update_email_settings_persists_preferences(): void
    {
        $this->actingAs($this->user)
            ->patch(route('crm.settings.email'), [
                'default_from_name' => 'Jane Agent',
                'bcc_self' => true,
                'track_opens' => true,
                'track_clicks' => false,
                'auto_reply_enabled' => true,
                'auto_reply_subject' => 'Out of office',
                'auto_reply_message' => 'Away until Monday.',
            ])
            ->assertRedirect();

        $this->user->refresh();
        $email = $this->user->settings['email'];

        $this->assertSame('Jane Agent', $email['default_from_name']);
        $this->assertTrue($email['bcc_self']);
        $this->assertTrue($email['track_opens']);
        $this->assertFalse($email['track_clicks']);
        $this->assertTrue($email['auto_reply']['enabled']);
        $this->assertSame('Out of office', $email['auto_reply']['subject']);
    }

    public function test_auto_reply_end_must_be_after_start(): void
    {
        $this->actingAs($this->user)
            ->patch(route('crm.settings.email'), [
                'auto_reply_start_at' => '2026-06-20T10:00',
                'auto_reply_end_at' => '2026-06-19T10:00',
            ])
            ->assertSessionHasErrors('auto_reply_end_at');
    }

    public function test_settings_warns_when_google_oauth_not_configured(): void
    {
        config(['google.client_id' => null, 'services.google.client_id' => null]);

        $this->actingAs($this->user)
            ->get(route('crm.settings'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Crm/Settings/Index')
                ->where('googleConfigured', false)
            );
    }

    public function test_settings_reports_google_configured_when_creds_present(): void
    {
        config(['google.client_id' => 'abc.apps.googleusercontent.com']);

        $this->actingAs($this->user)
            ->get(route('crm.settings'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('googleConfigured', true));
    }
}
