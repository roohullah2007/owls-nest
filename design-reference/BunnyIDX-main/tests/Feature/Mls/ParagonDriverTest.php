<?php

declare(strict_types=1);

namespace Tests\Feature\Mls;

use App\Models\IdxConnection;
use App\Models\User;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Paragon (paragonrels.com) driver wiring — exercised end-to-end through the
 * gateway against a faked OData server. Covers: OAuth token fetch, RESO Property
 * normalization, the separate Media-resource merge (Paragon has no $expand),
 * Public-only media filtering + Order sort, @odata.count total, and per-connection
 * agent scoping. PrimeMls is registered by MlsServiceProvider in the real app.
 */
class ParagonDriverTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();

        IdxConnection::create([
            'user_id' => $this->user->id,
            'mls_slug' => 'primemls',
            'display_name' => 'PrimeMLS',
            'provider' => 'paragon',
            'client_id' => 'test-login',
            'client_secret' => 'test-secret',
            'is_active' => true,
            'test_status' => IdxConnection::STATUS_PASSED,
        ]);
    }

    private function fakeParagon(): void
    {
        Http::fake(function (Request $request) {
            $url = $request->url();

            if (str_contains($url, '/identity/connect/token')) {
                return Http::response(['access_token' => 'tok-123', 'expires_in' => 7200, 'token_type' => 'Bearer']);
            }

            if (str_contains($url, '/DD1.7/Media')) {
                return Http::response(['value' => [
                    // Out of order + a Private image that must be dropped.
                    ['ResourceRecordKey' => '4342727', 'MediaURL' => 'https://img/photo-1.jpg', 'Order' => 1, 'MediaCategory' => 'Photo', 'Permission' => ['Public']],
                    ['ResourceRecordKey' => '4342727', 'MediaURL' => 'https://img/photo-0.jpg', 'Order' => 0, 'MediaCategory' => 'Photo', 'Permission' => ['Public']],
                    ['ResourceRecordKey' => '4342727', 'MediaURL' => 'https://img/secret.jpg', 'Order' => 2, 'MediaCategory' => 'Photo', 'Permission' => ['Private']],
                ]]);
            }

            if (str_contains($url, '/DD1.7/Property')) {
                return Http::response([
                    '@odata.count' => 42,
                    'value' => [[
                        'ListingKey' => '4342727', 'ListingId' => '4342727',
                        'StandardStatus' => 'Active', 'PropertyType' => 'Residential',
                        'ListPrice' => 550000.0, 'City' => 'Derry', 'StateOrProvince' => 'NH',
                        'PostalCode' => '03038', 'BedroomsTotal' => 3, 'BathroomsTotalInteger' => 2,
                        'PhotosCount' => 2,
                    ]],
                ]);
            }

            return Http::response([], 404);
        });
    }

    public function test_search_normalizes_listing_with_public_media_and_total(): void
    {
        $this->fakeParagon();

        $r = app(MlsGateway::class)->search($this->user, new MlsQuery);

        $this->assertCount(1, $r->listings);
        $listing = $r->listings[0];
        $this->assertSame('4342727', $listing->mlsId);
        $this->assertSame(550000.0, (float) $listing->price);
        $this->assertSame('primemls', $listing->mlsSlug);
        $this->assertSame(['primemls' => 42], $r->perMlsTotal);

        // Media merged from the separate resource, ordered by Order, Private dropped.
        $photos = $listing->toArray()['photos'];
        $this->assertSame(['https://img/photo-0.jpg', 'https://img/photo-1.jpg'], $photos);
    }

    public function test_default_status_filter_is_active(): void
    {
        $this->fakeParagon();

        app(MlsGateway::class)->search($this->user, new MlsQuery);

        Http::assertSent(function (Request $request) {
            if (! str_contains($request->url(), '/DD1.7/Property')) {
                return false;
            }
            $filter = urldecode($request->url());

            return str_contains($filter, "StandardStatus eq 'Active'");
        });
    }

    public function test_agent_scoping_adds_list_agent_filter(): void
    {
        $this->fakeParagon();
        IdxConnection::where('user_id', $this->user->id)->update(['agent_id' => 'AGENT99']);

        app(MlsGateway::class)->search($this->user, new MlsQuery);

        Http::assertSent(function (Request $request) {
            if (! str_contains($request->url(), '/DD1.7/Property')) {
                return false;
            }

            return str_contains(urldecode($request->url()), "ListAgentMlsId eq 'AGENT99'");
        });
    }

    public function test_get_single_listing_returns_normalized_with_photos(): void
    {
        $this->fakeParagon();

        $listing = app(MlsGateway::class)->get($this->user, 'primemls', '4342727');

        $this->assertNotNull($listing);
        $this->assertSame('4342727', $listing->mlsId);
        $this->assertSame(['https://img/photo-0.jpg', 'https://img/photo-1.jpg'], $listing->toArray()['photos']);
    }
}
