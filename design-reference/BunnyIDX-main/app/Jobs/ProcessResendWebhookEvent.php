<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\EmailSendEvent;
use App\Models\EmailSendLog;
use App\Models\EmailSuppression;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Applies a Resend tracking event to its matching email_send_log and records
 * suppression where the event warrants it. Idempotent: the event row is marked
 * processed and re-running is a no-op. Unknown event types never crash.
 */
class ProcessResendWebhookEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $eventId) {}

    public function handle(): void
    {
        $event = EmailSendEvent::find($this->eventId);

        if (! $event || $event->processed_at) {
            return;
        }

        $log = $event->provider_message_id
            ? EmailSendLog::where('provider_message_id', $event->provider_message_id)->first()
            : null;

        if ($log) {
            $event->email_send_log_id = $log->id;
            $this->applyToLog($log, $event);
        }

        $event->processed_at = now();
        $event->save();
    }

    private function applyToLog(EmailSendLog $log, EmailSendEvent $event): void
    {
        $at = $event->occurred_at ?? now();
        $payload = $event->payload ?? [];

        switch ($event->event_type) {
            case 'email.sent':
                // Don't downgrade a log that already reached a later state.
                if (in_array($log->status, [EmailSendLog::STATUS_QUEUED], true)) {
                    $log->status = EmailSendLog::STATUS_SENT;
                }
                $log->sent_at ??= $at;
                break;

            case 'email.delivered':
                $log->status = EmailSendLog::STATUS_DELIVERED;
                $log->delivered_at ??= $at;
                break;

            case 'email.delivery_delayed':
                // Transient — record the event only, leave status unchanged.
                break;

            case 'email.opened':
                // Engagement only: never changes status, never affects quota.
                $log->opened_at ??= $at;
                $log->last_opened_at = $at;
                break;

            case 'email.clicked':
                // Engagement only: never changes status, never affects quota.
                $log->clicked_at ??= $at;
                $log->last_clicked_at = $at;
                break;

            case 'email.bounced':
                $log->status = EmailSendLog::STATUS_BOUNCED;
                $log->bounce_reason = $this->bounceReason($payload);
                EmailSuppression::suppress($log->recipient ?? $event->recipient, EmailSuppression::REASON_BOUNCE);
                break;

            case 'email.complained':
                $log->status = EmailSendLog::STATUS_COMPLAINED;
                $log->complaint_at ??= $at;
                // Stop future marketing / property-alert sends to this address.
                EmailSuppression::suppress($log->recipient ?? $event->recipient, EmailSuppression::REASON_COMPLAINT);
                break;

            case 'email.failed':
                $log->status = EmailSendLog::STATUS_FAILED;
                $log->failed_reason = $this->failedReason($payload);
                break;

            default:
                // Unknown event type — recorded as an event, no log change.
                break;
        }

        $log->save();
    }

    private function bounceReason(array $payload): ?string
    {
        $reason = $payload['bounce']['message'] ?? $payload['reason'] ?? null;

        return $reason ? mb_substr((string) $reason, 0, 255) : null;
    }

    private function failedReason(array $payload): ?string
    {
        $reason = $payload['reason'] ?? ($payload['failed']['reason'] ?? null);

        return $reason ? mb_substr((string) $reason, 0, 255) : null;
    }
}
