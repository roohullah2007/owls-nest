<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

/**
 * Typed search query passed to every MlsDriver. Replaces the loose filter
 * arrays the legacy clients accepted — see feedback_mls_taxonomy rule #11.
 *
 * Fields grouped by dimension below. Multi-value fields end in `s`
 * (`cities`, `zips`, `statuses`). `extras` carries per-MLS custom-field
 * filters that don't belong on the canonical surface (e.g. Miami's
 * WaterfrontDirection — passed verbatim to the driver).
 *
 * MUST stay JSON-serializable: saved searches replay this DTO verbatim.
 */
final readonly class MlsQuery
{
    public const PROJECTION_DETAIL = 'detail';

    public const PROJECTION_LITE = 'lite';

    public const PROJECTION_COUNT = 'count';

    public const SORT_MODIFIED_DESC = 'modified_desc';

    public const SORT_NEWEST = 'newest';

    public const SORT_PRICE_ASC = 'price_asc';

    public const SORT_PRICE_DESC = 'price_desc';

    public const SORT_BEDS_DESC = 'beds_desc';

    public const SORT_SQFT_DESC = 'sqft_desc';

    public const SORT_DISTANCE_ASC = 'distance_asc';

    public const SORT_DOM_ASC = 'dom_asc';

    public const SORT_DOM_DESC = 'dom_desc';

    public function __construct(
        // ── Free-text + identity ────────────────────────────────────────
        public ?string $query = null,

        // ── 1. Geographic (multi-value canonical — singular forms are
        //     input-only aliases merged in fromArray) ───────────────────
        /** @var string[] */ public array $cities = [],
        /** @var string[] */ public array $zips = [],
        public ?string $zipPrefix = null,
        /** @var string[] */ public array $counties = [],
        /** @var string[] */ public array $neighborhoods = [],
        /** @var string[] */ public array $subdivisions = [],
        /** @var string[] */ public array $mlsAreas = [],
        /** @var string[] */ public array $states = [],
        public ?MlsGeoQuery $geo = null,
        /** @var array{kind:string,name:string}|null */ public ?array $schoolZone = null,

        // ── 2. Lifestyle (per-MLS translation) ─────────────────────────
        /** @var string[] */ public array $lifestyles = [],

        // ── 3. Architecture / type ─────────────────────────────────────
        /** @var string[] */ public array $propertyTypes = [],
        /** @var string[] */ public array $propertySubtypes = [],
        /** @var string[] */ public array $architecturalStyles = [],

        // ── 4. Structure (ranges + booleans) ───────────────────────────
        public ?int $minBeds = null,
        public ?int $maxBeds = null,
        public ?float $minBaths = null,
        public ?float $maxBaths = null,
        public ?int $minSqft = null,
        public ?int $maxSqft = null,
        public ?int $minLotSqft = null,
        public ?int $maxLotSqft = null,
        public ?float $minLotAcres = null,
        public ?float $maxLotAcres = null,
        public ?int $minYearBuilt = null,
        public ?int $maxYearBuilt = null,
        public ?int $minStories = null,
        public ?int $maxStories = null,
        public ?int $minGarageSpaces = null,
        public ?bool $hasPool = null,
        public ?bool $hasWaterfront = null,
        public ?bool $hasView = null,
        public ?bool $newConstruction = null,
        public ?bool $hasVirtualTour = null,
        public ?bool $hasOpenHouse = null,
        public ?bool $hasFloorPlans = null,

        // ── 5. Price intelligence ──────────────────────────────────────
        public ?int $minPrice = null,
        public ?int $maxPrice = null,
        public ?int $minPricePerSqft = null,
        public ?int $maxPricePerSqft = null,
        /** @var array{within_days:int, min_reduction_pct?:int}|null */
        public ?array $recentlyReduced = null,
        public ?int $maxHoaFee = null,
        public ?int $maxTaxAnnual = null,

        // ── 6. Time / freshness ────────────────────────────────────────
        public ?int $newWithinDays = null,
        public ?int $modifiedWithinDays = null,
        public ?int $domMin = null,
        public ?int $domMax = null,
        public ?string $listedAfter = null,
        public ?string $listedBefore = null,
        public ?int $soldWithinDays = null,

        // ── 7. Status / lifecycle ──────────────────────────────────────
        /** @var string[] */ public array $statuses = [],
        /** @var string[] */ public array $specialConditions = [],

        // ── 8. Agent / office ──────────────────────────────────────────
        /** @var string[] */ public array $agentIds = [],
        /** @var string[] */ public array $officeIds = [],
        public ?string $brokerageName = null,

        // ── Sort / projection / pagination / feed ──────────────────────
        public string $sort = self::SORT_MODIFIED_DESC,
        public string $projection = self::PROJECTION_DETAIL,
        public int $page = 1,
        public int $perPage = 20,
        public MlsFeed $feed = MlsFeed::IDX,

        // ── Per-MLS custom field filters (untyped passthrough) ─────────
        /** @var array<string,mixed> */ public array $extras = [],
    ) {}

    /**
     * Construct from a snake_case filter array — what the legacy callers + the
     * /api/v1/mls/search request body use.
     */
    public static function fromArray(array $f): self
    {
        // A scalar-expected field can arrive as an array from malformed or bot
        // requests (e.g. ?query[]=x, ?sort[]=x). Collapse to the first scalar so
        // a stray array never fatals downstream with "Array to string conversion".
        $firstScalar = static function (mixed $v): mixed {
            if (! is_array($v)) {
                return $v;
            }
            foreach ($v as $item) {
                if (is_scalar($item)) {
                    return $item;
                }
            }

            return null;
        };
        $intOrNull = static fn (mixed $v): ?int => (($v = $firstScalar($v)) === null || $v === '') ? null : (int) $v;
        $floatOrNull = static fn (mixed $v): ?float => (($v = $firstScalar($v)) === null || $v === '') ? null : (float) $v;
        $strOrNull = static fn (mixed $v): ?string => (($v = $firstScalar($v)) === null || $v === '') ? null : (string) $v;
        $boolOrNull = static fn (mixed $v): ?bool => (($v = $firstScalar($v)) === null || $v === '') ? null : (bool) $v;
        $arrOf = static function (mixed $v): array {
            if ($v === null || $v === '') {
                return [];
            }
            if (is_array($v)) {
                return array_values(array_filter(array_map('strval', $v), static fn ($s) => $s !== ''));
            }

            return array_values(array_filter(array_map('trim', explode(',', (string) $v)), static fn ($s) => $s !== ''));
        };

        // Every dimension that supports multi-value accepts BOTH singular and
        // plural input keys — fromArray merges singular into the plural form so
        // callers can't accidentally pass both and end up with AND-of-different-values.
        $known = [
            'query',
            // Geographic
            'cities', 'city', 'zips', 'zip', 'zip_prefix', 'counties', 'county',
            'neighborhoods', 'neighborhood', 'subdivisions', 'subdivision',
            'mls_areas', 'mls_area', 'states', 'state', 'geo', 'school_zone',
            // Lifestyle
            'lifestyles', 'lifestyle',
            // Type
            'property_types', 'property_type', 'property_subtypes', 'property_subtype',
            'architectural_styles', 'architectural_style',
            // Structure
            'min_beds', 'max_beds', 'min_baths', 'max_baths',
            'min_sqft', 'max_sqft', 'min_lot_sqft', 'max_lot_sqft', 'min_lot_acres', 'max_lot_acres',
            'min_year_built', 'max_year_built', 'min_stories', 'max_stories', 'min_garage_spaces',
            'has_pool', 'has_waterfront', 'has_view', 'new_construction',
            'has_virtual_tour', 'has_open_house', 'has_floor_plans',
            // Price
            'min_price', 'max_price', 'min_price_per_sqft', 'max_price_per_sqft',
            'recently_reduced', 'max_hoa_fee', 'max_tax_annual',
            // Freshness
            'new_within_days', 'modified_within_days', 'dom_min', 'dom_max',
            'listed_after', 'listed_before', 'sold_within_days',
            // Status / lifecycle
            'status', 'statuses', 'special_conditions',
            // Agent / office
            'agent_id', 'agent_ids', 'office_id', 'office_ids', 'brokerage_name',
            // Meta
            'sort', 'projection', 'page', 'per_page', 'feed',
        ];

        $extras = array_diff_key($f, array_flip($known));

        // Merge singular into plural — accepts e.g. {agent_id: "A1", agent_ids: ["A2"]}
        // as ["A1", "A2"] rather than the legacy AND'd "A1 AND A2 = impossible".
        // The singular key tolerates arrays too ({status: ['Active']}) so callers
        // can't silently produce a garbage "Array" filter value.
        $merge = static fn (mixed $singular, mixed $plural): array => array_values(array_unique(array_merge(
            $arrOf($plural),
            $arrOf($singular),
        )));

        $feed = MlsFeed::IDX;
        $feedRaw = $firstScalar($f['feed'] ?? null);
        if ($feedRaw !== null && $feedRaw !== '') {
            $feed = MlsFeed::tryFrom(strtolower((string) $feedRaw)) ?? MlsFeed::IDX;
        }

        return new self(
            query: $strOrNull($f['query'] ?? null),
            cities: $merge($f['city'] ?? null, $f['cities'] ?? null),
            zips: $merge($f['zip'] ?? null, $f['zips'] ?? null),
            zipPrefix: $strOrNull($f['zip_prefix'] ?? null),
            counties: $merge($f['county'] ?? null, $f['counties'] ?? null),
            neighborhoods: $merge($f['neighborhood'] ?? null, $f['neighborhoods'] ?? null),
            subdivisions: $merge($f['subdivision'] ?? null, $f['subdivisions'] ?? null),
            mlsAreas: $merge($f['mls_area'] ?? null, $f['mls_areas'] ?? null),
            states: $merge($f['state'] ?? null, $f['states'] ?? null),
            geo: MlsGeoQuery::fromArray($f['geo'] ?? null),
            schoolZone: is_array($f['school_zone'] ?? null) ? $f['school_zone'] : null,
            lifestyles: $merge($f['lifestyle'] ?? null, $f['lifestyles'] ?? null),
            propertyTypes: $merge($f['property_type'] ?? null, $f['property_types'] ?? null),
            propertySubtypes: $merge($f['property_subtype'] ?? null, $f['property_subtypes'] ?? null),
            architecturalStyles: $merge($f['architectural_style'] ?? null, $f['architectural_styles'] ?? null),
            minBeds: $intOrNull($f['min_beds'] ?? null),
            maxBeds: $intOrNull($f['max_beds'] ?? null),
            minBaths: $floatOrNull($f['min_baths'] ?? null),
            maxBaths: $floatOrNull($f['max_baths'] ?? null),
            minSqft: $intOrNull($f['min_sqft'] ?? null),
            maxSqft: $intOrNull($f['max_sqft'] ?? null),
            minLotSqft: $intOrNull($f['min_lot_sqft'] ?? null),
            maxLotSqft: $intOrNull($f['max_lot_sqft'] ?? null),
            minLotAcres: $floatOrNull($f['min_lot_acres'] ?? null),
            maxLotAcres: $floatOrNull($f['max_lot_acres'] ?? null),
            minYearBuilt: $intOrNull($f['min_year_built'] ?? null),
            maxYearBuilt: $intOrNull($f['max_year_built'] ?? null),
            minStories: $intOrNull($f['min_stories'] ?? null),
            maxStories: $intOrNull($f['max_stories'] ?? null),
            minGarageSpaces: $intOrNull($f['min_garage_spaces'] ?? null),
            hasPool: $boolOrNull($f['has_pool'] ?? null),
            hasWaterfront: $boolOrNull($f['has_waterfront'] ?? null),
            hasView: $boolOrNull($f['has_view'] ?? null),
            newConstruction: $boolOrNull($f['new_construction'] ?? null),
            hasVirtualTour: $boolOrNull($f['has_virtual_tour'] ?? null),
            hasOpenHouse: $boolOrNull($f['has_open_house'] ?? null),
            hasFloorPlans: $boolOrNull($f['has_floor_plans'] ?? null),
            minPrice: $intOrNull($f['min_price'] ?? null),
            maxPrice: $intOrNull($f['max_price'] ?? null),
            minPricePerSqft: $intOrNull($f['min_price_per_sqft'] ?? null),
            maxPricePerSqft: $intOrNull($f['max_price_per_sqft'] ?? null),
            recentlyReduced: is_array($f['recently_reduced'] ?? null) ? $f['recently_reduced'] : null,
            maxHoaFee: $intOrNull($f['max_hoa_fee'] ?? null),
            maxTaxAnnual: $intOrNull($f['max_tax_annual'] ?? null),
            newWithinDays: $intOrNull($f['new_within_days'] ?? null),
            modifiedWithinDays: $intOrNull($f['modified_within_days'] ?? null),
            domMin: $intOrNull($f['dom_min'] ?? null),
            domMax: $intOrNull($f['dom_max'] ?? null),
            listedAfter: $strOrNull($f['listed_after'] ?? null),
            listedBefore: $strOrNull($f['listed_before'] ?? null),
            soldWithinDays: $intOrNull($f['sold_within_days'] ?? null),
            statuses: $merge($f['status'] ?? null, $f['statuses'] ?? null),
            specialConditions: $arrOf($f['special_conditions'] ?? null),
            agentIds: $merge($f['agent_id'] ?? null, $f['agent_ids'] ?? null),
            officeIds: $merge($f['office_id'] ?? null, $f['office_ids'] ?? null),
            brokerageName: $strOrNull($f['brokerage_name'] ?? null),
            sort: $strOrNull($f['sort'] ?? null) ?? self::SORT_MODIFIED_DESC,
            projection: $strOrNull($f['projection'] ?? null) ?? self::PROJECTION_DETAIL,
            page: (int) ($f['page'] ?? 1),
            perPage: (int) ($f['per_page'] ?? 20),
            feed: $feed,
            extras: $extras,
        );
    }

    /**
     * Snake_case array shape. Empty fields are dropped so drivers can use
     * `!empty($filters['x'])` checks without false-positives.
     */
    public function toArray(): array
    {
        // Emits ONLY the canonical plural forms. fromArray() accepts singular
        // input keys for legacy compat but we never emit them — keeps the
        // round-tripped query unambiguous (saved searches replay cleanly).
        $a = [
            'query' => $this->query,
            'cities' => $this->cities,
            'zips' => $this->zips,
            'zip_prefix' => $this->zipPrefix,
            'counties' => $this->counties,
            'neighborhoods' => $this->neighborhoods,
            'subdivisions' => $this->subdivisions,
            'mls_areas' => $this->mlsAreas,
            'states' => $this->states,
            'geo' => $this->geo?->toArray(),
            'school_zone' => $this->schoolZone,
            'lifestyles' => $this->lifestyles,
            'property_types' => $this->propertyTypes,
            'property_subtypes' => $this->propertySubtypes,
            'architectural_styles' => $this->architecturalStyles,
            'min_beds' => $this->minBeds,
            'max_beds' => $this->maxBeds,
            'min_baths' => $this->minBaths,
            'max_baths' => $this->maxBaths,
            'min_sqft' => $this->minSqft,
            'max_sqft' => $this->maxSqft,
            'min_lot_sqft' => $this->minLotSqft,
            'max_lot_sqft' => $this->maxLotSqft,
            'min_lot_acres' => $this->minLotAcres,
            'max_lot_acres' => $this->maxLotAcres,
            'min_year_built' => $this->minYearBuilt,
            'max_year_built' => $this->maxYearBuilt,
            'min_stories' => $this->minStories,
            'max_stories' => $this->maxStories,
            'min_garage_spaces' => $this->minGarageSpaces,
            'has_pool' => $this->hasPool,
            'has_waterfront' => $this->hasWaterfront,
            'has_view' => $this->hasView,
            'new_construction' => $this->newConstruction,
            'has_virtual_tour' => $this->hasVirtualTour,
            'has_open_house' => $this->hasOpenHouse,
            'has_floor_plans' => $this->hasFloorPlans,
            'min_price' => $this->minPrice,
            'max_price' => $this->maxPrice,
            'min_price_per_sqft' => $this->minPricePerSqft,
            'max_price_per_sqft' => $this->maxPricePerSqft,
            'recently_reduced' => $this->recentlyReduced,
            'max_hoa_fee' => $this->maxHoaFee,
            'max_tax_annual' => $this->maxTaxAnnual,
            'new_within_days' => $this->newWithinDays,
            'modified_within_days' => $this->modifiedWithinDays,
            'dom_min' => $this->domMin,
            'dom_max' => $this->domMax,
            'listed_after' => $this->listedAfter,
            'listed_before' => $this->listedBefore,
            'sold_within_days' => $this->soldWithinDays,
            'statuses' => $this->statuses,
            'special_conditions' => $this->specialConditions,
            'agent_ids' => $this->agentIds,
            'office_ids' => $this->officeIds,
            'brokerage_name' => $this->brokerageName,
            'sort' => $this->sort,
            'projection' => $this->projection,
            'page' => $this->page,
            'per_page' => $this->perPage,
            'feed' => $this->feed->value,
        ];
        $a = array_filter($a, static fn ($v) => $v !== null && $v !== '' && $v !== []);

        return $a + $this->extras;
    }

    /** Lifestyle filter merge — returns a new query with the given lifestyle translation applied. */
    public function withLifestyleTranslation(array $translation): self
    {
        $merged = $this->toArray();
        foreach ($translation as $k => $v) {
            // Translation overlay: scalar replaces, array merges (e.g. multiple raw_filters).
            if (is_array($v) && isset($merged[$k]) && is_array($merged[$k])) {
                $merged[$k] = array_values(array_unique(array_merge($merged[$k], $v)));
            } else {
                $merged[$k] = $v;
            }
        }
        // Drop the lifestyle marker so it doesn't re-apply downstream.
        unset($merged['lifestyles'], $merged['lifestyle']);

        return self::fromArray($merged);
    }
}
