<?php

namespace Tests\Feature;

use App\Services\Idx\BridgeApiClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BridgeApiClientTest extends TestCase
{
    private function fixture(string $name): array
    {
        return json_decode(file_get_contents(base_path("tests/Fixtures/{$name}")), true);
    }

    public function test_test_connection_succeeds(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/api/v2/OData/miamire/Property*' => Http::response(
                $this->fixture('bridge_test_connection_response.json'),
                200
            ),
        ]);

        $client = app(BridgeApiClient::class);
        $result = $client->testConnection('miamire');

        $this->assertTrue($result);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'access_token=test-server-token')
                && str_contains($request->url(), '%24top=1')
                && str_contains($request->url(), '%24select=ListingKey');
        });
    }

    public function test_test_connection_fails_without_token(): void
    {
        config(['idx.bridge.server_token' => null]);

        $client = app(BridgeApiClient::class);
        $result = $client->testConnection('miamire');

        $this->assertFalse($result);
    }

    public function test_search_listings_returns_normalized_data(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/api/v2/OData/miamire/Property*' => Http::response(
                $this->fixture('bridge_search_response.json'),
                200
            ),
        ]);

        $client = app(BridgeApiClient::class);
        $results = $client->searchListings('miamire', ['city' => 'Miami', 'min_price' => 500000]);

        $this->assertArrayHasKey('listings', $results);
        $this->assertArrayHasKey('total', $results);
        $this->assertArrayNotHasKey('error', $results);
        $this->assertCount(3, $results['listings']);
        $this->assertEquals(1382, $results['total']);

        // Verify first listing normalization
        $listing = $results['listings'][0];
        $this->assertEquals('MIA2024050001', $listing['mls_id']);
        $this->assertEquals('A11534782', $listing['mls_number']);
        $this->assertEquals('miamire', $listing['mls_slug']);
        $this->assertEquals(749000, $listing['price']);
        $this->assertEquals('$749,000', $listing['price_formatted']);
        $this->assertEquals(4, $listing['bedrooms']);
        $this->assertEquals(3.0, $listing['bathrooms']);
        $this->assertEquals(2450, $listing['sqft']);
        $this->assertEquals(2001, $listing['year_built']);
        $this->assertEquals('Residential', $listing['property_type']);
        $this->assertEquals('Active', $listing['status']);
        $this->assertEquals(14, $listing['days_on_market']);

        // Verify address normalization (UnparsedAddress already has city/state)
        $this->assertEquals('22900 SW 122 PL, Miami FL 33170', $listing['address']['full']);
        $this->assertEquals('Miami', $listing['address']['city']);
        $this->assertEquals('FL', $listing['address']['state_province']);
        $this->assertEquals('33170', $listing['address']['postal_code']);

        // Verify agent info
        $this->assertEquals('Maria Rodriguez', $listing['list_agent_name']);
        $this->assertEquals('MROD-12345', $listing['list_agent_id']);
        $this->assertEquals('Sunshine Realty Group', $listing['list_office_name']);

        // Verify photos extracted from Media array
        $this->assertCount(3, $listing['photos']);
        $this->assertEquals(3, $listing['photo_count']);
        $this->assertStringContainsString('photo1.jpg', $listing['photos'][0]);

        // Verify features
        $this->assertContains('Pool', $listing['features']);
        $this->assertContains('Impact Windows', $listing['features']);
    }

    public function test_search_listings_sends_correct_odata_filters(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(['value' => [], '@odata.count' => 0], 200),
        ]);

        $client = app(BridgeApiClient::class);
        $client->searchListings('miamire', [
            'city' => 'Miami',
            'min_price' => 500000,
            'max_price' => 1000000,
            'min_beds' => 3,
            'min_baths' => 2,
            'property_type' => 'Residential',
            'page' => 2,
            'per_page' => 10,
        ]);

        Http::assertSent(function ($request) {
            $url = $request->url();
            // Verify access_token auth (not Bearer)
            $this->assertStringContainsString('access_token=test-server-token', $url);
            // Verify pagination
            $this->assertStringContainsString('%24top=10', $url);
            $this->assertStringContainsString('%24skip=10', $url);
            // Verify count is requested
            $this->assertStringContainsString('%24count=true', $url);
            return true;
        });
    }

    public function test_search_defaults_to_active_status(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(['value' => [], '@odata.count' => 0], 200),
        ]);

        $client = app(BridgeApiClient::class);
        $client->searchListings('miamire');

        Http::assertSent(function ($request) {
            // Default filter should be StandardStatus eq 'Active'
            return str_contains(urldecode($request->url()), "StandardStatus eq 'Active'");
        });
    }

    public function test_get_listing_returns_normalized_data(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            "api.bridgedataoutput.com/api/v2/OData/miamire/Property('MIA2024050001')*" => Http::response(
                $this->fixture('bridge_single_listing_response.json'),
                200
            ),
        ]);

        $client = app(BridgeApiClient::class);
        $listing = $client->getListing('miamire', 'MIA2024050001');

        $this->assertNotNull($listing);
        $this->assertEquals('MIA2024050001', $listing['mls_id']);
        $this->assertEquals('A11534782', $listing['mls_number']);
        $this->assertEquals(749000, $listing['price']);
    }

    public function test_get_listing_returns_null_on_404(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(null, 404),
        ]);

        $client = app(BridgeApiClient::class);
        $listing = $client->getListing('miamire', 'NONEXISTENT');

        $this->assertNull($listing);
    }

    public function test_search_handles_api_error_gracefully(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response('Internal Server Error', 500),
        ]);

        $client = app(BridgeApiClient::class);
        $results = $client->searchListings('miamire');

        $this->assertEmpty($results['listings']);
        $this->assertEquals(0, $results['total']);
        $this->assertArrayHasKey('error', $results);
    }

    public function test_bathroom_fallback_chain(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        // Only BathroomsFull provided (no BathroomsTotalDecimal)
        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response([
                'ListingKey' => 'TEST1',
                'BathroomsFull' => 2,
            ], 200),
        ]);

        $client = app(BridgeApiClient::class);
        $listing = $client->getListing('miamire', 'TEST1');

        $this->assertEquals(2.0, $listing['bathrooms']);
    }

    public function test_null_unparsed_address_constructs_from_parts(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response([
                'ListingKey' => 'TEST2',
                'UnparsedAddress' => null,
                'City' => 'Miami',
                'StateOrProvince' => 'FL',
                'PostalCode' => '33131',
            ], 200),
        ]);

        $client = app(BridgeApiClient::class);
        $listing = $client->getListing('miamire', 'TEST2');

        $this->assertEquals('Miami, FL, 33131', $listing['address']['full']);
        $this->assertNull($listing['address']['street']);
    }

    public function test_odata_value_escaping(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(['value' => [], '@odata.count' => 0], 200),
        ]);

        $client = app(BridgeApiClient::class);
        $client->searchListings('miamire', ['city' => "O'Brien"]);

        Http::assertSent(function ($request) {
            return str_contains(urldecode($request->url()), "City eq 'O''Brien'");
        });
    }
}
