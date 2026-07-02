<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\MapsFeaturedListings;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsGateway;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Public home page. The Featured Listings rail and the Featured Properties
 * slider render the latest live PrimeMLS listings (never static fixtures); the
 * React page derives the slider slides from the same set. When the gateway is
 * unavailable the prop is an empty array and those sections don't render.
 */
class HomeController extends Controller
{
    use MapsFeaturedListings;

    public function index(): Response
    {
        $owner = $this->resolveOwner();
        $listings = [];

        if ($owner) {
            // Latest general PrimeMLS listings — single-broker site, PrimeMLS is
            // the only feed. Six covers the rail plus two slider slides of three.
            $query = MlsQuery::fromArray([
                'per_page' => 6,
                'sort' => MlsQuery::SORT_NEWEST,
            ]);

            try {
                $result = app(MlsGateway::class)->search($owner, $query, ['primemls']);
                $listings = array_map(
                    fn (array $l): array => $this->mapFeaturedListing($l),
                    $result->toArray()['listings'],
                );
            } catch (Throwable) {
                $listings = [];
            }
        }

        return Inertia::render('home', ['featuredListings' => $listings]);
    }
}
