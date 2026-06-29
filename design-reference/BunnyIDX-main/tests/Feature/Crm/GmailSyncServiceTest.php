<?php

namespace Tests\Feature\Crm;

use App\Models\Contact;
use App\Models\EmailAccount;
use App\Models\EmailMessage;
use App\Models\EmailThread;
use App\Models\User;
use App\Services\Gmail\GmailSyncService;
use Google\Service\Gmail\Message;
use Google\Service\Gmail\MessagePart;
use Google\Service\Gmail\MessagePartBody;
use Google\Service\Gmail\MessagePartHeader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GmailSyncServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private EmailAccount $account;

    private GmailSyncService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->account = EmailAccount::create([
            'user_id' => $this->user->id,
            'team_id' => null,
            'provider' => 'google',
            'email_address' => 'agent@gmail.com',
            'provider_account_id' => 'agent@gmail.com',
            'access_token' => 'access-token',
            'refresh_token' => 'refresh-token',
            'token_expires_at' => now()->addHour(),
            'sync_state' => 'active',
            'is_active' => true,
        ]);
        $this->service = new GmailSyncService;
    }

    public function test_inbound_message_creates_thread_and_message(): void
    {
        $this->service->processMessage($this->account, $this->gmailMessage('m1', 't1', [
            'From' => 'Lead <lead@example.com>',
            'To' => 'agent@gmail.com',
            'Subject' => 'Hello there',
        ]));

        $this->assertDatabaseHas('email_threads', [
            'gmail_thread_id' => 't1',
            'email_account_id' => $this->account->id,
        ]);
        $this->assertDatabaseHas('email_messages', [
            'gmail_message_id' => 'm1',
            'direction' => 'inbound',
            'from_address' => 'lead@example.com',
        ]);
    }

    public function test_same_thread_does_not_create_duplicate_conversation(): void
    {
        $this->service->processMessage($this->account, $this->gmailMessage('m1', 't1', [
            'From' => 'Lead <lead@example.com>', 'To' => 'agent@gmail.com', 'Subject' => 'Hi',
        ]));
        // A reply arrives on the same Gmail thread.
        $this->service->processMessage($this->account, $this->gmailMessage('m2', 't1', [
            'From' => 'agent@gmail.com', 'To' => 'lead@example.com', 'Subject' => 'Re: Hi',
        ]));

        $this->assertSame(1, EmailThread::where('gmail_thread_id', 't1')->count());

        $thread = EmailThread::where('gmail_thread_id', 't1')->first();
        $this->assertSame(2, EmailMessage::where('email_thread_id', $thread->id)->count());
    }

    public function test_duplicate_provider_message_id_is_ignored(): void
    {
        $message = $this->gmailMessage('m1', 't1', [
            'From' => 'Lead <lead@example.com>', 'To' => 'agent@gmail.com', 'Subject' => 'Hi',
        ]);

        $this->service->processMessage($this->account, $message);
        $this->service->processMessage($this->account, $message);

        $this->assertSame(1, EmailMessage::where('gmail_message_id', 'm1')->count());
    }

    public function test_inbound_message_links_to_matching_contact(): void
    {
        $contact = Contact::factory()->create([
            'user_id' => $this->user->id,
            'email' => 'lead@example.com',
        ]);

        $this->service->processMessage($this->account, $this->gmailMessage('m1', 't1', [
            'From' => 'Lead <LEAD@example.com>', // mixed case — match is case-insensitive
            'To' => 'agent@gmail.com',
            'Subject' => 'Hi',
        ]));

        $this->assertDatabaseHas('email_messages', [
            'gmail_message_id' => 'm1',
            'contact_id' => $contact->id,
        ]);
    }

    /**
     * Build a minimal Gmail API Message object the sync service can parse.
     */
    private function gmailMessage(string $id, string $threadId, array $headers, string $bodyHtml = '<p>Body</p>'): Message
    {
        $headerObjects = [];
        foreach ($headers as $name => $value) {
            $header = new MessagePartHeader;
            $header->setName($name);
            $header->setValue($value);
            $headerObjects[] = $header;
        }

        $body = new MessagePartBody;
        $body->setData(rtrim(strtr(base64_encode($bodyHtml), '+/', '-_'), '='));

        $payload = new MessagePart;
        $payload->setMimeType('text/html');
        $payload->setHeaders($headerObjects);
        $payload->setBody($body);

        $message = new Message;
        $message->setId($id);
        $message->setThreadId($threadId);
        $message->setSnippet('Snippet');
        $message->setLabelIds(['INBOX', 'UNREAD']);
        $message->setPayload($payload);

        return $message;
    }
}
