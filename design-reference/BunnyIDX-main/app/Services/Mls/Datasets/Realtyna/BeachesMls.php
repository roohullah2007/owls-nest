<?php

declare(strict_types=1);

namespace App\Services\Mls\Datasets\Realtyna;

use App\Services\Mls\Dto\MlsFeed;

/**
 * BeachesMLS — Broward, Palm Beaches & St. Lucie REALTORS® — Realtyna-backed.
 *
 * First concrete Realtyna dataset; the reference implementation for every
 * future RealtyFeed-proxied MLS (analogous to Bridge\MiamiReMls).
 *
 * Coverage verified live (active-listing counts, June 2026): Palm Beach 16.5k,
 * Broward 11.7k, St Lucie 4k, Miami-Dade 2.1k (overlap), Martin 1.4k,
 * Indian River 1.2k, Okeechobee 612, Hendry 105, Glades 63.
 */
final class BeachesMls extends RealtynaDataset
{
    public function getSlug(): string
    {
        // Matches IdxConnection.mls_slug and the config/idx.php catalog key.
        return 'beachesmls';
    }

    public function getDisplayName(): string
    {
        return 'BeachesMLS (Broward, Palm Beaches & St. Lucie)';
    }

    public function getBrandingLogoUrl(): ?string
    {
        // Official BeachesMLS full-color mark from the association's branding
        // kit (rworld.com/external-beaches), shown in courtesy/compliance
        // blocks wherever BeachesMLS data renders.
        return 'https://static1.squarespace.com/static/5dd6e5c4baf69652ee450b55/t/5f8750280ec883699d38fc4f/1602703401141/BeachesMLS+Logo.png';
    }

    public function getDatasetPath(MlsFeed $feed = MlsFeed::IDX): string
    {
        // RealtyFeed partitions MLSes by OriginatingSystemName — this exact
        // value scopes every OData request. IDX/VOW share it; scope is decided
        // by the account's token, not a different identifier.
        return 'Beaches';
    }

    public function supportedFeeds(): array
    {
        // IDX only until a VOW-scoped Realtyna account is provisioned.
        return [MlsFeed::IDX];
    }

    /**
     * Beaches exposes these beyond the universal RESO core. All verified
     * selectable + filterable on the live feed.
     *
     * @return array<int,array{key:string,label:string,type:string}>
     */
    public function getCustomFields(): array
    {
        return [
            ['key' => 'View', 'label' => 'View', 'type' => 'multiselect'],
            ['key' => 'Furnished', 'label' => 'Furnished', 'type' => 'string'],
            ['key' => 'PetsAllowed', 'label' => 'Pets Allowed', 'type' => 'string'],
        ];
    }

    /**
     * Counties served, in the feed's exact `CountyOrParish` spelling — note
     * "St Lucie" carries NO period on this feed (unlike Bridge/Miami's
     * "St. Lucie"). Filters must match the stored value byte-for-byte.
     *
     * All verified live via a full active-listing facet scan (June 2026),
     * ordered by volume: Palm Beach 16.5k, Broward 11.8k, St Lucie 4k,
     * Miami-Dade 2.2k (cross-market overlap), Martin 1.4k, Indian River 1.2k,
     * Okeechobee 610. The tail (Lee 371 … Monroe 89) is members listing
     * outside the core footprint — real, filterable inventory, so the picker
     * offers them too. Counties under ~50 actives are one-offs and excluded.
     *
     * @return string[]
     */
    public function getCounties(): array
    {
        return [
            'Palm Beach', 'Broward', 'St Lucie', 'Miami-Dade', 'Martin',
            'Indian River', 'Okeechobee', 'Hendry', 'Glades',
            // Out-of-footprint counties with sustained member inventory:
            'Lee', 'Brevard', 'Highlands', 'Polk', 'Osceola', 'Putnam',
            'Charlotte', 'Marion', 'Citrus', 'Monroe',
        ];
    }

