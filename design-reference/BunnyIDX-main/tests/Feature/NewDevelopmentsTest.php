<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\NewDevelopment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The New Developments flow — the Condo Directory's sibling: admin-curated
 * platform catalog, per-site enable toggle via the website-editor API, and
 * the public /new-developments pages. No MLS connections exist here, so no
 * upstream calls are made.
 */
class NewDevelopmentsTest extends TestCase
{
    use RefreshDatabase;

    private function makeSite(bool $enabled = true): array
    {
        $user = User::factory()->create();
        $site = AgentWebsite::create([
            'user_id' => $user->id,
            'name' => 'Dev Site',
            'slug' => 'dev-site',
            'template' => 'luxury',
            'agent_name' => 'Dev Agent',
            'is_published' => true,
            'page_data' => $enabled ? ['_config' => ['new_developments' => ['enabled' => true]]] : [],
        ]);

        return [$user, $site];
    }

    private function makeDevelopment(array $attrs = []): NewDevelopment
    {
        return NewDevelopment::create(array_merge([
            'name' => '1212 Aventura',
            'slug' => '1212-aventura',
            'area' => 'Aventura',
            'city' => 'Aventura',
            'address' => '2890 NE 214th St, Aventura, FL',
            'description' => 'A boutique office-condo project.',
            'developer' => 'Rieber Developments',
            'status' => 'under-construction',
            'completion_year' => '2027',
            'price_label' => 'From $850K',
            'highlights' => ['Rooftop garden oasis', '14-foot floor-to-ceiling windows'],
            'is_active' => true,
            'sort_order' => 0,
        ], $attrs));
    }

    public function test_admin_can_create_update_and_delete_developments(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('admin.new-developments.store'), [
                'name' => 'Bentley Residences',
                'area' => 'Sunny Isles Beach',
                'status' => 'pre-construction',
                'highlights' => ['Car elevator to every unit'],
                'is_active' => true,
                'sort_order' => 0,
            ])
            ->assertRedirect();

        $dev = NewDevelopment::firstOrFail();
        $this->assertSame('bentley-residences', $dev->slug);
        $this->assertSame(['Car elevator to every unit'], $dev->highlights);

        $this->actingAs($admin)
            ->patch(route('admin.new-developments.update', $dev), [
                'name' => 'Bentley Residences',
                'area' => 'Sunny Isles Beach',
                'status' => 'under-construction',
                'mls_keyword' => 'BENTLEY RESIDENCES',
                'is_active' => true,
                'sort_order' => 1,
            ])
            ->assertRedirect();
        $this->assertSame('under-construction', $dev->fresh()->status);
        $this->assertSame('BENTLEY RESIDENCES', $dev->fresh()->listingKeyword());

        $this->actingAs($admin)->delete(route('admin.new-developments.destroy', $dev))->assertRedirect();
        $this->assertSame(0, NewDevelopment::count());
    }

    public function test_non_admin_cannot_reach_the_admin_catalog(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.new-developments'))->assertForbidden();
        $this->actingAs($user)
            ->post(route('admin.new-developments.store'), ['name' => 'Hack Tower', 'area' => 'X', 'status' => 'completed'])
            ->assertForbidden();
    }

    public function test_owner_toggles_new_developments_via_the_editor_api(): void
    {
        [$user, $site] = $this->makeSite(enabled: false);
        $this->makeDevelopment();

        $this->actingAs($user)
            ->getJson("/api/website-editor/{$site->id}/new-developments")
            ->assertOk()
            ->assertJsonPath('enabled', false)
            ->assertJsonPath('buildings', 1)
            ->assertJsonPath('areas', 1);

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/new-developments-config", ['enabled' => true])
            ->assertOk();

        $this->assertTrue($site->fresh()->newDevelopmentsEnabled());
    }

    public function test_public_directory_groups_projects_and_links_them(): void
    {
        [, $site] = $this->makeSite();
        $this->makeDevelopment();
        $this->makeDevelopment(['name' => 'Bentley Residences', 'slug' => 'bentley-residences', 'area' => 'Sunny Isles Beach']);

        $this->get(route('agent-site.new-developments', $site->slug))
            ->assertOk()
            ->assertSee('New Developments')
            ->assertSee('Aventura')
            ->assertSee('Sunny Isles Beach')
            ->assertSee('1212 Aventura')
            ->assertSee('From $850K')
            ->assertSee(route('agent-site.new-developments.show', [$site->slug, 'bentley-residences']));
    }

    public function test_project_page_renders_facts_and_highlights(): void
    {
        [, $site] = $this->makeSite();
        $dev = $this->makeDevelopment();

        $this->get(route('agent-site.new-developments.show', [$site->slug, $dev->slug]))
            ->assertOk()
            ->assertSee('1212 Aventura')
            ->assertSee('Under Construction')
            ->assertSee('Rieber Developments')
            ->assertSee('2027')
            ->assertSee('Rooftop garden oasis')
            // The hero crumbs link back to the directory; the old standalone
            // backlink and the contact-page CTA were replaced by the
            // Request Information modal.
            ->assertSee('Request Information')
            ->assertSee('Get VIP Price List');
    }

    public function test_pages_are_404_when_disabled_or_project_inactive(): void
    {
        [, $site] = $this->makeSite(enabled: false);
        $this->makeDevelopment();

        $this->get(route('agent-site.new-developments', $site->slug))->assertNotFound();
        $this->get(route('agent-site.new-developments.show', [$site->slug, '1212-aventura']))->assertNotFound();

        $site->update(['page_data' => ['_config' => ['new_developments' => ['enabled' => true]]]]);
        NewDevelopment::query()->update(['is_active' => false]);

        $this->get(route('agent-site.new-developments.show', [$site->slug, '1212-aventura']))->assertNotFound();
    }

    public function test_nav_links_new_developments_only_when_enabled_with_projects(): void
    {
        [, $site] = $this->makeSite();
        $this->makeDevelopment();

        $this->get(route('agent-site.home', $site->slug))
            ->assertOk()
            ->assertSee(route('agent-site.new-developments', $site->slug));

        $site->update(['page_data' => ['_config' => ['new_developments' => ['enabled' => false]]]]);

        $this->get(route('agent-site.home', $site->slug))
            ->assertOk()
            ->assertDontSee(route('agent-site.new-developments', $site->slug));
    }
}
