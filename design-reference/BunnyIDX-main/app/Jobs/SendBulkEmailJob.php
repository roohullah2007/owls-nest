<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Activity;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Services\Email\MergeFieldService;
use App\Services\Gmail\GmailService;
use App\Services\Gmail\GmailSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendBulkEmailJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 3600;

    public function __construct(
        public int $campaignId,
    ) {}

    public function handle(): void
    {
        $campaign = EmailCampaign::find($this->campaignId);

        if (! $campaign || $campaign->isCancelled()) {
            return;
        }

        $account = $campaign->emailAccount;

        if (! $account || ! $account->is_active) {
            $campaign->update(['status' => 'failed', 'errors' => [['message' => 'Email account is not active.']]]);
            return;
        }

        $campaign->update([
            'status' => 'sending',
            'started_at' => $campaign->started_at ?? now(),
        ]);

        $gmail = new GmailService($account);
        $syncService = new GmailSyncService();
        $sentIds = $campaign->sent_contact_ids ?? [];
        $failedIds = $campaign->failed_contact_ids ?? [];
        $errors = $campaign->errors ?? [];
        $contactIds = $campaign->contact_ids ?? [];

        foreach ($contactIds as $contactId) {
            // Refresh campaign status to check for pause/cancel
            $campaign->refresh();

            if ($campaign->isPaused() || $campaign->isCancelled()) {
                return;
            }

            // Skip already processed contacts
            if (in_array($contactId, $sentIds) || in_array($contactId, $failedIds)) {
                continue;
            }

            $contact = Contact::find($contactId);

            if (! $contact || ! $contact->email) {
                $campaign->increment('skipped_count');
                continue;
            }

            try {
                $personalizedSubject = MergeFieldService::replace($campaign->subject, $contact);
                $personalizedBody = MergeFieldService::replace($campaign->body_html, $contact);

                $sentMessage = $gmail->sendEmail(
                    to: $contact->email,
                    subject: $personalizedSubject,
                    bodyHtml: $personalizedBody,
                );

                // Process the sent message
                try {
                    $fullMessage = $gmail->getMessage($sentMessage->getId());
                    $syncService->processMessage($account, $fullMessage);
                } catch (\Exception) {
                    // Non-critical: email was sent, just couldn't sync it back
                }

                // Log activity
                Activity::create([
                    'user_id' => $campaign->user_id,
                    'team_id' => $campaign->team_id,
                    'contact_id' => $contact->id,
                    'event_type' => 'email_sent',
                    'subject' => 'Bulk email sent: '.$personalizedSubject,
                    'description' => substr(strip_tags($personalizedBody), 0, 200),
                    'metadata' => [
                        'campaign_id' => $campaign->id,
                        'bulk' => true,
                    ],
                ]);

                $sentIds[] = $contactId;
                $campaign->update([
                    'sent_contact_ids' => $sentIds,
                    'sent_count' => count($sentIds),
                ]);
            } catch (\Google\Service\Exception $e) {
                // Check for rate limiting (429)
                if ($e->getCode() === 429) {
                    $campaign->update([
                        'status' => 'paused',
                        'sent_contact_ids' => $sentIds,
                        'failed_contact_ids' => $failedIds,
                        'errors' => array_merge($errors, [['contact_id' => $contactId, 'message' => 'Rate limited — auto-paused. Will retry.']]),
                    ]);

                    // Re-dispatch with delay
                    self::dispatch($this->campaignId)->delay(now()->addSeconds(60));
                    return;
                }

                $failedIds[] = $contactId;
                $errors[] = ['contact_id' => $contactId, 'message' => $e->getMessage()];
                $campaign->update([
                    'failed_contact_ids' => $failedIds,
                    'failed_count' => count($failedIds),
                    'errors' => $errors,
                ]);
            } catch (\Exception $e) {
                $failedIds[] = $contactId;
                $errors[] = ['contact_id' => $contactId, 'message' => $e->getMessage()];
                $campaign->update([
                    'failed_contact_ids' => $failedIds,
                    'failed_count' => count($failedIds),
                    'errors' => $errors,
                ]);

                Log::warning('SendBulkEmailJob: failed to send to contact', [
                    'campaign_id' => $campaign->id,
                    'contact_id' => $contactId,
                    'error' => $e->getMessage(),
                ]);
            }

            // Random delay between sends (3-5 seconds)
            sleep(random_int(3, 5));
        }

        // All done
        $campaign->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }
}
