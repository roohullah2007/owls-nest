<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\EmailSendEvent;
use App\Models\EmailSendLog;
use App\Models\EmailSuppression;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailLogsAdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function log(array $attributes = []): EmailSendLog
    {
        return EmailSendLog::create(array_merge([
            'provider' => 'resend',
            'template_type' => 'new_lead_notification',
            'recipient' => 'lead@example.com',
            'status' => EmailSendLog::STATUS_SENT,
            'provider_message_id' => 'email_'.bin2hex(random_bytes(4)),
        ], $attributes));
    }

    public function test_page_loads_for_admin(): void
    {
        $this->log();

        $this->actingAs($this->admin())
            ->get(route('admin.email-logs'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/EmailLogs/Index')
                ->has('logs.data', 1)
                ->has('suppressions')
            );
    }

    public function test_non_admin_is_forbidden(): void
    {
        $agent = User::factory()->create(['role' => 'agent']);

        $this->actingAs($agent)
            ->get(route('admin.email-logs'))
            ->assertForbidden();
    }

    public function test_status_filter_works(): void
    {
        $this->log(['status' => EmailSendLog::STATUS_DELIVERED, 'recipient' => 'a@example.com']);
        $this->log(['status' => EmailSendLog::STATUS_DELIVERED, 'recipient' => 'b@example.com']);
        $this->log(['status' => EmailSendLog::STATUS_BOUNCED, 'recipient' => 'c@example.com']);

        $this->actingAs($this->admin())
            ->get(route('admin.email-logs', ['status' => EmailSendLog::STATUS_BOUNCED]))
            ->assertInertia(fn ($page) => $page
                ->has('logs.data', 1)
                ->where('logs.data.0.status', EmailSendLog::STATUS_BOUNCED)
            );
    }

    public function test_recipient_search_filter_works(): void
    {
        $this->log(['recipient' => 'findme@example.com']);
        $this->log(['recipient' => 'other@example.com']);

        $this->actingAs($this->admin())
            ->get(route('admin.email-logs', ['q' => 'findme']))
            ->assertInertia(fn ($page) => $page
                ->has('logs.data', 1)
                ->where('logs.data.0.recipient', 'findme@example.com')
            );
    }

    public function test_detail_returns_timeline_events(): void
    {
        $log = $this->log(['status' => EmailSendLog::STATUS_DELIVERED]);

        EmailSendEvent::create([
            'email_send_log_id' => $log->id,
            'provider' => 'resend',
            'event_id' => 'evt_1',
            'event_type' => 'email.delivered',
            'provider_message_id' => $log->provider_message_id,
            'recipient' => $log->recipient,
            'occurred_at' => now(),
            'processed_at' => now(),
        ]);

        $this->actingAs($this->admin())
            ->getJson(route('admin.email-logs.show', $log->id))
            ->assertOk()
            ->assertJsonPath('log.id', $log->id)
            ->assertJsonPath('events.0.event_type', 'email.delivered');
    }

    public function test_detail_never_exposes_raw_payload(): void
    {
        $log = $this->log();

        EmailSendEvent::create([
            'email_send_log_id' => $log->id,
            'provider' => 'resend',
            'event_id' => 'evt_secret',
            'event_type' => 'email.clicked',
            'provider_message_id' => $log->provider_message_id,
            'recipient' => $log->recipient,
            // A sentinel that must never reach the client via the payload column.
            'payload' => ['type' => 'email.clicked', 'internal_sentinel' => 'TOP_SECRET_PAYLOAD'],
            'clicked_url' => 'https://agentsbunny.com/listing/1',
            'occurred_at' => now(),
            'processed_at' => now(),
        ]);

        $response = $this->actingAs($this->admin())->getJson(route('admin.email-logs.show', $log->id));

        $response->assertOk();
        $response->assertJsonPath('events.0.clicked_url', 'https://agentsbunny.com/listing/1');
        // The raw (even sanitised) payload is never serialised to the client.
        $this->assertStringNotContainsString('TOP_SECRET_PAYLOAD', $response->getContent());
        $this->assertStringNotContainsString('internal_sentinel', $response->getContent());
    }

    public function test_unsafe_clicked_url_is_not_surfaced(): void
    {
        $log = $this->log();

        EmailSendEvent::create([
            'email_send_log_id' => $log->id,
            'provider' => 'resend',
            'event_id' => 'evt_xss',
            'event_type' => 'email.clicked',
            'provider_message_id' => $log->provider_message_id,
            'clicked_url' => 'javascript:alert(1)',
            'occurred_at' => now(),
            'processed_at' => now(),
        ]);

        $this->actingAs($this->admin())
            ->getJson(route('admin.email-logs.show', $log->id))
            ->assertOk()
            ->assertJsonPath('events.0.clicked_url', null);
    }

    public function test_suppression_list_loads(): void
    {
        EmailSuppression::suppress('spammer@example.com', EmailSuppression::REASON_COMPLAINT);

        $this->actingAs($this->admin())
            ->get(route('admin.email-logs'))
            ->assertInertia(fn ($page) => $page
                ->has('suppressions', 1)
                ->where('suppressions.0.email', 'spammer@example.com')
                ->where('suppressions.0.reason', EmailSuppression::REASON_COMPLAINT)
            );
    }
}
