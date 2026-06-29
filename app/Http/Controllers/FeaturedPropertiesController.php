<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\FeaturedListingSetting;
use App\Models\User;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsGateway;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Public Featured Listings page. Replays the admin-configured singleton
 * (search query, MLS slugs, agent/office ids) against the live MLS gateway.
 * When no config is active it falls back to the latest general listings, and
 * when the gateway is unavailable it returns an empty set so the React page
 * uses its static fixtures.
 */
class FeaturedPropertiesController extends Controller
{
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
            'agent_id' => $active ? $settings->agent_id : null,
            'office_id' => $active ? $settings->office_id : null,
            'per_page' => $limit,
            'sort' => MlsQuery::SORT_NEWEST,
        ], static fn ($v) => $v !== null));

        $slugs = $active && ! empty($settings->mls_slugs)
            ? $settings->mls_slugs
            : ['primemls'];

        try {
            $result = app(MlsGateway::class)->search($owner, $query, $slugs);
            $listings = array_map(
                fn (array $listing): array => $this->mapListing($listing),
                $result->toArray()['listings'],
            );
        } catch (Throwable) {
            $listings = [];
        }

        return Inertia::render('featured-properties', ['listings' => $listings]);
    }

    /**
     * The single broker/owner user whose IDX connections back the public page:
     * the first user with a connection, else the first user overall.
     */
    private function resolveOwner(): ?User
    {
        return User::query()->whereHas('idxConnections')->orderBy('id')->first()
            ?? User::query()->orderBy('id')->first();
    }

    /**
     * Map a normalized MLS listing array to the frontend Listing shape.
     *
     * @param  array<string, mixed>  $l
     * @return array<string, mixed>
     */
    private function mapListing(array $l): array
    {
        $address = is_array($l['address'] ?? null) ? $l['address'] : [];
        $full = $address['full'] ?? '';
        $photos = is_array($l['photos'] ?? null) ? $l['photos'] : [];
        $sqft = $l['sqft'] ?? null;

        return [
            'id' => (string) ($l['mls_id'] ?? ''),
            'image' => $photos[0] ?? '/images/listing-placeholder.webp',
            'alt' => $full,
            'status' => ($l['status'] ?? '') ?: 'For Sale',
            'price' => $l['price_formatted'] ?? '',
            'beds' => (int) ($l['bedrooms'] ?? 0),
            'baths' => (int) ($l['bathrooms'] ?? 0),
            'sqft' => $sqft ? number_format((int) $sqft) : '',
            'address' => $full,
            'href' => '/property-search?listing='.($l['mls_id'] ?? ''),
            'description' => $l['description'] ?? null,
        ];
    }
}
