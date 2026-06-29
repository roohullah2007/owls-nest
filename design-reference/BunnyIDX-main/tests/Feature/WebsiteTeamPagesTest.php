<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\AgentWebsiteTeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Public team pages: the block-based /team index (built-in Page Header hero +
 * Team block grid default composition, saved blocks, owner empty state,
 * visitor 404 without members) and the light team-member page (profile,
 * contact, breadcrumbs, CTA). No MLS connections exist here, so member
 * listings sections simply don't render.
 */
class WebsiteTeamPagesTest extends TestCase
{
    use RefreshDatabase;

    private function makeSite(array $attrs = []): array
    {
        $user = User::factory()->create();
        $site = AgentWebsite::create(array_merge([
            'user_id' => $user->id,
            'name' => 'Team Site',
            'slug' => 'team-site',
            'template' => 'luxury',
            'agent_name' => 'Team Agent',
            'is_published' => true,
        ], $attrs));

        return [$user, $site];
    }

    private function addMember(AgentWebsite $site, array $attrs = []): AgentWebsiteTeamMember
    {
        return AgentWebsiteTeamMember::create(array_merge([
            'agent_website_id' => $site->id,
            'name' => 'Elena Petrova',
            'slug' => 'elena-petrova',
            'title' => 'Buyer Specialist',
            'phone' => '305-555-0100',
            'email' => 'elena@example.com',
            'bio' => "Elena helps buyers across Miami.\n\nFluent in three languages.",
            'socials' => ['instagram' => 'https://instagram.com/elena'],
            'sort_order' => 0,
            'is_active' => true,
        ], $attrs));
    }

    public function test_team_index_renders_default_block_composition(): void
    {
        [, $site] = $this->makeSite();
        $this->addMember($site);

        $this->get(route('agent-site.team', $site->slug))
            ->assertOk()
            // Built-in hero renders through the Page Header block partial.
            ->assertSee('pgh-style-boxed')
            ->assertSee('Meet the Team')
            // Members grid is the Team block in grid layout, linking to the member page.
            ->assertSee('team-block-grid-cards')
            ->assertSee(route('agent-site.team.member', [$site->slug, 'elena-petrova']))
            // Default composition closes with the CTA block.
            ->assertSee('cta-block');
    }

    public function test_team_index_renders_saved_blocks_and_owner_page_header_block_replaces_hero(): void
    {
        [, $site] = $this->makeSite();
        $this->addMember($site);

        $site->update(['page_data' => [
            'team' => [
                'blocks' => [
                    ['id' => 'b_hero', 'type' => 'page-header', 'slot' => 'default', 'data' => ['style' => 'plain', 'heading' => 'Our People']],
                    ['id' => 'b_team', 'type' => 'team', 'slot' => 'default', 'data' => ['title' => '', 'source' => 'team', 'layout' => 'grid']],
                ],
            ],
        ]]);

        $response = $this->get(route('agent-site.team', $site->slug))
            ->assertOk()
            ->assertSee('Our People')
            ->assertSee('team-block-grid-cards');

        // The owner's Page Header block replaces the built-in boxed hero.
        $this->assertStringNotContainsString('team-index-hero', $response->getContent());
    }

    public function test_team_index_is_404_for_visitors_without_members_but_owner_sees_setup_note(): void
    {
        [$user, $site] = $this->makeSite();

        $this->get(route('agent-site.team', $site->slug))->assertNotFound();

        $this->actingAs($user)
            ->get(route('agent-site.team', $site->slug))
            ->assertOk()
            ->assertSee('No team members yet');
    }

    public function test_team_member_page_renders_light_profile_with_contact_and_breadcrumbs(): void
    {
        [, $site] = $this->makeSite();
        $member = $this->addMember($site);

        $this->get(route('agent-site.team.member', [$site->slug, $member->slug]))
            ->assertOk()
            // Hero is the shared Page Header block: name + role + crumbs.
            ->assertSee('team-member-hero')
            ->assertSee('Elena Petrova')
            ->assertSee('Buyer Specialist')
            // Light profile composed from the shared content-block styles.
            ->assertSee('tm-profile')
            ->assertSee('About Elena')
            ->assertSee('tel:305-555-0100')
            ->assertSee('mailto:elena@example.com')
            ->assertSee('https://instagram.com/elena')
            // Breadcrumb back to the team index + closing CTA block.
            ->assertSee(route('agent-site.team', $site->slug))
            ->assertSee('Work With Elena')
            ->assertSee('cta-block')
            ->assertSee('RealEstateAgent');
    }

    public function test_owner_saves_member_with_media_library_photo_socials_and_html_bio(): void
    {
        [$user, $site] = $this->makeSite();
        Storage::fake('public');
        Storage::disk('public')->put("agent-websites/library/{$site->id}/portrait.jpg", 'img');

        $this->actingAs($user)->postJson("/api/website-editor/{$site->id}/team", [
            'name' => 'Marcus Rivera',
            'title' => 'Listing Specialist',
            'bio' => '<p>Marcus leads our <strong>waterfront</strong> listings.</p><p>Reach out anytime.</p>',
            'photo' => "agent-websites/library/{$site->id}/portrait.jpg",
            'socials' => [
                'youtube' => 'https://youtube.com/@marcus',
                'tiktok' => 'https://tiktok.com/@marcus',
                'x' => 'https://x.com/marcus',
            ],
            'is_active' => true,
        ])->assertCreated()->assertJsonPath('member.socials.x', 'https://x.com/marcus');

        $member = AgentWebsiteTeamMember::where('slug', 'marcus-rivera')->firstOrFail();
        $this->assertSame("agent-websites/library/{$site->id}/portrait.jpg", $member->photo, 'media library path stored as-is');

        // Rich-text bio renders as HTML on the public page; all socials render
        // through the shared brand-icon partial.
        $html = $this->get(route('agent-site.team.member', [$site->slug, 'marcus-rivera']))->assertOk()->getContent();
        $this->assertStringContainsString('<strong>waterfront</strong>', $html);
        $this->assertStringContainsString('https://youtube.com/@marcus', $html);
        $this->assertStringContainsString('https://tiktok.com/@marcus', $html);
        $this->assertStringContainsString('https://x.com/marcus', $html);

        // A bogus photo path is ignored rather than stored.
        $this->actingAs($user)->postJson("/api/website-editor/{$site->id}/team/{$member->id}", [
            'name' => 'Marcus Rivera',
            'photo' => 'agent-websites/library/999/missing.jpg',
        ])->assertOk();
        $this->assertSame("agent-websites/library/{$site->id}/portrait.jpg", $member->fresh()->photo);
    }

    public function test_inactive_member_is_404(): void
    {
        [, $site] = $this->makeSite();
        $this->addMember($site); // keeps /team alive
        $this->addMember($site, ['name' => 'Hidden Agent', 'slug' => 'hidden-agent', 'is_active' => false]);

        $this->get(route('agent-site.team.member', [$site->slug, 'hidden-agent']))->assertNotFound();
    }
}
