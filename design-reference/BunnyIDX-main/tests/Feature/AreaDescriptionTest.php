<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\User;
use App\Models\WebsiteArea;
use App\Services\Sites\AreaDescription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * AreaDescription merge-variable engine: community descriptions may contain
 * {community}, {listings_count}, {sub_area_links}, … which resolve to live
 * values + internal links at render time; empty descriptions fall back to a
 * fully written SEO template. All cases here run with mlsIntegrated=false or
 * counts already supplied, so no MLS/gateway calls are made.
 */
class AreaDescriptionTest extends TestCase
{
    use RefreshDatabase;

    private function makeArea(array $attrs = []): array
    {
        $user = User::factory()->create();
        $site = AgentWebsite::create([
            'user_id' => $user->id,
            'name' => 'Test Site',
            'slug' => 'test-site',
            'template' => 'luxury',
            'agent_name' => 'Test Agent',
            'is_published' => true,
        ]);
        $area = WebsiteArea::create(array_merge([
            'agent_website_id' => $site->id,
            'name' => 'Coral Gables',
            'slug' => 'coral-gables',
            'search_criteria' => [
                'cities' => ['Coral Gables, FL'],
                'min_price' => 500000,
                'max_price' => 2000000,
            ],
            'sub_areas' => [
                ['type' => 'neighborhood', 'label' => 'Gables Estates', 'value' => 'Gables Estates', 'slug' => 'gables-estates'],
                ['type' => 'zip', 'label' => '33134', 'value' => '33134', 'slug' => '33134'],
            ],
            'is_active' => true,
            'sort_order' => 0,
        ], $attrs));

        return [$site, $area];
    }

    public function test_merge_variables_resolve_to_live_values_and_links(): void
    {
        [$site, $area] = $this->makeArea([
            'description' => '<p>{community} has {listings_count} homes priced {price_range}. Explore {sub_area_links} or {search_link}.</p>',
        ]);

        $html = AreaDescription::communityHtml($site, $area, [], [], 147, true);

        $this->assertStringContainsString('Coral Gables has 147 homes', $html);
        $this->assertStringContainsString('priced from $500,000 to $2,000,000', $html);
        $this->assertStringContainsString(route('agent-site.areas.sub', [$site->slug, $area->slug, 'gables-estates']), $html);
        $this->assertStringContainsString('>Gables Estates</a>', $html);
        $this->assertStringContainsString('search all homes for sale in Coral Gables', $html);
        $this->assertStringNotContainsString('{', $html, 'all merge variables must be resolved');
    }

    public function test_empty_description_falls_back_to_seo_template_with_internal_links(): void
    {
        [$site, $area] = $this->makeArea(['description' => null]);

        $html = AreaDescription::communityHtml($site, $area, [], [], 42, true);

        $this->assertNotNull($html);
        $this->assertStringContainsString('Coral Gables', $html);
        $this->assertStringContainsString('42', $html); // live count woven in
        $this->assertStringContainsString('>33134</a>', $html); // sub-area internal link
        $this->assertStringContainsString(route('agent-site.properties', $site->slug), $html); // search link
        $this->assertStringNotContainsString('{', $html);
    }

    public function test_placeholder_links_resolve_to_real_urls(): void
    {
        [$site, $area] = $this->makeArea([
            'lifestyle_pages' => [['key' => 'condos']],
            'description' => '<p>Browse <a href="#page:condos">condos</a>, visit <a href="#sub:gables-estates">Gables Estates</a>, '
                .'<a href="#search">search homes</a> or <a href="#page:not-enabled">this</a>.</p>',
        ]);

        $html = AreaDescription::communityHtml($site, $area, [], [], 10, false);

        $this->assertStringContainsString('href="'.route('agent-site.areas.sub', [$site->slug, $area->slug, 'condos']).'"', $html);
        $this->assertStringContainsString('href="'.route('agent-site.areas.sub', [$site->slug, $area->slug, 'gables-estates']).'"', $html);
        $this->assertStringContainsString(route('agent-site.properties', $site->slug), $html);
        // Unknown/disabled target falls back to the community page — never a broken #href.
        $this->assertStringContainsString('href="'.route('agent-site.areas.show', [$site->slug, $area->slug]).'"', $html);
        $this->assertStringNotContainsString('href="#', $html);
    }

    public function test_community_page_renders_heading_and_sidebar_cards(): void
    {
        [$site, $area] = $this->makeArea(['description' => null]);

        $response = $this->get(route('agent-site.areas.show', [$site->slug, $area->slug]));

        $response->assertOk();
        $response->assertSee('Welcome to Coral Gables'); // default description heading
        $response->assertSee('ap-guide', false); // 70/30 split container
        $response->assertSee('Neighborhoods in Coral Gables'); // sidebar card from sub-areas
        $response->assertSee('Coral Gables Zip Codes'); // full-width chip grid under the guide
        $response->assertSee('Gables Estates');
    }

    public function test_custom_description_heading_replaces_the_default(): void
    {
        [$site, $area] = $this->makeArea([
            'description' => '<p>Plain copy.</p>',
            'description_heading' => 'Discover Coral Gables Living',
        ]);

        $response = $this->get(route('agent-site.areas.show', [$site->slug, $area->slug]));

        $response->assertOk();
        $response->assertSee('Discover Coral Gables Living');
        $response->assertDontSee('Welcome to Coral Gables');
    }

    public function test_sub_page_gets_default_copy_linking_back_to_the_guide(): void
    {
        [$site, $area] = $this->makeArea(['description' => null]);
        $sub = ['kind' => 'zip', 'key' => '33134', 'label' => '33134', 'copy' => null];

        $html = AreaDescription::subPageHtml($site, $area, $sub, [], [], 9, true);

        $this->assertStringContainsString('<strong>9</strong>', $html);
        $this->assertStringContainsString('33134', $html);
        $this->assertStringContainsString(route('agent-site.areas.show', [$site->slug, $area->slug]), $html);
        $this->assertStringNotContainsString('{', $html);
    }
}
