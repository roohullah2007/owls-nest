<?php

declare(strict_types=1);

namespace App\Services\Idx;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Realtyna / RealtyFeed OData client.
 *
 * Multi-tenant model: ONE Realtyna account proxies access to N MLSes. Each MLS
 * is partitioned by `OriginatingSystemName` — the dataset's `getDatasetPath()`
 * supplies it and the client adds `$filter=OriginatingSystemName eq '...'` to
 * every request so a connection only ever sees its MLS's listings.
 *
 * Credentials are per-connection (admin-provisioned at integration time, see
 * RealtynaCredentials) with the platform .env account as fallback.
 *
 * Filter input accepts BOTH shapes:
 *  - canonical MlsQuery::toArray() (plural: cities[], statuses[], property_types[])
 *  - legacy CRM singular keys (city, status, property_type) from IdxSearchService
 *
 * Per-agent restriction is layered on top via `ListAgentMlsId` — stored on
 * IdxConnection.agent_id and injected by RealtynaDriver::prepareFilters().
 */
class RealtynaApiClient
{
    /**
     * Fields requested on every search. All verified against the live
     * RealtyFeed feed (nulls are omitted per-listing, never rejected) — if a
     * future Realtyna MLS rejects one, move it to that dataset's
     * getExtraSelectFields() and merge via the `select_extras` filter.
     */
    private const DEFAULT_SELECT = [
        'ListingKey', 'ListingId', 'OriginatingSystemName', 'StandardStatus',
        'PropertyType', 'PropertySubType',
        'ListPrice', 'OriginalListPrice', 'ClosePrice', 'PriceChangeTimestamp',
        'UnparsedAddress', 'City', 'StateOrProvince', 'PostalCode', 'CountyOrParish',
        'SubdivisionName', 'Latitude', 'Longitude',
        'BedroomsTotal', 'BathroomsTotalInteger', 'BathroomsFull', 'BathroomsHalf',
        'LivingArea', 'LotSizeSquareFeet', 'YearBuilt', 'StoriesTotal', 'GarageSpaces',
        'PoolPrivateYN', 'WaterfrontYN', 'WaterfrontFeatures', 'ViewYN', 'View',
        'NewConstructionYN', 'SeniorCommunityYN', 'PetsAllowed', 'Furnished',
        'InteriorFeatures', 'ExteriorFeatures', 'ArchitecturalStyle',
        'AssociationFee', 'AssociationFeeFrequency', 'TaxAnnualAmount', 'TaxYear',
        'PublicRemarks', 'VirtualTourURLUnbranded',
        'ListAgentMlsId', 'ListAgentFullName', 'ListAgentEmail', 'ListAgentDirectPhone',
        'ListOfficeMlsId', 'ListOfficeName',
        'ElementarySchool', 'MiddleOrJuniorSchool', 'HighSchool',
        'DaysOnMarket', 'OnMarketDate', 'StatusChangeTimestamp', 'PendingTimestamp',
        'CloseDate', 'ModificationTimestamp',
    ];

    public function __construct(
        private readonly RealtynaTokenManager $tokenManager,
    ) {}

    /**
     * Hit the Property endpoint as a cheap connectivity + scope test.
     */
    public function testConnection(string $originatingSystemName, ?RealtynaCredentials $credentials = null): bool
    {
        $response = $this->request($credentials)
            ->withQueryParameters(['$top' => 1, '$filter' => "OriginatingSystemName eq '".$this->escape($originatingSystemName)."'"])
            ->get($this->odataUrl('Property'));

        if ($response->failed()) {
            Log::warning('Realtyna: testConnection failed', ['status' => $response->status(), 'body' => $response->body()]);
        }

        return $response->successful();
    }

