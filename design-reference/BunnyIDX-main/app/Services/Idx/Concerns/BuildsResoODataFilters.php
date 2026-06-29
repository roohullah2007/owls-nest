<?php

declare(strict_types=1);

namespace App\Services\Idx\Concerns;

/**
 * Shared OData v4 filter translation for any RESO-aligned data source
 * (Bridge, MLSGrid, Realtyna, Spark, Trestle — they all speak this dialect).
 *
 * Translates the unified MlsQuery snake_case filter array into RESO OData
 * `$filter` clauses. Each dimension owns its own `appendX` method; clauses
 * are AND'd together by the caller via `implode(' and ', ...)`.
 *
 * Geography literals MUST include `SRID=4326;` — Bridge rejects polygons
 * without it. MLSGrid accepts both but emitting the SRID is safe across
 * every RESO endpoint we've tested.
 *
 * Per feedback_mls_taxonomy rules #25 (Bridge SELECT stays safe-universal),
 * #37 (geo must include SRID), and the orClause / dimension-split contracts
 * — all enforced here.
 */
trait BuildsResoODataFilters
{
    /**
     * @return string[] Per-dimension clauses, AND'd by the caller.
     */
    private function buildFilterParts(array $filters): array
    {
        $parts = [];
        $this->appendGeographic($parts, $filters);
        $this->appendType($parts, $filters);
        $this->appendStructure($parts, $filters);
        $this->appendPrice($parts, $filters);
        $this->appendTime($parts, $filters);
        $this->appendStatus($parts, $filters);
        $this->appendAgent($parts, $filters);
        $this->appendFreetext($parts, $filters);
        $this->appendRaw($parts, $filters);

        return $parts;
    }

    /**
     * `(F eq 'a' or F eq 'b' or ...)` from a multi-value filter. Returns null
     * when input is empty so callers can drop with a single `if`.
     */
    private function orClause(string $field, mixed $values, string $operator = 'eq'): ?string
    {
        if (! is_array($values) || empty($values)) {
            return null;
        }
        $clauses = array_map(
            fn ($v) => "{$field} {$operator} '{$this->escapeOData((string) $v)}'",
            array_values(array_unique($values)),
        );

        return '('.implode(' or ', $clauses).')';
    }

    /** Like orClause but uses contains() — for substring matches. */
    private function orContainsClause(string $field, mixed $values): ?string
    {
        if (! is_array($values) || empty($values)) {
            return null;
        }
        $clauses = array_map(
            fn ($v) => "contains({$field}, '{$this->escapeOData((string) $v)}')",
            array_values(array_unique($values)),
        );

        return '('.implode(' or ', $clauses).')';
    }

    private function appendGeographic(array &$parts, array $f): void
    {
        // Singular `city`/`postal_code` accepted for legacy direct-callers —
        // MlsQuery itself emits only plural forms.
        $cities = array_filter(array_merge(
            isset($f['city']) ? [(string) $f['city']] : [],
            is_array($f['cities'] ?? null) ? $f['cities'] : [],
        ));
        if ($c = $this->orClause('City', $cities)) {
            $parts[] = $c;
        }

        if (! empty($f['postal_code'])) {
            $parts[] = "PostalCode eq '{$this->escapeOData($f['postal_code'])}'";
        }
        if ($c = $this->orClause('PostalCode', $f['zips'] ?? null)) {
            $parts[] = $c;
        }

        if (! empty($f['zip_prefix'])) {
            $parts[] = "startswith(PostalCode, '{$this->escapeOData($f['zip_prefix'])}')";
        }
        if (! empty($f['postal_codes']) && is_array($f['postal_codes'])) {
            $clauses = array_map(
                fn ($z) => "startswith(PostalCode, '{$this->escapeOData((string) $z)}')",
                $f['postal_codes']
            );
            $parts[] = '('.implode(' or ', $clauses).')';
        }
        if ($c = $this->orClause('CountyOrParish', $f['counties'] ?? null)) {
            $parts[] = $c;
        }
        if ($c = $this->orClause('SubdivisionName', $f['subdivisions'] ?? null)) {
            $parts[] = $c;
        }
        if ($c = $this->orClause('MLSAreaMajor', $f['mls_areas'] ?? null)) {
            $parts[] = $c;
        }
        if ($c = $this->orClause('StateOrProvince', $f['states'] ?? null)) {
            $parts[] = $c;
        }

        if (! empty($f['neighborhoods']) && is_array($f['neighborhoods'])) {
            $clauses = array_map(function ($n) {
                $e = $this->escapeOData((string) $n);

                return "(SubdivisionName eq '{$e}' or MLSAreaMajor eq '{$e}')";
            }, $f['neighborhoods']);
            $parts[] = '('.implode(' or ', $clauses).')';
        }

        if (! empty($f['geo']) && is_array($f['geo'])) {
            if ($geo = $this->buildGeoClause($f['geo'])) {
                $parts[] = $geo;
            }
        }
    }

