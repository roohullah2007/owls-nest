<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\MapsMlsListings;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Public PrimeMLS (Paragon) property search. `index()` renders the Inertia
 * search page seeded with a live batch of PrimeMLS listings; `search()` is the
 * JSON endpoint the page can re-query as filters change.
 */
class PropertySearchController extends Controller
{
    use MapsMlsListings;

    /** Listings seeded into the page on first load. */
    private const INITIAL_LIMIT = 60;

    public function index(): Response
    {
        $owner = $this->resolveOwner();
        $listings = [];

        if ($owner) {
            try {
                $result = app(MlsGateway::class)->search(
                    $owner,
                    MlsQuery::fromArray([
                        'statuses' => ['Active'],
                        'per_page' => self::INITIAL_LIMIT,
                        'sort' => MlsQuery::SORT_NEWEST,
                    ]),
                    ['primemls'],
                );
                $listings = array_values(array_filter(array_map(
                    fn (array $l): ?array => $this->mapListing($l),
                    $result->toArray()['listings'],
                )));
            } catch (Throwable) {
                $listings = [];
            }
        }

        return Inertia::render('property-search', ['listings' => $listings]);
    }

    public function search(Request $request): JsonResponse
    {
        $owner = $this->resolveOwner();
        if (! $owner) {
            return response()->json(['listings' => [], 'total' => 0]);
        }

        try {
            $result = app(MlsGateway::class)->search($owner, MlsQuery::fromArray($request->all()), ['primemls']);
        } catch (Throwable) {
            return response()->json(['listings' => [], 'total' => 0]);
        }

        $data = $result->toArray();
        $listings = array_values(array_filter(array_map(
            fn (array $l): ?array => $this->mapListing($l),
            $data['listings'],
        )));

        return response()->json([
            'listings' => $listings,
            'total' => $data['total'] ?? count($listings),
        ]);
    }
}
