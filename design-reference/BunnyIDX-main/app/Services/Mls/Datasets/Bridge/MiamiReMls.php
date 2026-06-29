<?php

declare(strict_types=1);

namespace App\Services\Mls\Datasets\Bridge;

use App\Services\Mls\Dto\MlsFeed;

/**
 * Miami Association of Realtors — Bridge-backed.
 *
 * Reference dataset for Phase 1: the first concrete MlsDataset. Acts as the
 * canonical example for every future per-MLS class.
 */
final class MiamiReMls extends BridgeDataset
{
    public function getSlug(): string
    {
        // Matches IdxConnection.mls_slug and the Bridge OData dataset path.
        return 'miamire';
    }

    public function getDisplayName(): string
    {
        return 'Miami Association of Realtors';
    }

    public function getBrandingLogoUrl(): ?string
    {
        // Official MIAMI Association of REALTORS® mark (colored), shown in
        // courtesy/compliance blocks wherever MIAMI data renders.
        return 'https://business.fiu.edu/academics/graduate/international-real-estate/images/logo-miami-association-realtors.jpeg';
    }

    public function getDatasetPath(MlsFeed $feed = MlsFeed::IDX): string
    {
        // Bridge serves Miami IDX and VOW from the same dataset slug — VOW access
        // is gated by the server token's scope, not a different OData path.
        // If Miami later enables a separate VOW dataset, override here.
        return 'miamire';
    }

    public function supportedFeeds(): array
    {
        // IDX only for now. Enable VOW after the server token is provisioned with
        // VOW scope and the consuming UI (logged-in agent dashboard) is built.
        return [MlsFeed::IDX];
    }

    /**
     * Miami exposes a handful of waterfront-specific fields not in standard RESO.
     * Phase 3 will surface these in the modal automatically via the API.
     *
     * @return array<int,array{key:string,label:string,type:string}>
     */
    public function getCustomFields(): array
    {
        return [
            ['key' => 'WaterfrontFeatures', 'label' => 'Waterfront Features', 'type' => 'multiselect'],
            ['key' => 'View', 'label' => 'View', 'type' => 'multiselect'],
            ['key' => 'Furnished', 'label' => 'Furnished', 'type' => 'string'],
        ];
    }

    /**
     * Counties served by Miami Realtors MLS, in the feed's exact
     * `CountyOrParish` spelling — Miami stores the FULL "<Name> County" form
     * ("Miami-Dade County", 33.6k active), and "St Lucie County" carries NO
     * period. The previous bare names ("Miami-Dade") matched ZERO listings.
     *
     * All verified via a full active-listing facet scan (91.7k listings,
     * June 2026), ordered by volume; ≥90 actives kept. "OUTSIDE of Florida"
     * and "Other Florida County" placeholders excluded.
     *
     * @return string[]
     */
    public function getCounties(): array
    {
        return [
            'Miami-Dade County', 'Broward County', 'Palm Beach County',
            'St Lucie County', 'Lee County', 'Martin County',
            'Indian River County', 'Okeechobee County', 'Highlands County',
            'Charlotte County', 'Monroe County', 'Hendry County',
            'Brevard County', 'Polk County', 'Osceola County', 'Marion County',
            'Collier County', 'Putnam County', 'Citrus County', 'Orange County',
            'Sarasota County', 'Glades County',
        ];
    }

