<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\LandingPage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ListingPageTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        // Listing (IDX squeeze) pages are part of the paid Websites feature.
        return User::factory()->create(['subscription_tier' => 'pro']);
    }

    public function test_index_lists_only_listing_kind_pages(): void
    {
        $user = $this->user();
        LandingPage::create([
            'user_id' => $user->id, 'kind' => 'listing', 'template' => 'idx-squeeze',
            'slug' => 'lp-1', 'name' => 'My Squeeze', 'type' => 'buyer', 'page_data' => ['_config' => [], '_listing' => []],
        ]);
        LandingPage::create([
            'user_id' => $user->id, 'kind' => 'landing', 'template' => 'classic',
            'slug' => 'lp-2', 'name' => 'Regular Landing', 'type' => 'seller', 'page_data' => ['blocks' => []],
        ]);

        $this->actingAs($user)->get(route('crm.listing-pages.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Crm/ListingPages/Index')
                ->has('pages', 1)
                ->where('pages.0.name', 'My Squeeze'));
    }

    public function test_landing_pages_index_excludes_listing_kind(): void
    {
        $user = $this->user();
        LandingPage::create([
            'user_id' => $user->id, 'kind' => 'listing', 'template' => 'idx-squeeze',
            'slug' => 'lp-3', 'name' => 'Squeeze', 'type' => 'buyer', 'page_data' => ['_config' => [], '_listing' => []],
        ]);

        $this->actingAs($user)->get(route('crm.landing-pages.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Crm/LandingPages/Index')->has('pages', 0));
    }

    public function test_create_renders_presets(): void
    {
        $this->actingAs($this->user())->get(route('crm.listing-pages.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Crm/ListingPages/Create')->has('presets')->has('myListings'));
    }

    public function test_store_creates_listing_page_with_config(): void
    {
        $user = $this->user();

        $res = $this->actingAs($user)->post(route('crm.listing-pages.store'), [
            'preset' => 'property-squeeze',
            'source' => 'none',
        ]);

        $page = LandingPage::where('kind', 'listing')->first();
        $this->assertNotNull($page);
        $this->assertSame('idx-squeeze', $page->template);
        $this->assertSame('buyer', $page->type);
        // Flat config (no blocks) with a default React template + gating on.
        $this->assertArrayNotHasKey('blocks', $page->page_data);
        $this->assertSame('villa-serena', $page->page_data['_config']['design']);
        $this->assertTrue($page->page_data['_config']['gate']);
        $res->assertRedirect(route('crm.listing-pages.edit', $page->uuid));
    }

    public function test_edit_returns_config_and_template_designs(): void
    {
        $user = $this->user();
        $page = LandingPage::create([
            'user_id' => $user->id, 'kind' => 'listing', 'template' => 'idx-squeeze',
            'slug' => 'lp-edit', 'name' => 'Edit Me', 'type' => 'buyer',
            'page_data' => ['_config' => ['headline' => 'Old', 'design' => 'villa-serena'], '_listing' => []],
        ]);

        $this->actingAs($user)->get(route('crm.listing-pages.edit', $page->uuid))
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Crm/ListingPages/Edit')
                ->where('page.config.headline', 'Old')
                ->where('designs.0.id', 'villa-serena'));
    }

    public function test_update_saves_config_and_preserves_listing_snapshot(): void
    {
        $user = $this->user();
        $page = LandingPage::create([
            'user_id' => $user->id, 'kind' => 'listing', 'template' => 'idx-squeeze',
            'slug' => 'lp-up', 'name' => 'Before', 'type' => 'buyer',
            'page_data' => ['_config' => ['headline' => 'Old'], '_listing' => ['price' => 750000, 'address' => ['street' => '1 Main St']]],
        ]);

        $this->actingAs($user)->patch(route('crm.listing-pages.update', $page->uuid), [
            'name' => 'After',
            'accent_color' => '#2a5d8f',
            'is_published' => true,
            'config' => ['design' => 'villa-serena', 'font' => 'Open Sans', 'headline' => 'Brand New', 'gate' => false],
        ])->assertRedirect();

        $page->refresh();
        $this->assertSame('After', $page->name);
        $this->assertTrue($page->is_published);
        $this->assertSame('Brand New', $page->page_data['_config']['headline']);
        $this->assertSame('villa-serena', $page->page_data['_config']['design']);
        $this->assertFalse($page->page_data['_config']['gate']);
        // The editor never sends the property snapshot — it must survive.
        $this->assertSame(750000, $page->page_data['_listing']['price']);
        $this->assertSame('1 Main St', $page->page_data['_listing']['address']['street']);
    }

    public function test_update_rejects_unknown_template_design(): void
    {
        $user = $this->user();
        $page = LandingPage::create([
            'user_id' => $user->id, 'kind' => 'listing', 'template' => 'idx-squeeze',
            'slug' => 'lp-bad', 'name' => 'X', 'type' => 'buyer', 'page_data' => ['_config' => [], '_listing' => []],
        ]);

        $this->actingAs($user)->patch(route('crm.listing-pages.update', $page->uuid), [
            'name' => 'X', 'accent_color' => '#2a5d8f', 'config' => ['design' => 'not-a-template'],
        ])->assertSessionHasErrors('config.design');
    }

    public function test_public_page_mounts_react_template_with_payload(): void
    {
        $user = $this->user();
        $page = LandingPage::create([
            'user_id' => $user->id, 'kind' => 'listing', 'template' => 'idx-squeeze',
            'slug' => 'lp-public', 'name' => 'Public', 'type' => 'buyer', 'is_published' => true,
            'agent_name' => 'Jane Agent',
            'page_data' => [
                '_config' => ['design' => 'villa-serena', 'gate' => true],
                '_listing' => [
                    'status' => 'For Sale', 'price' => 750000,
                    'address' => ['street' => '100 Ocean Dr', 'city' => 'Miami', 'state' => 'FL', 'full' => '100 Ocean Dr, Miami, FL'],
                    'photos' => ['https://img/1.jpg'],
                ],
            ],
        ]);

        $res = $this->get(route('landing.show', $page->slug))->assertOk();
        $res->assertSee('idx-squeeze-root', false);          // React mount node
        $res->assertSee('villa-serena', false);              // chosen template in payload
        $res->assertSee('100 Ocean Dr', false);              // listing data serialized into payload
    }

    public function test_cannot_edit_another_users_page(): void
    {
        $owner = $this->user();
        $other = $this->user();
        $page = LandingPage::create([
            'user_id' => $owner->id, 'kind' => 'listing', 'template' => 'idx-squeeze',
            'slug' => 'lp-own', 'name' => 'Owned', 'type' => 'buyer', 'page_data' => ['_config' => [], '_listing' => []],
        ]);

        $this->actingAs($other)->get(route('crm.listing-pages.edit', $page->uuid))->assertForbidden();
    }
}