    /**
     * Canonical municipality / locale list across every county BeachesMLS
     * indexes, in the feed's exact `City` spelling. Format matches the City
     * autocomplete: "City, ST".
     *
     * FEED SPELLING RULES (all verified live, June 2026):
     *  - "St." loses its period: "Port St Lucie" (2,546 active), not
     *    "Port St. Lucie" (0). Same as the "St Lucie" county value.
     *  - Apostrophes are dropped: "Sewalls Point" (11), not "Sewall's Point" (0).
     *  - "Lake Worth" (704) and "Lake Worth Beach" (379) are BOTH stored —
     *    older listings keep the pre-rename value. List both.
     *  - Island locales are first-class City values: "Singer Island" (273),
     *    "Hutchinson Island" (114).
     *  - Unincorporated Vero CDPs (Gifford, Wabasso, Roseland, Vero Lake
     *    Estates) and "LaBelle" / "St Lucie Village" / "Buckhead Ridge" return
     *    0 as City values — they live in getNeighborhoods() instead.
     *
     * @return string[]
     */
    public function getCities(): array
    {
        // ── Palm Beach County (39 incorporated + verified locales) ───────
        $palmBeach = [
            'Atlantis', 'Belle Glade', 'Boca Raton', 'Boynton Beach',
            'Briny Breezes', 'Canal Point', 'Cloud Lake', 'Delray Beach',
            'Glen Ridge', 'Greenacres', 'Gulf Stream', 'Haverhill',
            'Highland Beach', 'Hypoluxo', 'Juno Beach', 'Jupiter',
            'Jupiter Inlet Colony', 'Lake Clarke Shores', 'Lake Park',
            'Lake Worth', 'Lake Worth Beach', 'Lantana', 'Loxahatchee',
            'Loxahatchee Groves', 'Manalapan', 'Mangonia Park',
            'North Palm Beach', 'Ocean Ridge', 'Pahokee', 'Palm Beach',
            'Palm Beach Gardens', 'Palm Beach Shores', 'Palm Springs',
            'Riviera Beach', 'Royal Palm Beach', 'Singer Island', 'South Bay',
            'South Palm Beach', 'Tequesta', 'The Acreage', 'Village of Golf',
            'Wellington', 'West Palm Beach', 'Westlake',
        ];

        // ── Broward County (31 incorporated) — feed stores "Lauderdale By
        //    The Sea" (209 active), NOT the official hyphenated spelling ────
        $broward = [
            'Coconut Creek', 'Cooper City', 'Coral Springs', 'Dania Beach',
            'Davie', 'Deerfield Beach', 'Fort Lauderdale', 'Hallandale Beach',
            'Hillsboro Beach', 'Hollywood', 'Lauderdale Lakes',
            'Lauderdale By The Sea', 'Lauderhill', 'Lazy Lake',
            'Lighthouse Point', 'Margate', 'Miramar', 'North Lauderdale',
            'Oakland Park', 'Parkland', 'Pembroke Park', 'Pembroke Pines',
            'Plantation', 'Pompano Beach', 'Sea Ranch Lakes',
            'Southwest Ranches', 'Sunrise', 'Tamarac', 'West Park', 'Weston',
            'Wilton Manors',
        ];

        // ── St. Lucie County (feed drops the period: "Port St Lucie") ────
        $stLucie = [
            'Fort Pierce', 'Hutchinson Island', 'Port St Lucie',
        ];

        // ── Martin County ────────────────────────────────────────────────
        $martin = [
            'Hobe Sound', 'Indiantown', 'Jensen Beach', 'Jupiter Island',
            'Ocean Breeze', 'Palm City', 'Port Salerno', 'Rio',
            'Sewalls Point', 'Stuart',
        ];

        // ── Indian River County ──────────────────────────────────────────
        $indianRiver = [
            'Fellsmere', 'Indian River Shores', 'Orchid', 'Sebastian',
            'Vero Beach',
        ];

        // ── Okeechobee County ────────────────────────────────────────────
        $okeechobee = ['Okeechobee'];

        // ── Hendry & Glades Counties (Lake Okeechobee west shore) — feed
        //    stores "Labelle" (49 active), not the official "LaBelle" ──────
        $hendryGlades = ['Clewiston', 'Labelle', 'Moore Haven'];

        // ── Out-of-footprint locales with sustained member inventory
        //    (full facet scan, June 2026; all ≥40 active) ──────────────────
        $outOfArea = [
            'Cape Coral',       // Lee, 88
            'Citrus Springs',   // Citrus, 48
            'Dunnellon',        // Marion, 41
            'Interlachen',      // Putnam, 94
            'Lake Placid',      // Highlands, 87
            'Lehigh Acres',     // Lee, 218
            'Ocala',            // Marion, 68
            'Palm Bay',         // Brevard, 173
            'Polk City',        // Polk, 40
            'Port Charlotte',   // Charlotte, 95
            'Sebring',          // Highlands, 109
            'St Cloud',         // Osceola, 123
        ];

        // ── Miami-Dade County (cross-market overlap — 2.1k active; the
        //    major municipalities Beaches members actually list in) ────────
        $miamiDade = [
            'Aventura', 'Coral Gables', 'Cutler Bay', 'Doral', 'Hialeah',
            'Homestead', 'Miami', 'Miami Beach', 'Miami Gardens',
            'North Miami', 'North Miami Beach', 'Sunny Isles Beach',
        ];

        $withState = static fn (array $cities, string $st): array => array_map(static fn (string $c) => "{$c}, {$st}", $cities);

        return array_merge(
            $withState($palmBeach, 'FL'),
            $withState($broward, 'FL'),
            $withState($stLucie, 'FL'),
            $withState($martin, 'FL'),
            $withState($indianRiver, 'FL'),
            $withState($okeechobee, 'FL'),
            $withState($hendryGlades, 'FL'),
            $withState($miamiDade, 'FL'),
            $withState($outOfArea, 'FL'),
        );
    }

