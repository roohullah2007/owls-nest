<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Contact;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactSubResourceEditTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // ── Offers ──────────────────────────────────────────────────────

    public function test_update_offer_modifies_fields(): void
    {
        $contact = Contact::factory()->create(['user_id' => $this->user->id]);
        $offer = $contact->offers()->create([
            'user_id' => $this->user->id,
            'amount' => 100000,
            'status' => 'submitted',
            'source' => 'manual',
        ]);

        $response = $this->actingAs($this->user)->patch(
            route('crm.contacts.offers.update', [$contact, $offer]),
            ['amount' => 250000, 'status' => 'accepted', 'notes' => 'Counter accepted'],
        );

        $response->assertRedirect();
        $this->assertDatabaseHas('contact_offers', [
            'id' => $offer->id,
            'amount' => 250000,
            'status' => 'accepted',
            'notes' => 'Counter accepted',
        ]);
    }

    public function test_update_offer_rejects_other_users_contact(): void
    {
        $other = User::factory()->create();
        $contact = Contact::factory()->create(['user_id' => $other->id]);
        $offer = $contact->offers()->create([
            'user_id' => $other->id,
            'amount' => 100000,
            'status' => 'submitted',
            'source' => 'manual',
        ]);

        $this->actingAs($this->user)
            ->patch(route('crm.contacts.offers.update', [$contact, $offer]), ['amount' => 1])
            ->assertForbidden();
    }

    // ── Inquiries ───────────────────────────────────────────────────

    public function test_update_inquiry_modifies_fields(): void
    {
        $contact = Contact::factory()->create(['user_id' => $this->user->id]);
        $inquiry = $contact->inquiries()->create([
            'user_id' => $this->user->id,
            'subject' => 'Old subject',
            'status' => 'open',
            'source' => 'manual',
        ]);

        $response = $this->actingAs($this->user)->patch(
            route('crm.contacts.inquiries.update', [$contact, $inquiry]),
            ['subject' => 'New subject', 'status' => 'closed', 'message' => 'Resolved'],
        );

        $response->assertRedirect();
        $this->assertDatabaseHas('contact_inquiries', [
            'id' => $inquiry->id,
            'subject' => 'New subject',
            'status' => 'closed',
            'message' => 'Resolved',
        ]);
    }

    // ── Bulk type change ────────────────────────────────────────────

    public function test_bulk_update_type_changes_selected_contacts(): void
    {
        $a = Contact::factory()->create(['user_id' => $this->user->id, 'type' => 'buyer']);
        $b = Contact::factory()->create(['user_id' => $this->user->id, 'type' => 'buyer']);
        $other = User::factory()->create();
        $foreign = Contact::factory()->create(['user_id' => $other->id, 'type' => 'buyer']);

        $response = $this->actingAs($this->user)->post(route('crm.contacts.bulk-type'), [
            'ids' => [$a->id, $b->id, $foreign->id],
            'type' => 'seller',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('contacts', ['id' => $a->id, 'type' => 'seller']);
        $this->assertDatabaseHas('contacts', ['id' => $b->id, 'type' => 'seller']);
        // Another user's contact must not be touched by the scoped update.
        $this->assertDatabaseHas('contacts', ['id' => $foreign->id, 'type' => 'buyer']);
    }

    public function test_bulk_update_type_rejects_unknown_type(): void
    {
        $a = Contact::factory()->create(['user_id' => $this->user->id, 'type' => 'buyer']);

        $this->actingAs($this->user)
            ->post(route('crm.contacts.bulk-type'), ['ids' => [$a->id], 'type' => 'not_a_real_type'])
            ->assertSessionHasErrors('type');
    }

    // ── Timeline note editing ───────────────────────────────────────

    public function test_update_activity_edits_note_body(): void
    {
        $contact = Contact::factory()->create(['user_id' => $this->user->id]);
        $note = $this->user->notes()->create([
            'notable_id' => $contact->id,
            'notable_type' => Contact::class,
            'body' => 'Original note',
        ]);
        $activity = Activity::create([
            'user_id' => $this->user->id,
            'contact_id' => $contact->id,
            'event_type' => 'note_created',
            'subject' => 'Note added',
            'description' => 'Original note',
            'loggable_id' => $note->id,
            'loggable_type' => Note::class,
        ]);

        $response = $this->actingAs($this->user)->patch(
            route('crm.activities.update', $activity),
            ['body' => 'Edited note body'],
        );

        $response->assertRedirect();
        $this->assertDatabaseHas('notes', ['id' => $note->id, 'body' => 'Edited note body']);
        $this->assertDatabaseHas('activities', ['id' => $activity->id, 'description' => 'Edited note body']);
    }

    public function test_update_activity_rejects_non_note_event(): void
    {
        $contact = Contact::factory()->create(['user_id' => $this->user->id]);
        $activity = Activity::create([
            'user_id' => $this->user->id,
            'contact_id' => $contact->id,
            'event_type' => 'call_logged',
            'subject' => 'Call logged',
            'description' => 'Spoke with lead',
        ]);

        $this->actingAs($this->user)
            ->patch(route('crm.activities.update', $activity), ['body' => 'nope'])
            ->assertStatus(422);
    }
}
