<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\CondoBuilding;
use App\Models\Developer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Condo Directory owner-management — the deliberate duplicate of the New
 * Developments architecture: own-building CRUD, per-site curation of the
 * platform catalog (source + hidden) and the shared developer taxonomy.
 */
class CondoDirectoryEditorTest extends TestCase
{
    use RefreshDatabase;

    private function makeSite(array $config = []): array
    {
        $user = User::factory()->create();
        $site = AgentWebsite::create([
            'user_id' => $user->id,
            'name' => 'Condo Site',
            'slug' => 'condo-site',
            'template' => 'luxury',
            'agent_name' => 'Condo Agent',
            'is_published' => true,
            'page_data' => ['_config' => ['condo_directory' => array_merge(['enabled' => true], $config)]],
        ]);

        return [$user, $site];
    }

    public function test_owner_creates_building_with_developer_taxonomy(): void
    {
        [$user, $site] = $this->makeSite();

        $this->actingAs($user)
            ->postJson("/api/website-editor/{$site->id}/condo-buildings", [
                'name' => 'My Bay Tower',
                'area' => 'Edgewater',
                'address' => '600 Bay Drive, Miami, FL',
                'status' => 'completed',
                'developer' => 'Bay Dev LLC',
                'developer_info' => 'Boutique builder.',
                'zip' => '33137',
                'key_details' => [['label' => 'Units', 'value' => '120']],
            ])
            ->assertCreated()
            ->assertJsonPath('building.slug', 'my-bay-tower');

        $building = CondoBuilding::where('slug', 'my-bay-tower')->firstOrFail();
        $this->assertSame($site->id, $building->agent_website_id);
        $this->assertSame('600 Bay Drive', $building->streetAddress());
        $this->assertNotNull($building->developer_id);
        $this->assertSame($site->id, Developer::find($building->developer_id)->agent_website_id);
    }

    public function test_source_and_hidden_control_the_public_directory(): void
    {
        [$user, $site] = $this->makeSite();
        $shown = CondoBuilding::create(['name' => 'Shown Tower', 'slug' => 'shown-tower', 'area' => 'Brickell']);
        $hidden = CondoBuilding::create(['name' => 'Hidden Tower', 'slug' => 'hidden-tower', 'area' => 'Brickell']);
        CondoBuilding::create(['agent_website_id' => $site->id, 'name' => 'Own Tower', 'slug' => 'own-tower', 'area' => 'Edgewater']);

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/condo-directory-config", [
                'enabled' => true,
                'source' => 'both',
                'hidden' => [$hidden->id],
            ])
            ->assertOk();

        $this->get('/site/condo-site/condos')
            ->assertOk()
            ->assertSee('Shown Tower')
            ->assertSee('Own Tower')
            ->assertDontSee('Hidden Tower');

        // Own buildings stay invisible under platform-only source + on other sites.
        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/condo-directory-config", ['source' => 'platform'])
            ->assertOk();
        $this->get('/site/condo-site/condos')->assertOk()->assertDontSee('Own Tower');
        $this->get('/site/condo-site/condos/own-tower')->assertNotFound();
    }

    public function test_owner_cannot_touch_platform_or_foreign_buildings(): void
    {
        [$user, $site] = $this->makeSite();
        $platform = CondoBuilding::create(['name' => 'Platform Tower', 'slug' => 'platform-tower', 'area' => 'Brickell']);

        $this->actingAs($user)
            ->deleteJson("/api/website-editor/{$site->id}/condo-buildings/{$platform->id}")
            ->assertNotFound();

        $this->actingAs($user)
            ->getJson("/api/website-editor/{$site->id}/condo-buildings/manage")
            ->assertOk()
            ->assertJsonCount(1, 'platform')
            ->assertJsonCount(0, 'own');
    }
}
