<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\CondoBuilding;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The Condo Directory flow: admin-curated platform catalog (admin CRUD +
 * gate), the per-site enable toggle via the website-editor API, and the
 * public /condos pages it powers (directory grouped by area, building page,
 * disabled/inactive → 404, nav injection). No MLS connections exist here,
 * so no upstream calls are made.
 */
class CondoDirectoryTest extends TestCase
{
    use RefreshDatabase;

    private function makeSite(bool $enabled = true): array
    {
        $user = User::factory()->create();
        $site = AgentWebsite::create([
            'user_id' => $user->id,
            'name' => 'Condo Site',
            'slug' => 'condo-site',
            'template' => 'luxury',
            'agent_name' => 'Condo Agent',
            'is_published' => true,
            'page_data' => $enabled ? ['_config' => ['condo_directory' => ['enabled' => true]]] : [],
        ]);

        return [$user, $site];
    }

    private function makeBuilding(array $attrs = []): CondoBuilding
    {
        return CondoBuilding::create(array_merge([
            'name' => 'Brickell Flatiron',
            'slug' => 'brickell-flatiron',
            'area' => 'Brickell',
            'city' => 'Miami',
            'address' => '1000 Brickell Plaza, Miami, FL',
            'description' => 'A landmark tower.',
            'is_active' => true,
            'sort_order' => 0,
        ], $attrs));
    }

    public function test_admin_can_create_update_and_delete_buildings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('admin.condo-buildings.store'), [
                'name' => 'Icon Brickell Tower 1',
                'area' => 'Brickell',
                'city' => 'Miami',
                'is_active' => true,
                'sort_order' => 0,
            ])
            ->assertRedirect();

        $building = CondoBuilding::firstOrFail();
        $this->assertSame('icon-brickell-tower-1', $building->slug);

        $this->actingAs($admin)
            ->patch(route('admin.condo-buildings.update', $building), [
                'name' => 'Icon Brickell Tower 1',
                'area' => 'Brickell',
                'mls_keyword' => 'ICON BRICKELL',
                'is_active' => true,
                'sort_order' => 1,
            ])
            ->assertRedirect();
        $this->assertSame('ICON BRICKELL', $building->fresh()->mls_keyword);
        $this->assertSame('ICON BRICKELL', $building->fresh()->listingKeyword());

        $this->actingAs($admin)->delete(route('admin.condo-buildings.destroy', $building))->assertRedirect();
        $this->assertSame(0, CondoBuilding::count());
    }

    public function test_non_admin_cannot_reach_the_admin_catalog(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.condo-buildings'))->assertForbidden();
        $this->actingAs($user)
            ->post(route('admin.condo-buildings.store'), ['name' => 'Hack Tower', 'area' => 'X'])
            ->assertForbidden();
    }

    public function test_owner_toggles_the_directory_via_the_editor_api(): void
    {
        [$user, $site] = $this->makeSite(enabled: false);
        $this->makeBuilding();

        $this->actingAs($user)
            ->getJson("/api/website-editor/{$site->id}/condo-directory")
            ->assertOk()
            ->assertJsonPath('enabled', false)
            ->assertJsonPath('buildings', 1)
            ->assertJsonPath('areas', 1);

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/condo-directory-config", ['enabled' => true])
            ->assertOk();

        $this->assertTrue($site->fresh()->condoDirectoryEnabled());
    }

    public function test_public_directory_groups_buildings_and_links_them(): void
    {
        [, $site] = $this->makeSite();
        $this->makeBuilding();
        $this->makeBuilding(['name' => 'Bella Mare', 'slug' => 'bella-mare', 'area' => 'Aventura', 'city' => 'Aventura']);

        $this->get(route('agent-site.condos', $site->slug))
            ->assertOk()
            ->assertSee('Condo Directory')
            ->assertSee('Brickell')          // area group
            ->assertSee('Aventura')
            ->assertSee('Brickell Flatiron') // building card
            ->assertSee(route('agent-site.condos.building', [$site->slug, 'bella-mare']));
    }

    public function test_building_page_renders_curated_info(): void
    {
        [, $site] = $this->makeSite();
        $building = $this->makeBuilding();

        $this->get(route('agent-site.condos.building', [$site->slug, $building->slug]))
            ->assertOk()
            ->assertSee('Brickell Flatiron')
            ->assertSee('A landmark tower.')
            // The hero crumbs link back to the directory; the old standalone
            // backlink was replaced by the Request Information modal + VIP CTA
            // (the building page is a duplicate of the New Development page).
            ->assertSee('Request Information')
            ->assertSee('Get VIP Price List');
    }

    public function test_directory_is_404_when_disabled_and_hides_inactive_buildings(): void
    {
        [, $site] = $this->makeSite(enabled: false);
        $this->makeBuilding();

        $this->get(route('agent-site.condos', $site->slug))->assertNotFound();
        $this->get(route('agent-site.condos.building', [$site->slug, 'brickell-flatiron']))->assertNotFound();

        // Enabled site, but the building is hidden by the admin team.
        [, $enabledSite] = [null, null];
        $site->update(['page_data' => ['_config' => ['condo_directory' => ['enabled' => true]]]]);
        CondoBuilding::query()->update(['is_active' => false]);

        $this->get(route('agent-site.condos.building', [$site->slug, 'brickell-flatiron']))->assertNotFound();
    }

    public function test_nav_links_the_directory_only_when_enabled_with_buildings(): void
    {
        [, $site] = $this->makeSite();
        $this->makeBuilding();

        $this->get(route('agent-site.home', $site->slug))
            ->assertOk()
            ->assertSee(route('agent-site.condos', $site->slug));

        $site->update(['page_data' => ['_config' => ['condo_directory' => ['enabled' => false]]]]);

        $this->get(route('agent-site.home', $site->slug))
            ->assertOk()
            ->assertDontSee(route('agent-site.condos', $site->slug));
    }
}