    /**
     * Search listings for a specific MLS (OriginatingSystemName), with optional
     * per-agent restriction and standard CRM filters (city/price/beds/etc).
     */
    public function searchListings(string $originatingSystemName, array $filters = [], ?RealtynaCredentials $credentials = null): array
    {
        // "Has open house" = the Property is in the upcoming OpenHouse
        // resource (no Property-level open-house field) — resolve the keys
        // first and narrow the search to them.
        if (! empty($filters['has_open_house'])) {
            unset($filters['has_open_house']);
            $ohKeys = $this->upcomingOpenHouseListingKeys($originatingSystemName, $credentials);
            if ($ohKeys === []) {
                return ['listings' => [], 'total' => 0];
            }
            $filters['listing_keys'] = $ohKeys;
        }

        $select = self::DEFAULT_SELECT;
        if (! empty($filters['select_extras']) && is_array($filters['select_extras'])) {
            $select = array_values(array_unique(array_merge($select, $filters['select_extras'])));
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 200);
        $params = [
            '$filter' => $this->buildOdataFilter($originatingSystemName, $filters),
            '$top' => $perPage,
            '$skip' => max(0, ((int) ($filters['page'] ?? 1) - 1) * $perPage),
            '$expand' => 'Media',
            '$select' => implode(',', $select),
        ];

        if (! empty($filters['sort_by'])) {
            $params['$orderby'] = $this->mapSort((string) $filters['sort_by'], (string) ($filters['sort_dir'] ?? 'desc'));
        }

        $response = $this->request($credentials)
            ->withQueryParameters($params)
            ->get($this->odataUrl('Property'));

        if ($response->failed()) {
            Log::error('Realtyna: searchListings failed', ['status' => $response->status(), 'body' => $response->body()]);

            return ['listings' => [], 'total' => 0, 'error' => "Realtyna search failed (HTTP {$response->status()})"];
        }

        $data = $response->json();

        return [
            'listings' => array_map([$this, 'normalizeListing'], $data['value'] ?? []),
            'total' => (int) ($data['@odata.count'] ?? count($data['value'] ?? [])),
        ];
    }

    /**
     * Fetch a single listing by ListingKey.
     *
     * Goes through the collection endpoint with OriginatingSystemName in the
     * $filter so MLS scoping is enforced server-side. (The Property('key')
     * entity endpoint can't be used for that check: with $select=ALL it echoes
     * the raw source value — 'BEACH' — instead of the partition name.)
     */
    public function getListing(string $originatingSystemName, string $listingId, ?RealtynaCredentials $credentials = null): ?array
    {
        $response = $this->request($credentials)
            ->withQueryParameters([
                '$filter' => "OriginatingSystemName eq '".$this->escape($originatingSystemName)."'"
                    ." and ListingKey eq '".$this->escape($listingId)."'",
                '$top' => 1,
                '$expand' => 'Media',
                '$select' => 'ALL',
            ])
            ->get($this->odataUrl('Property'));

        if ($response->failed()) {
            return null;
        }

        $data = $response->json('value.0');

        return $data ? $this->normalizeListing($data) : null;
    }