    private function appendType(array &$parts, array $f): void
    {
        if ($c = $this->orClause('PropertyType', $f['property_types'] ?? null)) {
            $parts[] = $c;
        }
        if ($c = $this->orClause('PropertySubType', $f['property_subtypes'] ?? null)) {
            $parts[] = $c;
        }
        if ($c = $this->orContainsClause('ArchitecturalStyle', $f['architectural_styles'] ?? null)) {
            $parts[] = $c;
        }
    }

    private function appendStructure(array &$parts, array $f): void
    {
        if (! empty($f['min_beds'])) {
            $parts[] = 'BedroomsTotal ge '.(int) $f['min_beds'];
        }
        if (! empty($f['max_beds'])) {
            $parts[] = 'BedroomsTotal le '.(int) $f['max_beds'];
        }
        if (! empty($f['min_baths'])) {
            $parts[] = 'BathroomsTotalDecimal ge '.(float) $f['min_baths'];
        }
        if (! empty($f['max_baths'])) {
            $parts[] = 'BathroomsTotalDecimal le '.(float) $f['max_baths'];
        }
        if (! empty($f['min_sqft'])) {
            $parts[] = 'LivingArea ge '.(int) $f['min_sqft'];
        }
        if (! empty($f['max_sqft'])) {
            $parts[] = 'LivingArea le '.(int) $f['max_sqft'];
        }
        if (! empty($f['min_lot_sqft'])) {
            $parts[] = 'LotSizeSquareFeet ge '.(int) $f['min_lot_sqft'];
        }
        if (! empty($f['max_lot_sqft'])) {
            $parts[] = 'LotSizeSquareFeet le '.(int) $f['max_lot_sqft'];
        }
        // 1 acre = 43560 sqft.
        if (! empty($f['min_lot_acres'])) {
            $parts[] = 'LotSizeSquareFeet ge '.(int) round((float) $f['min_lot_acres'] * 43560);
        }
        if (! empty($f['max_lot_acres'])) {
            $parts[] = 'LotSizeSquareFeet le '.(int) round((float) $f['max_lot_acres'] * 43560);
        }
        if (! empty($f['min_year_built'])) {
            $parts[] = 'YearBuilt ge '.(int) $f['min_year_built'];
        }
        if (! empty($f['max_year_built'])) {
            $parts[] = 'YearBuilt le '.(int) $f['max_year_built'];
        }
        if (! empty($f['min_stories'])) {
            $parts[] = 'Stories ge '.(int) $f['min_stories'];
        }
        if (! empty($f['max_stories'])) {
            $parts[] = 'Stories le '.(int) $f['max_stories'];
        }
        if (! empty($f['min_garage_spaces'])) {
            $parts[] = 'GarageSpaces ge '.(int) $f['min_garage_spaces'];
        }
        // Booleans — check key existence so we honour `false` explicitly.
        if (array_key_exists('has_pool', $f) && $f['has_pool'] !== null) {
            $parts[] = 'PoolPrivateYN eq '.($f['has_pool'] ? 'true' : 'false');
        }
        if (array_key_exists('has_waterfront', $f) && $f['has_waterfront'] !== null) {
            $parts[] = 'WaterfrontYN eq '.($f['has_waterfront'] ? 'true' : 'false');
        }
        if (array_key_exists('has_view', $f) && $f['has_view'] !== null) {
            $parts[] = 'ViewYN eq '.($f['has_view'] ? 'true' : 'false');
        }
        if (array_key_exists('new_construction', $f) && $f['new_construction'] !== null) {
            $parts[] = 'NewConstructionYN eq '.($f['new_construction'] ? 'true' : 'false');
        }
        // Virtual tour = the RESO unbranded tour URL being present.
        if (! empty($f['has_virtual_tour'])) {
            $parts[] = 'VirtualTourURLUnbranded ne null';
        }
        // has_open_house / has_floor_plans have no portable RESO Property field
        // (open houses live in the separate OpenHouse resource; floor plans in
        // Media). Feeds that don't support them simply ignore the filter.
    }

