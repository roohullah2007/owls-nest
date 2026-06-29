<?php

declare(strict_types=1);

namespace App\Services\Gmail;

use App\Models\EmailAccount;
use Google\Client as GoogleClient;
use Google\Service\Gmail;
use Google\Service\Gmail\ListHistoryResponse;
use Google\Service\Gmail\ListMessagesResponse;
use Google\Service\Gmail\ListThreadsResponse;
use Google\Service\Gmail\Message;
use Google\Service\Gmail\ModifyMessageRequest;
use Google\Service\Gmail\Profile;
use Google\Service\Gmail\Thread;

class GmailService
{
    private GoogleClient $client;

    private Gmail $gmail;

    public function __construct(
        private EmailAccount $account,
    ) {
        $this->client = new GoogleClient;
        $this->client->setClientId(config('google.client_id'));
        $this->client->setClientSecret(config('google.client_secret'));
        $this->client->setAccessToken($account->access_token);

        if ($account->isTokenExpired() && $account->refresh_token) {
            $this->refreshToken();
        }

        $this->gmail = new Gmail($this->client);
    }

    /**
     * Send an email via Gmail API.
     */
    public function sendEmail(
        string $to,
        string $subject,
        string $bodyHtml,
        ?string $cc = null,
        ?string $bcc = null,
        ?string $inReplyTo = null,
        ?string $threadId = null,
        ?string $fromName = null,
    ): Message {
        // Sender name precedence: explicit override (from the user's "Default
        // Sender Name" preference) → account owner's name → empty.
        $fromName = $fromName ?: ($this->account->user?->name ?? '');
        $fromEmail = $this->account->email_address;

        $headers = "From: {$fromName} <{$fromEmail}>\r\n";
        $headers .= "To: {$to}\r\n";
        if ($cc) {
            $headers .= "Cc: {$cc}\r\n";
        }
        if ($bcc) {
            $headers .= "Bcc: {$bcc}\r\n";
        }
        $headers .= "Subject: {$subject}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        if ($inReplyTo) {
            $headers .= "In-Reply-To: {$inReplyTo}\r\n";
            $headers .= "References: {$inReplyTo}\r\n";
        }
        $headers .= "\r\n";

        $rawMessage = $headers.$bodyHtml;
        $encodedMessage = rtrim(strtr(base64_encode($rawMessage), '+/', '-_'), '=');

        $message = new Message;
        $message->setRaw($encodedMessage);
        if ($threadId) {
            $message->setThreadId($threadId);
        }

        return $this->gmail->users_messages->send('me', $message);
    }

    /**
     * Fetch a single message with full format.
     */
    public function getMessage(string $messageId): Message
    {
        return $this->gmail->users_messages->get('me', $messageId, ['format' => 'full']);
    }

    /**
     * List messages matching a query.
     */
    public function listMessages(?string $query = null, int $maxResults = 50, ?string $pageToken = null): ListMessagesResponse
    {
        $params = ['maxResults' => $maxResults];
        if ($query) {
            $params['q'] = $query;
        }
        if ($pageToken) {
            $params['pageToken'] = $pageToken;
        }

        return $this->gmail->users_messages->listUsersMessages('me', $params);
    }

    /**
     * Fetch a thread with all messages.
     */
    public function getThread(string $threadId): Thread
    {
        return $this->gmail->users_threads->get('me', $threadId, ['format' => 'full']);
    }

    /**
     * List threads matching a query.
     */
    public function listThreads(?string $query = null, int $maxResults = 50, ?string $pageToken = null): ListThreadsResponse
    {
        $params = ['maxResults' => $maxResults];
        if ($query) {
            $params['q'] = $query;
        }
        if ($pageToken) {
            $params['pageToken'] = $pageToken;
        }

        return $this->gmail->users_threads->listUsersThreads('me', $params);
    }

    /**
     * Get history changes since a given historyId.
     */
    public function getHistory(string $historyId): ListHistoryResponse
    {
        return $this->gmail->users_history->listUsersHistory('me', [
            'startHistoryId' => $historyId,
            'historyTypes' => ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
        ]);
    }

    /**
     * Mark a message as read.
     */
    public function markAsRead(string $messageId): Message
    {
        $req = new ModifyMessageRequest;
        $req->setRemoveLabelIds(['UNREAD']);

        return $this->gmail->users_messages->modify('me', $messageId, $req);
    }

    /**
     * Mark a message as unread.
     */
    public function markAsUnread(string $messageId): Message
    {
        $req = new ModifyMessageRequest;
        $req->setAddLabelIds(['UNREAD']);

        return $this->gmail->users_messages->modify('me', $messageId, $req);
    }

    /**
     * Get the user's Gmail profile (email address).
     */
    public function getProfile(): Profile
    {
        return $this->gmail->users->getProfile('me');
    }

    /**
     * Refresh the OAuth access token.
     */
    private function refreshToken(): void
    {
        $this->client->fetchAccessTokenWithRefreshToken($this->account->refresh_token);
        $newToken = $this->client->getAccessToken();

        if (isset($newToken['access_token'])) {
            $this->account->update([
                'access_token' => $newToken['access_token'],
                'token_expires_at' => now()->addSeconds($newToken['expires_in'] ?? 3600),
                'refresh_token' => $newToken['refresh_token'] ?? $this->account->refresh_token,
            ]);
        }
    }
}