    /** Process-level memos so each JSON is decoded at most once per request. */
    private static ?array $subdivisions = null;

    private static ?array $zipCodes = null;

    /**
     * Distinct subdivisions from the live feed's `SubdivisionName` facet
     * (full active-listing scan, June 2026), junk-stripped (N/A, METES AND
     * BOUNDS, numeric codes, …) and limited to names on ≥2 active listings.
     * ~6.5k entries — too many and too volatile to inline, so they live in a
     * colocated JSON data file. Case variants ("Century Village" vs "CENTURY
     * VILLAGE") are BOTH real stored values and both kept — the subdivision
     * filter matches byte-for-byte. Refresh via
     * scripts/export-location-facets.php + scripts/build-location-taxonomy.php.
     *
     * @return string[]
     */
    public function getSubdivisions(): array
    {
        if (self::$subdivisions !== null) {
            return self::$subdivisions;
        }

        $path = __DIR__.'/data/beachesmls-subdivisions.json';
        $decoded = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;

        return self::$subdivisions = is_array($decoded) ? $decoded : [];
    }

    /**
     * ZIP codes from the live feed's `PostalCode` facet — well-formed 5-digit
     * values on ≥2 active listings. Same refresh pipeline as subdivisions.
     *
     * @return string[]
     */
    public function getZipCodes(): array
    {
        if (self::$zipCodes !== null) {
            return self::$zipCodes;
        }

        $path = __DIR__.'/data/beachesmls-zips.json';
        $decoded = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;

        return self::$zipCodes = is_array($decoded) ? $decoded : [];
    }

