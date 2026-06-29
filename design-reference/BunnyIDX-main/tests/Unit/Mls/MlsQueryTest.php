<?php

declare(strict_types=1);

namespace Tests\Unit\Mls;

use App\Services\Mls\Dto\MlsFeed;
use App\Services\Mls\Dto\MlsGeoQuery;
use App\Services\Mls\Dto\MlsQuery;
use PHPUnit\Framework\TestCase;

/**
 * MlsQuery is the foundation of every search — round-trip integrity is what
 * makes saved searches replayable, and the singular→plural merge is the
 * fix for the AND-of-different-values foot-gun. These tests pin both.
 */
class MlsQueryTest extends TestCase
{
    public function test_defaults_are_sane(): void
    {
        $q = new MlsQuery();

        $this->assertSame(MlsQuery::SORT_MODIFIED_DESC, $q->sort);
        $this->assertSame(MlsQuery::PROJECTION_DETAIL, $q->projection);
        $this->assertSame(1, $q->page);
        $this->assertSame(20, $q->perPage);
        $this->assertSame(MlsFeed::IDX, $q->feed);
        $this->assertSame([], $q->cities);
        $this->assertSame([], $q->statuses);
        $this->assertSame([], $q->agentIds);
    }

    public function test_singular_input_merges_into_plural_for_every_dimension(): void
    {
        $q = MlsQuery::fromArray([
            'city' => 'Miami',
            'cities' => ['Coral Gables'],
            'zip' => '33139',
            'zips' => ['33134'],
            'county' => 'Miami-Dade',
            'counties' => ['Broward'],
            'subdivision' => 'Brickell',
            'subdivisions' => ['Coconut Grove'],
            'agent_id' => 'A1',
            'agent_ids' => ['A2'],
            'office_id' => 'O1',
            'office_ids' => ['O2'],
            'status' => 'Active',
            'statuses' => ['Pending'],
            'property_type' => 'Residential',
            'property_types' => ['Commercial Sale'],
            'property_subtype' => 'Condominium',
            'property_subtypes' => ['Townhouse'],
            'lifestyle' => 'beachfront',
            'lifestyles' => ['luxury'],
        ]);

        // Each pair should land in the plural form with both values.
        $this->assertEqualsCanonicalizing(['Miami', 'Coral Gables'], $q->cities);
        $this->assertEqualsCanonicalizing(['33139', '33134'], $q->zips);
        $this->assertEqualsCanonicalizing(['Miami-Dade', 'Broward'], $q->counties);
        $this->assertEqualsCanonicalizing(['Brickell', 'Coconut Grove'], $q->subdivisions);
        $this->assertEqualsCanonicalizing(['A1', 'A2'], $q->agentIds);
        $this->assertEqualsCanonicalizing(['O1', 'O2'], $q->officeIds);
        $this->assertEqualsCanonicalizing(['Active', 'Pending'], $q->statuses);
        $this->assertEqualsCanonicalizing(['Residential', 'Commercial Sale'], $q->propertyTypes);
        $this->assertEqualsCanonicalizing(['Condominium', 'Townhouse'], $q->propertySubtypes);
        $this->assertEqualsCanonicalizing(['beachfront', 'luxury'], $q->lifestyles);
    }

