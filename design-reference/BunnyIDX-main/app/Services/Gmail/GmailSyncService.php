<?php

declare(strict_types=1);

namespace App\Services\Gmail;

use App\Events\NewEmailMessage;
use App\Models\Activity;
use App\Models\Contact;
use App\Models\EmailAccount;
use App\Models\EmailMessage;
use App\Models\EmailThread;
use Carbon\Carbon;
use Google\Service\Gmail\Message;
use Google\Service\Gmail\MessagePart;
use Illuminate\Support\Facades\Log;

class GmailSyncService
{
    /**
     * Perform initial sync — fetch last 30 days of email.
     * Returns the number of messages newly stored.
     */
    public function performInitialSync(EmailAccount $account): int
    {
        $account->update(['sync_state' => 'syncing', 'sync_error' => null]);

        Log::info('Gmail sync: initial sync started', [
            'account_id' => $account->id,
            'email' => $account->email_address,
        ]);

        $fetched = 0;
        $saved = 0;
        $failed = 0;

        try {
            $gmail = new GmailService($account);
            $after = now()->subDays(30)->format('Y/m/d');
            $pageToken = null;

            do {
                $response = $gmail->listMessages("after:{$after}", 100, $pageToken);
                $messages = $response->getMessages() ?? [];

                foreach ($messages as $messageSummary) {
                    $fetched++;
                    try {
                        $fullMessage = $gmail->getMessage($messageSummary->getId());
                        $stored = $this->processMessage($account, $fullMessage);
                        if ($stored && $stored->wasRecentlyCreated) {
                            $saved++;
                        }
                    } catch (\Exception $e) {
                        $failed++;
                        Log::warning('Gmail sync: failed to process message', [
                            'message_id' => $messageSummary->getId(),
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                $pageToken = $response->getNextPageToken();
            } while ($pageToken);

            // Get current history ID for incremental sync
            $profile = $gmail->getProfile();
            $account->update([
                'sync_state' => 'active',
                'history_id' => (string) $profile->getHistoryId(),
                'last_synced_at' => now(),
                'last_full_sync_at' => now(),
            ]);

            Log::info('Gmail sync: initial sync completed', [
                'account_id' => $account->id,
                'email' => $account->email_address,
                'fetched' => $fetched,
                'saved' => $saved,
                'skipped' => $fetched - $saved - $failed,
                'failed' => $failed,
            ]);
        } catch (\Exception $e) {
            Log::error('Gmail initial sync failed', [
                'account_id' => $account->id,
                'email' => $account->email_address,
                'error' => $e->getMessage(),
            ]);
            $account->update([
                'sync_state' => 'error',
                'sync_error' => $e->getMessage(),
            ]);
        }

        return $saved;
    }

    /**
     * Perform incremental sync using Gmail history API.
     * Returns the number of messages newly stored.
     */
    public function performIncrementalSync(EmailAccount $account): int
    {
        if (! $account->history_id) {
            Log::info('Gmail sync: no history id, falling back to initial sync', [
                'account_id' => $account->id,
                'email' => $account->email_address,
            ]);

            return $this->performInitialSync($account);
        }

        Log::info('Gmail sync: incremental sync started', [
            'account_id' => $account->id,
            'email' => $account->email_address,
            'from_history_id' => $account->history_id,
        ]);

        $fetched = 0;
        $saved = 0;
        $skippedDuplicate = 0;
        $failed = 0;

        try {
            $gmail = new GmailService($account);
            $response = $gmail->getHistory($account->history_id);
            $histories = $response->getHistory() ?? [];

            foreach ($histories as $history) {
                $addedMessages = $history->getMessagesAdded() ?? [];
                foreach ($addedMessages as $added) {
                    $msg = $added->getMessage();
                    if (! $msg) {
                        continue;
                    }
                    $fetched++;

                    // Skip if already synced (duplicate — same Gmail message id)
                    $exists = EmailMessage::where('email_account_id', $account->id)
                        ->where('gmail_message_id', $msg->getId())
                        ->exists();
                    if ($exists) {
                        $skippedDuplicate++;
                        Log::debug('Gmail sync: skipped already-synced message', [
                            'account_id' => $account->id,
                            'gmail_message_id' => $msg->getId(),
                        ]);

                        continue;
                    }

                    try {
                        $fullMessage = $gmail->getMessage($msg->getId());
                        $stored = $this->processMessage($account, $fullMessage, broadcast: true);
                        if ($stored && $stored->wasRecentlyCreated) {
                            $saved++;
                        }
                    } catch (\Exception $e) {
                        $failed++;
                        Log::warning('Gmail incremental sync: failed to process message', [
                            'message_id' => $msg->getId(),
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

            $newHistoryId = $response->getHistoryId();
            $account->update([
                'history_id' => $newHistoryId ? (string) $newHistoryId : $account->history_id,
                'last_synced_at' => now(),
                'sync_state' => 'active',
                'sync_error' => null,
            ]);

            Log::info('Gmail sync: incremental sync completed', [
                'account_id' => $account->id,
                'email' => $account->email_address,
                'fetched' => $fetched,
                'saved' => $saved,
                'skipped_duplicate' => $skippedDuplicate,
                'failed' => $failed,
                'to_history_id' => $newHistoryId ? (string) $newHistoryId : $account->history_id,
            ]);
        } catch (\Google\Service\Exception $e) {
            // History ID expired — need full resync
            if ($e->getCode() === 404) {
                Log::info('Gmail history expired, performing full sync', [
                    'account_id' => $account->id,
                    'email' => $account->email_address,
                ]);
                $account->update(['history_id' => null]);

                return $this->performInitialSync($account);
            }

            Log::error('Gmail incremental sync failed', [
                'account_id' => $account->id,
                'email' => $account->email_address,
                'error' => $e->getMessage(),
            ]);
            $account->update([
                'sync_state' => 'error',
                'sync_error' => $e->getMessage(),
            ]);
        }

        return $saved;
    }

    /**
     * Process a single Gmail message and store it locally.
     */
    public function processMessage(EmailAccount $account, Message $gmailMessage, bool $broadcast = false): ?EmailMessage
    {
        $headers = collect($gmailMessage->getPayload()?->getHeaders() ?? []);
        $getHeader = fn (string $name) => $headers->firstWhere('name', $name)?->getValue();

        $from = $getHeader('From') ?? '';
        $to = $getHeader('To') ?? '';
        $cc = $getHeader('Cc');
        $bcc = $getHeader('Bcc');
        $subject = $getHeader('Subject') ?? '(no subject)';
        $date = $getHeader('Date');
        $messageIdHeader = $getHeader('Message-ID') ?? $getHeader('Message-Id');
        $inReplyTo = $getHeader('In-Reply-To');
        $references = $getHeader('References');

        // Parse from address
        $fromAddress = $this->extractEmail($from);
        $fromName = $this->extractName($from);

        // Determine direction
        $direction = strtolower($fromAddress) === strtolower($account->email_address) ? 'outbound' : 'inbound';

        // Parse body
        $bodyHtml = $this->extractBody($gmailMessage->getPayload(), 'text/html');
        $bodyText = $this->extractBody($gmailMessage->getPayload(), 'text/plain');

        // Check attachments
        $hasAttachments = false;
        $attachmentsMeta = [];
        $this->collectAttachments($gmailMessage->getPayload(), $hasAttachments, $attachmentsMeta);

        // Determine label IDs
        $labelIds = $gmailMessage->getLabelIds() ?? [];
        $isRead = ! in_array('UNREAD', $labelIds);
        $isStarred = in_array('STARRED', $labelIds);

        // Parse sent date
        $sentAt = $date ? $this->parseDate($date) : now();

        // Find or create thread
        $thread = EmailThread::firstOrCreate(
            [
                'email_account_id' => $account->id,
                'gmail_thread_id' => $gmailMessage->getThreadId(),
            ],
            [
                'user_id' => $account->user_id,
                'team_id' => $account->team_id,
                'subject' => $subject,
                'last_message_at' => $sentAt,
            ]
        );

        // Match contact by email
        $contactEmail = $direction === 'inbound' ? $fromAddress : $this->extractEmail($to);
        $contact = $this->matchContact($contactEmail, $account);

        if (! $contact && $direction === 'inbound') {
            // Still stored under the thread/inbox — just not linked to a CRM contact.
            Log::debug('Gmail sync: inbound message has no matching CRM contact', [
                'account_id' => $account->id,
                'gmail_thread_id' => $gmailMessage->getThreadId(),
                'from' => $contactEmail,
            ]);
        }

        // Create the message
        $emailMessage = EmailMessage::updateOrCreate(
            [
                'email_account_id' => $account->id,
                'gmail_message_id' => $gmailMessage->getId(),
            ],
            [
                'user_id' => $account->user_id,
                'team_id' => $account->team_id,
                'email_thread_id' => $thread->id,
                'contact_id' => $contact?->id,
                'deal_id' => $thread->deal_id,
                'direction' => $direction,
                'from_address' => $fromAddress,
                'from_name' => $fromName,
                'to_addresses' => $this->parseAddressList($to),
                'cc_addresses' => $cc ? $this->parseAddressList($cc) : null,
                'bcc_addresses' => $bcc ? $this->parseAddressList($bcc) : null,
                'subject' => $subject,
                'body_text' => $bodyText,
                'body_html' => $bodyHtml,
                'snippet' => $gmailMessage->getSnippet(),
                'label_ids' => $labelIds,
                'is_read' => $isRead,
                'is_starred' => $isStarred,
                'has_attachments' => $hasAttachments,
                'attachments_metadata' => $attachmentsMeta ?: null,
                'in_reply_to' => $inReplyTo,
                'references' => $references,
                'sent_at' => $sentAt,
            ]
        );

        // Update thread metadata
        $thread->update([
            'snippet' => $gmailMessage->getSnippet(),
            'subject' => $subject ?: $thread->subject,
            'message_count' => $thread->messages()->count(),
            'is_read' => ! $thread->messages()->where('is_read', false)->exists(),
            'last_message_at' => max($sentAt, $thread->last_message_at ?? $sentAt),
            'contact_id' => $thread->contact_id ?? $contact?->id,
        ]);

        // Log to timeline if we matched a contact
        if ($contact) {
            $eventType = $direction === 'inbound' ? 'email_received' : 'email_sent';
            Activity::create([
                'user_id' => $account->user_id,
                'team_id' => $account->team_id,
                'contact_id' => $contact->id,
                'deal_id' => $thread->deal_id,
                'event_type' => $eventType,
                'subject' => $direction === 'inbound'
                    ? "Email received: {$subject}"
                    : "Email sent: {$subject}",
                'description' => $gmailMessage->getSnippet(),
                'metadata' => [
                    'email_message_id' => $emailMessage->id,
                    'email_thread_id' => $thread->id,
                ],
            ]);
        }

        // Broadcast for real-time updates
        if ($broadcast && $direction === 'inbound') {
            $emailMessage->load('contact');
            event(new NewEmailMessage($emailMessage));
        }

        return $emailMessage;
    }

    /**
     * Find a CRM contact by email address within the user/team scope.
     */
    public function matchContact(string $emailAddress, EmailAccount $account): ?Contact
    {
        if (empty($emailAddress)) {
            return null;
        }

        // Gmail returns whatever casing the sender used; match case-insensitively.
        $query = Contact::whereRaw('LOWER(email) = ?', [strtolower(trim($emailAddress))]);

        if ($account->team_id) {
            $query->where('team_id', $account->team_id);
        } else {
            $query->where('user_id', $account->user_id);
        }

        return $query->first();
    }

    /**
     * Extract email address from a "Name <email>" string.
     */
    private function extractEmail(string $address): string
    {
        if (preg_match('/<([^>]+)>/', $address, $matches)) {
            return $matches[1];
        }

        return trim($address);
    }

    /**
     * Extract display name from a "Name <email>" string.
     */
    private function extractName(string $address): ?string
    {
        if (preg_match('/^(.+?)\s*</', $address, $matches)) {
            return trim($matches[1], '" ');
        }

        return null;
    }

    /**
     * Parse a comma-separated address list into an array of email strings.
     */
    private function parseAddressList(string $list): array
    {
        $addresses = [];
        foreach (preg_split('/,\s*/', $list) as $addr) {
            $email = $this->extractEmail(trim($addr));
            if ($email) {
                $addresses[] = $email;
            }
        }

        return $addresses;
    }

    /**
     * Recursively extract body content from message payload.
     */
    private function extractBody(?MessagePart $payload, string $mimeType): ?string
    {
        if (! $payload) {
            return null;
        }

        if ($payload->getMimeType() === $mimeType && $payload->getBody()?->getData()) {
            return base64_decode(strtr($payload->getBody()->getData(), '-_', '+/'));
        }

        foreach ($payload->getParts() ?? [] as $part) {
            $result = $this->extractBody($part, $mimeType);
            if ($result) {
                return $result;
            }
        }

        return null;
    }

    /**
     * Recursively collect attachment metadata from message payload.
     */
    private function collectAttachments(?MessagePart $payload, bool &$hasAttachments, array &$metadata): void
    {
        if (! $payload) {
            return;
        }

        if ($payload->getFilename() && $payload->getBody()?->getAttachmentId()) {
            $hasAttachments = true;
            $metadata[] = [
                'filename' => $payload->getFilename(),
                'mime_type' => $payload->getMimeType(),
                'size' => $payload->getBody()->getSize(),
                'attachment_id' => $payload->getBody()->getAttachmentId(),
            ];
        }

        foreach ($payload->getParts() ?? [] as $part) {
            $this->collectAttachments($part, $hasAttachments, $metadata);
        }
    }

    /**
     * Parse various date formats from email headers.
     */
    private function parseDate(string $dateStr): Carbon
    {
        try {
            return Carbon::parse($dateStr);
        } catch (\Exception) {
            return now();
        }
    }
}
