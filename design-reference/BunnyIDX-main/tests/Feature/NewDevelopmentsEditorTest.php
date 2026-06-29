<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\Developer;
use App\Models\NewDevelopment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * New Developments: owner-managed projects (editor CRUD), per-site curation of
 * the platform catalog (source platform/own/both + hidden ids) and the public
 * /new-developments surfaces that respect that config.
 */
class NewDevelopmentsEditorTest extends TestCase
{
    use RefreshDatabase;

    private function makeSite(array $config = []): array
    {
        $user = User::factory()->create();
        $site = AgentWebsite::create([
            'user_id' => $user->id,
            'name' => 'Dev Site',
            'slug' => 'dev-site',
            'template' => 'luxury',
            'agent_name' => 'Dev Agent',
            'is_published' => true,
            'page_data' => ['_config' => ['new_developments' => array_merge(['enabled' => true], $config)]],
        ]);

        return [$user, $site];
    }

    private function makePlatformDev(string $name = 'Platform Tower'): NewDevelopment
    {
        return NewDevelopment::create([
            'name' => $name,
            'slug' => NewDevelopment::generateSlug($name),
            'area' => 'Brickell',
            'status' => 'pre-construction',
        ]);
    }

    public function test_owner_creates_own_development_with_media_fields(): void
    {
        [$user, $site] = $this->makeSite();

        $this->actingAs($user)
            ->postJson("/api/website-editor/{$site->id}/new-developments", [
                'name' => 'My Marina Tower',
                'area' => 'Aventura',
                'address' => '100 Marina Way, Aventura, FL',
                'status' => 'under-construction',
                'developer' => 'Me Development',
                'architect' => 'Arch Studio',
                'interior_design' => 'Design House',
                'key_details' => [['label' => 'Stories', 'value' => '40']],
                'gallery' => ['https://example.com/a.jpg'],
                'floor_plans' => [['label' => 'Residence A', 'image' => 'https://example.com/fp.png']],
                'highlights' => ['Private elevator'],
            ])
            ->assertCreated()
            ->assertJsonPath('development.slug', 'my-marina-tower');

        $dev = NewDevelopment::where('slug', 'my-marina-tower')->firstOrFail();
        $this->assertSame($site->id, $dev->agent_website_id);
        $this->assertSame('Arch Studio', $dev->architect);
        $this->assertSame([['label' => 'Stories', 'value' => '40']], $dev->key_details);
        $this->assertSame('100 Marina Way', $dev->streetAddress());
    }

    public function test_owner_cannot_edit_platform_or_other_sites_projects(): void
    {
        [$user, $site] = $this->makeSite();
        $platform = $this->makePlatformDev();

        $other = AgentWebsite::create([
            'user_id' => User::factory()->create()->id,
            'name' => 'Other', 'slug' => 'other-site', 'template' => 'luxury', 'agent_name' => 'Other Agent',
        ]);
        $foreign = NewDevelopment::create([
            'agent_website_id' => $other->id,
            'name' => 'Foreign Tower', 'slug' => 'foreign-tower', 'area' => 'Doral',
        ]);

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/new-developments/{$platform->id}", ['name' => 'Hack', 'area' => 'X', 'status' => 'completed'])
            ->assertNotFound();

        $this->actingAs($user)
            ->deleteJson("/api/website-editor/{$site->id}/new-developments/{$foreign->id}")
            ->assertNotFound();
    }

