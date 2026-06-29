<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // ── Index ───────────────────────────────────────────────────────

    public function test_index_requires_auth(): void
    {
        $this->get(route('crm.contacts.index'))->assertRedirect(route('login'));
    }

    public function test_index_displays_contacts(): void
    {
        $contact = $this->user->contacts()->create([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
            'type' => 'buyer',
            'source' => 'website',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.contacts.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Crm/Contacts/Index')
                ->has('contacts.data', 1)
                ->where('contacts.data.0.first_name', 'Jane')
        );
    }

    public function test_index_filters_by_search(): void
    {
        $this->user->contacts()->create([
            'first_name' => 'Alice', 'last_name' => 'Smith',
            'type' => 'buyer', 'source' => 'website',
        ]);
        $this->user->contacts()->create([
            'first_name' => 'Bob', 'last_name' => 'Jones',
            'type' => 'seller', 'source' => 'referral',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.contacts.index', ['search' => 'Alice']));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->has('contacts.data', 1)
                ->where('contacts.data.0.first_name', 'Alice')
        );
    }

    public function test_index_filters_by_type(): void
    {
        $this->user->contacts()->create([
            'first_name' => 'Buyer', 'last_name' => 'One',
            'type' => 'buyer', 'source' => 'website',
        ]);
        $this->user->contacts()->create([
            'first_name' => 'Seller', 'last_name' => 'Two',
            'type' => 'seller', 'source' => 'website',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.contacts.index', ['type' => 'seller']));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->has('contacts.data', 1)
                ->where('contacts.data.0.first_name', 'Seller')
        );
    }

    public function test_index_isolates_by_user(): void
    {
        $otherUser = User::factory()->create();
        $otherUser->contacts()->create([
            'first_name' => 'Other', 'last_name' => 'Contact',
            'type' => 'buyer', 'source' => 'manual',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.contacts.index'));

        $response->assertInertia(fn ($page) =>
            $page->has('contacts.data', 0)
        );
    }

    // ── Create / Store ──────────────────────────────────────────────

    public function test_create_page_loads(): void
    {
        $response = $this->actingAs($this->user)->get(route('crm.contacts.create'));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Crm/Contacts/Create')
                ->has('leadTypes')
                ->has('tags')
        );
    }

    public function test_store_creates_contact(): void
    {
        $response = $this->actingAs($this->user)->post(route('crm.contacts.store'), [
            'first_name' => 'John',
            'last_name' => 'Smith',
            'email' => 'john@example.com',
            'phone' => '555-0100',
            'type' => 'buyer',
            'source' => 'website',
            'city' => 'Austin',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('contacts', [
            'user_id' => $this->user->id,
            'first_name' => 'John',
            'last_name' => 'Smith',
            'email' => 'john@example.com',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)->post(route('crm.contacts.store'), []);

        $response->assertSessionHasErrors(['first_name', 'last_name', 'type', 'source']);
    }

    public function test_store_with_tags(): void
    {
        $tag = Tag::create(['user_id' => $this->user->id, 'name' => 'VIP', 'color' => '#ff0000']);

        $this->actingAs($this->user)->post(route('crm.contacts.store'), [
            'first_name' => 'Tagged',
            'last_name' => 'Contact',
            'type' => 'buyer',
            'source' => 'website',
            'tags' => [$tag->id],
        ]);

        $contact = Contact::where('first_name', 'Tagged')->first();
        $this->assertCount(1, $contact->tags);
        $this->assertEquals('VIP', $contact->tags->first()->name);
    }

    // ── Show ────────────────────────────────────────────────────────

    public function test_show_displays_contact(): void
    {
        $contact = $this->user->contacts()->create([
            'first_name' => 'Jane', 'last_name' => 'Doe',
            'type' => 'buyer', 'source' => 'website',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.contacts.show', $contact));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Crm/Contacts/Show')
                ->where('contact.first_name', 'Jane')
        );
    }

    public function test_show_rejects_other_users_contact(): void
    {
        $otherUser = User::factory()->create();
        $contact = $otherUser->contacts()->create([
            'first_name' => 'Other', 'last_name' => 'Person',
            'type' => 'buyer', 'source' => 'manual',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.contacts.show', $contact));

        $response->assertForbidden();
    }

    // ── Update ──────────────────────────────────────────────────────

    public function test_update_modifies_contact(): void
    {
        $contact = $this->user->contacts()->create([
            'first_name' => 'Old', 'last_name' => 'Name',
            'type' => 'buyer', 'source' => 'website',
        ]);

        $response = $this->actingAs($this->user)->put(route('crm.contacts.update', $contact), [
            'first_name' => 'New',
            'last_name' => 'Name',
            'type' => 'seller',
            'source' => 'referral',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'first_name' => 'New',
            'type' => 'seller',
        ]);
    }

    // ── Delete ──────────────────────────────────────────────────────

    public function test_destroy_soft_deletes_contact(): void
    {
        $contact = $this->user->contacts()->create([
            'first_name' => 'Delete', 'last_name' => 'Me',
            'type' => 'buyer', 'source' => 'website',
        ]);

        $response = $this->actingAs($this->user)->delete(route('crm.contacts.destroy', $contact));

        $response->assertRedirect();
        $this->assertSoftDeleted('contacts', ['id' => $contact->id]);
    }

    // ── Bulk Operations ─────────────────────────────────────────────

    public function test_bulk_delete_contacts(): void
    {
        $c1 = $this->user->contacts()->create([
            'first_name' => 'One', 'last_name' => 'Del',
            'type' => 'buyer', 'source' => 'manual',
        ]);
        $c2 = $this->user->contacts()->create([
            'first_name' => 'Two', 'last_name' => 'Del',
            'type' => 'buyer', 'source' => 'manual',
        ]);

        $response = $this->actingAs($this->user)->post(route('crm.contacts.bulk-delete'), [
            'ids' => [$c1->id, $c2->id],
        ]);

        $response->assertRedirect();
        $this->assertSoftDeleted('contacts', ['id' => $c1->id]);
        $this->assertSoftDeleted('contacts', ['id' => $c2->id]);
    }
}
