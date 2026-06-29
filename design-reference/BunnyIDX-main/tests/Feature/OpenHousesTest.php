<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\Idx\BridgeApiClient;
use App\Services\Mls\PublicPropertySearch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Open-house plumbing: Bridge OpenHouse resource fetch + display formatting. */
class OpenHousesTest extends TestCase
{
    use RefreshDatabase;

    public function test_bridge_open_houses_fetch_groups_by_listing_key(): void
    {
        config(['idx.bridge.odata_url' => 'https://bridge.test/OData', 'idx.bridge.server_token' => 'tok']);

        Http::fake([
            'bridge.test/OData/miamire/OpenHouse*' => Http::response([
                'value' => [
                    ['ListingKey' => 'A1', 'OpenHouseStartTime' => '2030-06-14T17:00:00Z', 'OpenHouseEndTime' => '2030-06-14T19:00:00Z', 'OpenHouseRemarks' => 'Refreshments'],
                    ['ListingKey' => 'A1', 'OpenHouseStartTime' => '2030-06-15T17:00:00Z', 'OpenHouseEndTime' => null, 'OpenHouseRemarks' => null],
                    ['ListingKey' => 'B2', 'OpenHouseStartTime' => '2030-06-16T15:00:00Z', 'OpenHouseEndTime' => '2030-06-16T18:00:00Z', 'OpenHouseRemarks' => null],
                ],
            ]),
        ]);

        $out = app(BridgeApiClient::class)->openHousesFor('miamire', ['A1', 'B2', 'C3']);

        $this->assertCount(2, $out['A1']);
        $this->assertCount(1, $out['B2']);
        $this->assertArrayNotHasKey('C3', $out);
        $this->assertSame('2030-06-14T17:00:00Z', $out['A1'][0]['start']);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/miamire/OpenHouse')
                && str_contains(urldecode($request->url()), "ListingKey eq 'A1'")
                && str_contains(urldecode($request->url()), 'OpenHouseStartTime ge ');
        });
    }

    public function test_bridge_open_houses_throttled_202_returns_empty_without_caching(): void
    {
        config(['idx.bridge.odata_url' => 'https://bridge.test/OData', 'idx.bridge.server_token' => 'tok']);

        Http::fake(['bridge.test/OData/miamire/OpenHouse*' => Http::response('', 202)]);

        $this->assertSame([], app(BridgeApiClient::class)->openHousesFor('miamire', ['A1']));
    }

    public function test_format_open_houses_builds_display_labels(): void
    {
        $formatted = PublicPropertySearch::formatOpenHouses([
            ['start' => '2030-06-14T17:00:00', 'end' => '2030-06-14T19:00:00', 'remarks' => null],
            ['start' => 'not-a-date', 'end' => null, 'remarks' => null],
            ['start' => '2030-06-15T16:30:00', 'end' => null, 'remarks' => null],
        ]);

        $this->assertCount(2, $formatted);
        // UTC feed timestamps render in the display timezone (America/New_York).
        $this->assertSame('Fri, Jun 14 · 1:00 PM – 3:00 PM', $formatted[0]['label']);
        $this->assertSame('Sat, Jun 15 · 12:30 PM', $formatted[1]['label']);
    }
}
