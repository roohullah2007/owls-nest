<?php

declare(strict_types=1);

namespace App\Services\Mls\Datasets\Bridge;

use App\Services\Mls\Dto\MlsFeed;

/**
 * Stellar MLS — Florida's largest MLS ("My Florida Regional MLS" / MFRMLS),
 * served via Bridge Data Output. Mirrors {@see MiamiReMls}: a concrete
 * BridgeDataset that pins the Bridge dataset path and ships Florida-specific
 * geography + lifestyle vocabulary. Because it's Bridge-backed it inherits the
 * full filter surface (city, price, beds, subdivision, …) from BridgeDataset —
 * unlike the previous MLSGrid implementation, which could only filter on a
 * server-side whitelist.
 */
final class StellarMls extends BridgeDataset
{
    public function getSlug(): string
    {
        // Matches IdxConnection.mls_slug.
        return 'stellar';
    }

    public function getDisplayName(): string
    {
        return 'Stellar MLS';
    }

    /**
     * Bridge OData dataset identifier for Stellar/MFRMLS. Miami's is 'miamire'.
     *
     * NOTE: this must match the dataset name provisioned on BRIDGE_SERVER_TOKEN.
     * Confirm the exact slug in the Bridge Data Output console (the system name
     * is typically 'mfrmls') and update here if it differs.
     */
    public function getDatasetPath(MlsFeed $feed = MlsFeed::IDX): string
    {
        return 'mfrmls';
    }

    public function supportedFeeds(): array
    {
        // IDX only for now — enable VOW once the server token carries VOW scope
        // for this dataset (same posture as Miami).
        return [MlsFeed::IDX];
    }

    /**
     * Florida waterfront / furnishing fields beyond standard RESO that agents
     * search Stellar by. Surfaced as custom filter inputs (parity with Miami).
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
     * Core service area Stellar/MFRMLS covers across Central & Southwest
     * Florida. Powers the County filter pill list. Bare county names (no state
     * suffix), matching the County DTO field.
     *
     * @return string[]
     */
    public function getCounties(): array
    {
        return [
            'Orange', 'Seminole', 'Osceola', 'Lake', 'Sumter', 'Volusia',
            'Polk', 'Flagler', 'Hillsborough', 'Pasco', 'Pinellas', 'Manatee',
            'Sarasota', 'Charlotte', 'DeSoto', 'Marion', 'Alachua', 'Okeechobee',
        ];
    }

    /**
     * Incorporated Florida municipalities (cities, towns, villages) within
     * Stellar's ~18-county service area — the official municipality roster,
     * grouped by county. Deliberately NOT the raw MLS City facet (which mixed
     * in unincorporated CDPs and out-of-area values). "City, FL" format for the
     * picker. Note: large unincorporated CDPs agents do search by (The Villages,
     * Spring Hill, Wesley Chapel, Riverview, Brandon, Lehigh Acres, Poinciana,
     * Lakewood Ranch) are intentionally excluded as they are not municipalities.
     *
     * @return string[]
     */
    public function getCities(): array
    {
        $byCounty = [
            // Orange
            'Orlando', 'Apopka', 'Ocoee', 'Winter Garden', 'Winter Park',
            'Maitland', 'Edgewood', 'Belle Isle', 'Eatonville', 'Oakland',
            'Windermere', 'Bay Lake', 'Lake Buena Vista',
            // Seminole
            'Altamonte Springs', 'Casselberry', 'Lake Mary', 'Longwood',
            'Oviedo', 'Sanford', 'Winter Springs',
            // Osceola
            'Kissimmee', 'St. Cloud',
            // Lake
            'Astatula', 'Clermont', 'Eustis', 'Fruitland Park', 'Groveland',
            'Howey-in-the-Hills', 'Lady Lake', 'Leesburg', 'Mascotte',
            'Minneola', 'Montverde', 'Mount Dora', 'Tavares', 'Umatilla',
            // Sumter
            'Bushnell', 'Center Hill', 'Coleman', 'Webster', 'Wildwood',
            // Volusia
            'Daytona Beach', 'Daytona Beach Shores', 'DeBary', 'DeLand',
            'Deltona', 'Edgewater', 'Holly Hill', 'Lake Helen',
            'New Smyrna Beach', 'Oak Hill', 'Orange City', 'Ormond Beach',
            'Pierson', 'Ponce Inlet', 'Port Orange', 'South Daytona',
            // Polk
            'Auburndale', 'Bartow', 'Davenport', 'Dundee', 'Eagle Lake',
            'Fort Meade', 'Frostproof', 'Haines City', 'Highland Park',
            'Hillcrest Heights', 'Lake Alfred', 'Lake Hamilton', 'Lake Wales',
            'Lakeland', 'Mulberry', 'Polk City', 'Winter Haven',
            // Flagler
            'Beverly Beach', 'Bunnell', 'Flagler Beach', 'Marineland', 'Palm Coast',
            // Hillsborough
            'Plant City', 'Tampa', 'Temple Terrace',
            // Pasco
            'Dade City', 'New Port Richey', 'Port Richey', 'Saint Leo',
            'San Antonio', 'Zephyrhills',
            // Pinellas
            'Belleair', 'Belleair Beach', 'Belleair Bluffs', 'Belleair Shore',
            'Clearwater', 'Dunedin', 'Gulfport', 'Indian Rocks Beach',
            'Indian Shores', 'Kenneth City', 'Largo', 'Madeira Beach',
            'North Redington Beach', 'Oldsmar', 'Pinellas Park',
            'Redington Beach', 'Redington Shores', 'Safety Harbor', 'Seminole',
            'South Pasadena', 'St. Pete Beach', 'St. Petersburg', 'Tarpon Springs',
            'Treasure Island',
            // Manatee
            'Anna Maria', 'Bradenton', 'Bradenton Beach', 'Holmes Beach',
            'Longboat Key', 'Palmetto',
            // Sarasota
            'North Port', 'Sarasota', 'Venice',
            // Charlotte
            'Punta Gorda',
            // DeSoto
            'Arcadia',
            // Marion
            'Belleview', 'Dunnellon', 'McIntosh', 'Ocala', 'Reddick',
            // Alachua
            'Alachua', 'Archer', 'Gainesville', 'Hawthorne', 'High Springs',
            'La Crosse', 'Micanopy', 'Newberry', 'Waldo',
            // Okeechobee
            'Okeechobee',
        ];

        return array_map(static fn (string $c) => "{$c}, FL", $byCounty);
    }

