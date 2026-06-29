<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\User;
use App\Models\WebsiteArea;
use App\Services\Ai\WebsiteCopyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The whole neighborhood (community) flow: editor CRUD via the
 * api/website-editor JSON API (create with sub-areas + lifestyle pages,
 * update, reorder, label rename, delete, ownership gate) and the public
 * /neighborhoods pages it powers (community page, ZIP sub-page with its
 * top back-link, inactive/deleted → 404). Plus the Team manager's
 * "Write with AI" bio endpoint. No MLS connections exist in these tests,
 * so no gateway/upstream calls are made.
 */
class WebsiteAreaFlowTest extends TestCase
{
    use RefreshDatabase;

    private function makeSite(?User $user = null): array
    {
        $user ??= User::factory()->create();
        $site = AgentWebsite::create([
            'user_id' => $user->id,
            'name' => 'Flow Site',
            'slug' => 'flow-site',
            'template' => 'luxury',
            'agent_name' => 'Flow Agent',
            'is_published' => true,
        ]);

        return [$user, $site];
    }

    public function test_owner_creates_a_community_with_sub_areas_and_lifestyle_pages(): void
    {
        [$user, $site] = $this->makeSite();

        $response = $this->actingAs($user)->postJson("/api/website-editor/{$site->id}/areas", [
            'name' => 'Key Biscayne',
            'is_active' => true,
            'search_criteria' => ['cities' => ['Key Biscayne'], 'limit' => 12],
            'sub_areas' => [
                ['type' => 'zip', 'label' => '33149'],
                ['type' => 'neighborhood', 'label' => 'Ocean Club'],
                ['type' => 'neighborhood', 'label' => 'Ocean Club'], // duplicate label → deduped slug
            ],
            // 'condos' moved to the taxonomy-driven property pages — only
            // genuine lifestyle keys remain valid here.
            'lifestyle_pages' => [['key' => 'pool-homes'], ['key' => 'waterfront']],
        ]);

        $response->assertCreated()->assertJsonPath('success', true);

        $area = WebsiteArea::where('agent_website_id', $site->id)->firstOrFail();
        $this->assertSame('key-biscayne', $area->slug);
        $subs = $area->subAreaEntries();
        $this->assertSame(['33149', 'ocean-club', 'ocean-club-1'], array_column($subs, 'slug'));
        $this->assertSame('33149', $subs[0]['value'], 'value defaults to the label when blank');
    }

    public function test_non_owner_cannot_touch_another_users_areas(): void
    {
        [, $site] = $this->makeSite();
        $intruder = User::factory()->create();

        $this->actingAs($intruder)
            ->postJson("/api/website-editor/{$site->id}/areas", ['name' => 'Hack'])
            ->assertForbidden();

        $this->assertSame(0, WebsiteArea::count());
    }

    public function test_public_community_page_and_zip_sub_page_render(): void
    {
        [, $site] = $this->makeSite();
        $area = WebsiteArea::create([
            'agent_website_id' => $site->id,
            'name' => 'Key Biscayne',
            'slug' => 'key-biscayne',
            'is_active' => true,
            'sort_order' => 0,
            'search_criteria' => ['cities' => ['Key Biscayne']],
            'sub_areas' => [['type' => 'zip', 'label' => '33149', 'value' => '33149', 'slug' => '33149']],
        ]);

        $this->get(route('agent-site.areas.show', [$site->slug, $area->slug]))
            ->assertOk()
            ->assertSee('Key Biscayne')
            ->assertSee('Key Biscayne Zip Codes');

        $sub = $this->get(route('agent-site.areas.sub', [$site->slug, $area->slug, '33149']));
        // The hero breadcrumb (not the removed backlink) links back to the community.
        $sub->assertOk()->assertSee(route('agent-site.areas.show', [$site->slug, $area->slug]));

        // The back-link sits at the top of the content, before the guide copy.
        $html = $sub->getContent();
        $this->assertLessThan(
            strpos($html, 'ap-guide'),
            strpos($html, 'ap-backlink'),
            'the "All of …" back-link must render above the community guide'
        );
    }

    public function test_inactive_community_is_404_publicly(): void
    {
        [, $site] = $this->makeSite();
        $area = WebsiteArea::create([
            'agent_website_id' => $site->id,
            'name' => 'Hidden Area',
            'slug' => 'hidden-area',
            'is_active' => false,
            'sort_order' => 0,
        ]);

        $this->get(route('agent-site.areas.show', [$site->slug, $area->slug]))->assertNotFound();
    }

    public function test_owner_updates_reorders_renames_label_and_deletes(): void
    {
        [$user, $site] = $this->makeSite();
        $a = WebsiteArea::create(['agent_website_id' => $site->id, 'name' => 'A', 'slug' => 'a', 'is_active' => true, 'sort_order' => 0]);
        $b = WebsiteArea::create(['agent_website_id' => $site->id, 'name' => 'B', 'slug' => 'b', 'is_active' => true, 'sort_order' => 1]);

        // Update — sub_areas get normalized slugs on the way in.
        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/areas/{$a->id}", [
                'description_heading' => 'Living in A',
                'sub_areas' => [['type' => 'city', 'label' => 'North Beach']],
            ])
            ->assertOk()
            ->assertJsonPath('area.description_heading', 'Living in A')
            ->assertJsonPath('area.sub_areas.0.slug', 'north-beach');

        // Reorder.
        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/areas-order", ['area_ids' => [$b->id, $a->id]])
            ->assertOk();
        $this->assertSame(0, $b->fresh()->sort_order);
        $this->assertSame(1, $a->fresh()->sort_order);

        // Rename the Communities page label.
        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/areas-label", ['areas_label' => 'Neighborhoods'])
            ->assertOk();
        $this->assertSame('Neighborhoods', $site->fresh()->areas_label);

        // Delete → gone from the public site.
        $this->actingAs($user)
            ->deleteJson("/api/website-editor/{$site->id}/areas/{$a->id}")
            ->assertOk();
        $this->get(route('agent-site.areas.show', [$site->slug, 'a']))->assertNotFound();
    }

    public function test_team_bio_ai_endpoint_validates_and_returns_copy(): void
    {
        [$user, $site] = $this->makeSite();

        // Name is required.
        $this->actingAs($user)
            ->postJson("/api/website-editor/{$site->id}/ai/generate-team-bio", ['title' => 'Broker'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        // Successful generation (AI client swapped out — no real API call).
        $this->mock(WebsiteCopyService::class, function ($mock) {
            $mock->shouldReceive('generateTeamBio')
                ->once()
                ->withArgs(fn (array $ctx) => $ctx['name'] === 'Jane Doe' && $ctx['title'] === 'Buyer Specialist')
                ->andReturn(['value' => 'Jane Doe helps buyers across Miami.']);
        });

        $this->actingAs($user)
            ->postJson("/api/website-editor/{$site->id}/ai/generate-team-bio", [
                'name' => 'Jane Doe',
                'title' => 'Buyer Specialist',
            ])
            ->assertOk()
            ->assertJsonPath('value', 'Jane Doe helps buyers across Miami.');
    }

    public function test_team_bio_ai_endpoint_reports_unconfigured_ai(): void
    {
        [$user, $site] = $this->makeSite();
        config(['ai.gemini.api_key' => '']);

        $this->actingAs($user)
            ->postJson("/api/website-editor/{$site->id}/ai/generate-team-bio", ['name' => 'Jane Doe'])
            ->assertUnprocessable()
            ->assertJsonStructure(['error']);
    }
}