    private function appendPrice(array &$parts, array $f): void
    {
        if (! empty($f['min_price'])) {
            $parts[] = 'ListPrice ge '.(int) $f['min_price'];
        }
        if (! empty($f['max_price'])) {
            $parts[] = 'ListPrice le '.(int) $f['max_price'];
        }
        if (! empty($f['max_hoa_fee'])) {
            $parts[] = 'AssociationFee le '.(int) $f['max_hoa_fee'];
        }
        if (! empty($f['max_tax_annual'])) {
            $parts[] = 'TaxAnnualAmount le '.(int) $f['max_tax_annual'];
        }
        if (! empty($f['recently_reduced']) && is_array($f['recently_reduced'])) {
            $within = (int) ($f['recently_reduced']['within_days'] ?? 14);
            $threshold = (new \DateTimeImmutable)->modify("-{$within} days")->format('Y-m-d\TH:i:s\Z');
            $parts[] = "PriceChangeTimestamp ge {$threshold}";
            $parts[] = 'ListPrice lt OriginalListPrice';
        }
    }

    private function appendTime(array &$parts, array $f): void
    {
        $relativeDate = static fn (int $days): string => (new \DateTimeImmutable)
            ->modify("-{$days} days")->format('Y-m-d\TH:i:s\Z');
        if (! empty($f['new_within_days'])) {
            $parts[] = 'OnMarketDate ge '.$relativeDate((int) $f['new_within_days']);
        }
        if (! empty($f['modified_within_days'])) {
            $parts[] = 'ModificationTimestamp ge '.$relativeDate((int) $f['modified_within_days']);
        }
        if (! empty($f['dom_min'])) {
            $parts[] = 'DaysOnMarket ge '.(int) $f['dom_min'];
        }
        if (! empty($f['dom_max'])) {
            $parts[] = 'DaysOnMarket le '.(int) $f['dom_max'];
        }
        if (! empty($f['max_dom'])) {
            $parts[] = 'DaysOnMarket le '.(int) $f['max_dom'];
        } // legacy alias
        if (! empty($f['listed_after'])) {
            $parts[] = "ListingContractDate ge {$this->escapeOData($f['listed_after'])}";
        }
        if (! empty($f['listed_before'])) {
            $parts[] = "ListingContractDate le {$this->escapeOData($f['listed_before'])}";
        }
        if (! empty($f['sold_within_days'])) {
            $parts[] = 'CloseDate ge '.$relativeDate((int) $f['sold_within_days']);
        }
        // Upcoming open house (best-effort: datasets without the denormalized
        // field return zero matches rather than erroring). The bare
        // `has_open_house` toggle (the public search's checkbox) means "any
        // upcoming" — previously it was silently ignored and the filter did
        // nothing.
        if (! empty($f['has_open_house_within_days'])) {
            $now = (new \DateTimeImmutable)->format('Y-m-d\TH:i:s\Z');
            $end = (new \DateTimeImmutable)
                ->modify('+'.(int) $f['has_open_house_within_days'].' days')
                ->format('Y-m-d\TH:i:s\Z');
            $parts[] = "OpenHouseStartTime ge {$now} and OpenHouseStartTime le {$end}";
        }
        // Explicit listing-key subset — e.g. Bridge resolves has_open_house by
        // first collecting upcoming OpenHouse ListingKeys, then narrowing the
        // Property query to them (no portable Property-level open-house field).
        if (! empty($f['listing_keys']) && is_array($f['listing_keys'])) {
            // ~50 keys keeps the GET URL well under proxy/OData limits (414s above that).
            $keys = array_slice(array_values(array_filter(array_map('strval', $f['listing_keys']))), 0, 60);
            if ($keys !== []) {
                $parts[] = '('.implode(' or ', array_map(
                    static fn (string $k): string => "ListingKey eq '".str_replace("'", "''", $k)."'",
                    $keys,
                )).')';
            } else {
                $parts[] = "ListingKey eq '__none__'";
            }
        }
    }

    private function appendStatus(array &$parts, array $f): void
    {
        if (! empty($f['statuses']) && is_array($f['statuses'])) {
            $parts[] = $this->orClause('StandardStatus', $f['statuses']);
        } else {
            // Default to active listings only — apps must opt into broader status.
            $parts[] = "StandardStatus eq 'Active'";
        }
        if ($c = $this->orContainsClause('SpecialListingConditions', $f['special_conditions'] ?? null)) {
            $parts[] = $c;
        }
    }

    private function appendAgent(array &$parts, array $f): void
    {
        if ($c = $this->orClause('ListAgentMlsId', $f['agent_ids'] ?? null)) {
            $parts[] = $c;
        }
        if ($c = $this->orClause('ListOfficeMlsId', $f['office_ids'] ?? null)) {
            $parts[] = $c;
        }
        if (! empty($f['brokerage_name'])) {
            $parts[] = "contains(ListOfficeName, '{$this->escapeOData($f['brokerage_name'])}')";
        }
        if (! empty($f['mls_number'])) {
            $parts[] = "ListingId eq '{$this->escapeOData($f['mls_number'])}'";
        }
    }

