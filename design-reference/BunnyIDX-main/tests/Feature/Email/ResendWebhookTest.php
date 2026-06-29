<?php

declare(strict_types=1);

namespace Tests\Feature\Email;

use App\Models\EmailSendEvent;
use App\Models\EmailSendLog;
use App\Models\EmailSuppression;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ResendWebhookTest extends TestCase
{
    use RefreshDatabase;

    private string $secret;

    protected function setUp(): void
    {
        parent::setUp();
        $this->secret = 'whsec_'.base64_encode('super-secret-signing-key-0123456789');
        config(['services.resend.webhook_secret' => $this->secret]);
    }

    private function secretBytes(): string
    {
        return base64_decode(substr($this->secret, 6));
    }

    private function sign(string $payload, string $id, string $ts): string
    {
        return 'v1,'.base64_encode(hash_hmac('sha256', "{$id}.{$ts}.{$payload}", $this->secretBytes(), true));
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function postEvent(array $body, ?string $id = null, ?string $signature = null): TestResponse
    {
        $payload = json_encode($body);
        $id ??= 'msg_'.bin2hex(random_bytes(6));
        $ts = (string) now()->getTimestamp();
        $signature ??= $this->sign($payload, $id, $ts);

        // Pass headers as HTTP_ server vars: call() does not merge withHeaders().
        $server = [
            'HTTP_SVIX_ID' => $id,
            'HTTP_SVIX_TIMESTAMP' => $ts,
            'HTTP_SVIX_SIGNATURE' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ];

        return $this->call('POST', '/api/webhooks/resend', [], [], [], $server, $payload);
    }

    private function logFor(string $messageId, string $status = EmailSendLog::STATUS_SENT, string $recipient = 'lead@example.com'): EmailSendLog
    {
        return EmailSendLog::create([
            'provider' => 'resend',
            'template_type' => 'new_lead_notification',
            'recipient' => $recipient,
            'status' => $status,
            'provider_message_id' => $messageId,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function event(string $type, array $data): array
    {
        return [
            'type' => $type,
            'created_at' => '2026-06-22T10:00:00.000Z',
            'data' => array_merge(['created_at' => '2026-06-22T10:00:00.000Z'], $data),
        ];
    }

    public function test_valid_signature_is_accepted(): void
    {
        $this->logFor('email_ok');

        $this->postEvent($this->event('email.delivered', ['email_id' => 'email_ok', 'to' => ['lead@example.com']]))
            ->assertOk()
            ->assertJson(['status' => 'ok']);
    }

    public function test_invalid_signature_is_rejected(): void
    {
        $response = $this->postEvent(
            $this->event('email.delivered', ['email_id' => 'email_x']),
            signature: 'v1,'.base64_encode('not-the-real-signature'),
        );

        $response->assertStatus(401);
        $this->assertDatabaseCount('email_send_events', 0);
    }

    public function test_duplicate_svix_id_is_ignored(): void
    {
        $this->logFor('email_dup');
        $body = $this->event('email.delivered', ['email_id' => 'email_dup', 'to' => ['lead@example.com']]);

        $this->postEvent($body, id: 'evt_dup_1')->assertOk();
        $this->postEvent($body, id: 'evt_dup_1')->assertOk()->assertJson(['status' => 'duplicate_ignored']);

        $this->assertSame(1, EmailSendEvent::where('event_id', 'evt_dup_1')->count());
        $this->assertSame(1, EmailSendEvent::count());
    }

    public function test_delivered_updates_log(): void
    {
        $log = $this->logFor('email_del');

        $this->postEvent($this->event('email.delivered', ['email_id' => 'email_del', 'to' => ['lead@example.com']]))->assertOk();

        $log->refresh();
        $this->assertSame(EmailSendLog::STATUS_DELIVERED, $log->status);
        $this->assertNotNull($log->delivered_at);
    }

    public function test_opened_sets_open_timestamps_without_changing_status(): void
    {
        $log = $this->logFor('email_open', EmailSendLog::STATUS_DELIVERED);

        $this->postEvent($this->event('email.opened', ['email_id' => 'email_open']))->assertOk();

        $log->refresh();
        // Engagement only — status must stay delivered, not become "opened".
        $this->assertSame(EmailSendLog::STATUS_DELIVERED, $log->status);
        $this->assertNotNull($log->opened_at);
        $this->assertNotNull($log->last_opened_at);
    }

    public function test_clicked_stores_url_and_click_timestamps(): void
    {
        $log = $this->logFor('email_click', EmailSendLog::STATUS_DELIVERED);

        $this->postEvent($this->event('email.clicked', [
            'email_id' => 'email_click',
            'click' => ['link' => 'https://agentsbunny.com/listing/123'],
        ]))->assertOk();

        $log->refresh();
        $this->assertSame(EmailSendLog::STATUS_DELIVERED, $log->status);
        $this->assertNotNull($log->clicked_at);
        $this->assertNotNull($log->last_clicked_at);

        $event = EmailSendEvent::where('event_type', 'email.clicked')->firstOrFail();
        $this->assertSame('https://agentsbunny.com/listing/123', $event->clicked_url);
    }

    public function test_bounced_marks_bounced_and_stores_reason_and_suppresses(): void
    {
        $log = $this->logFor('email_bounce', EmailSendLog::STATUS_SENT, 'bouncer@example.com');

        $this->postEvent($this->event('email.bounced', [
            'email_id' => 'email_bounce',
            'to' => ['bouncer@example.com'],
            'bounce' => ['type' => 'HardBounce', 'message' => 'Mailbox does not exist'],
        ]))->assertOk();

        $log->refresh();
        $this->assertSame(EmailSendLog::STATUS_BOUNCED, $log->status);
        $this->assertSame('Mailbox does not exist', $log->bounce_reason);
        $this->assertTrue(EmailSuppression::isSuppressed('bouncer@example.com'));
    }

    public function test_complained_marks_complaint_and_suppresses(): void
    {
        $log = $this->logFor('email_spam', EmailSendLog::STATUS_DELIVERED, 'angry@example.com');

        $this->postEvent($this->event('email.complained', [
            'email_id' => 'email_spam',
            'to' => ['angry@example.com'],
        ]))->assertOk();

        $log->refresh();
        $this->assertSame(EmailSendLog::STATUS_COMPLAINED, $log->status);
        $this->assertNotNull($log->complaint_at);
        $this->assertTrue(EmailSuppression::isSuppressed('angry@example.com'));
    }

    public function test_failed_marks_failed_and_stores_reason(): void
    {
        $log = $this->logFor('email_fail');

        $this->postEvent($this->event('email.failed', [
            'email_id' => 'email_fail',
            'reason' => 'Sending paused',
        ]))->assertOk();

        $log->refresh();
        $this->assertSame(EmailSendLog::STATUS_FAILED, $log->status);
        $this->assertSame('Sending paused', $log->failed_reason);
    }

    public function test_unknown_event_type_does_not_crash(): void
    {
        $this->logFor('email_unknown');

        $this->postEvent($this->event('email.some_future_thing', ['email_id' => 'email_unknown']))
            ->assertOk();

        // Recorded but the log is untouched (still sent).
        $this->assertDatabaseHas('email_send_events', ['event_type' => 'email.some_future_thing']);
        $this->assertSame(EmailSendLog::STATUS_SENT, EmailSendLog::where('provider_message_id', 'email_unknown')->first()->status);
    }

    public function test_secret_is_never_exposed_in_responses_or_storage(): void
    {
        $this->logFor('email_secret');

        $response = $this->postEvent($this->event('email.delivered', ['email_id' => 'email_secret', 'to' => ['lead@example.com']]));

        $response->assertOk();
        $this->assertStringNotContainsString($this->secret, $response->getContent());

        // The stored (sanitised) payload must not contain the signing secret.
        $event = EmailSendEvent::firstOrFail();
        $this->assertStringNotContainsString($this->secret, json_encode($event->payload));
    }
}
