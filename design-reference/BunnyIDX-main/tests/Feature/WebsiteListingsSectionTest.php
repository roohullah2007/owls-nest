<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Featured/Sold website-listing flags — incl. "Mark Sold" closing the listing. */
class WebsiteListingsSectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_mark_sold_moves_listing_and_closes_it(): void
    {
        $user = User::factory()->create();
        $site = AgentWebsite::create([
            'user_id' => $user->id,
            'name' => 'Site', 'slug' => 'mark-sold-site', 'template' => 'luxury', 'agent_name' => 'Agent',
        ]);
        $listing = Listing::create([
            'user_id' => $user->id,
            'title' => '1 Test St',
            'listing_type' => 'residential',
            'status' => 'active',
            'website_section' => 'featured',
        ]);

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/website-listings/{$listing->id}", [
                'section' => 'sold',
                'mark_sold' => true,
            ])
            ->assertOk()
            ->assertJsonPath('website_section', 'sold')
            ->assertJsonPath('status', 'sold');

        $listing->refresh();
        $this->assertSame('sold', $listing->status);
        $this->assertSame('sold', $listing->website_section);
        $this->assertNotNull($listing->sold_at);

        // Plain section moves never touch the status.
        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/website-listings/{$listing->id}", ['section' => 'featured'])
            ->assertOk();
        $this->assertSame('sold', $listing->fresh()->status);
    }
}