    private function appendFreetext(array &$parts, array $f): void
    {
        if (! empty($f['keywords']) && is_array($f['keywords'])) {
            foreach ($f['keywords'] as $kw) {
                $parts[] = "contains(PublicRemarks, '{$this->escapeOData((string) $kw)}')";
            }
        }
        if (! empty($f['exclude_keywords']) && is_array($f['exclude_keywords'])) {
            foreach ($f['exclude_keywords'] as $kw) {
                $parts[] = "not contains(PublicRemarks, '{$this->escapeOData((string) $kw)}')";
            }
        }
        if (! empty($f['query'])) {
            $q = $this->escapeOData($f['query']);
            $parts[] = "(contains(UnparsedAddress, '{$q}') or contains(City, '{$q}') or ListingId eq '{$q}')";
        }
    }

    /**
     * raw_filter passthrough. Used by MlsDataset::translateLifestyle() to inject
     * OData clauses that don't have a typed equivalent on MlsQuery.
     */
    private function appendRaw(array &$parts, array $f): void
    {
        if (empty($f['raw_filter'])) {
            return;
        }
        if (is_array($f['raw_filter'])) {
            foreach ($f['raw_filter'] as $rf) {
                $parts[] = (string) $rf;
            }
        } else {
            $parts[] = (string) $f['raw_filter'];
        }
    }

    /**
     * Build geo clauses. Geography literals include SRID=4326 (mandatory on
     * Bridge, accepted by MLSGrid). `near` converts to a bounding-box polygon
     * because some Bridge datasets silently ignore `geo.distance`.
     */
    private function buildGeoClause(array $geo): ?string
    {
        if (! empty($geo['polygon']) && is_array($geo['polygon'])) {
            $ring = $geo['polygon'];
            if ($ring[0] !== end($ring)) {
                $ring[] = $ring[0];
            }
            $pairs = array_map(static fn ($p) => $p[0].' '.$p[1], $ring);
            $wkt = 'POLYGON(('.implode(', ', $pairs).'))';

            return "geo.intersects(Coordinates, geography'SRID=4326;{$wkt}')";
        }
        if (! empty($geo['bounds']) && is_array($geo['bounds'])) {
            $b = $geo['bounds'];
            $ne_lat = (float) $b['ne_lat'];
            $ne_lng = (float) $b['ne_lng'];
            $sw_lat = (float) $b['sw_lat'];
            $sw_lng = (float) $b['sw_lng'];
            $wkt = "POLYGON(({$sw_lng} {$sw_lat}, {$ne_lng} {$sw_lat}, {$ne_lng} {$ne_lat}, {$sw_lng} {$ne_lat}, {$sw_lng} {$sw_lat}))";

            return "geo.intersects(Coordinates, geography'SRID=4326;{$wkt}')";
        }
        if (! empty($geo['near']) && is_array($geo['near'])) {
            $n = $geo['near'];
            $lat = (float) $n['lat'];
            $lng = (float) $n['lng'];
            $miles = (float) $n['radius_miles'];
            $latDelta = $miles / 69.0;
            $lngDelta = $miles / (69.0 * cos(deg2rad($lat)) ?: 1);
            $sw_lat = $lat - $latDelta;
            $sw_lng = $lng - $lngDelta;
            $ne_lat = $lat + $latDelta;
            $ne_lng = $lng + $lngDelta;
            $wkt = "POLYGON(({$sw_lng} {$sw_lat}, {$ne_lng} {$sw_lat}, {$ne_lng} {$ne_lat}, {$sw_lng} {$ne_lat}, {$sw_lng} {$sw_lat}))";

            return "geo.intersects(Coordinates, geography'SRID=4326;{$wkt}')";
        }

        return null;
    }

    /** Map MlsQuery::SORT_* to OData $orderby. Update [[feedback_mls_taxonomy #40]] when adding. */
    private function sortToODataOrderby(string $sort): string
    {
        return match ($sort) {
            'newest' => 'ListingContractDate desc',
            'price_asc' => 'ListPrice asc',
            'price_desc' => 'ListPrice desc',
            'beds_desc' => 'BedroomsTotal desc',
            'sqft_desc' => 'LivingArea desc',
            'dom_asc' => 'DaysOnMarket asc',
            'dom_desc' => 'DaysOnMarket desc',
            default => 'ModificationTimestamp desc',
        };
    }

    /** Escape single quotes inside an OData string literal (RFC: double them). */
    private function escapeOData(string $value): string
    {
        return str_replace("'", "''", $value);
    }
}
