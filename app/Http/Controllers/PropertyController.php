<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\MapsMlsListings;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsGateway;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * Standalone public property-detail page (`/property/{mls}`). Renders the same
 * design as the old detail modal, backed by a single live PrimeMLS listing plus
 * a handful of nearby active listings for the comparables rail.
 */
class PropertyController extends Controller
{
    use MapsMlsListings;

    private const SIMILAR_LIMIT = 24;

    public function show(string $mls): Response|HttpResponse
    {
        $owner = $this->resolveOwner();
        if (! $owner) {
            throw new NotFoundHttpException;
        }

        try {
            $result = app(MlsGateway::class)->search(
                $owner,
                MlsQuery::fromArray(['listing_ids' => [$mls], 'per_page' => 1]),
                ['primemls'],
            );
            $rows = $result->toArray()['listings'] ?? [];
            $listing = isset($rows[0]) ? $this->mapListing($rows[0]) : null;
        } catch (Throwable) {
            $listing = null;
        }

        if (! $listing) {
            throw new NotFoundHttpException('Listing not found.');
        }

        // Nearby active listings in the same town for the comparables rail.
        $similar = [];

        try {
            $sim = app(MlsGateway::class)->search(
                $owner,
                MlsQuery::fromArray([
                    'statuses' => ['Active'],
                    'cities' => array_filter([$listing['town']]),
                    'per_page' => self::SIMILAR_LIMIT,
                    'sort' => MlsQuery::SORT_NEWEST,
                ]),
                ['primemls'],
            );
            $similar = array_values(array_filter(array_map(
                fn (array $l): ?array => $this->mapListing($l),
                $sim->toArray()['listings'] ?? [],
            ), fn (?array $l): bool => $l !== null && $l['mlsNumber'] !== $listing['mlsNumber']));
        } catch (Throwable) {
            $similar = [];
        }

        return Inertia::render('property-detail', [
            'listing' => $listing,
            'similar' => $similar,
        ]);
    }
}