    /**
     * Build the OData $filter clause. Accepts the canonical MlsQuery::toArray()
     * plural shape; legacy singular keys are folded in for the old CRM path.
     */
    private function buildOdataFilter(string $originatingSystemName, array $f): string
    {
        $clauses = ["OriginatingSystemName eq '".$this->escape($originatingSystemName)."'"];

        // ── Status (default Active so public surfaces never leak off-market) ─
        $statuses = $this->values($f, 'statuses', 'status');
        $clauses[] = $statuses
            ? $this->orClause('StandardStatus', $statuses)
            : "StandardStatus eq 'Active'";

        // ── Type / style ─────────────────────────────────────────────────
        if ($types = $this->values($f, 'property_types', 'property_type')) {
            $clauses[] = $this->orClause('PropertyType', $types);
        }
        if ($subtypes = $this->values($f, 'property_subtypes', 'property_subtype')) {
            $clauses[] = $this->orClause('PropertySubType', $subtypes);
        }

        // ── Geographic ───────────────────────────────────────────────────
        if ($cities = $this->values($f, 'cities', 'city')) {
            $clauses[] = $this->orContainsClause('City', $cities);
        }
        if ($counties = $this->values($f, 'counties', 'county')) {
            $clauses[] = $this->orClause('CountyOrParish', $counties);
        }
        if ($zips = $this->values($f, 'zips', 'zip')) {
            $clauses[] = $this->orClause('PostalCode', $zips);
        }
        if ($subdivisions = $this->values($f, 'subdivisions', 'subdivision')) {
            $clauses[] = $this->orContainsClause('SubdivisionName', $subdivisions);
        }
        if ($states = $this->values($f, 'states', 'state')) {
            $clauses[] = $this->orClause('StateOrProvince', $states);
        }
        // Same neighborhood shape as the Bridge builder: a neighborhood is a
        // SubdivisionName or an MLSAreaMajor value, exact match.
        if ($hoods = $this->values($f, 'neighborhoods', 'neighborhood')) {
            $parts = array_map(function ($n) {
                $e = $this->escape((string) $n);

                return "(SubdivisionName eq '{$e}' or MLSAreaMajor eq '{$e}')";
            }, $hoods);
            $clauses[] = '('.implode(' or ', $parts).')';
        }
        if (! empty($f['query'])) {
            $q = $this->escape((string) $f['query']);
            $clauses[] = "(contains(UnparsedAddress, '{$q}') or contains(City, '{$q}') or contains(PostalCode, '{$q}') or ListingId eq '{$q}')";
        }

        // ── Agent / office scoping ───────────────────────────────────────
        if ($agentIds = $this->values($f, 'agent_ids', 'agent_id')) {
            $clauses[] = $this->orClause('ListAgentMlsId', $agentIds);
        }
        if ($officeIds = $this->values($f, 'office_ids', 'office_id')) {
            $clauses[] = $this->orClause('ListOfficeMlsId', $officeIds);
        }

        // ── Ranges ───────────────────────────────────────────────────────
        foreach ([
            'min_price' => ['ListPrice', 'ge'], 'max_price' => ['ListPrice', 'le'],
            'min_beds' => ['BedroomsTotal', 'ge'], 'max_beds' => ['BedroomsTotal', 'le'],
            'min_baths' => ['BathroomsTotalInteger', 'ge'], 'max_baths' => ['BathroomsTotalInteger', 'le'],
            'min_sqft' => ['LivingArea', 'ge'], 'max_sqft' => ['LivingArea', 'le'],
            'min_year_built' => ['YearBuilt', 'ge'], 'max_year_built' => ['YearBuilt', 'le'],
        ] as $key => [$field, $op]) {
            if (! empty($f[$key])) {
                $clauses[] = "{$field} {$op} ".(int) $f[$key];
            }
        }

        // ── Booleans (array_key_exists so `false` filters OUT, not "unset") ─
        foreach ([
            'has_pool' => 'PoolPrivateYN',
            'has_waterfront' => 'WaterfrontYN',
            'has_view' => 'ViewYN',
            'new_construction' => 'NewConstructionYN',
        ] as $key => $field) {
            if (array_key_exists($key, $f) && $f[$key] !== null) {
                $clauses[] = $field.' eq '.($f[$key] ? 'true' : 'false');
            }
        }

        // ── Raw OData overlay (lifestyle translations) ───────────────────
        if (! empty($f['raw_filter'])) {
            foreach ((array) $f['raw_filter'] as $raw) {
                $clauses[] = '('.$raw.')';
            }
        }

        return implode(' and ', $clauses);
    }

    /** Normalize a filter dimension that may arrive plural, singular, or scalar. */
    private function values(array $filters, string $pluralKey, string $singularKey): array
    {
        $values = (array) ($filters[$pluralKey] ?? []);
        if (! empty($filters[$singularKey])) {
            $values = array_merge($values, (array) $filters[$singularKey]);
        }

        return array_values(array_filter(array_unique(array_map(strval(...), $values)), fn ($v) => $v !== ''));
    }

    /** `(Field eq 'a' or Field eq 'b')` with consistent escaping. */
    private function orClause(string $field, array $values): string
    {
        $parts = array_map(fn ($v) => "{$field} eq '".$this->escape((string) $v)."'", $values);

        return count($parts) === 1 ? $parts[0] : '('.implode(' or ', $parts).')';
    }

    /** `(contains(Field, 'a') or contains(Field, 'b'))` with consistent escaping. */
    private function orContainsClause(string $field, array $values): string
    {
        $parts = array_map(fn ($v) => "contains({$field}, '".$this->escape((string) $v)."')", $values);

        return count($parts) === 1 ? $parts[0] : '('.implode(' or ', $parts).')';
    }

    private function mapSort(string $sortBy, string $dir): string
    {
        $dir = strtolower($dir) === 'asc' ? 'asc' : 'desc';
        $field = match ($sortBy) {
            'price' => 'ListPrice',
            'date' => 'ModificationTimestamp',
            'beds' => 'BedroomsTotal',
            'baths' => 'BathroomsTotalInteger',
            'sqft' => 'LivingArea',
            default => 'ModificationTimestamp',
        };

        return "{$field} {$dir}";
    }

