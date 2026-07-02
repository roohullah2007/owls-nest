<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use App\Models\User;

/**
 * Shared PrimeMLS → frontend `Listing` mapping for the marketing pages (the home
 * Featured Listings rail + Featured Properties slider, and the standalone
 * Featured Properties page). Produces the compact `Listing` shape the overlay /
 * slide-up / row cards consume, so those pages render live MLS data and never
 * drift apart.
 */
trait MapsFeaturedListings
{
    /** The single broker/owner user whose IDX connections back the public pages. */
    private function resolveOwner(): ?User
    {
        return User::query()->whereHas('idxConnections')->orderBy('id')->first()
            ?? User::query()->orderBy('id')->first();
    }

    /**
     * Map a normalized MLS listing array to the frontend `Listing` shape.
     *
     * @param  array<string, mixed>  $l
     * @return array<string, mixed>
     */
    private function mapFeaturedListing(array $l): array
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
