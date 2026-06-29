<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

/**
 * Normalized MLS listing. Canonical RESO-aligned fields are typed; truly
 * MLS-specific data lives in `$extras` (see feedback_mls_taxonomy rule #12 —
 * never grow this DTO for per-MLS data).
 *
 * `toArray()` reconstructs the legacy normalized shape so existing consumers
 * (ListingController, importListing, frontend) keep working during the migration.
 *
 * Fields are grouped to mirror how the UI consumes them: identity, status,
 * price, address, structure, content (media/description), HOA/tax, schools,
 * agents, timeline, computed.
 */
final readonly class MlsListing
{
    /**
     * @param string[] $photos
     * @param string[] $floorplans Media items where MediaCategory matched floorplan/sketch.
     * @param array<string,mixed> $extras Per-MLS custom fields preserved verbatim.
     */
    public function __construct(
        // Identity
        public string $mlsId,
        public string $mlsNumber,
        public string $mlsSlug,
        public MlsFeed $feed = MlsFeed::IDX,
        // Status / type
        public string $status = '',
        public ?string $propertyType = null,
        public ?string $propertySubtype = null,
        public ?string $style = null,
        // Price
        public ?int $price = null,
        public string $currency = 'USD',
        public ?int $originalListPrice = null,
        public ?int $previousListPrice = null,
        public ?int $soldPrice = null,
        public ?int $pricePerSqft = null,
        public ?string $priceChangedAt = null,
        // Location
        public ?MlsListingAddress $address = null,
        public ?float $lat = null,
        public ?float $lng = null,
        public ?string $subdivision = null,
        public ?string $mlsArea = null,
        // Structure
        public ?int $bedrooms = null,
        public ?float $bathrooms = null,
        public ?int $bathroomsFull = null,
        public ?int $bathroomsHalf = null,
        public ?int $sqft = null,
        public ?int $lotSqft = null,
        public ?float $lotAcres = null,
        public ?int $yearBuilt = null,
        public ?float $stories = null,
        public ?int $garageSpaces = null,
        public ?bool $newConstruction = null,
        // Content
        public ?string $description = null,
        public array $photos = [],
        public array $floorplans = [],
        public ?string $virtualTourUrl = null,
        public ?string $videoUrl = null,
        // Features (always arrays — flattened to comma-joined strings when needed for display)
        public array $features = [],
        public array $appliances = [],
        public array $exteriorFeatures = [],
        public array $cooling = [],
        public array $heating = [],
        public array $flooring = [],
        public array $parking = [],
        public array $view = [],
        public array $petsAllowed = [],
        public array $securityFeatures = [],
        public array $windowFeatures = [],
        public ?string $furnished = null,
        // Pool / waterfront
        public bool $pool = false,
        public array $poolFeatures = [],
        public bool $waterfront = false,
        public array $waterfrontFeatures = [],
        // HOA / tax
        public ?int $hoaFee = null,
        public ?string $hoaFrequency = null,
        public ?string $hoaName = null,
        public ?int $taxAnnualAmount = null,
        public ?int $taxYear = null,
        // Schools (suburban MLSes: ~100% fill; urban: ~10%)
        public ?MlsSchools $schools = null,
        // Agents (email/phone often VOW-only)
        public ?MlsAgent $listingAgent = null,
        public ?MlsAgent $coListingAgent = null,
        public ?MlsAgent $buyerAgent = null,
        // Timeline
        public ?string $listDate = null,
        public ?string $onMarketDate = null,
        public ?string $pendingDate = null,
        public ?string $soldDate = null,
        public ?string $statusChangedAt = null,
        public ?string $modificationTs = null,
        // Computed (datasets may override per-MLS calculation logic)
        public ?int $daysOnMarket = null,
        // Misc
        public array $extras = [],
    ) {}

    /**
     * Hydrate from the normalized array shape that BridgeApiClient / RealtynaApiClient
     * produce. The clients' normalize() output is the canonical input shape; any
     * field not mapped to a typed slot below survives in `extras`.
     */
    public static function fromNormalizedArray(array $raw): self
    {
        $typedKeys = [
            'mls_id', 'mls_number', 'mls_slug', 'feed',
            'status', 'property_type', 'property_subtype', 'style',
            'price', 'currency', 'original_price', 'previous_price', 'sold_price', 'price_per_sqft', 'price_changed_at',
            'address', 'lat', 'lng', 'subdivision', 'mls_area',
            'bedrooms', 'bathrooms', 'bathrooms_full', 'bathrooms_half', 'sqft', 'lot_sqft', 'lot_acres',
            'year_built', 'stories', 'garage_spaces', 'new_construction',
            'description', 'photos', 'floorplans', 'virtual_tour_url', 'video_url',
            'features', 'appliances', 'exterior_features', 'cooling', 'heating', 'flooring',
            'parking', 'view', 'pets_allowed', 'security_features', 'window_features', 'furnished',
            'pool', 'pool_features', 'waterfront', 'waterfront_features',
            'hoa_fee', 'hoa_frequency', 'hoa_name', 'tax_amount', 'tax_year',
            'schools', 'listing_agent', 'co_listing_agent', 'buyer_agent',
            'list_date', 'on_market_date', 'pending_date', 'sold_date', 'status_changed_at', 'modification_ts',
            'days_on_market',
            // Legacy-flat keys kept on the legacy normalized shape — consumed below into the typed fields.
            'list_agent_name', 'list_agent_id', 'list_agent_email', 'list_agent_phone',
            'list_office_name', 'list_office_id', 'list_office_phone',
            'buyer_agent_name', 'buyer_office_name',
            'price_formatted', 'photo_count', 'modification_ts',
            'elementary_school', 'middle_school', 'high_school', 'school_district',
        ];
        $extras = array_diff_key($raw, array_flip($typedKeys));

        return new self(
            mlsId: (string) ($raw['mls_id'] ?? ''),
            mlsNumber: (string) ($raw['mls_number'] ?? ''),
            mlsSlug: (string) ($raw['mls_slug'] ?? ''),
            feed: MlsFeed::tryFrom((string) ($raw['feed'] ?? 'idx')) ?? MlsFeed::IDX,
            status: (string) ($raw['status'] ?? ''),
            propertyType: $raw['property_type'] ?? null,
            propertySubtype: $raw['property_subtype'] ?? null,
            style: self::firstOrJoin($raw['style'] ?? null),
            price: isset($raw['price']) ? (int) $raw['price'] : null,
            currency: (string) ($raw['currency'] ?? 'USD'),
            originalListPrice: isset($raw['original_price']) ? (int) $raw['original_price'] : null,
            previousListPrice: isset($raw['previous_price']) ? (int) $raw['previous_price'] : null,
            soldPrice: isset($raw['sold_price']) ? (int) $raw['sold_price'] : null,
            pricePerSqft: isset($raw['price_per_sqft']) ? (int) $raw['price_per_sqft'] : null,
            priceChangedAt: $raw['price_changed_at'] ?? null,
            address: is_array($raw['address'] ?? null) ? MlsListingAddress::fromArray($raw['address']) : null,
            lat: isset($raw['lat']) ? (float) $raw['lat'] : null,
            lng: isset($raw['lng']) ? (float) $raw['lng'] : null,
            subdivision: $raw['subdivision'] ?? null,
            mlsArea: $raw['mls_area'] ?? null,
            bedrooms: isset($raw['bedrooms']) ? (int) $raw['bedrooms'] : null,
            bathrooms: isset($raw['bathrooms']) ? (float) $raw['bathrooms'] : null,
            bathroomsFull: isset($raw['bathrooms_full']) ? (int) $raw['bathrooms_full'] : null,
            bathroomsHalf: isset($raw['bathrooms_half']) ? (int) $raw['bathrooms_half'] : null,
            sqft: isset($raw['sqft']) ? (int) $raw['sqft'] : null,
            lotSqft: isset($raw['lot_sqft']) ? (int) $raw['lot_sqft'] : null,
            lotAcres: isset($raw['lot_acres']) ? (float) $raw['lot_acres'] : null,
            yearBuilt: isset($raw['year_built']) ? (int) $raw['year_built'] : null,
            stories: isset($raw['stories']) ? (float) $raw['stories'] : null,
            garageSpaces: isset($raw['garage_spaces']) ? (int) $raw['garage_spaces'] : null,
            newConstruction: isset($raw['new_construction']) ? (bool) $raw['new_construction'] : null,
            description: $raw['description'] ?? null,
            photos: array_values(array_filter((array) ($raw['photos'] ?? []))),
            floorplans: array_values(array_filter((array) ($raw['floorplans'] ?? []))),
            virtualTourUrl: $raw['virtual_tour_url'] ?? null,
            videoUrl: $raw['video_url'] ?? null,
            features: self::toArr($raw['features'] ?? null),
            appliances: self::toArr($raw['appliances'] ?? null),
            exteriorFeatures: self::toArr($raw['exterior_features'] ?? null),
            cooling: self::toArr($raw['cooling'] ?? null),
            heating: self::toArr($raw['heating'] ?? null),
            flooring: self::toArr($raw['flooring'] ?? null),
            parking: self::toArr($raw['parking'] ?? null),
            view: self::toArr($raw['view'] ?? null),
            petsAllowed: self::toArr($raw['pets_allowed'] ?? null),
            securityFeatures: self::toArr($raw['security_features'] ?? null),
            windowFeatures: self::toArr($raw['window_features'] ?? null),
            furnished: $raw['furnished'] ?? null,
            pool: (bool) ($raw['pool'] ?? false),
            poolFeatures: self::toArr($raw['pool_features'] ?? null),
            waterfront: (bool) ($raw['waterfront'] ?? false),
            waterfrontFeatures: self::toArr($raw['waterfront_features'] ?? null),
            hoaFee: isset($raw['hoa_fee']) ? (int) $raw['hoa_fee'] : null,
            hoaFrequency: $raw['hoa_frequency'] ?? null,
            hoaName: $raw['hoa_name'] ?? null,
            taxAnnualAmount: isset($raw['tax_amount']) ? (int) $raw['tax_amount'] : null,
            taxYear: isset($raw['tax_year']) ? (int) $raw['tax_year'] : null,
            schools: self::buildSchools($raw),
            listingAgent: self::buildAgent($raw, 'list'),
            coListingAgent: self::buildAgent($raw, 'co_list'),
            buyerAgent: self::buildAgent($raw, 'buyer'),
            listDate: $raw['list_date'] ?? null,
            onMarketDate: $raw['on_market_date'] ?? null,
            pendingDate: $raw['pending_date'] ?? null,
            soldDate: $raw['sold_date'] ?? null,
            statusChangedAt: $raw['status_changed_at'] ?? null,
            modificationTs: $raw['modification_ts'] ?? null,
            daysOnMarket: isset($raw['days_on_market']) ? (int) $raw['days_on_market'] : null,
            extras: $extras,
        );
    }

    /**
     * Legacy-compatible array shape — same keys as the original BridgeApiClient
     * normalize() output, plus typed extensions. Consumers reading e.g.
     * `$l['list_agent_name']` still work.
     */
    public function toArray(): array
    {
        $price = $this->price;
        $base = [
            'mls_id' => $this->mlsId,
            'mls_number' => $this->mlsNumber,
            'mls_slug' => $this->mlsSlug,
            'feed' => $this->feed->value,
            'status' => $this->status,
            'property_type' => $this->propertyType,
            'property_subtype' => $this->propertySubtype,
            'style' => $this->style,
            'price' => $price,
            'currency' => $this->currency,
            'price_formatted' => $price !== null ? '$' . number_format($price) : null,
            'price_per_sqft' => $this->pricePerSqft,
            'original_price' => $this->originalListPrice,
            'previous_price' => $this->previousListPrice,
            'sold_price' => $this->soldPrice,
            'price_changed_at' => $this->priceChangedAt,
            'address' => $this->address?->toArray() ?? [],
            'lat' => $this->lat,
            'lng' => $this->lng,
            'subdivision' => $this->subdivision,
            'mls_area' => $this->mlsArea,
            'bedrooms' => $this->bedrooms,
            'bathrooms' => $this->bathrooms,
            'bathrooms_full' => $this->bathroomsFull,
            'bathrooms_half' => $this->bathroomsHalf,
            'sqft' => $this->sqft,
            'lot_sqft' => $this->lotSqft,
            'lot_acres' => $this->lotAcres,
            'year_built' => $this->yearBuilt,
            'stories' => $this->stories,
            'garage_spaces' => $this->garageSpaces,
            'new_construction' => $this->newConstruction,
            'description' => $this->description,
            'photos' => $this->photos,
            'photo_count' => count($this->photos),
            'floorplans' => $this->floorplans,
            'virtual_tour_url' => $this->virtualTourUrl,
            'video_url' => $this->videoUrl,
            'features' => $this->features,
            'appliances' => $this->appliances,
            'exterior_features' => $this->exteriorFeatures,
            'cooling' => $this->cooling,
            'heating' => $this->heating,
            'flooring' => $this->flooring,
            'parking' => $this->parking,
            'view' => $this->view,
            'pets_allowed' => $this->petsAllowed,
            'security_features' => $this->securityFeatures,
            'window_features' => $this->windowFeatures,
            'furnished' => $this->furnished,
            'pool' => $this->pool,
            'pool_features' => $this->poolFeatures,
            'waterfront' => $this->waterfront,
            'waterfront_features' => $this->waterfrontFeatures,
            'hoa_fee' => $this->hoaFee,
            'hoa_frequency' => $this->hoaFrequency,
            'hoa_name' => $this->hoaName,
            'tax_amount' => $this->taxAnnualAmount,
            'tax_year' => $this->taxYear,
            'schools' => $this->schools?->toArray(),
            'listing_agent' => $this->listingAgent?->toArray(),
            'co_listing_agent' => $this->coListingAgent?->toArray(),
            'buyer_agent' => $this->buyerAgent?->toArray(),
            // Flat legacy aliases for the agent panel UI that pre-dates the sub-DTO
            'list_agent_name' => $this->listingAgent?->name,
            'list_agent_id' => $this->listingAgent?->mlsId,
            'list_office_name' => $this->listingAgent?->officeName,
            'list_office_id' => $this->listingAgent?->officeMlsId,
            'buyer_agent_name' => $this->buyerAgent?->name,
            'buyer_office_name' => $this->buyerAgent?->officeName,
            'list_date' => $this->listDate,
            'on_market_date' => $this->onMarketDate,
            'pending_date' => $this->pendingDate,
            'sold_date' => $this->soldDate,
            'status_changed_at' => $this->statusChangedAt,
            'modification_ts' => $this->modificationTs,
            'days_on_market' => $this->daysOnMarket,
        ];

        return $base + $this->extras;
    }

    /** Normalize anything-shaped feature input into a clean string[]. */
    private static function toArr(mixed $v): array
    {
        if ($v === null || $v === '') {
            return [];
        }
        if (is_array($v)) {
            return array_values(array_filter(array_map('strval', $v), static fn ($s) => $s !== ''));
        }
        return [(string) $v];
    }

    private static function firstOrJoin(mixed $v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }
        if (is_array($v)) {
            return implode(', ', array_filter(array_map('strval', $v)));
        }
        return (string) $v;
    }

    private static function buildSchools(array $raw): ?MlsSchools
    {
        if (isset($raw['schools']) && is_array($raw['schools'])) {
            return MlsSchools::fromArray($raw['schools']);
        }
        return MlsSchools::fromArray([
            'elementary' => $raw['elementary_school'] ?? null,
            'middle' => $raw['middle_school'] ?? null,
            'high' => $raw['high_school'] ?? null,
            'district' => $raw['school_district'] ?? null,
        ]);
    }

    private static function buildAgent(array $raw, string $prefix): ?MlsAgent
    {
        // Prefer nested sub-DTO shape if the dataset already emitted one.
        $nested = $raw["{$prefix}ing_agent"] ?? ($prefix === 'co_list' ? ($raw['co_listing_agent'] ?? null) : null);
        if (is_array($nested)) {
            return MlsAgent::fromArray($nested);
        }
        // Fall back to flat legacy keys (list_agent_*, buyer_agent_*).
        return MlsAgent::fromArray([
            'name' => $raw["{$prefix}_agent_name"] ?? null,
            'mls_id' => $raw["{$prefix}_agent_id"] ?? null,
            'email' => $raw["{$prefix}_agent_email"] ?? null,
            'phone' => $raw["{$prefix}_agent_phone"] ?? null,
            'office_name' => $raw["{$prefix}_office_name"] ?? null,
            'office_mls_id' => $raw["{$prefix}_office_id"] ?? null,
            'office_phone' => $raw["{$prefix}_office_phone"] ?? null,
        ]);
    }
}