    /**
     * Map RealtyFeed's RESO shape to the canonical normalized-listing shape
     * (the input contract of MlsListing::fromNormalizedArray).
     */
    private function normalizeListing(array $r): array
    {
        [$photos, $floorplans] = $this->splitMedia($r['Media'] ?? []);

        // "City, FL 33487" tails on UnparsedAddress are common — keep as-is for
        // `full`, the discrete components are returned separately anyway.
        $city = $r['City'] ?? null;

        return [
            'mls_id' => $r['ListingKey'] ?? null,
            'mls_number' => $r['ListingId'] ?? $r['ListingKey'] ?? null,
            'status' => $r['StandardStatus'] ?? null,
            'property_type' => $r['PropertyType'] ?? null,
            'property_subtype' => $r['PropertySubType'] ?? null,
            'style' => $r['ArchitecturalStyle'] ?? null,
            'price' => isset($r['ListPrice']) ? (float) $r['ListPrice'] : null,
            'price_formatted' => isset($r['ListPrice']) ? '$'.number_format((float) $r['ListPrice'], 0) : null,
            'original_price' => isset($r['OriginalListPrice']) ? (float) $r['OriginalListPrice'] : null,
            'sold_price' => isset($r['ClosePrice']) ? (float) $r['ClosePrice'] : null,
            'price_changed_at' => $r['PriceChangeTimestamp'] ?? null,
            'address' => [
                'street' => $r['UnparsedAddress'] ?? null,
                'city' => $city,
                'state_province' => $r['StateOrProvince'] ?? null,
                'postal_code' => $r['PostalCode'] ?? null,
                'county' => $r['CountyOrParish'] ?? null,
                'full' => trim(implode(', ', array_filter([
                    $r['UnparsedAddress'] ?? null,
                    $city,
                    $r['StateOrProvince'] ?? null,
                    $r['PostalCode'] ?? null,
                ]))),
            ],
            'subdivision' => $r['SubdivisionName'] ?? null,
            'lat' => $r['Latitude'] ?? null,
            'lng' => $r['Longitude'] ?? null,
            'bedrooms' => $r['BedroomsTotal'] ?? null,
            'bathrooms' => $r['BathroomsTotalInteger'] ?? null,
            'bathrooms_full' => $r['BathroomsFull'] ?? null,
            'bathrooms_half' => $r['BathroomsHalf'] ?? null,
            'sqft' => $r['LivingArea'] ?? null,
            'lot_sqft' => $r['LotSizeSquareFeet'] ?? null,
            'year_built' => (! empty($r['YearBuilt'])) ? (int) $r['YearBuilt'] : null,
            'stories' => $r['StoriesTotal'] ?? null,
            'garage_spaces' => $r['GarageSpaces'] ?? null,
            'new_construction' => $r['NewConstructionYN'] ?? null,
            'description' => $r['PublicRemarks'] ?? null,
            'photos' => $photos,
            'floorplans' => $floorplans,
            'photo_count' => count($photos),
            'virtual_tour_url' => $r['VirtualTourURLUnbranded'] ?? null,
            'features' => $r['InteriorFeatures'] ?? null,
            'exterior_features' => $r['ExteriorFeatures'] ?? null,
            'view' => $r['View'] ?? null,
            'pets_allowed' => $r['PetsAllowed'] ?? null,
            'furnished' => $r['Furnished'] ?? null,
            'pool' => (bool) ($r['PoolPrivateYN'] ?? false),
            'waterfront' => (bool) ($r['WaterfrontYN'] ?? false),
            'waterfront_features' => $r['WaterfrontFeatures'] ?? null,
            'hoa_fee' => isset($r['AssociationFee']) ? (float) $r['AssociationFee'] : null,
            'hoa_frequency' => $r['AssociationFeeFrequency'] ?? null,
            'tax_amount' => isset($r['TaxAnnualAmount']) ? (float) $r['TaxAnnualAmount'] : null,
            'tax_year' => isset($r['TaxYear']) ? (int) $r['TaxYear'] : null,
            'elementary_school' => $r['ElementarySchool'] ?? null,
            'middle_school' => $r['MiddleOrJuniorSchool'] ?? null,
            'high_school' => $r['HighSchool'] ?? null,
            'list_agent_name' => $r['ListAgentFullName'] ?? null,
            'list_agent_id' => $r['ListAgentMlsId'] ?? null,
            'list_agent_email' => $r['ListAgentEmail'] ?? null,
            'list_agent_phone' => $r['ListAgentDirectPhone'] ?? null,
            'list_office_name' => $r['ListOfficeName'] ?? null,
            'list_office_id' => $r['ListOfficeMlsId'] ?? null,
            'days_on_market' => isset($r['DaysOnMarket']) ? (int) $r['DaysOnMarket'] : null,
            'on_market_date' => $r['OnMarketDate'] ?? null,
            'pending_date' => $r['PendingTimestamp'] ?? null,
            'sold_date' => $r['CloseDate'] ?? null,
            'status_changed_at' => $r['StatusChangeTimestamp'] ?? null,
            'modification_ts' => $r['ModificationTimestamp'] ?? null,
            'updated_at' => $r['ModificationTimestamp'] ?? null,
            'originating_system_name' => $r['OriginatingSystemName'] ?? null,
        ];
    }

