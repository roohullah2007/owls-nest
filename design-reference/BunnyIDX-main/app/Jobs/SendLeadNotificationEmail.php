<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Contact;
use App\Models\EmailSendLog;
use App\Models\User;
use App\Services\Email\BrandedEmailResolver;
use App\Services\Email\EmailCategory;
use App\Services\Email\EmailTemplateRenderer;
use App\Services\Email\ResendClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * Emails a CRM user/team owner that a new lead came in from a website or
 * landing-page form. Uses the recipient's own (branded) Resend key when set,
 * otherwise the platform key. An idempotency key keeps a re-dispatched job from
 * sending a duplicate, and every attempt is recorded in email_send_logs.
 *
 * Not counted against any property-alert quota.
 */
class SendLeadNotificationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $contactId,
        public int $recipientUserId,
        public string $source,
        public string $idempotencyKey,
    ) {}

    public function handle(
        BrandedEmailResolver $resolver,
        EmailTemplateRenderer $renderer,
        ResendClient $client,
    ): void {
        // Idempotency: bail if this exact send was already logged (sent OR
        // in-flight). The unique index on idempotency_key is the race-safe guard.
        if (EmailSendLog::where('idempotency_key', $this->idempotencyKey)->exists()) {
            return;
        }

        $recipient = User::find($this->recipientUserId);
        $contact = Contact::find($this->contactId);

        if (! $recipient || ! $recipient->email || ! $contact) {
            return;
        }

        $resolved = $resolver->for($recipient);

        $leadName = trim($contact->first_name.' '.$contact->last_name) ?: 'New lead';
        $crmUrl = url('/crm/contacts/'.($contact->uuid ?? $contact->id));

        $rendered = $renderer->render('new_lead_notification', [
            'agent_name' => $recipient->name,
            'source' => $this->source,
            'lead_name' => $leadName,
            'lead_email' => $contact->email ?: '—',
            'lead_phone' => $contact->phone ?: '—',
            'lead_type' => $contact->type ?: '—',
            'lead_message' => $contact->description ?: '—',
            'action_url' => $crmUrl,
        ], $recipient);

        // Record the attempt first so a failure still leaves a trace. Creating
        // the row here also reserves the idempotency key.
        try {
            $log = EmailSendLog::create([
                'user_id' => $recipient->id,
                'team_id' => $recipient->team_id,
                'provider' => 'resend',
                'template_type' => 'new_lead_notification',
                'recipient' => $recipient->email,
                'sender' => $resolved['from_email'],
                'subject' => $rendered['subject'],
                'status' => EmailSendLog::STATUS_QUEUED,
                'branded' => $resolved['branded'],
                'quota_category' => 'lead_notification',
                'counts_toward_quota' => EmailCategory::countsTowardQuota(EmailCategory::LEAD_NOTIFICATION),
                'idempotency_key' => $this->idempotencyKey,
                'meta' => ['contact_id' => $contact->id, 'source' => $this->source],
            ]);
        } catch (QueryException $e) {
            // Unique violation → another worker already claimed this send.
            return;
        }

        try {
            $messageId = $client->send(
                $resolved['key'],
                $resolved['from_email'],
                $resolved['from_name'],
                $recipient->email,
                $rendered['subject'],
                $rendered['html'],
            );

            $log->update([
                'status' => EmailSendLog::STATUS_SENT,
                'provider_message_id' => $messageId,
                'sent_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $log->update([
                'status' => EmailSendLog::STATUS_FAILED,
                'error_message' => Str::limit($e->getMessage(), 480),
            ]);
            // Swallow: the failure is logged. We deliberately do not rethrow so a
            // retry can't bypass the idempotency row and double-send.
        }
    }
}