    public function test_round_trip_to_array_from_array_preserves_every_field(): void
    {
        $original = MlsQuery::fromArray([
            'query' => '123 Main St',
            'cities' => ['Miami Beach', 'Coral Gables'],
            'zips' => ['33139', '33134'],
            'zip_prefix' => '331',
            'counties' => ['Miami-Dade'],
            'neighborhoods' => ['Brickell'],
            'subdivisions' => ['South Beach'],
            'mls_areas' => ['41'],
            'states' => ['FL'],
            'lifestyles' => ['beachfront', 'luxury'],
            'property_types' => ['Residential'],
            'property_subtypes' => ['Condominium', 'Single Family Residence'],
            'architectural_styles' => ['Contemporary', 'Mediterranean'],
            'min_beds' => 2, 'max_beds' => 5,
            'min_baths' => 1.5, 'max_baths' => 4.0,
            'min_sqft' => 1000, 'max_sqft' => 5000,
            'min_lot_acres' => 0.1, 'max_lot_acres' => 1.0,
            'min_year_built' => 1990, 'max_year_built' => 2024,
            'has_pool' => true, 'has_waterfront' => true, 'new_construction' => false,
            'min_price' => 500000, 'max_price' => 2000000,
            'min_price_per_sqft' => 200, 'max_price_per_sqft' => 800,
            'recently_reduced' => ['within_days' => 14, 'min_reduction_pct' => 5],
            'max_hoa_fee' => 1000, 'max_tax_annual' => 20000,
            'new_within_days' => 7, 'modified_within_days' => 1,
            'dom_min' => 0, 'dom_max' => 90,
            'listed_after' => '2024-01-01', 'listed_before' => '2024-12-31',
            'sold_within_days' => 30,
            'statuses' => ['Active', 'Pending'],
            'special_conditions' => ['Standard'],
            'agent_ids' => ['A1', 'A2'],
            'office_ids' => ['O1'],
            'brokerage_name' => 'Coldwell',
            'sort' => MlsQuery::SORT_PRICE_DESC,
            'projection' => MlsQuery::PROJECTION_LITE,
            'page' => 3, 'per_page' => 50,
            'feed' => 'idx',
        ]);

        $replayed = MlsQuery::fromArray($original->toArray());

        // Field-by-field equivalence — saved-search replay must produce an
        // identical query object.
        foreach (get_object_vars($original) as $prop => $value) {
            $this->assertEquals($value, $replayed->$prop, "Round-trip failed for {$prop}");
        }
    }

    public function test_feed_defaults_to_idx_and_accepts_vow(): void
    {
        $this->assertSame(MlsFeed::IDX, MlsQuery::fromArray([])->feed);
        $this->assertSame(MlsFeed::IDX, MlsQuery::fromArray(['feed' => 'idx'])->feed);
        $this->assertSame(MlsFeed::VOW, MlsQuery::fromArray(['feed' => 'vow'])->feed);
        // Unknown feed falls back to IDX rather than throwing.
        $this->assertSame(MlsFeed::IDX, MlsQuery::fromArray(['feed' => 'nonsense'])->feed);
    }

    public function test_unknown_filter_keys_land_in_extras(): void
    {
        $q = MlsQuery::fromArray([
            'min_price' => 500000,
            'WaterfrontDirection' => 'North',     // Miami custom field
            'MIAMIRE_PoolDimensions' => '20x40',  // truly per-MLS
        ]);

        $this->assertSame(500000, $q->minPrice);
        $this->assertSame('North', $q->extras['WaterfrontDirection']);
        $this->assertSame('20x40', $q->extras['MIAMIRE_PoolDimensions']);
    }

    public function test_to_array_drops_empty_dimensions(): void
    {
        $arr = (new MlsQuery(minPrice: 500000))->toArray();

        $this->assertSame(500000, $arr['min_price']);
        $this->assertArrayNotHasKey('cities', $arr, 'empty arrays dropped');
        $this->assertArrayNotHasKey('query', $arr, 'null fields dropped');
        $this->assertSame('idx', $arr['feed'], 'enum still emitted');
    }

    public function test_lifestyle_translation_merges_overlay_and_clears_lifestyle(): void
    {
        $q = MlsQuery::fromArray(['lifestyles' => ['beachfront']]);
        $translated = $q->withLifestyleTranslation([
            'has_waterfront' => true,
            'raw_filter' => "contains(View, 'Ocean')",
        ]);

        $this->assertTrue($translated->hasWaterfront);
        $this->assertSame("contains(View, 'Ocean')", $translated->extras['raw_filter']);
        $this->assertSame([], $translated->lifestyles, 'lifestyle marker cleared so it doesn\'t re-apply');
    }

    public function test_csv_string_accepted_for_multi_value_inputs(): void
    {
        // Convenience — query strings like ?statuses=Active,Pending should work.
        $q = MlsQuery::fromArray(['statuses' => 'Active,Pending,Closed']);

        $this->assertEqualsCanonicalizing(['Active', 'Pending', 'Closed'], $q->statuses);
    }
}