    /**
     * Split Media[] into photo + floorplan URL lists, honouring display Order.
     *
     * @return array{0: string[], 1: string[]}
     */
    private function splitMedia(mixed $media): array
    {
        if (! is_array($media)) {
            return [[], []];
        }

        usort($media, static fn ($a, $b) => ((int) ($a['Order'] ?? 0)) <=> ((int) ($b['Order'] ?? 0)));

        $photos = [];
        $floorplans = [];
        foreach ($media as $m) {
            $url = $m['MediaURL'] ?? null;
            if (! $url) {
                continue;
            }
            $category = strtolower((string) ($m['MediaCategory'] ?? 'photo'));
            if (str_contains($category, 'floor')) {
                $floorplans[] = $url;
            } else {
                $photos[] = $url;
            }
        }

        return [$photos, $floorplans];
    }

    /**
     * Distinct ListingKeys with an upcoming open house — powers the
     * has_open_house search filter. 15-min cache; failures → [].
     *
     * @return string[]
     */
    public function upcomingOpenHouseListingKeys(string $originatingSystemName, ?RealtynaCredentials $credentials = null, int $limit = 50): array
    {
        $cacheKey = 'mls:realtyna:ohkeys:'.$originatingSystemName;
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');

        try {
            $response = $this->request($credentials)
                ->withQueryParameters([
                    '$filter' => "OriginatingSystemName eq '{$this->escape($originatingSystemName)}' and OpenHouseStartTime ge {$now}",
                    '$orderby' => 'OpenHouseStartTime asc',
                    '$select' => 'ListingKey,OpenHouseStartTime',
                    '$top' => 200,
                ])
                ->get($this->odataUrl('OpenHouse'));
            if ($response->failed()) {
                return [];
            }
            $rows = (array) ($response->json()['value'] ?? []);
        } catch (\Throwable) {
            return [];
        }

        $keys = [];
        foreach ($rows as $row) {
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
     * Upcoming open houses for a page of listings, keyed by ListingKey —
     * same shape as BridgeApiClient::openHousesFor(). Failures → [].
     *
     * @param  string[]  $listingKeys
     * @return array<string, array<int, array{start: string, end: ?string, remarks: ?string}>>
     */
    public function openHousesFor(string $originatingSystemName, array $listingKeys, ?RealtynaCredentials $credentials = null): array
    {
        $keys = array_values(array_filter(array_map('strval', $listingKeys)));
        if ($keys === []) {
            return [];
        }

        $cacheKey = 'mls:realtyna:oh:'.$originatingSystemName.':'.sha1(json_encode($keys));
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $keyFilter = '('.implode(' or ', array_map(
            fn ($k) => "ListingKey eq '".$this->escape($k)."'",
            array_slice($keys, 0, 50),
        )).')';
        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z');

        try {
            $response = $this->request($credentials)
                ->withQueryParameters([
                    '$filter' => "OriginatingSystemName eq '{$this->escape($originatingSystemName)}' and {$keyFilter} and OpenHouseStartTime ge {$now}",
                    '$orderby' => 'OpenHouseStartTime asc',
                    '$select' => 'ListingKey,OpenHouseStartTime,OpenHouseEndTime,OpenHouseRemarks',
                    '$top' => 200,
                ])
                ->get($this->odataUrl('OpenHouse'));
            if ($response->failed()) {
                return [];
            }
            $rows = (array) ($response->json()['value'] ?? []);
        } catch (\Throwable) {
            return [];
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

    private function odataUrl(string $resource): string
    {
        $base = rtrim((string) config('idx.realtyna.base_url'), '/');

        return "{$base}/realtyfeed/odata/{$resource}";
    }

    private function request(?RealtynaCredentials $credentials = null): PendingRequest
    {
        $credentials ??= RealtynaCredentials::fromConfig();
        $token = $this->tokenManager->getToken($credentials);

        $req = Http::timeout(20)
            ->acceptJson()
            ->withToken($token ?? '');

        if ($credentials->apiKey) {
            $req = $req->withHeader('x-api-key', $credentials->apiKey);
        }

        return $req;
    }

    private function escape(string $s): string
    {
        return str_replace("'", "''", $s);
    }
}
