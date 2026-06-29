<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\PhoneNumber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelnyxSmsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        // Pro includes the phone feature plus an included credit allowance, so
        // sends pass the credit gate. (Phone is now metered against credits.)
        $this->user = User::factory()->create(['subscription_tier' => 'pro']);
        config([
            'telnyx.api_key' => 'KEYtest',
            'telnyx.messaging_profile_id' => 'mp_test',
        ]);
    }

    private function activeNumber(User $owner, string $number, bool $default = true): PhoneNumber
    {
        return PhoneNumber::create([
            'user_id' => $owner->id,
            'team_id' => $owner->team_id,
            'phone_number' => $number,
            'status' => 'active',
            'is_default' => $default,
            'capabilities' => ['sms', 'voice'],
        ]);
    }

    private function contact(User $owner, string $phone): Contact
    {
        return $owner->contacts()->create([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane'.$owner->id.'@example.com',
            'phone' => $phone,
            'type' => 'buyer',
            'source' => 'website',
        ]);
    }

    public function test_outbound_sms_stores_message_with_telnyx_id(): void
    {
        Http::fake(['*messages*' => Http::response(['data' => ['id' => 'msg_1', 'parts' => 1]], 200)]);

        $this->activeNumber($this->user, '+13055550001');
        // Non-NANP destination so the 10DLC gate is skipped (it only applies to US/Canada).
        $contact = $this->contact($this->user, '+447911123456');

        $this->actingAs($this->user)
            ->postJson(route('crm.sms.send'), [
                'contact_id' => $contact->id,
                'to_number' => '+447911123456',
                'body' => 'Hello there',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('sms_messages', [
            'contact_id' => $contact->id,
            'direction' => 'outbound',
            'telnyx_message_id' => 'msg_1',
            'from_number' => '+13055550001',
            'to_number' => '+447911123456',
            'status' => 'sent',
        ]);
    }

    public function test_failed_send_returns_error_and_stores_nothing(): void
    {
        Http::fake(['*messages*' => Http::response(['errors' => [['detail' => 'rejected']]], 422)]);

        $this->activeNumber($this->user, '+13055550001');
        $contact = $this->contact($this->user, '+447911123456');

        $this->actingAs($this->user)
            ->postJson(route('crm.sms.send'), [
                'contact_id' => $contact->id,
                'to_number' => '+447911123456',
                'body' => 'Hello',
            ])
            ->assertStatus(500);

        $this->assertDatabaseCount('sms_messages', 0);
    }

    public function test_user_cannot_send_from_a_number_they_do_not_own(): void
    {
        Http::fake(['*messages*' => Http::response(['data' => ['id' => 'msg_x', 'parts' => 1]], 200)]);

        // The attacker owns their own default number.
        $own = $this->activeNumber($this->user, '+13055550001');

        // A victim on another account owns a different number.
        $victim = User::factory()->create();
        $victimNumber = $this->activeNumber($victim, '+13055550002');

        $contact = $this->contact($this->user, '+447911123456');

        // Attacker explicitly passes the victim's phone_number_id.
        $this->actingAs($this->user)
            ->postJson(route('crm.sms.send'), [
                'contact_id' => $contact->id,
                'to_number' => '+447911123456',
                'body' => 'spoof attempt',
                'phone_number_id' => $victimNumber->id,
            ])
            ->assertCreated();

        // It must fall back to the attacker's OWN number, never the victim's.
        $this->assertDatabaseHas('sms_messages', ['from_number' => $own->phone_number]);
        $this->assertDatabaseMissing('sms_messages', ['from_number' => $victimNumber->phone_number]);
    }
}
