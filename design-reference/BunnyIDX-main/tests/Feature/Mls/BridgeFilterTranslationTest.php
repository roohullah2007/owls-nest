<?php

declare(strict_types=1);

namespace Tests\Feature\Mls;

use App\Services\Idx\BridgeApiClient;
use App\Services\Mls\Dto\MlsQuery;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Pins the OData $filter clauses generated for each MlsQuery dimension. These
 * tests do NOT call the network — Http::fake() intercepts; we assert on the
 * filter string Bridge would see.
 */
class BridgeFilterTranslationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['idx.bridge.server_token' => 'test-token']);
        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(['value' => [], '@odata.count' => 0], 200),
        ]);
    }

    private function search(array $filters): string
    {
        // Use a unique filter combination per call so cache doesn't short-circuit
        // across tests — without this, only the first test would hit the network.
        $filters['_test_nonce'] = uniqid('', true);
        app(BridgeApiClient::class)->searchListings('miamire', $filters);
        return $this->lastFilter();
    }

    private function lastFilter(): string
    {
        $captured = '';
        Http::assertSent(function ($request) use (&$captured) {
            $captured = urldecode($request->url());
            return true;
        });
        return $captured;
    }

    public function test_default_status_clause_is_active(): void
    {
        $f = $this->search([]);
        $this->assertStringContainsString("StandardStatus eq 'Active'", $f);
    }

    public function test_multi_status_emits_or_clause(): void
    {
        $f = $this->search(['statuses' => ['Active', 'Pending', 'Closed']]);

        $this->assertStringContainsString(
            "(StandardStatus eq 'Active' or StandardStatus eq 'Pending' or StandardStatus eq 'Closed')",
            $f,
        );
        $this->assertStringNotContainsString("StandardStatus eq 'Active' and", $f, 'no AND-of-different-values');
    }

    public function test_multi_agent_ids_emits_or_clause(): void
    {
        $f = $this->search(['agent_ids' => ['A1', 'A2']]);
        $this->assertStringContainsString(
            "(ListAgentMlsId eq 'A1' or ListAgentMlsId eq 'A2')",
            $f,
        );
    }

    public function test_multi_office_ids_emits_or_clause(): void
    {
        $f = $this->search(['office_ids' => ['O1', 'O2']]);
        $this->assertStringContainsString(
            "(ListOfficeMlsId eq 'O1' or ListOfficeMlsId eq 'O2')",
            $f,
        );
    }

    public function test_multi_cities_zips_counties_emit_or_clauses(): void
    {
        $f = $this->search([
            'cities' => ['Miami', 'Coral Gables'],
            'zips' => ['33139', '33134'],
            'counties' => ['Miami-Dade'],
        ]);

        $this->assertStringContainsString("(City eq 'Miami' or City eq 'Coral Gables')", $f);
        $this->assertStringContainsString("(PostalCode eq '33139' or PostalCode eq '33134')", $f);
        $this->assertStringContainsString("(CountyOrParish eq 'Miami-Dade')", $f);
    }

    public function test_structure_ranges_emit_ge_le_clauses(): void
    {
        $f = $this->search([
            'min_beds' => 3, 'max_beds' => 5,
            'min_baths' => 2.5, 'max_baths' => 4,
            'min_sqft' => 1500, 'max_sqft' => 4000,
            'min_year_built' => 2010,
        ]);

        $this->assertStringContainsString('BedroomsTotal ge 3', $f);
        $this->assertStringContainsString('BedroomsTotal le 5', $f);
        $this->assertStringContainsString('BathroomsTotalDecimal ge 2.5', $f);
        $this->assertStringContainsString('BathroomsTotalDecimal le 4', $f);
        $this->assertStringContainsString('LivingArea ge 1500', $f);
        $this->assertStringContainsString('LivingArea le 4000', $f);
        $this->assertStringContainsString('YearBuilt ge 2010', $f);
    }

    public function test_lot_acres_converts_to_sqft_for_filter(): void
    {
        $f = $this->search(['min_lot_acres' => 1.0, 'max_lot_acres' => 2.0]);
        // 1 acre = 43560 sqft.
        $this->assertStringContainsString('LotSizeSquareFeet ge 43560', $f);
        $this->assertStringContainsString('LotSizeSquareFeet le 87120', $f);
    }

    public function test_boolean_filters_honour_false(): void
    {
        $fTrue = $this->search(['has_pool' => true]);
        $fFalse = $this->search(['has_pool' => false]);

        $this->assertStringContainsString('PoolPrivateYN eq true', $fTrue);
        $this->assertStringContainsString('PoolPrivateYN eq false', $fFalse);
    }

    public function test_recently_reduced_emits_dual_clause(): void
    {
        $f = $this->search(['recently_reduced' => ['within_days' => 14]]);
        $this->assertStringContainsString('PriceChangeTimestamp ge ', $f);
        $this->assertStringContainsString('ListPrice lt OriginalListPrice', $f);
    }

    public function test_geo_polygon_emits_intersects_with_srid(): void
    {
        $f = $this->search([
            'geo' => ['polygon' => [[-80.20, 25.75], [-80.10, 25.75], [-80.10, 25.85]]],
        ]);
        $this->assertStringContainsString("geo.intersects(Coordinates, geography'SRID=4326;POLYGON((", $f);
    }

    public function test_geo_bounds_emits_intersects_polygon(): void
    {
        $f = $this->search([
            'geo' => ['bounds' => ['ne_lat' => 25.85, 'ne_lng' => -80.10, 'sw_lat' => 25.75, 'sw_lng' => -80.15]],
        ]);
        $this->assertStringContainsString("geo.intersects(Coordinates, geography'SRID=4326;POLYGON((", $f);
        // SW corner appears as starting/closing vertex.
        $this->assertStringContainsString('-80.15 25.75', $f);
    }

    public function test_geo_near_converts_to_bounding_box(): void
    {
        $f = $this->search([
            'geo' => ['near' => ['lat' => 25.79, 'lng' => -80.13, 'radius_miles' => 1]],
        ]);
        // Bridge silently no-ops geo.distance on some datasets; we always
        // emit a bounding-box geo.intersects instead.
        $this->assertStringContainsString('geo.intersects', $f);
        $this->assertStringNotContainsString('geo.distance', $f);
    }

    public function test_raw_filter_pass_through_for_lifestyle_translations(): void
    {
        $f = $this->search(['raw_filter' => ["WaterfrontYN eq true", "contains(View, 'Ocean')"]]);
        $this->assertStringContainsString('WaterfrontYN eq true', $f);
        $this->assertStringContainsString("contains(View, 'Ocean')", $f);
    }

    public function test_odata_single_quote_escaping(): void
    {
        $f = $this->search(['cities' => ["O'Brien"]]);
        // OData single-quote escape is doubling the quote.
        $this->assertStringContainsString("City eq 'O''Brien'", $f);
    }

    public function test_sort_maps_to_orderby(): void
    {
        $this->search(['sort' => MlsQuery::SORT_PRICE_DESC]);
        $url = $this->lastFilter();
        $this->assertStringContainsString('orderby=ListPrice desc', $url);
    }

    public function test_projection_lite_uses_lean_select(): void
    {
        $this->search(['projection' => 'lite']);
        $url = $this->lastFilter();
        // Lite SELECT excludes description, agent details, features.
        $this->assertStringContainsString('ListPrice', $url);
        $this->assertStringNotContainsString('PublicRemarks', $url);
        $this->assertStringNotContainsString('InteriorFeatures', $url);
    }

    public function test_select_extras_merges_into_default_select(): void
    {
        $this->search(['select_extras' => ['SchoolDistrict', 'AssociationName']]);
        $url = $this->lastFilter();
        $this->assertStringContainsString('SchoolDistrict', $url);
        $this->assertStringContainsString('AssociationName', $url);
        // Plus DEFAULT_SELECT must still be there.
        $this->assertStringContainsString('ListPrice', $url);
    }
}