    /** Process-level memo so the JSON is decoded at most once per request. */
    private static ?array $subdivisions = null;

    /**
     * Distinct subdivisions for Stellar, pulled directly from the live feed's
     * `SubdivisionName` facet and stripped of placeholder junk (N/A, NONE,
     * UNPLATTED, numeric codes, …). Too many (~6.6k) and too volatile to inline,
     * so they live in a colocated JSON data file the dataset owns. Now that
     * Stellar is Bridge-backed, the subdivision filter resolves server-side
     * against Bridge's `SubdivisionName`. Refresh from Bridge once the live
     * `mfrmls` dataset is provisioned.
     *
     * @return string[]
     */
    public function getSubdivisions(): array
    {
        if (self::$subdivisions !== null) {
            return self::$subdivisions;
        }

        $path = __DIR__ . '/data/stellar-subdivisions.json';
        $decoded = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;

        return self::$subdivisions = is_array($decoded) ? $decoded : [];
    }

    /** @return string[] */
    public function getSupportedLifestyles(): array
    {
        return [
            'beachfront', 'waterfront', 'gulf-view', 'water-view',
            'luxury', 'new-construction', 'penthouse', 'condominium',
            'single-family', 'townhouse', 'multi-family', 'villa',
            'pool', 'pet-friendly', 'furnished',
            '55-plus', 'gated', 'golf-course',
            'commercial', 'land', 'farm', 'rental',
        ];
    }

    public function translateLifestyle(string $lifestyle): ?array
    {
        return match ($lifestyle) {
            'beachfront' => ['raw_filter' => ["WaterfrontYN eq true", "(contains(View, 'Ocean') or contains(View, 'Beach') or contains(View, 'Gulf'))"]],
            'waterfront' => ['raw_filter' => "WaterfrontYN eq true"],
            'gulf-view' => ['raw_filter' => ["ViewYN eq true", "contains(View, 'Gulf')"]],
            'water-view' => ['raw_filter' => ["ViewYN eq true", "(contains(View, 'Water') or contains(View, 'Gulf') or contains(View, 'Bay') or contains(View, 'Canal') or contains(View, 'River'))"]],
            'luxury' => ['min_price' => 1000000],  // Florida luxury floor lower than Miami's
            'new-construction' => ['raw_filter' => 'NewConstructionYN eq true'],
            'penthouse' => ['raw_filter' => "contains(PropertySubType, 'Penthouse')"],
            'condominium' => ['property_types' => ['Residential'], 'property_subtypes' => ['Condominium']],
            'single-family' => ['property_types' => ['Residential'], 'property_subtypes' => ['Single Family Residence']],
            'townhouse' => ['property_subtypes' => ['Townhouse']],
            'villa' => ['property_subtypes' => ['Villa']],
            'multi-family' => ['property_types' => ['Residential Income']],
            'pool' => ['raw_filter' => 'PoolPrivateYN eq true'],
            'pet-friendly' => ['raw_filter' => "PetsAllowed ne null and PetsAllowed ne 'No'"],
            'furnished' => ['raw_filter' => "Furnished eq 'Furnished'"],
            '55-plus' => ['raw_filter' => 'SeniorCommunityYN eq true'],
            'gated' => ['raw_filter' => "(contains(CommunityFeatures, 'Gated') or contains(InteriorFeatures, 'Gated'))"],
            'golf-course' => ['raw_filter' => "contains(CommunityFeatures, 'Golf')"],
            'commercial' => ['property_types' => ['Commercial Sale']],
            'land' => ['property_types' => ['Land']],
            'farm' => ['property_types' => ['Farm']],
            'rental' => ['property_types' => ['Residential Lease']],
            default => null,
        };
    }
}
