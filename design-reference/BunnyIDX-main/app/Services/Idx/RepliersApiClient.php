<?php

declare(strict_types=1);

namespace App\Services\Idx;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RepliersApiClient
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('idx.repliers.base_url', 'https://api.repliers.io'), '/');
    }

    public function testConnection(string $apiKey): bool
    {
        $response = Http::timeout(15)
            ->withHeaders(['REPLIERS-API-KEY' => $apiKey])
            ->get("{$this->baseUrl}/listings", [
                'pageNum' => 1,
                'resultsPerPage' => 1,
            ]);

        return $response->successful();
    }

    /**
     * Search listings via Repliers API.
     * Accepts the same standardized filter keys as BridgeApiClient.
     */
    public function searchListings(string $apiKey, array $filters = []): array
    {
        $perPage = (int) ($filters['per_page'] ?? 20);
        $page = (int) ($filters['page'] ?? 1);

        $params = [
            'pageNum' => $page,
            'resultsPerPage' => $perPage,
            'sortBy' => $filters['sort_by'] ?? 'updatedOnDesc',
        ];

        // Single-value filters
        if (!empty($filters['city'])) {
            $params['city'] = $filters['city'];
        }
        if (!empty($filters['postal_code'])) {
            $params['postalCode'] = $filters['postal_code'];
        }
        if (!empty($filters['min_price'])) {
            $params['minPrice'] = $filters['min_price'];
        }
        if (!empty($filters['max_price'])) {
            $params['maxPrice'] = $filters['max_price'];
        }
        if (!empty($filters['min_beds'])) {
            $params['minBeds'] = $filters['min_beds'];
        }
        if (!empty($filters['min_baths'])) {
            $params['minBaths'] = $filters['min_baths'];
        }
        if (!empty($filters['property_type'])) {
            $params['type'] = $filters['property_type'];
        }
        if (!empty($filters['status'])) {
            $params['status'] = $filters['status'];
        }
        if (!empty($filters['query'])) {
            $params['search'] = $filters['query'];
        }
        if (!empty($filters['agent_id'])) {
            $params['agentId'] = $filters['agent_id'];
        }
        if (!empty($filters['office_id'])) {
            $params['officeId'] = $filters['office_id'];
        }
        if (!empty($filters['mls_number'])) {
            $params['mlsNumber'] = $filters['mls_number'];
        }

        // Multi-value filters from constraints
        if (!empty($filters['property_types']) && is_array($filters['property_types'])) {
            $params['type'] = implode(',', $filters['property_types']);
        }
        if (!empty($filters['statuses']) && is_array($filters['statuses'])) {
            $params['status'] = implode(',', $filters['statuses']);
        }
        if (!empty($filters['cities']) && is_array($filters['cities'])) {
            $params['city'] = implode(',', $filters['cities']);
        }

        // Size/year/DOM filters
        if (!empty($filters['min_sqft'])) {
            $params['minSqft'] = $filters['min_sqft'];
        }
        if (!empty($filters['max_sqft'])) {
            $params['maxSqft'] = $filters['max_sqft'];
        }

        $response = Http::timeout(15)
            ->retry(1, 500)
            ->withHeaders(['REPLIERS-API-KEY' => $apiKey])
            ->get("{$this->baseUrl}/listings", $params);

        if (!$response->successful()) {
            Log::warning('Repliers API search failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return ['listings' => [], 'total' => 0, 'error' => 'API request failed (' . $response->status() . ')'];
        }

        $data = $response->json();

        // Post-filter for constraints the Repliers API doesn't support natively
        $listings = array_map(
            fn (array $raw) => $this->normalize($raw),
            $data['listings'] ?? [],
        );

        $listings = $this->postFilter($listings, $filters);

        return [
            'listings' => array_values($listings),
            'total' => $data['count'] ?? count($listings),
        ];
    }

    public function getListing(string $apiKey, string $mlsNumber): ?array
    {
        $response = Http::timeout(15)
            ->withHeaders(['REPLIERS-API-KEY' => $apiKey])
            ->get("{$this->baseUrl}/listings/{$mlsNumber}");

        if (!$response->successful()) {
            return null;
        }

        return $this->normalize($response->json());
    }

    /**
     * Apply filters that the Repliers API doesn't support natively.
     * These are applied client-side after fetching.
     */
    private function postFilter(array $listings, array $filters): array
    {
        return array_filter($listings, function (array $listing) use ($filters) {
            // Year built range
            if (!empty($filters['min_year_built']) && $listing['year_built'] !== null && $listing['year_built'] < $filters['min_year_built']) {
                return false;
            }
            if (!empty($filters['max_year_built']) && $listing['year_built'] !== null && $listing['year_built'] > $filters['max_year_built']) {
                return false;
            }

            // Days on market
            if (!empty($filters['max_dom']) && $listing['days_on_market'] !== null && $listing['days_on_market'] > $filters['max_dom']) {
                return false;
            }

            // Postal code restrictions (multi-value)
            if (!empty($filters['postal_codes']) && is_array($filters['postal_codes'])) {
                $zip = $listing['address']['postal_code'] ?? '';
                $match = false;
                foreach ($filters['postal_codes'] as $allowed) {
                    if ($zip && str_starts_with($zip, $allowed)) {
                        $match = true;
                        break;
                    }
                }
                if (!$match) {
                    return false;
                }
            }

            // Keyword inclusion
            if (!empty($filters['keywords']) && is_array($filters['keywords'])) {
                $desc = strtolower($listing['description'] ?? '');
                foreach ($filters['keywords'] as $kw) {
                    if (!str_contains($desc, strtolower($kw))) {
                        return false;
                    }
                }
            }

            // Keyword exclusion
            if (!empty($filters['exclude_keywords']) && is_array($filters['exclude_keywords'])) {
                $desc = strtolower($listing['description'] ?? '');
                foreach ($filters['exclude_keywords'] as $kw) {
                    if (str_contains($desc, strtolower($kw))) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    private function normalize(array $raw): array
    {
        $photos = [];
        if (!empty($raw['images'])) {
            $photos = array_column($raw['images'], 'url');
            $photos = array_values(array_filter($photos));
        }

        $address = $raw['address'] ?? [];

        $details = $raw['details'] ?? [];
        $sqft = isset($details['sqft']) ? (int) $details['sqft'] : null;
        $price = (int) ($raw['listPrice'] ?? 0);

        return [
            'mls_id' => $raw['mlsNumber'] ?? null,
            'mls_number' => $raw['mlsNumber'] ?? null,
            'mls_slug' => 'repliers',
            'price' => $price,
            'currency' => 'CAD',
            'price_formatted' => '$' . number_format((float) $price),
            'price_per_sqft' => ($price && $sqft) ? round($price / $sqft) : null,
            'original_price' => null,
            'sold_price' => isset($raw['soldPrice']) ? (int) $raw['soldPrice'] : null,
            'address' => [
                'street' => $address['streetAddress'] ?? null,
                'city' => $address['city'] ?? null,
                'state_province' => $address['state'] ?? $address['province'] ?? null,
                'postal_code' => $address['zip'] ?? $address['postalCode'] ?? null,
                'country' => 'CA',
                'county' => $address['county'] ?? null,
                'full' => trim(implode(', ', array_filter([
                    $address['streetAddress'] ?? null,
                    $address['city'] ?? null,
                    $address['state'] ?? $address['province'] ?? null,
                    $address['zip'] ?? $address['postalCode'] ?? null,
                ]))),
            ],
            'subdivision' => $address['neighbourhood'] ?? null,
            'bedrooms' => isset($details['numBedrooms']) ? (int) $details['numBedrooms'] : null,
            'bathrooms' => isset($details['numBathrooms']) ? (float) $details['numBathrooms'] : null,
            'bathrooms_half' => null,
            'sqft' => $sqft,
            'lot_sqft' => isset($details['lotSize']) ? (int) $details['lotSize'] : null,
            'year_built' => isset($details['yearBuilt']) ? (int) $details['yearBuilt'] : null,
            'stories' => isset($details['stories']) ? (float) $details['stories'] : null,
            'property_type' => $raw['type'] ?? null,
            'property_subtype' => $details['style'] ?? null,
            'style' => null,
            'construction' => null,
            'roof' => null,
            'status' => $raw['status'] ?? null,
            'days_on_market' => isset($raw['daysOnMarket']) ? (int) $raw['daysOnMarket'] : null,
            'lat' => isset($raw['map']['latitude']) ? (float) $raw['map']['latitude'] : null,
            'lng' => isset($raw['map']['longitude']) ? (float) $raw['map']['longitude'] : null,
            'photos' => $photos,
            'photo_count' => count($photos),
            'virtual_tour_url' => $raw['virtualTourUrl'] ?? null,
            // Interior
            'features' => $details['extras'] ?? [],
            'appliances' => [],
            'flooring' => null,
            'cooling' => null,
            'heating' => null,
            'furnished' => null,
            'fireplaces' => null,
            // Exterior
            'exterior_features' => [],
            'pool' => false,
            'pool_features' => null,
            'waterfront' => false,
            'waterfront_features' => null,
            'view' => null,
            // Parking
            'garage_spaces' => isset($details['garageSpaces']) ? (int) $details['garageSpaces'] : null,
            'parking' => null,
            // Financial
            'hoa_fee' => null,
            'hoa_frequency' => null,
            'tax_amount' => isset($raw['taxes']['annualAmount']) ? (float) $raw['taxes']['annualAmount'] : null,
            'tax_year' => isset($raw['taxes']['year']) ? (int) $raw['taxes']['year'] : null,
            // Agent/Office
            'list_agent_name' => $raw['agents'][0]['name'] ?? null,
            'list_agent_id' => $raw['agents'][0]['agentId'] ?? null,
            'list_office_name' => $raw['office']['name'] ?? null,
            'list_office_id' => $raw['office']['officeId'] ?? null,
            'buyer_agent_name' => null,
            'buyer_office_name' => null,
            // Dates
            'list_date' => $raw['listDate'] ?? null,
            'sold_date' => $raw['soldDate'] ?? null,
            'modification_ts' => $raw['updatedOn'] ?? null,
            'description' => $details['description'] ?? null,
        ];
    }
}