    /**
     * Sub-city neighborhoods agents actually search by in the Beaches
     * footprint. Keyed by area heading for the grouped neighborhood picker.
     *
     * @return array<string, string[]>
     */
    public function getNeighborhoods(): array
    {
        return [
            // ── Fort Lauderdale ─────────────────────────────────────────
            'Fort Lauderdale' => [
                'Bermuda Riviera', 'Colee Hammock', 'Coral Ridge',
                'Coral Ridge Isles', 'Croissant Park', 'Flagler Village',
                'Harbor Beach', 'Imperial Point', 'Las Olas', 'Lauderdale Beach',
                'Poinsettia Heights', 'Rio Vista', 'Sailboat Bend', 'Sunrise Key',
                'Tarpon River', 'Victoria Park',
            ],
            // ── Hollywood ───────────────────────────────────────────────
            'Hollywood' => [
                'Beverly Park', 'Downtown Hollywood', 'Emerald Hills',
                'Hollywood Beach', 'Hollywood Hills', 'Lawn Acres',
                'Royal Poinciana',
            ],
            // ── Southeast Broward ───────────────────────────────────────
            'Southeast Broward' => [
                'Dania Beach', 'Golden Isles (Hallandale)', 'Gulfstream Park',
                'Hallandale Beach', 'Three Islands (Hallandale)', 'West Park',
            ],
            // ── Pompano Beach / Deerfield ───────────────────────────────
            'Pompano Beach & Deerfield' => [
                'Cresthaven', 'Deerfield Beach', 'Hillsboro Shores',
                'Palm-Aire (Pompano)', 'Pompano Beach', 'The Cove (Deerfield)',
            ],
            // ── West Broward ────────────────────────────────────────────
            'West Broward' => [
                'Bonaventure (Weston)', 'Coral Springs', 'Davie (Forest Ridge)',
                'Davie (Shenandoah)', 'Embassy Lakes (Cooper City)',
                'Heron Bay (Parkland)', 'Jacaranda (Plantation)',
                'Parkland Golf & Country Club', 'Plantation Acres',
                'Rock Creek (Cooper City)', 'Savanna (Weston)',
                'Sawgrass (Sunrise)', 'Weston Hills',
            ],
            // ── West Palm Beach ─────────────────────────────────────────
            'West Palm Beach' => [
                'Andros Isle', 'CityPlace / Rosemary Square', 'Downtown WPB',
                'El Cid', 'Flamingo Park', 'Grandview Heights', 'Ibis',
                'Mango Promenade', 'Northwood', 'Northwood Shores',
                'Prospect Park', 'SoSo (South of Southern)',
            ],
            // ── Boca Raton ──────────────────────────────────────────────
            'Boca Raton' => [
                'Boca del Mar', 'Boca West', 'Broken Sound', 'East Boca',
                'Mizner Park District', 'Old Floresta',
                'Royal Palm Yacht & Country Club', 'The Sanctuary', 'Woodfield',
            ],
            // ── Delray Beach ────────────────────────────────────────────
            'Delray Beach' => [
                'Del-Aire', 'Lake Ida', 'Marina District', 'Pineapple Grove',
                'Seagate', 'Tropic Isle',
            ],
            // ── Boynton Beach / Lake Worth corridor ─────────────────────
            'Boynton Beach & Lake Worth' => [
                'Aberdeen', 'Canyon Isles', 'Canyon Lakes', 'College Park',
                'Downtown Lake Worth Beach', 'Hunters Run', 'Indian Spring',
                'Lake Charleston', 'Lake Osborne Estates', 'Renaissance Commons',
                'Valencia Isles', 'Valencia Lakes', 'Valencia Reserve',
            ],
            // ── Jupiter / Palm Beach Gardens ────────────────────────────
            'Jupiter & Palm Beach Gardens' => [
                'Abacoa', 'Admirals Cove', 'BallenIsles', "Frenchman's Creek",
                "Jonathan's Landing", 'Jupiter Inlet Colony', 'Mirasol',
                'Old Palm', 'PGA National',
            ],
            // ── North Palm Beach corridor / Singer Island ───────────────
            'North Palm Beach & Singer Island' => [
                'Juno Beach', 'Lake Park', 'Lost Tree Village',
                'North Palm Beach', 'Old Port Cove', 'Palm Beach Isles',
                'Palm Beach Shores', 'Singer Island',
            ],
            // ── Wellington / West ───────────────────────────────────────
            'Wellington & West' => [
                'Equestrian Club (Wellington)', 'Loxahatchee', 'Olympia (Wellington)',
                'Royal Palm Beach', 'The Acreage', 'Versailles (Wellington)',
                'Westlake',
            ],
            // ── Martin County ───────────────────────────────────────────
            'Martin County' => [
                'Hobe Sound', 'Hutchinson Island (Martin)', 'Indiantown',
                'Jensen Beach', 'Mariner Sands', 'Palm City', 'Port Salerno',
                'Rio', 'Sailfish Point', "Sewall's Point", 'The Floridian',
            ],
            // ── St. Lucie County ────────────────────────────────────────
            'St. Lucie County' => [
                'Hutchinson Island (St. Lucie)', 'Indian River Estates',
                'Lakewood Park', 'PGA Village', 'River Park', 'St. Lucie West',
                'Tesoro', 'The Reserve', 'Torino', 'Tradition', 'White City',
            ],
            // ── Indian River County ─────────────────────────────────────
            'Indian River County' => [
                'Castaway Cove', 'Gifford', 'Grand Harbor', "John's Island",
                'Moorings', 'Orchid Island', 'Roseland', 'Sebastian',
                'Vero Beach Island', 'Vero Isles', 'Vero Lake Estates',
                'Wabasso', 'Winter Beach',
            ],
            // ── Lake Okeechobee region (Okeechobee / Hendry / Glades /
            //    western Palm Beach) ──────────────────────────────────────
            'Lake Okeechobee Region' => [
                'Belle Glade', 'Buckhead Ridge', 'Canal Point', 'Clewiston',
                'Moore Haven', 'Okeechobee', 'Pahokee', 'Port LaBelle',
                'South Bay', 'Taylor Creek',
            ],
        ];
    }

