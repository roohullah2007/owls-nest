<?php

declare(strict_types=1);

namespace Tests\Unit\Mls;

use App\Services\Mls\Datasets\Bridge\MiamiReMls;
use App\Services\Mls\Dto\MlsFeed;
use App\Services\Mls\Dto\MlsListing;
use PHPUnit\Framework\TestCase;

/**
 * MiamiReMls is the canonical concrete dataset — the reference for every
 * future per-MLS class. Pin its declared vocabulary + key translations.
 */
class MiamiReMlsTest extends TestCase
{
    private MiamiReMls $miami;

    protected function setUp(): void
    {
        parent::setUp();
        $this->miami = new MiamiReMls();
    }

    public function test_advertises_idx_only_until_vow_is_provisioned(): void
    {
        $this->assertSame([MlsFeed::IDX], $this->miami->supportedFeeds());
        $this->assertTrue($this->miami->supportsFeed(MlsFeed::IDX));
        $this->assertFalse($this->miami->supportsFeed(MlsFeed::VOW));
    }

    public function test_dataset_path_is_stable_across_feeds(): void
    {
        // Miami serves IDX + VOW from the same OData slug — gated by token scope.
        $this->assertSame('miamire', $this->miami->getDatasetPath());
        $this->assertSame('miamire', $this->miami->getDatasetPath(MlsFeed::IDX));
        $this->assertSame('miamire', $this->miami->getDatasetPath(MlsFeed::VOW));
    }

    public function test_property_subtypes_are_scoped_by_parent_type(): void
    {
        $residential = $this->miami->getPropertySubtypes('Residential');
        $values = array_map(fn ($t) => $t->value, $residential);

        $this->assertContains('Single Family Residence', $values);
        $this->assertContains('Townhouse', $values);
        $this->assertContains('Condominium', $values);
        $this->assertNotContains('Office', $values);  // commercial subtype

        // Commercial subtypes
        $commercial = $this->miami->getPropertySubtypes('Commercial Sale');
        $cValues = array_map(fn ($t) => $t->value, $commercial);
        $this->assertContains('Office', $cValues);
        $this->assertNotContains('Single Family Residence', $cValues);

        // Each subtype carries parent_value
        foreach ($residential as $term) {
            $this->assertSame('Residential', $term->parentValue);
        }
    }

    public function test_property_subtypes_flat_list_when_no_parent(): void
    {
        $all = $this->miami->getPropertySubtypes(null);
        $this->assertNotEmpty($all);
        // Verify subtypes from multiple parents are present.
        $parents = array_unique(array_map(fn ($t) => $t->parentValue, $all));
        $this->assertGreaterThan(1, count($parents));
    }

    public function test_supports_lifestyles_match_translation_keys(): void
    {
        // Every advertised lifestyle must translate — drift would silently
        // return 0 results with a misleading "supported" claim.
        foreach ($this->miami->getSupportedLifestyles() as $lifestyle) {
            $this->assertNotNull(
                $this->miami->translateLifestyle($lifestyle),
                "Lifestyle [{$lifestyle}] is advertised but translateLifestyle() returns null",
            );
        }
    }

    public function test_unsupported_lifestyle_returns_null(): void
    {
        $this->assertNull($this->miami->translateLifestyle('scuba-friendly'));
        $this->assertNull($this->miami->translateLifestyle(''));
    }

    public function test_beachfront_translation_includes_waterfront_and_ocean(): void
    {
        $t = $this->miami->translateLifestyle('beachfront');

        $this->assertNotNull($t);
        $this->assertArrayHasKey('raw_filter', $t);
        $clauses = is_array($t['raw_filter']) ? $t['raw_filter'] : [$t['raw_filter']];
        $combined = implode(' ', $clauses);
        $this->assertStringContainsString('WaterfrontYN', $combined);
        $this->assertStringContainsString('Ocean', $combined);
    }

    public function test_luxury_translation_is_price_floor_not_raw_filter(): void
    {
        // Luxury is partly amenity-driven, partly a price floor — Miami's
        // floor is $1.5M. Test pins the floor specifically.
        $t = $this->miami->translateLifestyle('luxury');
        $this->assertSame(1500000, $t['min_price']);
    }

    public function test_normalize_stamps_feed_on_listing(): void
    {
        $raw = [
            'mls_id' => 'X', 'mls_number' => 'X', 'mls_slug' => 'miamire',
            'address' => ['full' => 'test'],
        ];

        $idx = $this->miami->normalize($raw, MlsFeed::IDX);
        $vow = $this->miami->normalize($raw, MlsFeed::VOW);

        $this->assertInstanceOf(MlsListing::class, $idx);
        $this->assertSame(MlsFeed::IDX, $idx->feed);
        $this->assertSame(MlsFeed::VOW, $vow->feed);
    }

    public function test_custom_fields_have_required_descriptor_keys(): void
    {
        foreach ($this->miami->getCustomFields() as $cf) {
            $this->assertArrayHasKey('key', $cf);
            $this->assertArrayHasKey('label', $cf);
            $this->assertArrayHasKey('type', $cf);
        }
    }
}