    public function test_source_and_hidden_control_the_public_directory(): void
    {
        [$user, $site] = $this->makeSite();
        $shown = $this->makePlatformDev('Shown Tower');
        $hidden = $this->makePlatformDev('Hidden Tower');
        $own = NewDevelopment::create([
            'agent_website_id' => $site->id,
            'name' => 'Own Tower', 'slug' => 'own-tower', 'area' => 'Aventura',
        ]);

        // Save config: both sources, one platform project hidden.
        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/new-developments-config", [
                'enabled' => true,
                'source' => 'both',
                'hidden' => [$hidden->id, $own->id], // own id must be dropped (not a platform row)
            ])
            ->assertOk();

        $config = (array) data_get($site->fresh()->page_data, '_config.new_developments');
        $this->assertSame('both', $config['source']);
        $this->assertSame([$hidden->id], $config['hidden']);

        $visible = NewDevelopment::query()->active()->visibleToSite($site->fresh())->pluck('name');
        $this->assertEqualsCanonicalizing(['Shown Tower', 'Own Tower'], $visible->all());

        // Public page: shown + own render, hidden doesn't; the site-owned
        // project never leaks onto other sites.
        $this->get('/site/dev-site/new-developments')
            ->assertOk()
            ->assertSee('Shown Tower')
            ->assertSee('Own Tower')
            ->assertDontSee('Hidden Tower');

        $this->get('/site/dev-site/new-developments/own-tower')->assertOk();
    }

    public function test_own_projects_invisible_on_other_sites_and_under_platform_source(): void
    {
        [$user, $site] = $this->makeSite(['source' => 'platform']);
        $this->makePlatformDev();
        NewDevelopment::create([
            'agent_website_id' => $site->id,
            'name' => 'Own Tower', 'slug' => 'own-tower', 'area' => 'Aventura',
        ]);

        // Source 'platform' → the own project stays off the page and its URL 404s.
        $this->get('/site/dev-site/new-developments')->assertOk()->assertDontSee('Own Tower');
        $this->get('/site/dev-site/new-developments/own-tower')->assertNotFound();

        // Another published site never shows it either.
        AgentWebsite::create([
            'user_id' => User::factory()->create()->id,
            'name' => 'Second', 'slug' => 'second-site', 'template' => 'luxury',
            'agent_name' => 'Second Agent', 'is_published' => true,
            'page_data' => ['_config' => ['new_developments' => ['enabled' => true, 'source' => 'both']]],
        ]);
        $this->get('/site/second-site/new-developments')->assertOk()->assertDontSee('Own Tower');
    }

    public function test_developer_taxonomy_select_or_create(): void
    {
        [$user, $site] = $this->makeSite();
        $platformDev = Developer::create([
            'name' => 'Platform Dev Co', 'slug' => 'platform-dev-co', 'info' => 'Known platform developer.',
        ]);

        // A typed developer name creates a site-owned Developer with logo/about.
        $this->actingAs($user)
            ->postJson("/api/website-editor/{$site->id}/new-developments", [
                'name' => 'Tower One', 'area' => 'Brickell', 'status' => 'pre-construction',
                'developer' => 'My Dev LLC', 'developer_info' => 'Local developer.',
                'developer_logo' => 'agent-websites/library/1/my-dev.png',
                'zip' => '33131',
            ])
            ->assertCreated();

        $created = Developer::where('name', 'My Dev LLC')->firstOrFail();
        $this->assertSame($site->id, $created->agent_website_id);
        $this->assertSame('agent-websites/library/1/my-dev.png', $created->logo);

        $towerOne = NewDevelopment::where('name', 'Tower One')->firstOrFail();
        $this->assertSame($created->id, $towerOne->developer_id);
        $this->assertSame('33131', $towerOne->zip);

        // Selecting an existing platform developer links it and syncs the name.
        $this->actingAs($user)
            ->postJson("/api/website-editor/{$site->id}/new-developments", [
                'name' => 'Tower Two', 'area' => 'Brickell', 'status' => 'pre-construction',
                'developer_id' => $platformDev->id,
            ])
            ->assertCreated();

        $towerTwo = NewDevelopment::where('name', 'Tower Two')->firstOrFail();
        $this->assertSame($platformDev->id, $towerTwo->developer_id);
        $this->assertSame('Platform Dev Co', $towerTwo->developer);

        // The manage endpoint exposes the visible taxonomy (platform + own).
        $this->actingAs($user)
            ->getJson("/api/website-editor/{$site->id}/new-developments/manage")
            ->assertOk()
            ->assertJsonCount(2, 'developers');
    }

    public function test_manage_endpoint_lists_platform_and_own(): void
    {
        [$user, $site] = $this->makeSite(['source' => 'both', 'hidden' => []]);
        $this->makePlatformDev();
        NewDevelopment::create([
            'agent_website_id' => $site->id,
            'name' => 'Own Tower', 'slug' => 'own-tower', 'area' => 'Aventura',
        ]);

        $this->actingAs($user)
            ->getJson("/api/website-editor/{$site->id}/new-developments/manage")
            ->assertOk()
            ->assertJsonPath('enabled', true)
            ->assertJsonPath('source', 'both')
            ->assertJsonCount(1, 'platform')
            ->assertJsonCount(1, 'own')
            ->assertJsonPath('own.0.name', 'Own Tower');
    }
}
