<?php

namespace Tests\Feature;

use App\Models\IdxConnection;
use App\Models\License;
use App\Models\LicenseDomain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MlsRelayApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private License $license;
    private IdxConnection $connection;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->license = License::factory()->create(['user_id' => $this->user->id]);
        LicenseDomain::create([
            'license_id' => $this->license->id,
            'domain' => 'localhost',
            'is_active' => true,
            'activated_at' => now(),
        ]);
        $this->connection = IdxConnection::factory()->bridge()->create(['user_id' => $this->user->id]);
    }

    private function fixture(string $name): array
    {
        return json_decode(file_get_contents(base_path("tests/Fixtures/{$name}")), true);
    }

    // ── Public endpoints ────────────────────────────────────────────

    public function test_datasets_endpoint_is_public(): void
    {
        $response = $this->getJson('/api/v1/mls/datasets');

        $response->assertOk();
        $response->assertJsonStructure([
            'datasets' => [
                '*' => ['slug', 'name', 'region', 'provider', 'tier'],
            ],
        ]);

        $datasets = collect($response->json('datasets'));
        $this->assertTrue($datasets->contains('slug', 'miamire'));
    }

    // ── Authentication ──────────────────────────────────────────────

    public function test_search_requires_license_key(): void
    {
        $response = $this->getJson('/api/v1/mls/search?mls=miamire');

        $response->assertStatus(401);
        $response->assertJson(['error' => 'Missing X-License-Key header.']);
    }

    public function test_search_rejects_invalid_license(): void
    {
        $response = $this->getJson('/api/v1/mls/search?mls=miamire', [
            'X-License-Key' => 'IDX-FAKE-FAKE-FAKE',
        ]);

        $response->assertStatus(401);
        $response->assertJson(['error' => 'Invalid or inactive license key.']);
    }

    public function test_search_rejects_revoked_license(): void
    {
        $this->license->update(['status' => 'revoked']);

        $response = $this->getJson('/api/v1/mls/search?mls=miamire', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertStatus(401);
    }

    // ── Validation ──────────────────────────────────────────────────

    public function test_search_requires_mls_parameter(): void
    {
        $response = $this->getJson('/api/v1/mls/search', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertStatus(422);
    }

    public function test_search_rejects_unknown_mls(): void
    {
        $response = $this->getJson('/api/v1/mls/search?mls=nonexistent', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertStatus(400);
        $response->assertJson(['error' => 'Unknown MLS dataset.']);
    }

    public function test_search_requires_active_connection(): void
    {
        $this->connection->delete();

        $response = $this->getJson('/api/v1/mls/search?mls=miamire', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertStatus(403);
        $response->assertJsonFragment(['error' => 'No active connection for this MLS. Connect it in your CRM dashboard first.']);
    }

    // ── Search ──────────────────────────────────────────────────────

    public function test_search_returns_listings(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(
                $this->fixture('bridge_search_response.json'),
                200
            ),
        ]);

        $response = $this->getJson('/api/v1/mls/search?mls=miamire&city=Miami', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'listings' => [
                '*' => ['mls_id', 'mls_number', 'price', 'address', 'bedrooms', 'bathrooms'],
            ],
            'total',
        ]);
        $this->assertCount(3, $response->json('listings'));
    }

    // ── Single listing ──────────────────────────────────────────────

    public function test_listing_endpoint_returns_single_listing(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(
                $this->fixture('bridge_single_listing_response.json'),
                200
            ),
        ]);

        $response = $this->getJson('/api/v1/mls/listing?mls=miamire&id=MIA2024050001', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['listing' => ['mls_id', 'price', 'address']]);
        $this->assertEquals('MIA2024050001', $response->json('listing.mls_id'));
    }

    public function test_listing_returns_404_when_not_found(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(null, 404),
        ]);

        $response = $this->getJson('/api/v1/mls/listing?mls=miamire&id=NONEXISTENT', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertStatus(404);
    }

    // ── Rate limiting ───────────────────────────────────────────────

    public function test_rate_limiting_blocks_excessive_requests(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);
        config(['idx.relay.rate_limit' => 2]);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(
                $this->fixture('bridge_search_response.json'),
                200
            ),
        ]);

        $headers = ['X-License-Key' => $this->license->key];

        // First two requests should succeed
        $this->getJson('/api/v1/mls/search?mls=miamire', $headers)->assertOk();
        $this->getJson('/api/v1/mls/search?mls=miamire', $headers)->assertOk();

        // Third should be rate limited
        $response = $this->getJson('/api/v1/mls/search?mls=miamire', $headers);
        $response->assertStatus(429);
        $response->assertJson(['error' => 'Rate limit exceeded. Try again in a minute.']);
    }

    public function test_rate_limit_headers_present(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);
        config(['idx.relay.rate_limit' => 100]);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(
                $this->fixture('bridge_search_response.json'),
                200
            ),
        ]);

        $response = $this->getJson('/api/v1/mls/search?mls=miamire', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertOk();
        $response->assertHeader('X-RateLimit-Limit', '100');
        $this->assertNotNull($response->headers->get('X-RateLimit-Remaining'));
        $this->assertNotNull($response->headers->get('X-RateLimit-Reset'));
    }

    // ── CORS ────────────────────────────────────────────────────────

    public function test_cors_headers_present_on_response(): void
    {
        $response = $this->getJson('/api/v1/mls/datasets');

        $response->assertOk();
        $response->assertHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        $response->assertHeader('Access-Control-Allow-Headers', 'X-License-Key, Content-Type, Accept, Origin');
    }

    public function test_cors_preflight_options_returns_204(): void
    {
        $response = $this->options('/api/v1/mls/datasets', [], [
            'Origin' => 'https://customer-site.com',
            'Access-Control-Request-Method' => 'GET',
        ]);

        $response->assertStatus(204);
    }

    // ── Field selection ─────────────────────────────────────────────

    public function test_field_selection_filters_response(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(
                $this->fixture('bridge_search_response.json'),
                200
            ),
        ]);

        $response = $this->getJson('/api/v1/mls/search?mls=miamire&fields=mls_id,price,bedrooms', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertOk();
        $listing = $response->json('listings.0');

        // Should have requested fields
        $this->assertArrayHasKey('mls_id', $listing);
        $this->assertArrayHasKey('price', $listing);
        $this->assertArrayHasKey('bedrooms', $listing);

        // Should NOT have other fields
        $this->assertArrayNotHasKey('description', $listing);
        $this->assertArrayNotHasKey('photos', $listing);
        $this->assertArrayNotHasKey('address', $listing);
    }

    // ── ETag ────────────────────────────────────────────────────────

    public function test_listing_has_etag_header(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(
                $this->fixture('bridge_single_listing_response.json'),
                200
            ),
        ]);

        $response = $this->getJson('/api/v1/mls/listing?mls=miamire&id=MIA2024050001', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertOk();
        $this->assertNotNull($response->headers->get('ETag'));
    }
}