    /**
     * Lifestyle vocabulary Beaches can answer. Every keyword below was
     * verified filterable against the live feed (non-zero active counts):
     * waterfront 10.9k, pool 6.9k, 55+ 7.2k, ocean view 3.1k, townhouse 3.1k,
     * furnished 6.5k, new construction 1.4k.
     *
     * @return string[]
     */
    public function getSupportedLifestyles(): array
    {
        return [
            'beachfront', 'waterfront', 'ocean-view', 'water-view',
            'luxury', 'new-construction', 'condominium',
            'single-family', 'townhouse', 'multi-family',
            'pool', 'pet-friendly', 'furnished',
            '55-plus',
            'golf', 'boating', 'bay-front',
            'commercial', 'land', 'rental',
        ];
    }

    public function translateLifestyle(string $lifestyle): ?array
    {
        return match ($lifestyle) {
            'beachfront' => ['raw_filter' => ['WaterfrontYN eq true', "contains(View, 'Ocean')"]],
            'waterfront' => ['raw_filter' => 'WaterfrontYN eq true'],
            'ocean-view' => ['raw_filter' => ['ViewYN eq true', "contains(View, 'Ocean')"]],
            'water-view' => ['raw_filter' => ['ViewYN eq true', "(contains(View, 'Water') or contains(View, 'Ocean') or contains(View, 'Intracoastal') or contains(View, 'Lake') or contains(View, 'Canal'))"]],
            'luxury' => ['min_price' => 1000000],
            'new-construction' => ['raw_filter' => 'NewConstructionYN eq true'],
            'condominium' => ['property_type' => 'Residential', 'property_subtype' => 'Condominium'],
            'single-family' => ['property_type' => 'Residential', 'property_subtype' => 'Single Family Residence'],
            'townhouse' => ['raw_filter' => "PropertySubType eq 'Townhouse'"],
            'multi-family' => ['property_type' => 'Residential Income'],
            'pool' => ['raw_filter' => 'PoolPrivateYN eq true'],
            'pet-friendly' => ['raw_filter' => "PetsAllowed ne null and PetsAllowed ne 'No'"],
            'furnished' => ['raw_filter' => "Furnished eq 'Furnished'"],
            '55-plus' => ['raw_filter' => 'SeniorCommunityYN eq true'],
            // Verified live: View 'Golf Course' 1.8k, 'Ocean Access' 3.3k actives;
            // this feed writes "Bayfront" as ONE word (sampled vocabulary).
            'golf' => ['raw_filter' => "contains(View, 'Golf')"],
            'boating' => ['raw_filter' => "(contains(WaterfrontFeatures, 'Ocean Access') or contains(WaterfrontFeatures, 'Canal') or contains(WaterfrontFeatures, 'Intracoastal') or contains(WaterfrontFeatures, 'Navigable'))"],
            'bay-front' => ['raw_filter' => "(contains(WaterfrontFeatures, 'Bayfront') or contains(WaterfrontFeatures, 'Bay Front'))"],
            'commercial' => ['property_type' => 'Commercial Sale'],
            'land' => ['property_type' => 'Land'],
            'rental' => ['property_type' => 'Residential Lease'],
            default => null,
        };
    }
}
