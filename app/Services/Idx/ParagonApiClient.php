<?php

declare(strict_types=1);

namespace App\Services\Idx;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Paragon (paragonrels.com) RESO OData client.
 *
 * One Paragon account == one MLS, served from a dedicated subdomain
 * (https://{MLS}.paragonrels.com/OData/{MLS}). The RESO Data Dictionary feed
 * lives under /DD1.7 and uses standard RESO field names — the SAME shape Bridge
 * and Realtyna return — so normalization mirrors RealtynaApiClient.
 *
 * Two Paragon-specific twists handled here:
 *  - Auth is OAuth2 client_credentials against the server's IdentityServer
 *    (ParagonTokenManager); credentials + base URL come from ParagonCredentials.
 *  - Media is NOT an expandable navigation ($expand is unsupported, returns 501).
 *    Photos live in a SEPARATE RESO `Media` resource keyed by ResourceRecordKey
 *    (== Property.ListingKey). We batch-fetch media for the page and merge it in.
 *
 * Filter input accepts BOTH the canonical MlsQuery::toArray() plural shape and
 * legacy CRM singular keys, exactly like RealtynaApiClient.
 */
class ParagonApiClient
{
    /**
     * Fields requested on every search.
     *
     * IMPORTANT: Paragon's DD1.7 "RESO" feed is NOT a full RESO Data Dictionary —
     * many standard names are absent (LivingArea, View, PoolPrivateYN, ViewYN,
     * NewConstructionYN, SeniorCommunityYN, AssociationFee, ListAgentEmail,
     * OnMarketDate, StatusChangeTimestamp, PendingTimestamp, MLSAreaMajor) and
     * Paragon uses its own names instead (BuildingAreaTotal, Stories, Water_View,
     * Pets_Allowed, Fee/Fee_Frequency, OriginalEntryTimestamp,
     * Pending_Agreement_Date). All verified against the live PrimeMLS $metadata
     * (805 Property fields) + filter probes. Paragon silently DROPS unknown
     * $select fields (no error), so this stays resilient, but we use the real
     * names so data actually populates.
     */
    private const DEFAULT_SELECT = [
        'ListingKey', 'ListingId', 'StandardStatus',
        'PropertyType', 'PropertySubType', 'ArchitecturalStyle',
        'ListPrice', 'OriginalListPrice', 'ClosePrice',
        'UnparsedAddress', 'City', 'StateOrProvince', 'PostalCode', 'CountyOrParish',
        'SubdivisionName', 'Latitude', 'Longitude',
        'BedroomsTotal', 'BathroomsTotalInteger', 'BathroomsFull', 'BathroomsHalf',
        'AboveGradeFinishedArea', 'LotSizeSquareFeet', 'YearBuilt', 'Stories', 'GarageSpaces',
        'WaterfrontYN', 'Water_View', 'Water_Body_Type',
        'Pets_Allowed', 'Furnished', 'InteriorFeatures', 'ExteriorFeatures',
        'Fee', 'Fee_Frequency', 'TaxAnnualAmount', 'TaxYear',
        'PublicRemarks', 'VirtualTourURLUnbranded',
        'ListAgentMlsId', 'ListAgentFullName', 'ListOfficeMlsId', 'ListOfficeName',
        'ElementarySchool', 'MiddleOrJuniorSchool', 'HighSchool',
        'DaysOnMarket', 'OriginalEntryTimestamp', 'Pending_Agreement_Date',
        'CloseDate', 'ModificationTimestamp', 'PhotosCount',
    ];

    /** Photos requested in one batch — caps the Media call for a result page. */
    private const MEDIA_BATCH_LIMIT = 30;

    public function __construct(
        private readonly ParagonTokenManager $tokenManager,
    ) {}

    /** Cheap connectivity test: one Property row via the dataset's feed path. */
    public function testConnection(ParagonCredentials $credentials, string $datasetPath = 'DD1.7'): bool
    {
        $response = $this->request($credentials)
            ->withQueryParameters(['$top' => 1, '$select' => 'ListingKey'])
            ->get($credentials->resourceUrl($datasetPath, 'Property'));

        if ($response->failed()) {
            Log::warning('Paragon: testConnection failed', ['status' => $response->status(), 'body' => $response->body()]);
        }

        return $response->successful();
    }

    /**
     * Search listings on this Paragon MLS. Returns canonical normalized-listing
     * arrays (the input contract of MlsDataset::normalize) so the driver's
     * normalization loop wraps them into MlsListing unchanged.
     *
     * @return array{listings: array<int,array>, total: int, error?: string}
     */
    public function searchListings(ParagonCredentials $credentials, string $datasetPath, array $filters = []): array
    {
        $select = self::DEFAULT_SELECT;
        if (! empty($filters['select_extras']) && is_array($filters['select_extras'])) {
            $select = array_values(array_unique(array_merge($select, $filters['select_extras'])));
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 200);
        $params = [
            '$filter' => $this->buildOdataFilter($filters),
            '$top' => $perPage,
            '$skip' => max(0, ((int) ($filters['page'] ?? 1) - 1) * $perPage),
            '$count' => 'true',
            '$select' => implode(',', $select),
        ];

        if (! empty($filters['sort_by'])) {
            $params['$orderby'] = $this->mapSort((string) $filters['sort_by'], (string) ($filters['sort_dir'] ?? 'desc'));
        }

        $response = $this->request($credentials)
            ->withQueryParameters($params)
            ->get($credentials->resourceUrl($datasetPath, 'Property'));

        if ($response->failed()) {
            Log::error('Paragon: searchListings failed', ['status' => $response->status(), 'body' => $response->body()]);

            return ['listings' => [], 'total' => 0, 'error' => "Paragon search failed (HTTP {$response->status()})"];
        }

        $data = $response->json();
        $rows = $data['value'] ?? [];

        // Paragon has no inline media — batch-fetch photos for this page by key.
        $mediaByKey = $this->mediaForListings($credentials, $datasetPath, array_filter(array_map(
            static fn ($r) => (string) ($r['ListingKey'] ?? ''),
            $rows,
        )));

        return [
            'listings' => array_map(
                fn (array $r) => $this->normalizeListing($r, $mediaByKey[(string) ($r['ListingKey'] ?? '')] ?? []),
                $rows,
            ),
            'total' => (int) ($data['@odata.count'] ?? count($rows)),
        ];
    }

    /** Fetch a single listing by ListingKey, with its photos. */
    public function getListing(ParagonCredentials $credentials, string $datasetPath, string $listingId): ?array
    {
        $response = $this->request($credentials)
            ->withQueryParameters([
                '$filter' => "ListingKey eq '".$this->escape($listingId)."'",
                '$top' => 1,
            ])
            ->get($credentials->resourceUrl($datasetPath, 'Property'));

        if ($response->failed()) {
            return null;
        }

        $row = $response->json('value.0');
        if (! $row) {
            return null;
        }

        $media = $this->mediaForListings($credentials, $datasetPath, [(string) ($row['ListingKey'] ?? $listingId)]);

        return $this->normalizeListing($row, $media[(string) ($row['ListingKey'] ?? $listingId)] ?? []);
    }

    /**
     * Batch-fetch media for a page of listings from the separate RESO `Media`
     * resource (Paragon doesn't support $expand). Keyed by ResourceRecordKey
     * (== Property.ListingKey); only Public media is kept; ordered by Order.
     *
     * @param  string[]  $listingKeys
     * @return array<string, array{0: string[], 1: string[]}> key => [photos, floorplans]
     */
    private function mediaForListings(ParagonCredentials $credentials, string $datasetPath, array $listingKeys): array
    {
        $keys = array_values(array_unique(array_filter(array_map('strval', $listingKeys), fn ($k) => $k !== '')));
        if ($keys === []) {
            return [];
        }

        $keyFilter = '('.implode(' or ', array_map(
            fn ($k) => "ResourceRecordKey eq '".$this->escape($k)."'",
            $keys,
        )).')';

        try {
            $response = $this->request($credentials)
                ->withQueryParameters([
                    '$filter' => $keyFilter,
                    '$orderby' => 'Order asc',
                    '$select' => 'ResourceRecordKey,MediaURL,Order,MediaCategory,Permission',
                    '$top' => count($keys) * self::MEDIA_BATCH_LIMIT,
                ])
                ->get($credentials->resourceUrl($datasetPath, 'Media'));
            if ($response->failed()) {
                return [];
            }
            $rows = (array) ($response->json()['value'] ?? []);
        } catch (\Throwable) {
            return [];
        }

        $grouped = [];
        foreach ($rows as $m) {
            $key = (string) ($m['ResourceRecordKey'] ?? '');
            $url = $m['MediaURL'] ?? null;
            if ($key === '' || ! $url) {
                continue;
            }
            // Only surface publicly-displayable media (IDX compliance).
            $perm = $m['Permission'] ?? null;
            if (is_array($perm) && ! in_array('Public', $perm, true)) {
                continue;
            }
            $grouped[$key][] = $m;
        }

        $out = [];
        foreach ($grouped as $key => $items) {
            usort($items, static fn ($a, $b) => ((int) ($a['Order'] ?? 0)) <=> ((int) ($b['Order'] ?? 0)));
            $photos = [];
            $floorplans = [];
            foreach ($items as $m) {
                $category = strtolower((string) ($m['MediaCategory'] ?? 'photo'));
                if (str_contains($category, 'floor')) {
                    $floorplans[] = $m['MediaURL'];
                } else {
                    $photos[] = $m['MediaURL'];
                }
            }
            $out[$key] = [$photos, $floorplans];
        }

        return $out;
    }

    /**
     * Build the OData $filter clause. Unlike Realtyna there is NO
     * OriginatingSystemName partition — a Paragon server hosts a single MLS.
     */
    private function buildOdataFilter(array $f): string
    {
        $clauses = [];

        // Status — default Active so public surfaces never leak off-market.
        $statuses = $this->values($f, 'statuses', 'status');
        $clauses[] = $statuses
            ? $this->orClause('StandardStatus', $statuses)
            : "StandardStatus eq 'Active'";

        if ($types = $this->values($f, 'property_types', 'property_type')) {
            $clauses[] = $this->orClause('PropertyType', $types);
        }
        if ($subtypes = $this->values($f, 'property_subtypes', 'property_subtype')) {
            $clauses[] = $this->orClause('PropertySubType', $subtypes);
        }

        if ($cities = $this->values($f, 'cities', 'city')) {
            $clauses[] = $this->orContainsClause('City', $cities);
        }
        // County values are stored state-prefixed ("NH-Grafton", "VT-Windsor") and
        // must be matched with EXACT eq — `contains()` and bare-name `eq` both 500
        // on this feed. The dataset's getCounties() supplies the feed-exact values.
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
        // Paragon DD1.7 has no MLSAreaMajor — match neighborhoods on SubdivisionName only.
        if ($hoods = $this->values($f, 'neighborhoods', 'neighborhood')) {
            $clauses[] = $this->orClause('SubdivisionName', $hoods);
        }
        if (! empty($f['query'])) {
            $q = $this->escape((string) $f['query']);
            $clauses[] = "(contains(UnparsedAddress, '{$q}') or contains(City, '{$q}') or contains(PostalCode, '{$q}') or ListingId eq '{$q}')";
        }

        if ($agentIds = $this->values($f, 'agent_ids', 'agent_id')) {
            $clauses[] = $this->orClause('ListAgentMlsId', $agentIds);
        }
        if ($officeIds = $this->values($f, 'office_ids', 'office_id')) {
            $clauses[] = $this->orClause('ListOfficeMlsId', $officeIds);
        }

        foreach ([
            'min_price' => ['ListPrice', 'ge'], 'max_price' => ['ListPrice', 'le'],
            'min_beds' => ['BedroomsTotal', 'ge'], 'max_beds' => ['BedroomsTotal', 'le'],
            'min_baths' => ['BathroomsTotalInteger', 'ge'], 'max_baths' => ['BathroomsTotalInteger', 'le'],
            // Paragon's well-populated living-area field is AboveGradeFinishedArea
            // (no RESO LivingArea; BuildingAreaTotal is sparse — only ~7% of actives).
            'min_sqft' => ['AboveGradeFinishedArea', 'ge'], 'max_sqft' => ['AboveGradeFinishedArea', 'le'],
            'min_year_built' => ['YearBuilt', 'ge'], 'max_year_built' => ['YearBuilt', 'le'],
        ] as $key => [$field, $op]) {
            if (! empty($f[$key])) {
                $clauses[] = "{$field} {$op} ".(int) $f[$key];
            }
        }

        // Waterfront is the only "lifestyle" boolean this feed can answer, and NOT
        // via WaterfrontYN (`eq true` returns HTTP 400). `Water_View ne null` is the
        // filterable proxy (lake/river/pond frontage + views). has_pool / has_view /
        // new_construction have no filterable field on Paragon DD1.7 — omitted.
        if (array_key_exists('has_waterfront', $f) && $f['has_waterfront']) {
            $clauses[] = 'Water_View ne null';
        }

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

    private function orClause(string $field, array $values): string
    {
        $parts = array_map(fn ($v) => "{$field} eq '".$this->escape((string) $v)."'", $values);

        return count($parts) === 1 ? $parts[0] : '('.implode(' or ', $parts).')';
    }

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
            'sqft' => 'AboveGradeFinishedArea',
            default => 'ModificationTimestamp',
        };

        return "{$field} {$dir}";
    }

    /**
     * Map Paragon's RESO shape to the canonical normalized-listing array (the
     * input contract of MlsListing::fromNormalizedArray). Photos are passed in
     * separately because Paragon serves them from the Media resource.
     *
     * @param  array{0: string[], 1: string[]}  $media  [photos, floorplans]
     */
    private function normalizeListing(array $r, array $media = []): array
    {
        [$photos, $floorplans] = $media + [[], []];
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
            // Paragon's well-populated living-area field is AboveGradeFinishedArea.
            'sqft' => $r['AboveGradeFinishedArea'] ?? null,
            'lot_sqft' => $r['LotSizeSquareFeet'] ?? null,
            'year_built' => (! empty($r['YearBuilt'])) ? (int) $r['YearBuilt'] : null,
            'stories' => $r['Stories'] ?? null,
            'garage_spaces' => $r['GarageSpaces'] ?? null,
            'description' => $r['PublicRemarks'] ?? null,
            'photos' => $photos,
            'floorplans' => $floorplans,
            'photo_count' => count($photos) ?: (int) ($r['PhotosCount'] ?? 0),
            'virtual_tour_url' => $r['VirtualTourURLUnbranded'] ?? null,
            'features' => $r['InteriorFeatures'] ?? null,
            'exterior_features' => $r['ExteriorFeatures'] ?? null,
            // No generic View field on this feed — Water_View carries lake/river views.
            'view' => $r['Water_View'] ?? null,
            'pets_allowed' => $r['Pets_Allowed'] ?? null,
            'furnished' => $r['Furnished'] ?? null,
            'waterfront' => (bool) ($r['WaterfrontYN'] ?? false),
            'waterfront_features' => $r['Water_Body_Type'] ?? null,
            'hoa_fee' => isset($r['Fee']) ? (float) $r['Fee'] : null,
            'hoa_frequency' => $r['Fee_Frequency'] ?? null,
            'tax_amount' => isset($r['TaxAnnualAmount']) ? (float) $r['TaxAnnualAmount'] : null,
            'tax_year' => isset($r['TaxYear']) ? (int) $r['TaxYear'] : null,
            'elementary_school' => $r['ElementarySchool'] ?? null,
            'middle_school' => $r['MiddleOrJuniorSchool'] ?? null,
            'high_school' => $r['HighSchool'] ?? null,
            'list_agent_name' => $r['ListAgentFullName'] ?? null,
            'list_agent_id' => $r['ListAgentMlsId'] ?? null,
            'list_office_name' => $r['ListOfficeName'] ?? null,
            'list_office_id' => $r['ListOfficeMlsId'] ?? null,
            'days_on_market' => isset($r['DaysOnMarket']) ? (int) $r['DaysOnMarket'] : null,
            'on_market_date' => $r['OriginalEntryTimestamp'] ?? null,
            'pending_date' => $r['Pending_Agreement_Date'] ?? null,
            'sold_date' => $r['CloseDate'] ?? null,
            'modification_ts' => $r['ModificationTimestamp'] ?? null,
            'updated_at' => $r['ModificationTimestamp'] ?? null,
        ];
    }

    private function request(ParagonCredentials $credentials): PendingRequest
    {
        $token = $this->tokenManager->getToken($credentials);

        return Http::timeout((int) config('idx.paragon.timeout', 20))
            ->acceptJson()
            ->withToken($token ?? '');
    }

    private function escape(string $s): string
    {
        return str_replace("'", "''", $s);
    }
}
