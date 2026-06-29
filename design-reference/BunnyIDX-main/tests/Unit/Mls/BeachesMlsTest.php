<?php

declare(strict_types=1);

namespace Tests\Unit\Mls;

use App\Models\MlsProvider;
use App\Services\Mls\Datasets\Realtyna\BeachesMls;
use App\Services\Mls\Dto\MlsFeed;
use App\Services\Mls\Dto\MlsListing;
use PHPUnit\Framework\TestCase;

/**
 * BeachesMls is the first concrete Realtyna dataset — the reference for every
 * future RealtyFeed-proxied MLS. Pin its declared vocabulary + translations.
 */
class BeachesMlsTest extends TestCase
{
    private BeachesMls $beaches;

    protected function setUp(): void
    {
        parent::setUp();
        $this->beaches = new BeachesMls;
    }

    public function test_routes_through_the_realtyna_driver(): void
    {
        $this->assertSame(MlsProvider::SOURCE_REALTYNA, $this->beaches->getDriver());
    }

    public function test_dataset_path_is_the_originating_system_name(): void
    {
        // RealtyFeed partitions MLSes by OriginatingSystemName — 'Beaches' is
        // the live feed's exact value; every OData $filter scopes to it.
        $this->assertSame('Beaches', $this->beaches->getDatasetPath());
        $this->assertSame('Beaches', $this->beaches->getDatasetPath(MlsFeed::IDX));
        $this->assertSame('Beaches', $this->beaches->getDatasetPath(MlsFeed::VOW));
    }

    public function test_advertises_idx_only_until_vow_is_provisioned(): void
    {
        $this->assertSame([MlsFeed::IDX], $this->beaches->supportedFeeds());
        $this->assertTrue($this->beaches->supportsFeed(MlsFeed::IDX));
        $this->assertFalse($this->beaches->supportsFeed(MlsFeed::VOW));
    }

    public function test_slug_matches_catalog_key(): void
    {
        $this->assertSame('beachesmls', $this->beaches->getSlug());
    }

    public function test_property_subtypes_are_scoped_by_parent_type(): void
    {
        $residential = $this->beaches->getPropertySubtypes('Residential');
        $values = array_map(fn ($t) => $t->value, $residential);

        $this->assertContains('Single Family Residence', $values);
        $this->assertContains('Townhouse', $values);
        $this->assertContains('Condominium', $values);
        $this->assertNotContains('Office', $values);  // commercial subtype

        foreach ($residential as $term) {
            $this->assertSame('Residential', $term->parentValue);
        }
    }

    public function test_supports_lifestyles_match_translation_keys(): void
    {
        // Every advertised lifestyle must translate — drift would silently
        // return 0 results with a misleading "supported" claim.
        foreach ($this->beaches->getSupportedLifestyles() as $lifestyle) {
            $this->assertNotNull(
                $this->beaches->translateLifestyle($lifestyle),
                "Lifestyle [{$lifestyle}] is advertised but translateLifestyle() returns null",
            );
        }
    }

    public function test_unsupported_lifestyle_returns_null(): void
    {
        $this->assertNull($this->beaches->translateLifestyle('penthouse')); // not filterable on this feed
        $this->assertNull($this->beaches->translateLifestyle('scuba-friendly'));
        $this->assertNull($this->beaches->translateLifestyle(''));
    }

    public function test_beachfront_translation_includes_waterfront_and_ocean(): void
    {
        $t = $this->beaches->translateLifestyle('beachfront');

        $this->assertNotNull($t);
        $this->assertArrayHasKey('raw_filter', $t);
        $clauses = is_array($t['raw_filter']) ? $t['raw_filter'] : [$t['raw_filter']];
        $combined = implode(' ', $clauses);
        $this->assertStringContainsString('WaterfrontYN', $combined);
        $this->assertStringContainsString('Ocean', $combined);
    }

    public function test_county_values_match_feed_spelling(): void
    {
        // The live feed stores "St Lucie" WITHOUT a period (unlike Bridge/Miami's
        // "St. Lucie") — a mismatch makes the county filter return zero rows.
        $this->assertContains('St Lucie', $this->beaches->getCounties());
        $this->assertNotContains('St. Lucie', $this->beaches->getCounties());
    }

    public function test_covers_all_nine_verified_counties(): void
    {
        $counties = $this->beaches->getCounties();
        foreach (['Palm Beach', 'Broward', 'St Lucie', 'Miami-Dade', 'Martin', 'Indian River', 'Okeechobee', 'Hendry', 'Glades'] as $county) {
            $this->assertContains($county, $counties);
        }
    }

    public function test_city_values_match_feed_spelling(): void
    {
        $cities = $this->beaches->getCities();

        // Feed drops periods in "St." names and apostrophes — the wrong
        // variants return ZERO listings (verified live).
        $this->assertContains('Port St Lucie, FL', $cities);
        $this->assertNotContains('Port St. Lucie, FL', $cities);
        $this->assertContains('Sewalls Point, FL', $cities);
        $this->assertNotContains("Sewall's Point, FL", $cities);

        // Both Lake Worth values exist upstream (pre/post city rename).
        $this->assertContains('Lake Worth, FL', $cities);
        $this->assertContains('Lake Worth Beach, FL', $cities);

        // Island locales are first-class City values on this feed.
        $this->assertContains('Singer Island, FL', $cities);
        $this->assertContains('Hutchinson Island, FL', $cities);
    }

    public function test_normalize_stamps_feed_and_slug_on_listing(): void
    {
        $raw = [
            'mls_id' => 'X', 'mls_number' => 'X',
            'address' => ['full' => 'test'],
        ];

        $idx = $this->beaches->normalize($raw, MlsFeed::IDX);

        $this->assertInstanceOf(MlsListing::class, $idx);
        $this->assertSame(MlsFeed::IDX, $idx->feed);
        $this->assertSame('beachesmls', $idx->mlsSlug);
    }

    public function test_custom_fields_have_required_descriptor_keys(): void
    {
        $this->assertNotEmpty($this->beaches->getCustomFields());
        foreach ($this->beaches->getCustomFields() as $cf) {
            $this->assertArrayHasKey('key', $cf);
            $this->assertArrayHasKey('label', $cf);
            $this->assertArrayHasKey('type', $cf);
        }
    }

    public function test_declares_raw_filter_support_for_lifestyle_overlays(): void
    {
        // Lifestyle translations emit raw_filter clauses — the dataset must
        // declare it so the gateway doesn't warn it away.
        $this->assertContains('raw_filter', $this->beaches->getSupportedFilters());
        $this->assertContains('agent_id', $this->beaches->getSupportedFilters());
    }
}
