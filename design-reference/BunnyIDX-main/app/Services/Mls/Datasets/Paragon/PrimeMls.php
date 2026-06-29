<?php

declare(strict_types=1);

namespace App\Services\Mls\Datasets\Paragon;

/**
 * PrimeMLS — New Hampshire & Vermont (formerly NNEREN) — Paragon-backed.
 *
 * First concrete Paragon dataset; the reference implementation for every future
 * paragonrels.com OData MLS (analogous to Bridge\MiamiReMls / Realtyna\BeachesMls).
 *
 * Verified live against the DD1.7 RESO feed (June 2026): ~10.9k active listings,
 * standard RESO field names, media served from the separate Media resource
 * (ResourceRecordKey == ListingKey).
 *
 * Location facets (counties / cities / subdivisions / zips) are intentionally
 * left to the standard facet-scan pipeline (scripts/export-location-facets.php +
 * scripts/build-location-taxonomy.php) — property types / statuses / subtypes
 * come from the RESO defaults on ParagonDataset.
 */
final class PrimeMls extends ParagonDataset
{
    public function getSlug(): string
    {
        // Matches IdxConnection.mls_slug and the MlsProvider.slug.
        return 'primemls';
    }

    public function getDisplayName(): string
    {
        return 'PrimeMLS (New Hampshire & Vermont)';
    }

    public function getBaseUrl(): string
    {
        // Per-MLS OData service root — token endpoint + data resources hang off it.
        return 'https://PrimeMLS.paragonrels.com/OData/PrimeMLS';
    }

    /**
     * Counties in the feed's EXACT `CountyOrParish` value — state-prefixed
     * ("NH-Grafton", "VT-Windsor"). This is mandatory: the filter matches with
     * `eq` and a bare/contains value returns HTTP 500. PrimeMLS spans all of NH
     * + VT, plus cross-border MA-Essex. All verified live (June 2026).
     *
     * @return string[]
     */
    public function getCounties(): array
    {
        return [
            // New Hampshire (10)
            'NH-Belknap', 'NH-Carroll', 'NH-Cheshire', 'NH-Coos', 'NH-Grafton',
            'NH-Hillsborough', 'NH-Merrimack', 'NH-Rockingham', 'NH-Strafford', 'NH-Sullivan',
            // Vermont (14)
            'VT-Addison', 'VT-Bennington', 'VT-Caledonia', 'VT-Chittenden', 'VT-Essex',
            'VT-Franklin', 'VT-Grand Isle', 'VT-Lamoille', 'VT-Orange', 'VT-Orleans',
            'VT-Rutland', 'VT-Washington', 'VT-Windham', 'VT-Windsor',
            // Cross-border inventory
            'MA-Essex',
        ];
    }

    /**
     * NH's 13 incorporated cities + the major VT cities, in the City-autocomplete
     * "City, ST" convention (matches BeachesMls). Most NH/VT locales are towns,
     * not cities — the full town/subdivision/zip facets come from the standard
     * facet-scan pipeline; this is the high-signal seed.
     *
     * @return string[]
     */
    public function getCities(): array
    {
        $nh = [
            'Berlin', 'Claremont', 'Concord', 'Dover', 'Franklin', 'Keene',
            'Laconia', 'Lebanon', 'Manchester', 'Nashua', 'Portsmouth',
            'Rochester', 'Somersworth',
        ];
        $vt = [
            'Burlington', 'South Burlington', 'Rutland', 'Barre', 'Montpelier',
            'Winooski', 'St. Albans', 'Newport', 'Vergennes',
        ];

        $withState = static fn (array $cities, string $st): array => array_map(static fn (string $c) => "{$c}, {$st}", $cities);

        return array_merge($withState($nh, 'NH'), $withState($vt, 'VT'));
    }

    /** Process-level memos so each JSON is decoded at most once per request. */
    private static ?array $subdivisions = null;

    private static ?array $condoNames = null;

    /**
     * Subdivisions this MLS indexes, matching the feed's `SubdivisionName` so the
     * subdivision filter resolves. Sourced from the MLS's subdivision export and
     * stored in a colocated JSON data file (too many + too volatile to inline).
     *
     * @return string[]
     */
    public function getSubdivisions(): array
    {
        if (self::$subdivisions !== null) {
            return self::$subdivisions;
        }

        $path = __DIR__.'/data/primemls-subdivisions.json';
        $decoded = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;

        return self::$subdivisions = is_array($decoded) ? $decoded : [];
    }

    /**
     * Condo / building / resort names from the feed's `Condo_Name` facet (full
     * keyset scan across all statuses, June 2026), junk-stripped. Distinct from
     * subdivisions — Paragon stores condo project names in `Condo_Name`. Powers a
     * condo-building autocomplete; values match the feed for byte-for-byte filtering.
     *
     * @return string[]
     */
    public function getCondoNames(): array
    {
        if (self::$condoNames !== null) {
            return self::$condoNames;
        }

        $path = __DIR__.'/data/primemls-condos.json';
        $decoded = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;

        return self::$condoNames = is_array($decoded) ? $decoded : [];
    }

    /**
     * Lifestyle keywords this feed can actually answer. Paragon's DD1.7 lacks the
     * usual RESO lifestyle booleans (no PoolPrivateYN/ViewYN/NewConstructionYN/
     * SeniorCommunityYN) and `WaterfrontYN eq true` returns HTTP 400 — so the only
     * non-type lifestyle we can filter is waterfront/lake/river frontage via the
     * filterable `Water_View` field (NH/VT is lake & river country: Winnipesaukee,
     * Willoughby, Memphremagog, etc.). The rest are PropertyType/SubType based.
     */
    public function getSupportedLifestyles(): array
    {
        return [
            'waterfront', 'water-view', 'lakefront',
            'condominium', 'single-family', 'townhouse', 'multi-family',
            'land', 'rental', 'commercial',
        ];
    }

    public function translateLifestyle(string $lifestyle): ?array
    {
        return match ($lifestyle) {
            // WaterfrontYN isn't filterable here; Water_View is the working proxy
            // for lake/river/pond frontage + views.
            'waterfront', 'water-view', 'lakefront' => ['raw_filter' => 'Water_View ne null'],
            'condominium' => ['property_type' => 'Residential', 'property_subtype' => 'Condominium'],
            'single-family' => ['property_type' => 'Residential', 'property_subtype' => 'Single Family Residence'],
            'townhouse' => ['raw_filter' => "PropertySubType eq 'Townhouse'"],
            'multi-family' => ['property_type' => 'Residential Income'],
            'land' => ['property_type' => 'Land'],
            'rental' => ['property_type' => 'Residential Lease'],
            'commercial' => ['property_type' => 'Commercial Sale'],
            default => null,
        };
    }
}
