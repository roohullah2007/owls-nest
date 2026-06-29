<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingControllerTest extends TestCase
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
        $this->get(route('crm.listings.index'))->assertRedirect(route('login'));
    }

    public function test_index_displays_listings(): void
    {
        $this->user->listings()->create([
            'title' => '123 Main St',
            'listing_type' => 'residential',
            'status' => 'active',
            'price' => 500000,
            'city' => 'Miami',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.listings.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Crm/Listings/Index')
            ->has('listings.data', 1)
            ->where('listings.data.0.title', '123 Main St')
        );
    }

    public function test_index_filters_by_search(): void
    {
        $this->user->listings()->create([
            'title' => 'Beach House', 'listing_type' => 'residential',
            'status' => 'active', 'city' => 'Miami',
        ]);
        $this->user->listings()->create([
            'title' => 'Mountain Cabin', 'listing_type' => 'residential',
            'status' => 'active', 'city' => 'Denver',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.listings.index', ['search' => 'Beach']));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('listings.data', 1)
            ->where('listings.data.0.title', 'Beach House')
        );
    }

    public function test_index_filters_by_type_and_status(): void
    {
        $this->user->listings()->create([
            'title' => 'Commercial One', 'listing_type' => 'commercial',
            'status' => 'active',
        ]);
        $this->user->listings()->create([
            'title' => 'Residential One', 'listing_type' => 'residential',
            'status' => 'sold',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.listings.index', [
            'listing_type' => 'commercial',
            'status' => 'active',
        ]));

        $response->assertInertia(fn ($page) => $page->has('listings.data', 1)
            ->where('listings.data.0.title', 'Commercial One')
        );
    }

    public function test_index_isolates_by_user(): void
    {
        $otherUser = User::factory()->create();
        $otherUser->listings()->create([
            'title' => 'Not Mine', 'listing_type' => 'residential',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.listings.index'));

        $response->assertInertia(fn ($page) => $page->has('listings.data', 0)
        );
    }

    // ── Create / Store ──────────────────────────────────────────────

    public function test_create_page_loads(): void
    {
        $response = $this->actingAs($this->user)->get(route('crm.listings.create'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Crm/Listings/Create')
            ->has('listingTypes')
            ->has('listingStatuses')
        );
    }

    public function test_store_creates_listing(): void
    {
        $response = $this->actingAs($this->user)->post(route('crm.listings.store'), [
            'title' => 'Beautiful Home',
            'listing_type' => 'residential',
            'status' => 'active',
            'price' => 599000,
            'bedrooms' => 4,
            'bathrooms' => 3,
            'sqft' => 2500,
            'city' => 'Austin',
            'state_province' => 'TX',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('listings', [
            'user_id' => $this->user->id,
            'title' => 'Beautiful Home',
            'price' => 599000.00,
            'bedrooms' => 4,
        ]);
    }

    public function test_store_persists_mls_feature_fields(): void
    {
        $this->actingAs($this->user)->post(route('crm.listings.store'), [
            'title' => 'Waterfront Condo',
            'listing_type' => 'residential',
            'status' => 'active',
            'features' => [
                'subdivision' => 'Brickell Key',
                'mls_area' => 'Miami-Dade County',
                'hoa_name' => 'Courvoisier HOA',
                'hoa_frequency' => 'monthly',
                'tax_annual_amount' => 12500,
                'tax_year' => 2025,
                'furnished' => 'furnished',
                'pool' => '1',
                'waterfront' => '1',
                'view' => ['Ocean', 'City'],
                'appliances' => ['Dishwasher'],
                'custom_features' => ['Wine cellar'],
                'amenities' => ['Pool', 'Waterfront', 'Furnished', 'Ocean', 'City', 'Dishwasher', 'Wine cellar'],
            ],
        ]);

        $listing = $this->user->listings()->where('title', 'Waterfront Condo')->firstOrFail();

        // Booleans cast to real booleans (sent as "1" over multipart form data).
        $this->assertTrue($listing->features['pool']);
        $this->assertTrue($listing->features['waterfront']);
        $this->assertSame('Brickell Key', $listing->features['subdivision']);
        $this->assertSame(['Ocean', 'City'], $listing->features['view']);
        $this->assertContains('Wine cellar', $listing->features['amenities']);
    }

    public function test_store_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)->post(route('crm.listings.store'), []);

        $response->assertSessionHasErrors(['title', 'listing_type', 'status']);
    }

    public function test_store_with_tags(): void
    {
        $tag = Tag::create(['user_id' => $this->user->id, 'name' => 'Featured', 'color' => '#ff0000']);

        $this->actingAs($this->user)->post(route('crm.listings.store'), [
            'title' => 'Tagged Listing',
            'listing_type' => 'residential',
            'status' => 'active',
            'tags' => [$tag->id],
        ]);

        $listing = $this->user->listings()->where('title', 'Tagged Listing')->first();
        $this->assertCount(1, $listing->tags);
    }

    // ── Show ────────────────────────────────────────────────────────

    public function test_show_displays_listing(): void
    {
        $listing = $this->user->listings()->create([
            'title' => 'Show Listing', 'listing_type' => 'residential',
            'status' => 'active', 'price' => 300000,
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.listings.show', $listing));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Crm/Listings/Show')
            ->where('listing.title', 'Show Listing')
        );
    }

    public function test_show_rejects_other_users_listing(): void
    {
        $otherUser = User::factory()->create();
        $listing = $otherUser->listings()->create([
            'title' => 'Private', 'listing_type' => 'residential',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.listings.show', $listing));

        $response->assertForbidden();
    }

    // ── Update ──────────────────────────────────────────────────────

    public function test_update_modifies_listing(): void
    {
        $listing = $this->user->listings()->create([
            'title' => 'Original', 'listing_type' => 'residential',
            'status' => 'active', 'price' => 300000,
        ]);

        $response = $this->actingAs($this->user)->put(route('crm.listings.update', $listing), [
            'title' => 'Updated',
            'listing_type' => 'residential',
            'status' => 'pending',
            'price' => 325000,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('listings', [
            'id' => $listing->id,
            'title' => 'Updated',
            'status' => 'pending',
            'price' => 325000.00,
        ]);
    }

    public function test_update_status_change_logs_timeline(): void
    {
        $listing = $this->user->listings()->create([
            'title' => 'Status Change', 'listing_type' => 'residential',
            'status' => 'active',
        ]);

        $this->actingAs($this->user)->put(route('crm.listings.update', $listing), [
            'title' => 'Status Change',
            'listing_type' => 'residential',
            'status' => 'sold',
        ]);

        $this->assertDatabaseHas('activities', [
            'user_id' => $this->user->id,
            'listing_id' => $listing->id,
            'event_type' => 'listing_status_changed',
        ]);
    }

    // ── Delete ──────────────────────────────────────────────────────

    public function test_destroy_soft_deletes_listing(): void
    {
        $listing = $this->user->listings()->create([
            'title' => 'Delete Me', 'listing_type' => 'residential',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->user)->delete(route('crm.listings.destroy', $listing));

        $response->assertRedirect();
        $this->assertSoftDeleted('listings', ['id' => $listing->id]);
    }

    // ── Custom Types / Statuses ─────────────────────────────────────

    public function test_store_listing_type(): void
    {
        $response = $this->actingAs($this->user)->post(route('crm.listings.listing-types.store'), [
            'type' => 'condo',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->user->refresh();
        $this->assertContains('condo', $this->user->getListingTypes());
    }

    public function test_store_listing_status(): void
    {
        $response = $this->actingAs($this->user)->post(route('crm.listings.listing-statuses.store'), [
            'status' => 'under_contract',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->user->refresh();
        $this->assertContains('under_contract', $this->user->getListingStatuses());
    }
}