    /**
     * Canonical municipality / locale list across every county Miami Realtors
     * indexes, in the feed's exact `City` spelling (filters match
     * byte-for-byte). Format matches the City autocomplete: "City, ST".
     *
     * FEED SPELLING RULES (full facet scan, 91.7k actives, June 2026):
     *  - "Opa-Locka" (119), not the official "Opa-locka" (0).
     *  - "Lauderdale By The Sea" (297), not "Lauderdale-by-the-Sea" (0).
     *  - "Green Acres" (33), not "Greenacres" (0).
     *  - "Lake Worth" (851) only — "Lake Worth Beach" is NOT stored (0).
     *  - "Loxahatchee" (182) — "Loxahatchee Groves" is NOT stored (0).
     *  - "Sewalls Point" (12), no apostrophe. "Indian Town" (11), two words.
     *  - "Port St. Lucie" (2.7k) KEEPS the period — opposite of BeachesMLS.
     *  - "La Belle" (140), two words — BeachesMLS stores "Labelle".
     *  - Neighborhood-as-City values are real: "Coconut Grove" (76),
     *    "Kendall" (28), "Singer Island" (287), "Hutchinson Island" (122).
     *  - Indian Creek, Lazy Lake, Sea Ranch Lakes, Cloud Lake, Glen Ridge,
     *    Village of Golf, Ocean Breeze: zero stored listings — dropped.
     *
     * @return string[]
     */
    public function getCities(): array
    {
        // ── Miami-Dade County ─────────────────────────────────────────────
        $miamiDade = [
            'Aventura', 'Bal Harbour', 'Bay Harbor Islands', 'Biscayne Park',
            'Coconut Grove', 'Coral Gables', 'Cutler Bay', 'Doral', 'El Portal',
            'Florida City', 'Golden Beach', 'Hialeah', 'Hialeah Gardens',
            'Homestead', 'Kendall', 'Key Biscayne', 'Medley', 'Miami',
            'Miami Beach', 'Miami Gardens', 'Miami Lakes', 'Miami Shores',
            'Miami Springs', 'North Bay Village', 'North Miami',
            'North Miami Beach', 'Opa-Locka', 'Palmetto Bay', 'Pinecrest',
            'South Miami', 'Sunny Isles Beach', 'Surfside', 'Sweetwater',
            'Virginia Gardens', 'West Miami',
        ];

        // ── Broward County ────────────────────────────────────────────────
        $broward = [
            'Coconut Creek', 'Cooper City', 'Coral Springs', 'Dania Beach',
            'Davie', 'Deerfield Beach', 'Fort Lauderdale', 'Hallandale Beach',
            'Hillsboro Beach', 'Hollywood', 'Lauderdale By The Sea',
            'Lauderdale Lakes', 'Lauderhill', 'Lighthouse Point', 'Margate',
            'Miramar', 'North Lauderdale', 'Oakland Park', 'Parkland',
            'Pembroke Park', 'Pembroke Pines', 'Plantation', 'Pompano Beach',
            'Southwest Ranches', 'Sunrise', 'Tamarac', 'West Park', 'Weston',
            'Wilton Manors',
        ];

        // ── Palm Beach County ─────────────────────────────────────────────
        $palmBeach = [
            'Atlantis', 'Belle Glade', 'Boca Raton', 'Boynton Beach',
            'Briny Breezes', 'Delray Beach', 'Green Acres', 'Gulf Stream',
            'Haverhill', 'Highland Beach', 'Hypoluxo', 'Juno Beach', 'Jupiter',
            'Jupiter Inlet Colony', 'Lake Clarke Shores', 'Lake Park',
            'Lake Worth', 'Lantana', 'Loxahatchee', 'Manalapan',
            'Mangonia Park', 'North Palm Beach', 'Ocean Ridge', 'Pahokee',
            'Palm Beach', 'Palm Beach Gardens', 'Palm Beach Shores',
            'Palm Springs', 'Riviera Beach', 'Royal Palm Beach',
            'Singer Island', 'South Bay', 'South Palm Beach', 'Tequesta',
            'Wellington', 'West Palm Beach', 'Westlake',
        ];

        // ── Martin County ─────────────────────────────────────────────────
        $martin = [
            'Hobe Sound', 'Indian Town', 'Jensen Beach', 'Jupiter Island',
            'Palm City', 'Sewalls Point', 'Stuart',
        ];

        // ── St. Lucie County (period kept: "Port St. Lucie") ──────────────
        $stLucie = [
            'Fort Pierce', 'Hutchinson Island', 'Port St. Lucie',
        ];

        // ── Indian River County ───────────────────────────────────────────
        $indianRiver = [
            'Fellsmere', 'Indian River Shores', 'Sebastian', 'Vero Beach',
        ];

        // ── Lake Okeechobee region ────────────────────────────────────────
        $okeechobeeRegion = [
            'Clewiston', 'La Belle', 'Moore Haven', 'Okeechobee',
        ];

        // ── Monroe County (Keys) ──────────────────────────────────────────
        $monroe = [
            'Islamorada', 'Key Largo', 'Key West', 'Marathon',
            'Plantation Key', 'Tavernier',
        ];

        // ── Out-of-footprint locales with sustained member inventory
        //    (≥100 active in the June 2026 scan) ────────────────────────────
        $outOfArea = [
            'Cape Coral',     // Lee, 427
            'Fort Myers',     // Lee, 128
            'Kissimmee',      // Osceola, 114
            'Lake Placid',    // Highlands, 210
            'Lehigh Acres',   // Lee, 924
            'Naples',         // Collier, 123
            'North Port',     // Sarasota, 107
            'Ocala',          // Marion, 147
            'Orlando',        // Orange, 104
            'Palm Bay',       // Brevard, 222
            'Port Charlotte', // Charlotte, 314
            'Punta Gorda',    // Charlotte, 140
            'Sebring',        // Highlands, 294
        ];

        $withState = static fn (array $cities, string $st): array => array_map(static fn (string $c) => "{$c}, {$st}", $cities);

        return array_merge(
            $withState($miamiDade, 'FL'),
            $withState($broward, 'FL'),
            $withState($palmBeach, 'FL'),
            $withState($martin, 'FL'),
            $withState($stLucie, 'FL'),
            $withState($indianRiver, 'FL'),
            $withState($okeechobeeRegion, 'FL'),
            $withState($monroe, 'FL'),
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
     * ~12.7k entries — far too many and too volatile to inline, so they live
     * in a colocated JSON data file. Case variants are real distinct stored
     * values and both kept (the filter matches byte-for-byte). Refresh via
     * scripts/export-location-facets.php + scripts/build-location-taxonomy.php.
     *
     * @return string[]
     */
    public function getSubdivisions(): array
    {
        if (self::$subdivisions !== null) {
            return self::$subdivisions;
        }

        $path = __DIR__.'/data/miamire-subdivisions.json';
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

        $path = __DIR__.'/data/miamire-zips.json';
        $decoded = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;

        return self::$zipCodes = is_array($decoded) ? $decoded : [];
    }

    /**
     * Sub-city neighborhoods Miami Realtors indexes (and that users actually
     * search by). Keyed by the area heading so the frontend can group them in a
     * neighborhood picker / build per-neighborhood landing pages. Also covers
     * unincorporated CDPs (Kendall, The Hammocks, etc.) that aren't cities but
     * are how local agents talk about location.
     *
     * @return array<string, string[]>
     */
    public function getNeighborhoods(): array
    {
        return [
            // ── City of Miami ───────────────────────────────────────────
            'City of Miami' => [
                'Allapattah', 'Brickell', 'Brickell Key', 'Buena Vista',
                'Coconut Grove', 'Coral Way', 'Design District', 'Downtown Miami',
                'East Little Havana', 'Edgewater', 'Flagami', 'Grapeland Heights',
                'Health District', 'Liberty City', 'Little Haiti', 'Little Havana',
                'Midtown', 'Model City', 'Morningside', 'Omni', 'Overtown',
                'Park West', 'Shenandoah', 'Silver Bluff', 'Spring Garden',
                'The Roads', 'Upper Eastside (MiMo)', 'Virginia Key',
                'West Flagler', 'Wynwood',
            ],
            // ── Miami Beach ─────────────────────────────────────────────
            'Miami Beach' => [
                'Bayshore', 'Flamingo / Lummus', 'La Gorce', 'Mid-Beach',
                'Nautilus', 'Normandy Isles', 'North Beach', 'Palm Island',
                'Hibiscus Island', 'Star Island', 'South Beach (SoBe)',
                'South of Fifth (SoFi)', 'Sunset Islands', 'Venetian Islands',
            ],
            // ── Coral Gables ────────────────────────────────────────────
            'Coral Gables' => [
                'Cocoplum', 'Coral Bay', 'Coral Gables (central)',
                'Gables by the Sea', 'Gables Estates', 'Old Cutler',
                'Ponce-Davis', 'Riviera',
            ],
            // ── Doral ───────────────────────────────────────────────────
            'Doral' => [
                'Doral Estates', 'Doral Isles', 'Downtown Doral',
                'Islands at Doral',
            ],
            // ── Aventura / North ────────────────────────────────────────
            'Aventura & North' => [
                'Aventura', 'Golden Shores', 'Sunny Isles Beach',
                'Williams Island',
            ],
            // ── Miami-Dade unincorporated / CDP neighborhoods ───────────
            'Miami-Dade Unincorporated' => [
                'Andover', 'Brownsville', 'Country Walk', 'Cutler', 'Fontainebleau',
                'Gladeview', 'Golden Glades', 'Goulds', 'Highland Lakes',
                'Ives Estates', 'Kendall', 'Kendall West', 'Lake Lucerne',
                'Leisure City', 'Naranja', 'Norland', 'Ojus', 'Olympia Heights',
                'Palmetto Estates', 'Perrine', 'Pinewood', 'Princeton',
                'Richmond Heights', 'Richmond West', 'Scott Lake', 'Sky Lake',
                'South Miami Heights', 'Sunset', 'Tamiami', 'The Crossings',
                'The Hammocks', 'University Park', 'West Kendall',
                'West Little River', 'Westchester', 'Westview',
                'Westwood Lakes',
            ],
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
            // ── Jupiter / Palm Beach Gardens ────────────────────────────
            'Jupiter & Palm Beach Gardens' => [
                'Abacoa', 'Admirals Cove', 'BallenIsles', "Frenchman's Creek",
                'Jonathan\'s Landing', 'Jupiter Inlet Colony', 'Mirasol',
                'Old Palm', 'PGA National',
            ],
            // ── Wellington / West ───────────────────────────────────────
            'Wellington & West' => [
                'Equestrian Club (Wellington)', 'Loxahatchee', 'Olympia (Wellington)',
                'Royal Palm Beach', 'The Acreage', 'The Mall at Wellington Green',
                'Versailles (Wellington)',
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
        ];
    }

    /**
     * Miami's lifestyle vocabulary — what the website templates' "neighborhood
     * collection" pages (Beachfront, Luxury, 55+, Penthouses) actually query.
     * Each keyword maps to OData clauses Bridge can answer against Miami fields.
     *
     * @return string[]
     */
    public function getSupportedLifestyles(): array
    {
        return [
            'beachfront', 'waterfront', 'ocean-view', 'water-view',
            'luxury', 'new-construction', 'penthouse', 'condominium',
            'single-family', 'townhouse', 'multi-family',
            'pool', 'pet-friendly', 'furnished',
            '55-plus', 'gated',
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
            'water-view' => ['raw_filter' => ['ViewYN eq true', "(contains(View, 'Water') or contains(View, 'Ocean') or contains(View, 'Bay') or contains(View, 'Canal'))"]],
            'luxury' => ['min_price' => 1500000],
            'new-construction' => ['raw_filter' => 'NewConstructionYN eq true'],
            'penthouse' => ['raw_filter' => "contains(PropertySubType, 'Penthouse')"],
            'condominium' => ['property_type' => 'Residential', 'property_subtype' => 'Condominium'],
            'single-family' => ['property_type' => 'Residential', 'property_subtype' => 'Single Family Residence'],
            'townhouse' => ['raw_filter' => "PropertySubType eq 'Townhouse'"],
            'multi-family' => ['property_type' => 'Residential Income'],
            'pool' => ['raw_filter' => 'PoolPrivateYN eq true'],
            'pet-friendly' => ['raw_filter' => "PetsAllowed ne null and PetsAllowed ne 'No'"],
            'furnished' => ['raw_filter' => "Furnished eq 'Furnished'"],
            '55-plus' => ['raw_filter' => 'SeniorCommunityYN eq true'],
            'gated' => ['raw_filter' => "contains(MIAMIRE_Restrictions, 'Gated') or contains(InteriorFeatures, 'Gated')"],
            'golf' => ['raw_filter' => "contains(View, 'Golf')"],
            'boating' => ['raw_filter' => "(contains(WaterfrontFeatures, 'Ocean Access') or contains(WaterfrontFeatures, 'Canal') or contains(WaterfrontFeatures, 'Intracoastal') or contains(WaterfrontFeatures, 'Navigable'))"],
            'bay-front' => ['raw_filter' => "contains(WaterfrontFeatures, 'Bay')"],
            'commercial' => ['property_type' => 'Commercial Sale'],
            'land' => ['property_type' => 'Land'],
            'rental' => ['property_type' => 'Residential Lease'],
            default => null,
        };
    }
}
