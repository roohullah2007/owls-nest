<?php

declare(strict_types=1);

namespace Tests\Unit\Mls;

use App\Services\Mls\Dto\MlsAgent;
use App\Services\Mls\Dto\MlsFeed;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsSchools;
use PHPUnit\Framework\TestCase;

class MlsListingTest extends TestCase
{
    public function test_full_payload_hydrates_every_typed_field(): void
    {
        $raw = [
            'mls_id' => 'KEY1', 'mls_number' => 'A1', 'mls_slug' => 'miamire',
            'status' => 'Active', 'property_type' => 'Residential', 'property_subtype' => 'Single Family Residence',
            'price' => 749000, 'original_price' => 799000, 'previous_price' => 779000,
            'price_changed_at' => '2026-05-20T12:00:00Z', 'price_per_sqft' => 305,
            'address' => ['full' => '123 Main St, Miami FL', 'city' => 'Miami', 'state_province' => 'FL'],
            'lat' => 25.79, 'lng' => -80.13, 'subdivision' => 'Brickell', 'mls_area' => '41',
            'bedrooms' => 4, 'bathrooms' => 3.5, 'bathrooms_full' => 3, 'bathrooms_half' => 1,
            'sqft' => 2450, 'lot_sqft' => 7500, 'lot_acres' => 0.17, 'year_built' => 2001, 'stories' => 2,
            'garage_spaces' => 2, 'new_construction' => false,
            'photos' => ['p1.jpg', 'p2.jpg'], 'floorplans' => ['fp1.jpg'],
            'virtual_tour_url' => 'https://tour.example.com',
            'hoa_fee' => 150, 'hoa_frequency' => 'Monthly', 'hoa_name' => 'Brickell HOA',
            'tax_amount' => 14555, 'tax_year' => 2025,
            'elementary_school' => 'Central Park Elem',
            'middle_school' => 'Brickell Middle',
            'high_school' => 'Miami High',
            'school_district' => 'Miami-Dade',
            'listing_agent' => [
                'name' => 'Jane Doe', 'mls_id' => 'JD-123', 'email' => 'jane@example.com',
                'phone' => '305-555-1234', 'office_name' => 'Acme', 'office_mls_id' => 'ACME-1',
            ],
            'features' => ['Walk-in Closet'], 'cooling' => ['Central'],
            'pool' => true, 'pool_features' => ['In Ground'], 'waterfront' => true,
            'days_on_market' => 14, 'on_market_date' => '2026-05-10',
            'modification_ts' => '2026-05-27T18:00:00Z',
            'feed' => 'idx',
        ];

        $l = MlsListing::fromNormalizedArray($raw);

        $this->assertSame('KEY1', $l->mlsId);
        $this->assertSame('miamire', $l->mlsSlug);
        $this->assertSame(MlsFeed::IDX, $l->feed);
        $this->assertSame(749000, $l->price);
        $this->assertSame(799000, $l->originalListPrice);
        $this->assertSame('2026-05-20T12:00:00Z', $l->priceChangedAt);
        $this->assertSame(4, $l->bedrooms);
        $this->assertSame(3.5, $l->bathrooms);
        $this->assertSame(150, $l->hoaFee);
        $this->assertSame(14555, $l->taxAnnualAmount);
        $this->assertInstanceOf(MlsSchools::class, $l->schools);
        $this->assertSame('Central Park Elem', $l->schools->elementary);
        $this->assertInstanceOf(MlsAgent::class, $l->listingAgent);
        $this->assertSame('jane@example.com', $l->listingAgent->email);
        $this->assertSame(['p1.jpg', 'p2.jpg'], $l->photos);
        $this->assertSame(['fp1.jpg'], $l->floorplans);
        $this->assertSame(14, $l->daysOnMarket);
        $this->assertTrue($l->pool);
        $this->assertTrue($l->waterfront);
    }

    public function test_sparse_payload_leaves_nulls(): void
    {
        $l = MlsListing::fromNormalizedArray([
            'mls_id' => 'X', 'mls_number' => 'X', 'mls_slug' => 'miamire',
            'address' => ['full' => 'foo'],
        ]);

        $this->assertNull($l->price);
        $this->assertNull($l->bedrooms);
        $this->assertNull($l->schools);
        $this->assertNull($l->listingAgent);
        $this->assertSame([], $l->photos);
    }

    public function test_extras_round_trip_preserves_per_mls_fields(): void
    {
        $raw = [
            'mls_id' => 'X', 'mls_number' => 'X', 'mls_slug' => 'miamire',
            'address' => ['full' => 'foo'],
            // MIAMIRE-specific custom fields not in canonical shape
            'MIAMIRE_WaterfrontDirection' => 'North',
            'days_on_market' => 5,  // canonical
        ];

        $l = MlsListing::fromNormalizedArray($raw);
        $this->assertSame(5, $l->daysOnMarket);
        $this->assertSame('North', $l->extras['MIAMIRE_WaterfrontDirection']);

        // toArray exposes both canonical AND extras flat
        $out = $l->toArray();
        $this->assertSame(5, $out['days_on_market']);
        $this->assertSame('North', $out['MIAMIRE_WaterfrontDirection']);
    }

    public function test_to_array_includes_flat_legacy_aliases_for_existing_consumers(): void
    {
        $l = MlsListing::fromNormalizedArray([
            'mls_id' => 'X', 'mls_number' => 'X', 'mls_slug' => 'miamire',
            'address' => ['full' => 'foo'], 'price' => 500000,
            'listing_agent' => ['name' => 'Jane', 'mls_id' => 'JD-1', 'office_name' => 'Acme'],
        ]);
        $out = $l->toArray();

        // Drawer UI reads list_agent_name / list_office_name without sub-DTO awareness.
        $this->assertSame('Jane', $out['list_agent_name']);
        $this->assertSame('Acme', $out['list_office_name']);
        $this->assertSame('$500,000', $out['price_formatted']);
        $this->assertSame(0, $out['photo_count']);
    }

    public function test_agent_from_array_returns_null_when_every_field_empty(): void
    {
        $this->assertNull(MlsAgent::fromArray(null));
        $this->assertNull(MlsAgent::fromArray([]));
        $this->assertNull(MlsAgent::fromArray(['name' => null, 'email' => null]));

        $a = MlsAgent::fromArray(['name' => 'Jane']);
        $this->assertNotNull($a);
        $this->assertSame('Jane', $a->name);
    }

    public function test_schools_from_array_returns_null_when_every_field_empty(): void
    {
        $this->assertNull(MlsSchools::fromArray(null));
        $this->assertNull(MlsSchools::fromArray(['elementary' => null]));

        $s = MlsSchools::fromArray(['high' => 'Miami High']);
        $this->assertNotNull($s);
        $this->assertSame('Miami High', $s->high);
    }
}
