<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use App\Models\User;

/**
 * Shared PrimeMLS → frontend SearchListing mapping, used by both the search page
 * and the standalone property-detail page so the two never drift.
 */
trait MapsMlsListings
{
    /** The broker/owner user whose IDX connection backs the public search. */
    private function resolveOwner(): ?User
    {
        return User::query()->whereHas('idxConnections')->orderBy('id')->first()
            ?? User::query()->orderBy('id')->first();
    }

    /**
     * Map a normalized PrimeMLS listing to the frontend SearchListing shape the
     * search page, map markers, cards and detail page consume. Returns null for
     * listings with no usable image (the grid only shows listings with photos).
     *
     * @param  array<string, mixed>  $l
     * @return array<string, mixed>|null
     */
    private function mapListing(array $l): ?array
    {
        $photos = is_array($l['photos'] ?? null) ? array_values(array_filter($l['photos'])) : [];
        if ($photos === []) {
            return null;
        }

        $address = is_array($l['address'] ?? null) ? $l['address'] : [];
        $full = (string) ($address['full'] ?? '');
        $price = isset($l['price']) ? (int) $l['price'] : 0;
        $sqftNum = (int) ($l['sqft'] ?? 0);
        $beds = (int) ($l['bedrooms'] ?? 0);
        $baths = (float) ($l['bathrooms'] ?? 0);
        $original = isset($l['original_price']) ? (int) $l['original_price'] : 0;

        $priceChange = null;
        if ($original > 0 && $price > 0 && $original !== $price) {
            $priceChange = $price < $original ? 'reduced' : 'increased';
        }

        $statusRaw = (string) ($l['status'] ?? 'Active');

        // Lot size + price/ft² are DERIVED here — the Paragon feed gives us
        // LotSizeSquareFeet (no acres) and no price-per-sqft, so compute both.
        $lotSqft = (float) ($l['lot_sqft'] ?? 0);
        $acres = $lotSqft > 0 ? number_format($lotSqft / 43560, 2).' acres' : '';
        $ppsf = ($price > 0 && $sqftNum > 0)
            ? '$'.number_format($price / $sqftNum).'/ft²'
            : '';

        $hoaFee = isset($l['hoa_fee']) ? (float) $l['hoa_fee'] : 0;
        $hoaFreq = (string) ($l['hoa_frequency'] ?? '');
        $taxAnnual = isset($l['tax_amount']) ? (int) $l['tax_amount'] : 0;

        // The human MLS number (ListingId) is the detail-page route key.
        $mlsNumber = (string) ($l['mls_number'] ?? '');
        $routeKey = $mlsNumber !== '' ? $mlsNumber : (string) ($l['mls_id'] ?? '');

        return [
            'id' => (string) ($l['mls_id'] ?? ''),
            'image' => $photos[0],
            'photos' => array_slice($photos, 0, 12),
            'alt' => $full,
            'status' => $this->displayStatus($statusRaw),
            'price' => $l['price_formatted'] ?? ($price ? '$'.number_format($price) : ''),
            'priceNum' => $price,
            'shortPrice' => $this->shortPrice($price),
            'beds' => $beds,
            'baths' => $baths,
            'fullBaths' => ! empty($l['bathrooms_full']) ? (string) $l['bathrooms_full'] : '',
            'bedsLabel' => $beds.' bd',
            'bathsLabel' => $this->trimNum($baths).' ba',
            'sqft' => $sqftNum ? number_format($sqftNum).' ft²' : '',
            'sqftNum' => $sqftNum,
            'acres' => $acres,
            'year' => (int) ($l['year_built'] ?? 0),
            'propType' => (string) ($l['property_type'] ?? ''),
            'subType' => (string) ($l['property_subtype'] ?? $l['property_type'] ?? ''),
            'county' => (string) ($address['county'] ?? ''),
            'town' => (string) ($address['city'] ?? ''),
            'state' => (string) ($address['state_province'] ?? ''),
            'address' => $full,
            'href' => $routeKey !== '' ? '/property/'.rawurlencode($routeKey) : '#',
            'lat' => isset($l['lat']) ? (float) $l['lat'] : 0,
            'lng' => isset($l['lng']) ? (float) $l['lng'] : 0,
            'desc' => (string) ($l['description'] ?? ''),
            'ppsf' => $ppsf,
            // ── Extra fields the BunnyIDX-style search card + detail page read ──
            'mlsNumber' => $mlsNumber,
            'office' => (string) ($l['list_office_name'] ?? ''),
            'agent' => (string) ($l['list_agent_name'] ?? ''),
            'subdivision' => $this->flatten($l['subdivision'] ?? null),
            'parking' => (int) ($l['garage_spaces'] ?? 0),
            'waterfront' => ! empty($l['waterfront']),
            // Water_View arrives as a RESO collection (array) on this feed.
            'view' => $this->flatten($l['view'] ?? null),
            'hoa' => $hoaFee > 0
                ? '$'.number_format($hoaFee).($hoaFreq !== '' ? ' / '.$hoaFreq : '')
                : '',
            'taxAnnual' => $taxAnnual > 0 ? '$'.number_format($taxAnnual) : '',
            'taxYear' => isset($l['tax_year']) ? (int) $l['tax_year'] : 0,
            'daysOnMarket' => isset($l['days_on_market']) ? (int) $l['days_on_market'] : null,
            'virtualTour' => ! empty($l['virtual_tour_url']),
            'priceChange' => $priceChange,
            'priceOriginal' => $original > 0 ? $original : null,
        ];
    }

    private function displayStatus(string $status): string
    {
        return match (true) {
            $status === 'Active' => 'For Sale',
            str_contains($status, 'Pending') => 'Pending',
            str_contains($status, 'Active Under Contract') => 'Under Contract',
            $status === 'Closed' => 'Sold',
            default => $status ?: 'For Sale',
        };
    }

    private function trimNum(float $n): string
    {
        return rtrim(rtrim(number_format($n, 1), '0'), '.');
    }

    /**
     * Flatten a feed value that may arrive as a RESO collection (array) into a
     * comma-joined string. Scalars pass through unchanged.
     */
    private function flatten(mixed $value): string
    {
        if (is_array($value)) {
            return implode(', ', array_filter(array_map('strval', $value), static fn (string $s): bool => $s !== ''));
        }

        return (string) ($value ?? '');
    }

    private function shortPrice(int $price): string
    {
        if ($price >= 1_000_000) {
            return '$'.rtrim(rtrim(number_format($price / 1_000_000, 2), '0'), '.').'M';
        }
        if ($price >= 1_000) {
            return '$'.(int) round($price / 1_000).'k';
        }

        return $price ? '$'.$price : '';
    }
}
