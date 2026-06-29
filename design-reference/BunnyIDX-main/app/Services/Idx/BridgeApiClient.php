<?php

declare(strict_types=1);

namespace App\Services\Idx;

use App\Services\Idx\Concerns\BuildsResoODataFilters;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BridgeApiClient
{
    use BuildsResoODataFilters;

    /** Cache TTL in seconds for successful search responses. */
    private const SEARCH_CACHE_TTL = 300;

    private string $odataUrl;

    private string $serverToken;

    public function __construct()
    {
        $this->odataUrl = rtrim(config('idx.bridge.odata_url'), '/').'/';
        $this->serverToken = config('idx.bridge.server_token') ?? '';
    }

    /**
     * Test that we can reach a given MLS dataset.
     * Uses system-level server token — no per-user key needed for Bridge.
     */
    public function testConnection(string $mlsSlug): bool
    {
        if (! $this->serverToken) {
            Log::error('Bridge server token not configured');

            return false;
        }

        $response = Http::timeout(15)
            ->get("{$this->odataUrl}{$mlsSlug}/Property", [
                'access_token' => $this->serverToken,
                '$top' => 1,
                '$select' => 'ListingKey',
            ]);

        return $response->successful();
    }

    /**
     * Search listings in a Bridge MLS dataset.
     *
     * Successful responses are cached for SEARCH_CACHE_TTL (5 min) keyed by
     * (slug + filter hash). Errors are NEVER cached — a transient Bridge
     * failure shouldn't poison subsequent retries.
     */
    public function searchListings(string $mlsSlug, array $filters = []): array
    {
        if (! $this->serverToken) {
            return ['listings' => [], 'total' => 0, 'error' => 'Bridge API not configured'];
        }

        $cacheKey = 'mls:bridge:search:'.$mlsSlug.':'.sha1(json_encode($filters));
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $perPage = (int) ($filters['per_page'] ?? 20);
        $page = (int) ($filters['page'] ?? 1);

        // Projection — picks the SELECT field set + tweaks $top.
        $projection = (string) ($filters['projection'] ?? 'detail');

        // SELECT resolution: explicit `select` filter wins; otherwise pick by
        // projection (DEFAULT_SELECT for detail, LITE_SELECT for map view, none
        // for count-only). Per-dataset `select_extras` always merges in.
        $select = $filters['select'] ?? null;
        if ($select === null) {
            $base = match ($projection) {
                'lite' => self::LITE_SELECT,
                'count' => [],
                default => self::DEFAULT_SELECT,
            };
            $extras = $filters['select_extras'] ?? [];
            $select = implode(',', array_unique(array_merge($base, is_array($extras) ? $extras : [])));
        }

        // Sort
        $orderby = $filters['orderby'] ?? $this->sortToODataOrderby((string) ($filters['sort'] ?? 'modified_desc'));

        $params = [
            'access_token' => $this->serverToken,
            '$top' => $projection === 'count' ? 0 : $perPage,
            '$skip' => ($page - 1) * $perPage,
            '$orderby' => $orderby,
            '$count' => 'true',
        ];
        if ($select !== '') {
            $params['$select'] = $select;
        }

        // "Has open house" = the Property is in the upcoming OpenHouse
        // resource — Bridge has no Property-level open-house field, so resolve
        // the keys first and narrow the search to them.
        if (! empty($filters['has_open_house'])) {
            unset($filters['has_open_house']);
            $ohKeys = $this->upcomingOpenHouseListingKeys($mlsSlug);
            if ($ohKeys === []) {
                $empty = ['listings' => [], 'total' => 0];
                Cache::put($cacheKey, $empty, 300);

                return $empty;
            }
            $filters['listing_keys'] = $ohKeys;
        }

        // Build OData $filter
        $filterParts = $this->buildFilterParts($filters);

        if (! empty($filterParts)) {
            $params['$filter'] = implode(' and ', $filterParts);
        }

        // Bridge sometimes answers 202 with an EMPTY text/html body (upstream
        // throttling / dataset warming). That's a 2xx, so successful() passes —
        // but it is NOT an empty result set; it means "retry shortly". Retry a
        // couple of times so a briefly-throttled MLS doesn't silently vanish
        // from multi-MLS fan-out results. Without the payload guard the empty
        // "success" would get cached and the MLS disappear for 5 minutes with
        // no error anywhere.
        $data = null;
        $response = null;
        for ($attempt = 0; $attempt < 3; $attempt++) {
            if ($attempt > 0) {
                sleep(1);
            }

            $response = Http::timeout(20)
                ->retry(1, 500)
                ->get("{$this->odataUrl}{$mlsSlug}/Property", $params);

            if (! $response->successful()) {
                Log::warning('Bridge API search failed', [
                    'mls' => $mlsSlug,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return ['listings' => [], 'total' => 0, 'error' => 'API request failed ('.$response->status().')'];
            }

            $data = $response->json();
            if (is_array($data) && array_key_exists('value', $data)) {
                break;
            }
        }

        if (! is_array($data) || ! array_key_exists('value', $data)) {
            Log::warning('Bridge API search returned no OData payload', [
                'mls' => $mlsSlug,
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 200),
            ]);

            return ['listings' => [], 'total' => 0, 'error' => 'MLS feed temporarily unavailable (HTTP '.$response->status().')'];
        }

        $listings = array_map(
            fn (array $raw) => $this->normalize($raw, $mlsSlug),
            $data['value'] ?? [],
        );

        $result = [
            'listings' => $listings,
            'total' => $data['@odata.count'] ?? count($listings),
        ];

        Cache::put($cacheKey, $result, self::SEARCH_CACHE_TTL);

        return $result;
    }

    /**
     * Distinct ListingKeys with an upcoming open house — powers the
     * has_open_house search filter. 15-min cache; 401/throttle → [].
     *
     * @return string[]
     */
    public function upcomingOpenHouseListingKeys(string $mlsSlug, int $limit = 50): array
    {
        if (! $this->serverToken) {
            return [];
        }

        $cacheKey = 'mls:bridge:ohkeys:'.$mlsSlug;
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');

        try {
            $response = Http::timeout(12)->retry(1, 500)->get("{$this->odataUrl}{$mlsSlug}/OpenHouse", [
                'access_token' => $this->serverToken,
                '$filter' => "OpenHouseStartTime ge {$now}",
                '$orderby' => 'OpenHouseStartTime asc',
                '$select' => 'ListingKey,OpenHouseStartTime',
                '$top' => 200, // Bridge's hard $top ceiling; duplicates collapse below
            ]);
            if (! $response->successful()) {
                return [];
            }
            $data = $response->json();
            if (! is_array($data) || ! array_key_exists('value', $data)) {
                return []; // body-less 202 — throttled, don't cache
            }
        } catch (\Throwable) {
            return [];
        }

        $keys = [];
        foreach ((array) $data['value'] as $row) {
            $key = (string) ($row['ListingKey'] ?? '');
            if ($key !== '') {
                $keys[$key] = true;
            }
        }
        $keys = array_slice(array_keys($keys), 0, $limit);

        Cache::put($cacheKey, $keys, now()->addMinutes(15));

        return $keys;
    }

    /**
     * Upcoming open houses for a page of listings — one query against the
     * RESO OpenHouse resource, keyed by ListingKey. Returns
     * [listingKey => [{start, end, remarks}], …]; failures degrade to [].
     *
     * @param  string[]  $listingKeys
     * @return array<string, array<int, array{start: string, end: ?string, remarks: ?string}>>
     */
    public function openHousesFor(string $mlsSlug, array $listingKeys): array
    {
        $keys = array_values(array_filter(array_map('strval', $listingKeys)));
        if (! $this->serverToken || $keys === []) {
            return [];
        }

        $cacheKey = 'mls:bridge:oh:'.$mlsSlug.':'.sha1(json_encode($keys));
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        // OData has no IN — OR the keys (a results page is ~20 listings).
        $keyFilter = '('.implode(' or ', array_map(
            fn ($k) => "ListingKey eq '".str_replace("'", "''", $k)."'",
            array_slice($keys, 0, 50),
        )).')';
        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');

        // Same body-less 202 guard as searchListings — Bridge answers 202
        // with an empty body while throttling/warming; retry briefly.
        $rows = null;
        try {
            for ($attempt = 0; $attempt < 3; $attempt++) {
                if ($attempt > 0) {
                    sleep(1);
                }
                $response = Http::timeout(12)->get("{$this->odataUrl}{$mlsSlug}/OpenHouse", [
                    'access_token' => $this->serverToken,
                    '$filter' => "{$keyFilter} and OpenHouseStartTime ge {$now}",
                    '$orderby' => 'OpenHouseStartTime asc',
                    '$select' => 'ListingKey,OpenHouseStartTime,OpenHouseEndTime,OpenHouseRemarks',
                    '$top' => 200,
                ]);
                if (! $response->successful()) {
                    return [];
                }
                $data = $response->json();
                if (is_array($data) && array_key_exists('value', $data)) {
                    $rows = (array) $data['value'];
                    break;
                }
            }
        } catch (\Throwable) {
            return [];
        }
        if ($rows === null) {
            return []; // still throttled — don't cache, try again next page load
        }

        $out = [];
        foreach ($rows as $row) {
            $key = (string) ($row['ListingKey'] ?? '');
            $start = (string) ($row['OpenHouseStartTime'] ?? '');
            if ($key === '' || $start === '') {
                continue;
            }
            $out[$key][] = [
                'start' => $start,
                'end' => $row['OpenHouseEndTime'] ?? null,
                'remarks' => $row['OpenHouseRemarks'] ?? null,
            ];
        }

        Cache::put($cacheKey, $out, now()->addMinutes(15));

        return $out;
    }

    public function getListing(string $mlsSlug, string $listingKey): ?array
    {
        if (! $this->serverToken) {
            return null;
        }

        $response = Http::timeout(15)
            ->get("{$this->odataUrl}{$mlsSlug}/Property('{$listingKey}')", [
                'access_token' => $this->serverToken,
            ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        // Same body-less 202 guard as searchListings — a 2xx without a
        // parseable listing payload is a miss, not a listing.
        if (! is_array($data) || empty($data['ListingKey'])) {
            return null;
        }

        return $this->normalize($data, $mlsSlug);
    }

    /**
     * Get listings for a specific agent.
     */
    public function getAgentListings(string $mlsSlug, string $agentId, int $perPage = 20): array
    {
        return $this->searchListings($mlsSlug, [
            'agent_id' => $agentId,
            'per_page' => $perPage,
        ]);
    }

    /**
     * Get listings for a specific office.
     */
    public function getOfficeListings(string $mlsSlug, string $officeId, int $perPage = 20): array
    {
        return $this->searchListings($mlsSlug, [
            'office_id' => $officeId,
            'per_page' => $perPage,
        ]);
    }

    /**
     * Normalize a Bridge API listing to our standard listing object.
     * Output shape feeds MlsListing::fromNormalizedArray — keys are stable.
     */
    private function normalize(array $raw, string $mlsSlug): array
    {
        // Split Media by category — gallery photos vs floorplans/sketches.
        $photos = [];
        $floorplans = [];
        if (! empty($raw['Media'])) {
            // Sort by Order when present so the lightbox starts on the listing's hero shot.
            $media = $raw['Media'];
            usort($media, static fn ($a, $b) => ($a['Order'] ?? 0) <=> ($b['Order'] ?? 0));
            foreach ($media as $m) {
                $url = $m['MediaURL'] ?? null;
                if (! $url) {
                    continue;
                }
                $cat = strtolower((string) ($m['MediaCategory'] ?? ''));
                if (str_contains($cat, 'floor') || str_contains($cat, 'sketch')) {
                    $floorplans[] = $url;
                } else {
                    $photos[] = $url;
                }
            }
        }

        // Address — UnparsedAddress often already carries city/state/zip; use as-is when so.
        $street = $raw['UnparsedAddress'] ?? null;
        $city = $raw['City'] ?? null;
        $state = $raw['StateOrProvince'] ?? null;
        $zip = $raw['PostalCode'] ?? null;
        $fullAddress = ($street && ($city || $state))
            ? $street
            : trim(implode(', ', array_filter([$street, $city, $state, $zip])));

        // Bathrooms: prefer the decimal total, then full, then plain integer.
        $bathrooms = null;
        if (isset($raw['BathroomsTotalDecimal'])) {
            $bathrooms = (float) $raw['BathroomsTotalDecimal'];
        } elseif (isset($raw['BathroomsFull'])) {
            $bathrooms = (float) $raw['BathroomsFull'];
        } elseif (isset($raw['BathroomsTotalInteger'])) {
            $bathrooms = (float) $raw['BathroomsTotalInteger'];
        }

        $sqft = isset($raw['LivingArea']) ? (int) $raw['LivingArea'] : null;
        $price = isset($raw['ListPrice']) ? (int) $raw['ListPrice'] : null;

        // Lot acres — direct field, or derived from LotSizeSquareFeet (43560 sqft = 1 acre).
        $lotAcres = null;
        if (isset($raw['LotSizeAcres'])) {
            $lotAcres = (float) $raw['LotSizeAcres'];
        } elseif (isset($raw['LotSizeSquareFeet']) && $raw['LotSizeSquareFeet'] > 0) {
            $lotAcres = round((float) $raw['LotSizeSquareFeet'] / 43560, 3);
        } elseif (
            isset($raw['LotSizeArea'])
            && stripos((string) ($raw['LotSizeUnits'] ?? ''), 'acre') !== false
        ) {
            $lotAcres = (float) $raw['LotSizeArea'];
        }

        // Days on market — prefer DaysOnMarket; fall back to cumulative; final fallback derives from OnMarketDate.
        $dom = $raw['DaysOnMarket'] ?? $raw['CumulativeDaysOnMarket'] ?? null;
        if ($dom === null && ! empty($raw['OnMarketDate'])) {
            try {
                $dom = max(0, (int) (new \DateTimeImmutable)->diff(new \DateTimeImmutable($raw['OnMarketDate']))->days);
            } catch (\Throwable) {
                $dom = null;
            }
        }
        $dom = $dom !== null ? (int) $dom : null;

        // Prefer unbranded for IDX display (MLS rule: branded tours can't appear on third-party IDX surfaces).
        $tourUrl = $raw['VirtualTourURLUnbranded']
            ?? $raw['VirtualTourURLBranded']
            ?? $raw['VirtualTourURLZillow']
            ?? null;

        return [
            // Identity / type / status
            'mls_id' => $raw['ListingKey'] ?? null,
            'mls_number' => $raw['ListingId'] ?? $raw['ListingKey'] ?? null,
            'mls_slug' => $mlsSlug,
            'status' => $raw['StandardStatus'] ?? null,
            'property_type' => $raw['PropertyType'] ?? null,
            'property_subtype' => $raw['PropertySubType'] ?? null,
            'style' => $raw['ArchitecturalStyle'] ?? null,
            'new_construction' => isset($raw['NewConstructionYN']) ? (bool) $raw['NewConstructionYN'] : null,
            // Price + history
            'price' => $price,
            'currency' => 'USD',
            'price_formatted' => $price !== null ? '$'.number_format($price) : null,
            'price_per_sqft' => ($price && $sqft) ? (int) round($price / $sqft) : null,
            'original_price' => isset($raw['OriginalListPrice']) ? (int) $raw['OriginalListPrice'] : null,
            'previous_price' => isset($raw['PreviousListPrice']) ? (int) $raw['PreviousListPrice'] : null,
            'sold_price' => isset($raw['ClosePrice']) ? (int) $raw['ClosePrice'] : null,
            'price_changed_at' => $raw['PriceChangeTimestamp'] ?? null,
            // Location
            'address' => [
                'street' => $street,
                'city' => $city,
                'state_province' => $state,
                'postal_code' => $zip,
                'country' => $raw['Country'] ?? 'US',
                'county' => $raw['CountyOrParish'] ?? null,
                'full' => $fullAddress,
            ],
            'lat' => isset($raw['Latitude']) ? (float) $raw['Latitude'] : null,
            'lng' => isset($raw['Longitude']) ? (float) $raw['Longitude'] : null,
            'subdivision' => $raw['SubdivisionName'] ?? null,
            'mls_area' => $raw['MLSAreaMajor'] ?? null,
            // Structure
            'bedrooms' => isset($raw['BedroomsTotal']) ? (int) $raw['BedroomsTotal'] : null,
            'bathrooms' => $bathrooms,
            'bathrooms_full' => isset($raw['BathroomsFull']) ? (int) $raw['BathroomsFull'] : null,
            'bathrooms_half' => isset($raw['BathroomsHalf']) ? (int) $raw['BathroomsHalf'] : null,
            'sqft' => $sqft,
            'lot_sqft' => isset($raw['LotSizeSquareFeet']) ? (int) $raw['LotSizeSquareFeet'] : null,
            'lot_acres' => $lotAcres,
            'year_built' => isset($raw['YearBuilt']) ? (int) $raw['YearBuilt'] : null,
            'stories' => isset($raw['Stories']) ? (float) $raw['Stories'] : null,
            'garage_spaces' => isset($raw['GarageSpaces']) ? (int) $raw['GarageSpaces'] : null,
            // Content
            'description' => $raw['PublicRemarks'] ?? null,
            'photos' => $photos,
            'photo_count' => count($photos),
            'floorplans' => $floorplans,
            'virtual_tour_url' => $tourUrl,
            // Features (always-arrays — UI joins with commas as needed)
            'features' => $raw['InteriorFeatures'] ?? [],
            'appliances' => $raw['Appliances'] ?? [],
            'exterior_features' => $raw['ExteriorFeatures'] ?? [],
            'cooling' => $raw['Cooling'] ?? [],
            'heating' => $raw['Heating'] ?? [],
            'flooring' => $raw['Flooring'] ?? [],
            'parking' => $raw['ParkingFeatures'] ?? [],
            'view' => $raw['View'] ?? [],
            'pets_allowed' => $raw['PetsAllowed'] ?? [],
            'security_features' => $raw['SecurityFeatures'] ?? [],
            'window_features' => $raw['WindowFeatures'] ?? [],
            'furnished' => $raw['Furnished'] ?? null,
            // Pool / waterfront
            'pool' => ! empty($raw['PoolPrivateYN']),
            'pool_features' => $raw['PoolFeatures'] ?? [],
            'waterfront' => ! empty($raw['WaterfrontYN']),
            'waterfront_features' => $raw['WaterfrontFeatures'] ?? [],
            // HOA / tax
            'hoa_fee' => isset($raw['AssociationFee']) ? (int) $raw['AssociationFee'] : null,
            'hoa_frequency' => $raw['AssociationFeeFrequency'] ?? null,
            'hoa_name' => $raw['AssociationName'] ?? null,
            'tax_amount' => isset($raw['TaxAnnualAmount']) ? (int) $raw['TaxAnnualAmount'] : null,
            'tax_year' => isset($raw['TaxYear']) ? (int) $raw['TaxYear'] : null,
            // Schools
            'elementary_school' => $raw['ElementarySchool'] ?? null,
            'middle_school' => $raw['MiddleOrJuniorSchool'] ?? null,
            'high_school' => $raw['HighSchool'] ?? null,
            'school_district' => $raw['SchoolDistrict'] ?? null,
            // Agents — sub-DTO shape AND flat legacy aliases. MlsListing
            // promotes both forms identically; direct BridgeApiClient callers
            // (existing tests, legacy controllers) read flat keys.
            'listing_agent' => [
                'name' => $raw['ListAgentFullName'] ?? null,
                'mls_id' => $raw['ListAgentMlsId'] ?? null,
                'email' => $raw['ListAgentEmail'] ?? null,
                'phone' => $raw['ListAgentDirectPhone'] ?? null,
                'office_name' => $raw['ListOfficeName'] ?? null,
                'office_mls_id' => $raw['ListOfficeMlsId'] ?? null,
                'office_phone' => $raw['ListOfficePhone'] ?? null,
            ],
            'co_listing_agent' => [
                'name' => $raw['CoListAgentFullName'] ?? null,
                'mls_id' => $raw['CoListAgentMlsId'] ?? null,
                'email' => $raw['CoListAgentEmail'] ?? null,
                'office_name' => $raw['CoListOfficeName'] ?? null,
                'office_mls_id' => $raw['CoListOfficeMlsId'] ?? null,
            ],
            'list_agent_name' => $raw['ListAgentFullName'] ?? null,
            'list_agent_id' => $raw['ListAgentMlsId'] ?? null,
            'list_office_name' => $raw['ListOfficeName'] ?? null,
            'list_office_id' => $raw['ListOfficeMlsId'] ?? null,
            'buyer_agent_name' => $raw['BuyerAgentFullName'] ?? null,
            'buyer_office_name' => $raw['BuyerOfficeName'] ?? null,
            // Timeline
            'list_date' => $raw['ListingContractDate'] ?? $raw['OnMarketDate'] ?? null,
            'on_market_date' => $raw['OnMarketDate'] ?? null,
            'pending_date' => $raw['PendingTimestamp'] ?? null,
            'sold_date' => $raw['CloseDate'] ?? null,
            'status_changed_at' => $raw['StatusChangeTimestamp'] ?? null,
            'modification_ts' => $raw['ModificationTimestamp'] ?? null,
            // Computed
            'days_on_market' => $dom,
        ];
    }

    /**
     * Lean field set for map / list views — drops description, features,
     * agent details, taxonomy that aren't needed when rendering pins or
     * compact cards. Cuts payload ~10x vs DEFAULT_SELECT.
     */
    private const LITE_SELECT = [
        'ListingKey', 'ListingId', 'StandardStatus',
        'PropertyType', 'PropertySubType',
        'ListPrice', 'OriginalListPrice',
        'UnparsedAddress', 'City', 'StateOrProvince', 'PostalCode',
        'BedroomsTotal', 'BathroomsTotalDecimal', 'LivingArea',
        'Latitude', 'Longitude',
        'ListingContractDate', 'OnMarketDate', 'ModificationTimestamp',
        'Media',
    ];

    /**
     * Universally-supported Bridge fields — safe to request from any dataset.
     * Per-MLS additional fields are appended at runtime via the `select_extras`
     * filter (driver supplies them from the dataset's getExtraSelectFields()).
     *
     * If a field is rejected by Bridge with 400 "Cannot select the following
     * field(s)", remove it from here and move it to the relevant dataset's
     * getExtraSelectFields() — never universally.
     */
    private const DEFAULT_SELECT = [
        // Identity / status
        'ListingKey', 'ListingId', 'StandardStatus', 'MlsStatus',
        // Type
        'PropertyType', 'PropertySubType', 'ArchitecturalStyle',
        // Price (current + history)
        'ListPrice', 'OriginalListPrice', 'PreviousListPrice', 'ClosePrice', 'PriceChangeTimestamp',
        // Address
        'UnparsedAddress', 'City', 'StateOrProvince', 'PostalCode', 'Country',
        'CountyOrParish', 'SubdivisionName', 'MLSAreaMajor',
        // Structure
        'BedroomsTotal', 'BathroomsTotalDecimal', 'BathroomsFull', 'BathroomsTotalInteger', 'BathroomsHalf',
        'LivingArea', 'LotSizeSquareFeet',
        'YearBuilt', 'Stories', 'NewConstructionYN',
        'ConstructionMaterials', 'Roof',
        // Geo + DOM
        'DaysOnMarket', 'Latitude', 'Longitude',
        // Interior
        'InteriorFeatures', 'Appliances', 'Flooring', 'Cooling', 'Heating', 'Furnished',
        'WindowFeatures', 'SecurityFeatures',
        // Exterior
        'ExteriorFeatures', 'PatioAndPorchFeatures',
        'PoolPrivateYN', 'PoolFeatures', 'WaterfrontYN', 'WaterfrontFeatures', 'View',
        // Parking
        'GarageSpaces', 'ParkingFeatures',
        // HOA / tax
        'AssociationFee', 'AssociationFeeFrequency', 'AssociationAmenities',
        'TaxAnnualAmount', 'TaxYear',
        // Pets / rules
        'PetsAllowed',
        // Schools (Elementary/Middle/High are widely supported; SchoolDistrict is per-MLS)
        'ElementarySchool', 'MiddleOrJuniorSchool', 'HighSchool',
        // Agent / office (IDX-permitted contact fields)
        'ListAgentFullName', 'ListAgentMlsId', 'ListAgentEmail', 'ListAgentDirectPhone',
        'ListOfficeName', 'ListOfficeMlsId', 'ListOfficePhone',
        'CoListAgentFullName', 'CoListAgentMlsId', 'CoListAgentEmail',
        'CoListOfficeName', 'CoListOfficeMlsId',
        'BuyerAgentFullName', 'BuyerOfficeName',
        // Timeline
        'ListingContractDate', 'OnMarketDate', 'PendingTimestamp', 'CloseDate',
        'StatusChangeTimestamp', 'ModificationTimestamp',
        // Media + content
        'PublicRemarks', 'VirtualTourURLUnbranded', 'VirtualTourURLZillow', 'Media',
    ];
}
