<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Menus editor nesting → public header dropdowns. Mirrors the exact PATCH
 * sequence MenusSection.tsx fires on Save Menus, then asserts navTree()
 * nests the items.
 */
class MenusNestingTest extends TestCase
{
    use RefreshDatabase;

    private function makeSite(User $user): AgentWebsite
    {
        return AgentWebsite::create([
            'user_id' => $user->id,
            'name' => 'Site', 'slug' => 'menus-test-site', 'template' => 'luxury', 'agent_name' => 'Agent',
        ]);
    }

    public function test_system_page_nesting_persists_and_nests_in_nav_tree(): void
    {
        $user = User::factory()->create();
        $site = $this->makeSite($user);

        // The editor fires these three PATCHes in parallel on Save Menus.
        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/pages-config", [
                'disabled_pages' => [],
                'nav_order' => ['home', 'properties', 'about', 'buy', 'sell', 'areas', 'blog', 'contact'],
                'custom_pages' => [],
            ])
            ->assertOk();

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/header-config", [
                'nav_dropdowns' => [],
                'nav_parents' => ['sell' => 'buy'],
            ])
            ->assertOk();

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/footer-config", ['menu' => []])
            ->assertOk();

        $site->refresh();
        $this->assertSame(['sell' => 'buy'], data_get($site->page_data, '_config.header.nav_parents'));

        $tree = collect($site->navTree());
        $buy = $tree->firstWhere('key', 'buy');
        $this->assertNotNull($buy);
        // Mortgage Calculator is always offered under Buy (standalone tool page).
        $this->assertSame(['Mortgage Calculator', 'Sell'], array_column($buy['children'], 'label'));
        $this->assertNull($tree->firstWhere('key', 'sell'), 'Nested item must leave the top level');
    }

    public function test_curated_listings_pages_nest_under_buy(): void
    {
        $user = User::factory()->create();
        $site = $this->makeSite($user);

        foreach (['featured', 'sold'] as $section) {
            Listing::create([
                'user_id' => $user->id,
                'title' => "1 {$section} St",
                'listing_type' => 'residential',
                'status' => $section === 'sold' ? 'sold' : 'active',
                'website_section' => $section,
            ]);
        }

        $tree = collect($site->navTree());
        $this->assertSame(
            ['Featured Properties', 'Past Transactions', 'Mortgage Calculator'],
            array_column($tree->firstWhere('key', 'buy')['children'], 'label'),
        );
        $this->assertSame([], $tree->firstWhere('key', 'properties')['children']);
    }

    public function test_manual_dropdown_links_persist_and_render_as_children(): void
    {
        $user = User::factory()->create();
        $site = $this->makeSite($user);

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/header-config", [
                'nav_dropdowns' => ['about' => [['label' => 'Our Story', 'url' => '/site/x/about#story']]],
                'nav_parents' => [],
            ])
            ->assertOk();

        $about = collect($site->refresh()->navTree())->firstWhere('key', 'about');
        $this->assertSame(['Our Story'], array_column($about['children'], 'label'));
    }
}
