<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\PhoneNumber;
use App\Models\SmsMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelnyxWebhookTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        // No telnyx.public_key configured → signature check no-ops in the testing env,
        // so we can post raw payloads (the prod path is covered by TelnyxSignatureTest).
        PhoneNumber::create([
            'user_id' => $this->user->id,
            'phone_number' => '+13055550000',
            'status' => 'active',
        ]);
    }

    private function inboundPayload(string $id, string $from, string $text): array
    {
        return [
            'data' => [
                'event_type' => 'message.received',
                'payload' => [
                    'id' => $id,
                    'from' => ['phone_number' => $from],
                    'to' => [['phone_number' => '+13055550000']],
                    'text' => $text,
                ],
            ],
        ];
    }

    public function test_inbound_sms_creates_message_for_matched_contact(): void
    {
        $contact = $this->user->contacts()->create([
            'first_name' => 'Lead',
            'last_name' => 'Person',
            'phone' => '+15551112222',
            'type' => 'prospect',
            'source' => 'website',
        ]);

        $this->postJson(route('webhooks.telnyx.sms'), $this->inboundPayload('in_1', '+15551112222', 'Hello'))
            ->assertOk()
            ->assertJsonPath('status', 'received');

        $this->assertDatabaseHas('sms_messages', [
            'telnyx_message_id' => 'in_1',
            'direction' => 'inbound',
            'contact_id' => $contact->id,
            'body' => 'Hello',
            'phone_number_id' => PhoneNumber::first()->id,
        ]);
    }

    public function test_inbound_sms_auto_creates_unknown_contact(): void
    {
        $this->postJson(route('webhooks.telnyx.sms'), $this->inboundPayload('in_2', '+15559998888', 'New lead'))
            ->assertOk();

        $contact = Contact::where('phone', '+15559998888')->first();
        $this->assertNotNull($contact);
        $this->assertSame($this->user->id, $contact->user_id);
        $this->assertDatabaseHas('sms_messages', ['telnyx_message_id' => 'in_2', 'contact_id' => $contact->id]);
    }

    public function test_duplicate_inbound_webhook_is_ignored(): void
    {
        $payload = $this->inboundPayload('in_dup', '+15551112222', 'Only once');

        $this->postJson(route('webhooks.telnyx.sms'), $payload)->assertOk()->assertJsonPath('status', 'received');
        $this->postJson(route('webhooks.telnyx.sms'), $payload)->assertOk()->assertJsonPath('status', 'duplicate_ignored');

        $this->assertSame(1, SmsMessage::where('telnyx_message_id', 'in_dup')->count());
    }

    public function test_inbound_stop_keyword_opts_contact_out(): void
    {
        $contact = $this->user->contacts()->create([
            'first_name' => 'Opt',
            'last_name' => 'Out',
            'phone' => '+15551113333',
            'type' => 'prospect',
            'source' => 'website',
        ]);

        $this->postJson(route('webhooks.telnyx.sms'), $this->inboundPayload('in_stop', '+15551113333', 'STOP'))
            ->assertOk()
            ->assertJsonPath('status', 'opt_out_processed');

        $this->assertTrue((bool) $contact->fresh()->sms_opted_out);
    }

    public function test_inbound_to_unknown_number_is_ignored(): void
    {
        $this->postJson(route('webhooks.telnyx.sms'), [
            'data' => [
                'event_type' => 'message.received',
                'payload' => [
                    'id' => 'in_unknown',
                    'from' => ['phone_number' => '+15551110000'],
                    'to' => [['phone_number' => '+19998887777']],
                    'text' => 'Hi',
                ],
            ],
        ])->assertOk()->assertJsonPath('status', 'no_matching_number');

        $this->assertDatabaseCount('sms_messages', 0);
    }
}
