<?php

namespace Tests\Feature;

use App\Models\IdxConnection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ListingMlsImportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private IdxConnection $connection;

    protected function setUp(): void
    {
        parent::setUp();

        // MLS search is a paid 'idx' feature — arrange an entitled user.
        $this->user = User::factory()->create(['subscription_tier' => 'enterprise']);
        $this->connection = IdxConnection::factory()->bridge()->create(['user_id' => $this->user->id]);
    }

    private function fixture(string $name): array
    {
        return json_decode(file_get_contents(base_path("tests/Fixtures/{$name}")), true);
    }

    public function test_search_mls_requires_authentication(): void
    {
        $response = $this->postJson(route('crm.listings.search-mls'), [
            'connection_id' => $this->connection->id,
        ]);

        $response->assertStatus(401); // JSON request returns 401 Unauthenticated
    }

    public function test_search_mls_returns_results(): void
    {
        config(['idx.bridge.server_token' => 'test-server-token']);

        Http::fake([
            'api.bridgedataoutput.com/*' => Http::response(
                $this->fixture('bridge_search_response.json'),
                200
            ),
        ]);

        $response = $this->actingAs($this->user)->postJson(route('crm.listings.search-mls'), [
            'connection_id' => $this->connection->id,
            'city' => 'Miami',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'listings' => [
                '*' => ['mls_id', 'mls_number', 'price', 'address'],
            ],
            'total',
        ]);
        $this->assertCount(3, $response->json('listings'));
    }

    public function test_search_mls_rejects_other_users_connection(): void
    {
        $otherUser = User::factory()->create();
        $otherConnection = IdxConnection::factory()->bridge()->create(['user_id' => $otherUser->id]);

        $response = $this->actingAs($this->user)->postJson(route('crm.listings.search-mls'), [
            'connection_id' => $otherConnection->id,
        ]);

        $response->assertStatus(404); // firstOrFail should 404
    }

    public function test_search_mls_rejects_inactive_connection(): void
    {
        $this->connection->update(['is_active' => false]);

        $response = $this->actingAs($this->user)->postJson(route('crm.listings.search-mls'), [
            'connection_id' => $this->connection->id,
        ]);

        $response->assertStatus(404);
    }

    public function test_search_mls_rejects_failed_connection(): void
    {
        $this->connection->update(['test_status' => 'failed']);

        $response = $this->actingAs($this->user)->postJson(route('crm.listings.search-mls'), [
            'connection_id' => $this->connection->id,
        ]);

        $response->assertStatus(404);
    }
}
