<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\MapsFeaturedListings;
use App\Models\FeaturedListingSetting;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsGateway;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Public Featured Listings page. Replays the admin-configured singleton
 * (search query, MLS slugs, agent/office ids) against the live MLS gateway.
 * When no config is active it falls back to the latest general PrimeMLS
 * listings, and when the gateway is unavailable it returns an empty set (the
 * React page renders live data only — no static fixtures).
 */
class FeaturedPropertiesController extends Controller
{
    use MapsFeaturedListings;

    public function index(): Response
    {
        $settings = FeaturedListingSetting::current();

        $owner = $this->resolveOwner();
        if (! $owner) {
            return Inertia::render('featured-properties', ['listings' => []]);
        }

        $active = $settings->is_active;
        $limit = $settings->result_limit ?: 12;

        $query = MlsQuery::fromArray(array_filter([
            'query' => $active ? $settings->search_query : null,
            'listing_ids' => $active ? $settings->mls_numbers : null,
            'agent_id' => $active ? $settings->agent_id : null,
            'office_id' => $active ? $settings->office_id : null,
            'per_page' => $limit,
            'sort' => MlsQuery::SORT_NEWEST,
        ], static fn ($v) => $v !== null && $v !== []));

        // Single-broker site: PrimeMLS is the only feed. When the config is
        // inactive/empty the query above carries no filters, so this returns the
        // latest general PrimeMLS listings.
        try {
            $result = app(MlsGateway::class)->search($owner, $query, ['primemls']);
            $listings = array_map(
                fn (array $listing): array => $this->mapFeaturedListing($listing),
                $result->toArray()['listings'],
            );
        } catch (Throwable) {
            $listings = [];
        }

        return Inertia::render('featured-properties', ['listings' => $listings]);
    }
}
