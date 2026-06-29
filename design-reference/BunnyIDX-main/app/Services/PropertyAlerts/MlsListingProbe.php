<?php

declare(strict_types=1);

namespace App\Services\PropertyAlerts;

use App\Models\User;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsGateway;

/**
 * Thin, swappable seam over MlsGateway for the property-alert engine. Keeps the
 * (final) gateway untouched while letting tests inject canned listings. All
 * upstream errors are absorbed here so the alert engine degrades gracefully.
 */
class MlsListingProbe
{
    public function __construct(private readonly MlsGateway $gateway) {}

    /**
     * Run a saved search. Returns the matched listings, plus whether the search
     * errored at the MLS level (so the caller can avoid seeding an empty
     * baseline on a transient failure).
     *
     * @return array{listings: list<MlsListing>, errored: bool}
     */
    public function searchListings(User $user, MlsQuery $query): array
    {
        try {
            $result = $this->gateway->search($user, $query);
        } catch (\Throwable) {
            return ['listings' => [], 'errored' => true];
        }

        return [
            'listings' => $result->listings,
            'errored' => $result->listings === [] && $result->errors !== [],
        ];
    }

    public function getListing(User $user, string $mlsSlug, string $listingId): ?MlsListing
    {
        try {
            return $this->gateway->get($user, $mlsSlug, $listingId);
        } catch (\Throwable) {
            return null;
        }
    }
}
