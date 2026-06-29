<?php

namespace Tests\Feature;

use App\Models\IdxWidget;
use App\Models\IdxConnection;
use App\Models\License;
use App\Models\LicenseDomain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PluginApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private License $license;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->license = License::factory()->create(['user_id' => $this->user->id]);
    }

    // ── Health ──────────────────────────────────────────────────────

    public function test_health_endpoint_is_public(): void
    {
        $response = $this->getJson('/api/v1/plugin/health');

        $response->assertOk();
        $response->assertJsonStructure(['status', 'version', 'timestamp']);
        $response->assertJson(['status' => 'ok']);
    }

    // ── Verify License ──────────────────────────────────────────────

    public function test_verify_license_valid(): void
    {
        LicenseDomain::create([
            'license_id' => $this->license->id,
            'domain' => 'example.com',
            'is_active' => true,
            'activated_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/plugin/verify-license', [
            'license_key' => $this->license->key,
            'domain' => 'example.com',
        ]);

        $response->assertOk();
        $response->assertJson([
            'valid' => true,
            'status' => 'active',
            'domain' => 'example.com',
            'domain_match' => true,
        ]);
        $response->assertJsonStructure(['features', 'connections']);
    }

    public function test_verify_license_not_found(): void
    {
        $response = $this->postJson('/api/v1/plugin/verify-license', [
            'license_key' => 'IDX-FAKE-FAKE-FAKE',
        ]);

        $response->assertStatus(404);
        $response->assertJson(['error' => 'License key not found.']);
    }

    public function test_verify_license_revoked(): void
    {
        $this->license->update([
            'status' => 'revoked',
            'revoked_at' => now(),
            'revoked_reason' => 'Chargeback',
        ]);

        $response = $this->postJson('/api/v1/plugin/verify-license', [
            'license_key' => $this->license->key,
        ]);

        $response->assertOk();
        $response->assertJson([
            'valid' => false,
            'status' => 'revoked',
        ]);
    }

    public function test_verify_license_domain_mismatch(): void
    {
        LicenseDomain::create([
            'license_id' => $this->license->id,
            'domain' => 'example.com',
            'is_active' => true,
            'activated_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/plugin/verify-license', [
            'license_key' => $this->license->key,
            'domain' => 'other-site.com',
        ]);

        $response->assertOk();
        $response->assertJson([
            'valid' => true,
            'domain_match' => false,
        ]);
    }

    public function test_verify_license_includes_connections(): void
    {
        IdxConnection::factory()->bridge()->create(['user_id' => $this->user->id]);

        $response = $this->postJson('/api/v1/plugin/verify-license', [
            'license_key' => $this->license->key,
        ]);

        $response->assertOk();
        $connections = $response->json('connections');
        $this->assertCount(1, $connections);
        $this->assertEquals('miamire', $connections[0]['mls_slug']);
    }

    // ── Activate ────────────────────────────────────────────────────

    public function test_activate_license_on_domain(): void
    {
        $response = $this->postJson('/api/v1/plugin/activate', [
            'license_key' => $this->license->key,
            'domain' => 'https://my-realty-site.com/',
        ]);

        $response->assertOk();
        $response->assertJson([
            'activated' => true,
            'domain' => 'my-realty-site.com',
        ]);

        // Verify in database
        $this->assertDatabaseHas('license_domains', [
            'license_id' => $this->license->id,
            'domain' => 'my-realty-site.com',
            'is_active' => true,
        ]);
    }

    public function test_activate_deactivates_previous_domain(): void
    {
        // First activation
        $this->postJson('/api/v1/plugin/activate', [
            'license_key' => $this->license->key,
            'domain' => 'old-site.com',
        ]);

        // Second activation
        $this->postJson('/api/v1/plugin/activate', [
            'license_key' => $this->license->key,
            'domain' => 'new-site.com',
        ]);

        // Old should be deactivated
        $this->assertDatabaseHas('license_domains', [
            'license_id' => $this->license->id,
            'domain' => 'old-site.com',
            'is_active' => false,
        ]);

        // New should be active
        $this->assertDatabaseHas('license_domains', [
            'license_id' => $this->license->id,
            'domain' => 'new-site.com',
            'is_active' => true,
        ]);
    }

    public function test_activate_rejects_invalid_license(): void
    {
        $response = $this->postJson('/api/v1/plugin/activate', [
            'license_key' => 'IDX-FAKE-FAKE-FAKE',
            'domain' => 'example.com',
        ]);

        $response->assertStatus(404);
    }

    public function test_activate_rejects_revoked_license(): void
    {
        $this->license->update(['status' => 'revoked']);

        $response = $this->postJson('/api/v1/plugin/activate', [
            'license_key' => $this->license->key,
            'domain' => 'example.com',
        ]);

        $response->assertStatus(403);
    }

    // ── Deactivate ──────────────────────────────────────────────────

    public function test_deactivate_license_from_domain(): void
    {
        LicenseDomain::create([
            'license_id' => $this->license->id,
            'domain' => 'example.com',
            'is_active' => true,
            'activated_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/plugin/deactivate', [
            'license_key' => $this->license->key,
            'domain' => 'example.com',
        ]);

        $response->assertOk();
        $response->assertJson([
            'deactivated' => true,
            'domain' => 'example.com',
        ]);

        $this->assertDatabaseHas('license_domains', [
            'license_id' => $this->license->id,
            'domain' => 'example.com',
            'is_active' => false,
        ]);
    }

    // ── Settings ────────────────────────────────────────────────────

    public function test_settings_requires_license_key(): void
    {
        $response = $this->getJson('/api/v1/plugin/settings');

        $response->assertStatus(401);
        $response->assertJson(['error' => 'Missing X-License-Key header.']);
    }

    public function test_settings_returns_full_configuration(): void
    {
        LicenseDomain::create([
            'license_id' => $this->license->id,
            'domain' => 'example.com',
            'is_active' => true,
            'activated_at' => now(),
        ]);

        IdxConnection::factory()->bridge()->create(['user_id' => $this->user->id]);

        IdxWidget::create([
            'user_id' => $this->user->id,
            'license_id' => $this->license->id,
            'name' => 'Homepage Grid',
            'widget_type' => 'grid',
            'mls_slug' => 'miamire',
            'config' => ['per_page' => 12, 'city' => 'Miami'],
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/plugin/settings', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'license' => ['key', 'status', 'domain'],
            'connections' => [
                '*' => ['id', 'provider', 'mls_slug', 'display_name'],
            ],
            'snippets' => [
                '*' => ['id', 'name', 'widget_type', 'mls_slug', 'config', 'appearance'],
            ],
            'datasets',
            'api' => ['base_url', 'rate_limit', 'cache_ttl'],
        ]);

        $this->assertEquals('example.com', $response->json('license.domain'));
        $this->assertCount(1, $response->json('connections'));
        $this->assertCount(1, $response->json('snippets'));
        $this->assertEquals('Homepage Grid', $response->json('snippets.0.name'));
    }

    public function test_settings_rejects_inactive_license(): void
    {
        $this->license->update(['status' => 'revoked']);

        $response = $this->getJson('/api/v1/plugin/settings', [
            'X-License-Key' => $this->license->key,
        ]);

        $response->assertStatus(401);
    }

    // ── CORS ────────────────────────────────────────────────────────

    public function test_plugin_endpoints_have_cors_headers(): void
    {
        $response = $this->getJson('/api/v1/plugin/health');

        $response->assertHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }

    public function test_plugin_preflight_returns_204(): void
    {
        $response = $this->options('/api/v1/plugin/verify-license', [], [
            'Origin' => 'https://customer-site.com',
        ]);

        $response->assertStatus(204);
    }
}
