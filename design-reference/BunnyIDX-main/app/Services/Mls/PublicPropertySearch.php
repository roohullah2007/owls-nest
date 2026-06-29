<?php

declare(strict_types=1);

namespace App\Services\Mls;

use App\Models\AgentWebsite;
use App\Models\IdxConnection;
use App\Models\Listing;
use App\Models\User;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsQuery;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Powers the public, theme-agnostic property-search page (map + grid) on the
 * published agent websites. Resolves the site owner's active MLS feed(s) and
 * runs the query through {@see MlsGateway} — the visitor is never authenticated
 * and never touches an upstream MLS API directly.
 *
 * Returns a flat, JSON-serializable payload (cards + map markers + compliance)
 * the front-end Google-Maps app consumes. Mirrors the resolution rules in
 * {@see FeaturedListingsResolver} but exposes the richer card the search screen
 * needs (mls #, office, lot, parking, photo carousel, lat/lng, badges).
 */
class PublicPropertySearch
{
    /** Page size PER MLS for the grid + markers — the gateway requests this many
     * from each connected feed, so the map shows ≥100 listings per MLS at once
     * (≈200 with two same-state MLSes). Default views are cache-served (8h). */
    private const PER_PAGE = 100;

    private const MAX_PHOTOS = 8;

    /** USPS code → state name, for labeling state autocomplete entries.
     * (US geography, not MLS taxonomy — which states appear is still derived
     * from the connected datasets' city vocabulary.) */
    private const US_STATES = [
        'AL' => 'Alabama', 'AK' => 'Alaska', 'AZ' => 'Arizona', 'AR' => 'Arkansas',
        'CA' => 'California', 'CO' => 'Colorado', 'CT' => 'Connecticut', 'DE' => 'Delaware',
        'DC' => 'District of Columbia', 'FL' => 'Florida', 'GA' => 'Georgia', 'HI' => 'Hawaii',
        'ID' => 'Idaho', 'IL' => 'Illinois', 'IN' => 'Indiana', 'IA' => 'Iowa',
        'KS' => 'Kansas', 'KY' => 'Kentucky', 'LA' => 'Louisiana', 'ME' => 'Maine',
        'MD' => 'Maryland', 'MA' => 'Massachusetts', 'MI' => 'Michigan', 'MN' => 'Minnesota',
        'MS' => 'Mississippi', 'MO' => 'Missouri', 'MT' => 'Montana', 'NE' => 'Nebraska',
        'NV' => 'Nevada', 'NH' => 'New Hampshire', 'NJ' => 'New Jersey', 'NM' => 'New Mexico',
        'NY' => 'New York', 'NC' => 'North Carolina', 'ND' => 'North Dakota', 'OH' => 'Ohio',
        'OK' => 'Oklahoma', 'OR' => 'Oregon', 'PA' => 'Pennsylvania', 'RI' => 'Rhode Island',
        'SC' => 'South Carolina', 'SD' => 'South Dakota', 'TN' => 'Tennessee', 'TX' => 'Texas',
        'UT' => 'Utah', 'VT' => 'Vermont', 'VA' => 'Virginia', 'WA' => 'Washington',
        'WV' => 'West Virginia', 'WI' => 'Wisconsin', 'WY' => 'Wyoming', 'PR' => 'Puerto Rico',
    ];

    /** UI sort keys → MlsQuery sort constants. */
    private const SORT_MAP = [
        'recommended' => MlsQuery::SORT_MODIFIED_DESC,
        'newest' => MlsQuery::SORT_NEWEST,
        'price_asc' => MlsQuery::SORT_PRICE_ASC,
        'price_desc' => MlsQuery::SORT_PRICE_DESC,
        'beds' => MlsQuery::SORT_BEDS_DESC,
        'sqft' => MlsQuery::SORT_SQFT_DESC,
    ];

    /**
     * Run a search for a site.
     *
     * @param  array<string, mixed>  $filters  Raw filter input from the request (snake_case, MlsQuery-shaped).
     * @return array{
     *     integrated: bool,
     *     listings: array<int, array<string, mixed>>,
     *     total: int,
     *     page: int,
     *     per_page: int,
     *     compliance: array<int, array<string, mixed>>,
     *     taxonomy: array{property_types: array<int, array{value: string, label: string}>},
     *     error: ?string
     * }
     */
    public function search(AgentWebsite $site, array $filters, int $page = 1): array
    {
        // UI-preview mode: render sample listings so the layout can be reviewed
        // without a connected MLS feed. Opt-in via PROPERTY_SEARCH_MOCK (local).
        if (config('services.property_search.mock')) {
            return $this->mockResult($site, $filters);
        }

        $blank = [
            'integrated' => false,
            'listings' => [],
            'total' => 0,
            'page' => 1,
            'per_page' => self::PER_PAGE,
            'compliance' => [],
            'taxonomy' => ['property_types' => [], 'property_subtypes' => [], 'statuses' => [], 'locations' => []],
            'error' => null,
        ];

        $user = $this->ownerUser($site);
        if (! $user) {
            return $blank;
        }

        // Unfiltered "default view" — first open of the search page. Default
        // results are served from an 8h cache below; the MLS API is only hit
        // live when the visitor actually narrows the search.
        $isDefault = $this->isDefaultView($filters);

        // Featured listings on the search grid (editor toggle): shown first on
        // the default view, and standing in entirely when no MLS is connected.
        $featuredInSearch = (bool) data_get($site->page_data, '_config.listings.featured_in_search');
        $featuredCards = ($featuredInSearch && $page === 1 && $isDefault)
            ? $this->manualSearchCards($site, 'featured')
            : [];

        // The active MLS connections — drives the "coming soon" / owner
        // "connect your MLS" notice, and fingerprints the default-view cache so
        // connecting/disconnecting an MLS busts it immediately.
        $connectionIds = IdxConnection::where('is_active', true)
            ->where(function ($w) use ($user) {
                $w->where('user_id', $user->id);
                if ($user->team_id) {
                    $w->orWhere('team_id', $user->team_id);
                }
            })
            ->orderBy('id')
            ->pluck('id');

        if ($connectionIds->isEmpty()) {
            if ($featuredCards) {
                return [
                    'integrated' => true,
                    'listings' => $featuredCards,
                    'total' => count($featuredCards),
                    'error' => null,
                ] + $blank;
            }

            return $blank;
        }

        $page = max(1, $page);

        // Owner listing restrictions (website editor → IDX Settings): allowed
        // transaction types + excluded property types / sub-types.
        $restrictions = (array) data_get($site->page_data, '_config.search', []);
        $allowedTxn = array_values(array_intersect(['sale', 'rent'], (array) ($restrictions['allowed_transactions'] ?? [])));

        // Visitor intent BEFORE any defaulting — an explicit class/sub-type
        // pick opts out of the residential-only default below.
        $visitorPickedTypes = array_filter((array) ($filters['property_types'] ?? ($filters['property_type'] ?? []))) !== [];
        $visitorPickedSubs = array_filter((array) ($filters['property_subtypes'] ?? [])) !== [];

        // Transaction type (For Sale / For Rent) → property-type CLASS subset,
        // derived from the live taxonomy: lease/rental classes vs the rest. No
        // hardcoded class names — works for any MLS.
        $txn = $filters['transaction'] ?? null;
        unset($filters['transaction']);
        // A single allowed transaction clamps whatever the visitor picked.
        if (count($allowedTxn) === 1) {
            $txn = $allowedTxn[0];
        }
        if (in_array($txn, ['sale', 'rent'], true)) {
            $classes = array_column($this->taxonomyBlock($user)['property_types'] ?? [], 'value');
            $rent = array_values(array_filter($classes, fn ($c) => preg_match('/lease|rent/i', (string) $c)));
            $picked = $txn === 'rent' ? $rent : array_values(array_diff($classes, $rent));
            // An explicit class pick narrows within the transaction subset; if
            // the two contradict (e.g. For Sale + a lease class) the user's
            // explicit pick wins rather than silently searching nothing.
            $userClasses = array_filter((array) ($filters['property_types'] ?? ($filters['property_type'] ?? [])));
            if ($userClasses) {
                $both = array_values(array_intersect($userClasses, $picked));
                $filters['property_types'] = $both ?: array_values($userClasses);
                unset($filters['property_type']);
            } elseif ($picked) {
                $filters['property_types'] = $picked;
            }
        }

        // Residential by default: land / commercial / business classes only
        // appear when the visitor explicitly filters for them. Derived from
        // the live taxonomy (classes containing "residential") — never
        // hardcoded enum values.
        if (! $visitorPickedTypes && ! $visitorPickedSubs) {
            $base = array_filter((array) ($filters['property_types'] ?? []));
            if ($base === []) {
                $base = array_column($this->taxonomyBlock($user)['property_types'] ?? [], 'value');
            }
            $residential = array_values(preg_grep('/residential/i', $base) ?: []);
            if ($residential !== []) {
                $filters['property_types'] = $residential;
            }
        }

        // Excluded property types: subtract from whatever set is in play
        // (visitor picks or the full taxonomy). An exclusion can never widen a
        // search; if it would empty the set, a sentinel guarantees 0 results
        // rather than silently searching everything.
        $excludedTypes = array_filter((array) ($restrictions['excluded_property_types'] ?? []));
        if ($excludedTypes !== []) {
            $base = array_filter((array) ($filters['property_types'] ?? ($filters['property_type'] ?? [])));
            if ($base === []) {
                $base = array_column($this->taxonomyBlock($user)['property_types'] ?? [], 'value');
            }
            $kept = array_values(array_diff($base, $excludedTypes));
            $filters['property_types'] = $kept !== [] ? $kept : ['__restricted__'];
            unset($filters['property_type']);
        }

        // Excluded sub-types: same subtraction on the sub-type axis. Only
        // applied when the owner configured exclusions — the include-list it
        // produces would otherwise drop listings without a PropertySubType.
        $excludedSubs = array_filter((array) ($restrictions['excluded_property_subtypes'] ?? []));
        if ($excludedSubs !== []) {
            $base = array_filter((array) ($filters['property_subtypes'] ?? []));
            if ($base !== []) {
                $kept = array_values(array_diff($base, $excludedSubs));
                $filters['property_subtypes'] = $kept !== [] ? $kept : ['__restricted__'];
            } else {
                $allSubs = array_column($this->taxonomyBlock($user)['property_subtypes'] ?? [], 'value');
                $kept = array_values(array_diff($allSubs, $excludedSubs));
                if ($kept !== [] && count($kept) < count($allSubs)) {
                    $filters['property_subtypes'] = $kept;
                }
            }
        }

        // Free text that exactly matches a dataset-declared location resolves
        // into the typed filter (City/County/Zip/Neighborhood/State eq) instead
        // of the weaker freetext contains() — picking an autocomplete suggestion
        // (which submits the entry's value as `query`) actually narrows the
        // search this way; counties in particular never match via freetext.
        $filters = $this->resolveLocationQuery($user, $filters);

        try {
            $query = $this->buildQuery($filters, $page);

            $runSearch = function () use ($site, $user, $query): array {
                $result = app(MlsGateway::class)->search($user, $query, []);

                // Drop listings with junk location data (placeholder cities/states
                // like "Other"/"Not In Usa", or impossible coordinates) — they're
                // unusable on the public map + grid.
                $listings = array_values(array_filter($result->listings, fn (MlsListing $l) => $this->hasValidLocation($l)));

                // SEO detail-URL slugs for this page of results (one select + insert).
                $slugs = app(ListingSlugResolver::class)->slugsFor($site, array_map(fn (MlsListing $l) => [
                    'mls_slug' => $l->mlsSlug,
                    'listing_id' => $l->mlsId,
                    'address' => $this->cardAddress($l),
                ], $listings));

                // Upcoming open houses for this page of results (one
                // OpenHouse-resource query per feed; best-effort).
                $openHouses = $this->openHousesByCardId($user, $listings);

                return [
                    'cards' => array_map(fn (MlsListing $l) => $this->card($site, $l, $slugs, $openHouses[$l->mlsSlug.':'.$l->mlsId] ?? []), $listings),
                    'total' => max(0, $result->total - (count($result->listings) - count($listings))),
                    'compliance' => $this->compliance($result),
                    // Any per-MLS error means a feed's listings are missing
                    // from this page (e.g. Bridge throttling one dataset).
                    'partial' => ! empty($result->errors),
                ];
            };

            // Default views (no visitor-entered filters; incl. the For Sale/For
            // Rent landing states and their pagination) come from a 2h cache.
            // PARTIAL results — one of the MLS feeds errored/throttled — only
            // cache for 5 minutes so the missing feed's listings reappear as
            // soon as it recovers instead of being pinned out for hours.
            // Manual featured cards merge AFTER the cache so owner edits stay live.
            $cacheKey = sprintf('ps:default:%d:%s', $site->id, md5(json_encode([$site->slug, $user->id, $connectionIds, $txn, $filters, $page])));
            $mls = $isDefault ? Cache::get($cacheKey) : null;
            if ($mls === null) {
                $mls = $runSearch();
                if ($isDefault) {
                    Cache::put($cacheKey, $mls, ! empty($mls['partial']) ? now()->addMinutes(5) : now()->addHours(2));
                }
            }

            $cards = $mls['cards'];
            if ($featuredCards) {
                // Default view: the site's featured listings lead the grid.
                $cards = array_merge($featuredCards, $cards);
            }

            return [
                'integrated' => true,
                'listings' => $cards,
                'total' => $mls['total'] + count($featuredCards),
                'page' => $page,
                'per_page' => self::PER_PAGE,
                'compliance' => $mls['compliance'],
                'taxonomy' => $this->restrictTaxonomy($this->taxonomyBlock($user), $restrictions, $allowedTxn),
                'error' => null,
            ];
        } catch (\Throwable $e) {
            Log::warning('Public property search failed: '.$e->getMessage(), ['site' => $site->id]);

            // Left operands win an array union — error must precede $blank (which carries error: null).
            return ['integrated' => true, 'error' => 'Search is temporarily unavailable.'] + $blank;
        }
    }

    /**
     * Live MLS taxonomy for the public filter UI (property types, for now).
     * Empty dataset slugs = union across ALL the owner's connected MLSes —
     * the gateway merges and dedupes terms per value. Cached per owner;
     * any failure degrades to an empty list (the frontend falls back to its
     * static defaults) so taxonomy can never break the search itself.
     *
     * @return array{property_types: array<int, array{value: string, label: string}>}
     */
    private function taxonomyBlock(User $user): array
    {
        try {
            return Cache::remember("ps:taxonomy:{$user->id}", 3600, function () use ($user) {
                $tax = app(MlsGateway::class)->taxonomy($user, []);

                return [
                    'property_types' => array_map(
                        static fn ($t) => ['value' => $t->value, 'label' => $t->label],
                        $tax->propertyTypes,
                    ),
                    // Sub-types (Single Family, Condo, Townhouse…), each carrying
                    // its parent class so the UI can show class → sub-type
                    // hierarchically (same pattern as the CRM MLS filters modal).
                    // Deduped on value+parent: MiamiRE repeats e.g. "Condominium"
                    // under both Residential and Residential Lease.
                    'property_subtypes' => array_values(collect($tax->propertySubtypes)
                        ->unique(static fn ($t) => $t->value.'|'.($t->parentValue ?? ''))
                        ->map(static fn ($t) => array_filter([
                            'value' => $t->value,
                            'label' => $t->label,
                            'parent_value' => $t->parentValue,
                        ], static fn ($v) => $v !== null))
                        ->all()),
                    // Status union — the UI hides Sold/Expired toggles when the
                    // connected MLS(es) don't carry those statuses at all.
                    'statuses' => array_map(
                        static fn ($t) => ['value' => $t->value, 'label' => $t->label],
                        $tax->statuses,
                    ),
                    // Location vocabulary (cities / counties / neighborhoods /
                    // zips / states) the MlsDataset classes declare — drives the
                    // search box and hero
                    // autocompletes so visitors pick values the feed can actually
                    // answer (feed-exact spellings, e.g. "Port St Lucie").
                    'locations' => $this->locationEntries($tax),
                ];
            });
        } catch (\Throwable $e) {
            Log::warning('Public property search taxonomy failed: '.$e->getMessage(), ['user' => $user->id]);

            return ['property_types' => [], 'property_subtypes' => [], 'statuses' => [], 'locations' => []];
        }
    }

    /**
     * Flatten the dataset-declared location vocabulary into autocomplete
     * entries. `label` is what the dropdown shows, `value` is what gets
     * searched (city names without the ", FL" suffix — the freetext/city
     * filters match the bare name).
     *
     * @return array<int, array{label: string, value: string, type: string}>
     */
    private function locationEntries(Dto\MlsTaxonomy $tax): array
    {
        $entries = [];
        $seen = [];
        $push = static function (string $label, string $value, string $type) use (&$entries, &$seen) {
            $key = $type.'|'.mb_strtolower($value);
            if ($value === '' || isset($seen[$key])) {
                return;
            }
            $seen[$key] = true;
            $entries[] = ['label' => $label, 'value' => $value, 'type' => $type];
        };

        foreach ($tax->cities as $city) {
            $push($city, preg_replace('/,\s*[A-Z]{2}$/', '', $city), 'city');
        }
        foreach ($tax->neighborhoods as $hoods) {
            foreach ($hoods as $hood) {
                $push($hood, $hood, 'neighborhood');
            }
        }
        foreach ($tax->counties as $county) {
            // Feed-exact county values — some feeds already carry the
            // " County" suffix (MiamiRE), some don't (Stellar/Beaches).
            $push(preg_match('/county$/i', $county) ? $county : "{$county} County", $county, 'county');
        }
        foreach ($tax->zipCodes as $zip) {
            $push($zip, $zip, 'zip');
        }
        // States the connected MLSes cover, derived from the dataset city
        // vocabulary's ", ST" suffixes (no per-state list exists on datasets).
        $states = [];
        foreach ($tax->cities as $city) {
            if (preg_match('/,\s*([A-Z]{2})$/', $city, $m)) {
                $states[$m[1]] = true;
            }
        }
        foreach (array_keys($states) as $code) {
            $push(self::US_STATES[$code] ?? $code, $code, 'state');
        }

        return $entries;
    }

    /**
     * Location autocomplete entries for a site (hero search box, etc.).
     * Same dataset-declared vocabulary the search page uses, same per-owner
     * 1h cache via taxonomyBlock().
     *
     * @return array<int, array{label: string, value: string, type: string}>
     */
    public function locationSuggestions(AgentWebsite $site): array
    {
        $user = $this->ownerUser($site);
        if (! $user) {
            return [];
        }

        return $this->taxonomyBlock($user)['locations'] ?? [];
    }

    /**
     * If the freetext `query` exactly equals a dataset-declared location
     * (value or label, case-insensitive), swap it for the corresponding typed
     * filter. Leaves genuine freetext (street addresses, MLS numbers) alone.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function resolveLocationQuery(User $user, array $filters): array
    {
        // A malformed/bot request can send `query` as an array (?query[]=x); a
        // bare (string) cast would fatal here (this runs before the search
        // try/catch). Treat a non-scalar query as no freetext to resolve.
        $raw = $filters['query'] ?? '';
        $q = is_array($raw) ? '' : trim((string) $raw);
        if ($q === '') {
            return $filters;
        }

        // Neighborhoods intentionally stay freetext: the curated values are
        // how locals talk ("Brickell"), while the feeds store exact
        // SubdivisionName/MLSAreaMajor enums ("BRICKELL TOWNSITE", …) — the
        // typed filter matches almost nothing, contains(UnparsedAddress/City)
        // has far better recall.
        $typeToFilter = [
            'city' => 'cities',
            'county' => 'counties',
            'zip' => 'zips',
            'state' => 'states',
        ];
        $needle = mb_strtolower($q);

        foreach ($this->taxonomyBlock($user)['locations'] ?? [] as $entry) {
            $filterKey = $typeToFilter[$entry['type'] ?? ''] ?? null;
            if ($filterKey === null) {
                continue;
            }
            if (mb_strtolower($entry['value']) === $needle || mb_strtolower($entry['label']) === $needle) {
                unset($filters['query']);
                $filters[$filterKey] = array_values(array_unique(array_merge(
                    array_filter((array) ($filters[$filterKey] ?? [])),
                    [$entry['value']],
                )));

                return $filters;
            }
        }

        return $filters;
    }

    /** Translate the request filters into a typed, paginated MlsQuery. */
    private function buildQuery(array $filters, int $page): MlsQuery
    {
        // Whitelist the filter keys the public search exposes; everything else
        // (agent/office scoping, raw extras) is intentionally not visitor-driven.
        $allowed = [
            'query', 'city', 'cities', 'county', 'counties', 'neighborhood', 'neighborhoods',
            'subdivision', 'subdivisions', 'zip', 'zips', 'state', 'states',
            'min_price', 'max_price', 'min_beds', 'max_beds', 'min_baths', 'max_baths',
            'min_sqft', 'max_sqft', 'min_lot_acres', 'max_lot_acres',
            'min_year_built', 'max_year_built', 'property_type', 'property_types', 'property_subtype', 'property_subtypes',
            'status', 'statuses', 'has_pool', 'has_waterfront', 'new_within_days',
            'has_virtual_tour', 'has_open_house', 'has_floor_plans',
            'recently_reduced', 'max_hoa_fee', 'sold_within_days', 'geo',
        ];
        $query = array_intersect_key($filters, array_flip($allowed));

        $sortKey = is_string($filters['sort'] ?? null) ? $filters['sort'] : 'recommended';
        $query['sort'] = self::SORT_MAP[$sortKey] ?? MlsQuery::SORT_MODIFIED_DESC;
        $query['page'] = $page;
        $query['per_page'] = self::PER_PAGE;

        return MlsQuery::fromArray($query);
    }

    /**
     * Map a normalized listing into the card shape the search UI renders.
     *
     * @return array<string, mixed>
     */
    private function card(AgentWebsite $site, MlsListing $listing, array $slugs, array $openHouses = []): array
    {
        $a = $listing->toArray();
        $price = $listing->price;

        $badges = $this->badges($listing);
        if ($openHouses !== []) {
            $badges[] = 'open_house';
        }

        // Reduction amount shown beside the "Price Reduced" badge (same reference
        // price the badge logic uses); null unless the price actually dropped.
        $priceReference = $listing->previousListPrice ?: $listing->originalListPrice;
        $priceDrop = ($price !== null && $priceReference && $priceReference > $price)
            ? $priceReference - $price
            : null;

        return [
            'id' => $listing->mlsSlug.':'.$listing->mlsId,
            'mls_slug' => $listing->mlsSlug,
            'mls_id' => $listing->mlsId,
            'mls_number' => $listing->mlsNumber,
            'href' => route('agent-site.property', [$site->slug, $slugs[$listing->mlsSlug.':'.$listing->mlsId] ?? 'listing']),
            'price' => $price,
            'price_formatted' => $price !== null ? '$'.number_format($price) : 'Contact for price',
            'price_drop' => $priceDrop,
            'price_drop_formatted' => $priceDrop !== null ? '$'.number_format($priceDrop) : null,
            'status_label' => $this->statusLabel($listing->status, $listing->propertyType),
            // Show the granular sub-type; fall back to the class only if it isn't
            // a bare umbrella term (so cards don't display a generic "Residential").
            'property_type' => $listing->propertySubtype ?: $this->displayClass($listing->propertyType),
            'beds' => $listing->bedrooms,
            'baths' => $this->formatBaths($listing->bathrooms),
            'parking' => $listing->garageSpaces ?: (count($listing->parking) ?: null),
            'sqft' => $listing->sqft ? number_format($listing->sqft) : null,
            'lot' => $this->formatLot($listing),
            'address' => $this->cardAddress($listing),
            'office' => $listing->listingAgent?->officeName,
            'photos' => array_slice(array_values(array_filter($listing->photos)), 0, self::MAX_PHOTOS),
            'lat' => $listing->lat,
            'lng' => $listing->lng,
            'badges' => $badges,
            'open_houses' => self::formatOpenHouses($openHouses),
            'floorplans' => array_slice(array_values(array_filter($listing->floorplans)), 0, 12),
            'virtual_tour_url' => $listing->virtualTourUrl ?: null,
            // Mortgage-calculator prefill (normalized to monthly / annual).
            'hoa_monthly' => self::monthlyHoa($listing->hoaFee, $listing->hoaFrequency),
            'tax_annual' => $listing->taxAnnualAmount,
        ];
    }

    /**
     * The public filter UI's taxonomy minus the owner's exclusions, plus the
     * allowed transaction types (so the UI can hide a disabled toggle).
     *
     * @param  array{property_types?: array, property_subtypes?: array}  $taxonomy
     */
    private function restrictTaxonomy(array $taxonomy, array $restrictions, array $allowedTxn): array
    {
        $excludedTypes = array_filter((array) ($restrictions['excluded_property_types'] ?? []));
        $excludedSubs = array_filter((array) ($restrictions['excluded_property_subtypes'] ?? []));

        if ($excludedTypes !== []) {
            $taxonomy['property_types'] = array_values(array_filter(
                (array) ($taxonomy['property_types'] ?? []),
                fn ($t) => ! in_array($t['value'] ?? '', $excludedTypes, true),
            ));
        }
        if ($excludedSubs !== []) {
            $taxonomy['property_subtypes'] = array_values(array_filter(
                (array) ($taxonomy['property_subtypes'] ?? []),
                fn ($t) => ! in_array($t['value'] ?? '', $excludedSubs, true),
            ));
        }

        $taxonomy['allowed_transactions'] = $allowedTxn !== [] ? $allowedTxn : ['sale', 'rent'];

        return $taxonomy;
    }

    /**
     * This page's upcoming open houses, grouped per feed then keyed by the
     * card id (mls_slug:mls_id).
     *
     * @param  MlsListing[]  $listings
     * @return array<string, array<int, array{start: string, end: ?string, remarks: ?string}>>
     */
    private function openHousesByCardId(User $user, array $listings): array
    {
        $bySlug = [];
        foreach ($listings as $l) {
            $bySlug[$l->mlsSlug][] = $l->mlsId;
        }

        $out = [];
        foreach ($bySlug as $slug => $keys) {
            foreach (app(MlsGateway::class)->openHousesFor($user, (string) $slug, $keys) as $key => $entries) {
                $out[$slug.':'.$key] = $entries;
            }
        }

        return $out;
    }

    /**
     * Raw open-house rows → display entries with a preformatted label
     * ("Sat, Jun 14 · 1:00 PM – 3:00 PM"), capped at the next 3.
     *
     * @param  array<int, array{start: string, end: ?string, remarks: ?string}>  $openHouses
     * @return array<int, array{start: string, end: ?string, label: string}>
     */
    public static function formatOpenHouses(array $openHouses): array
    {
        // RESO publishes UTC timestamps — render in the display timezone so
        // "1:00 PM" means 1 PM where the house actually is.
        $tz = (string) config('idx.display_timezone', 'America/New_York');

        $out = [];
        foreach (array_slice($openHouses, 0, 3) as $oh) {
            try {
                $start = Carbon::parse($oh['start'])->setTimezone($tz);
            } catch (\Throwable) {
                continue;
            }
            $label = $start->format('D, M j').' · '.$start->format('g:i A');
            if (! empty($oh['end'])) {
                try {
                    $label .= ' – '.Carbon::parse($oh['end'])->setTimezone($tz)->format('g:i A');
                } catch (\Throwable) {
                    // start-only label
                }
            }
            $out[] = ['start' => $oh['start'], 'end' => $oh['end'] ?? null, 'label' => $label];
        }

        return $out;
    }

    /** HOA fee normalized to a monthly amount (feeds the mortgage calculator). */
    public static function monthlyHoa(?int $fee, ?string $frequency): ?int
    {
        if (! $fee) {
            return null;
        }

        $f = strtolower((string) $frequency);

        return match (true) {
            str_contains($f, 'ann') || str_contains($f, 'year') => (int) round($fee / 12),
            str_contains($f, 'quart') => (int) round($fee / 3),
            str_contains($f, 'semi') => (int) round($fee / 6),
            default => $fee, // monthly (or unspecified — most feeds report monthly)
        };
    }

    /**
     * Suppress bare umbrella class names on cards (a listing with no sub-type
     * shows no type chip rather than a generic "Residential"/"Commercial").
     */
    private function displayClass(?string $type): ?string
    {
        $t = strtolower(trim((string) $type));
        $generic = ['residential', 'residential lease', 'residential income', 'commercial', 'commercial sale', 'commercial lease', 'rental', 'business', 'business opportunity'];

        return ($t === '' || in_array($t, $generic, true)) ? null : $type;
    }

    /** Display address for a card — also feeds the SEO detail-URL slug. */
    private function cardAddress(MlsListing $listing): string
    {
        $a = $listing->toArray();

        return (string) (data_get($a, 'address.full') ?? trim(implode(', ', array_filter([
            data_get($a, 'address.street'),
            data_get($a, 'address.city'),
            data_get($a, 'address.state_province'),
        ]))));
    }

    /**
     * Card badges the design renders (New Listing / Price Reduced / Price
     * Increased / Virtual Tour), in priority order.
     *
     * @return string[]
     */
    private function badges(MlsListing $listing): array
    {
        $badges = [];

        if ($this->isNew($listing)) {
            $badges[] = 'new';
        }

        $reference = $listing->previousListPrice ?: $listing->originalListPrice;
        if ($listing->price !== null && $reference) {
            if ($reference > $listing->price) {
                $badges[] = 'price_reduced';
            } elseif ($reference < $listing->price) {
                $badges[] = 'price_increased';
            }
        }

        if (! empty($listing->virtualTourUrl)) {
            $badges[] = 'virtual_tour';
        }

        if (! empty($listing->floorplans)) {
            $badges[] = 'floor_plan';
        }

        return $badges;
    }

    /** "New" = on the market within the last two weeks (or flagged new construction). */
    private function isNew(MlsListing $listing): bool
    {
        if ($listing->newConstruction === true) {
            return true;
        }
        if ($listing->daysOnMarket !== null) {
            return $listing->daysOnMarket <= 14;
        }

        $listed = $listing->onMarketDate ?: $listing->listDate;
        if ($listed) {
            try {
                return CarbonImmutable::parse($listed)->greaterThan(CarbonImmutable::now()->subDays(14));
            } catch (\Throwable) {
                return false;
            }
        }

        return false;
    }

    /** MLS status → public display label. Mirrors FeaturedListingsResolver.
     * Rentals (lease classes) show "For Rent" instead of "For Sale".
     * Public: the detail Blade maps raw MlsListing payloads through this too. */
    public function statusLabel(string $status, ?string $propertyClass = null): string
    {
        $active = preg_match('/lease|rent/i', (string) $propertyClass) ? 'For Rent' : 'For Sale';

        return match (strtolower(trim($status))) {
            'active', 'active under contract', 'activeundercontract' => $active,
            'pending', 'under contract', 'undercontract' => 'Pending',
            'sold', 'closed' => 'Sold',
            'coming soon', 'comingsoon' => 'Coming Soon',
            '' => $active,
            default => ucwords(str_replace(['_', '-'], ' ', $status)),
        };
    }

    /** Bathrooms → trimmed string (2.0 → "2", 1.5 → "1.5"), null when absent. */
    private function formatBaths(?float $baths): ?string
    {
        if ($baths === null) {
            return null;
        }

        return rtrim(rtrim(number_format($baths, 1), '0'), '.');
    }

    /** Lot size display — acres preferred, else sqft, else null. */
    private function formatLot(MlsListing $listing): ?string
    {
        if ($listing->lotAcres) {
            return rtrim(rtrim(number_format($listing->lotAcres, 2), '0'), '.').' ac lot';
        }
        if ($listing->lotSqft) {
            return number_format($listing->lotSqft).' sqft lot';
        }

        return null;
    }

    /**
     * Distinct compliance blocks (logo + disclaimer + board name) for the MLS®
     * reciprocity footer. Required wherever MLS data is shown.
     *
     * @return array<int, array{name: ?string, logo: ?string, disclaimer: ?string}>
     */
    private function compliance(mixed $result): array
    {
        $blocks = [];
        $seen = [];
        foreach ($result->compliance as $slug => $block) {
            $disclaimer = trim((string) ($block['disclaimer'] ?? $block['attribution_template'] ?? ''));
            $name = $block['mls_name'] ?? null;
            $key = $name.'|'.$disclaimer;
            if ($disclaimer === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $blocks[] = [
                // Dataset slug (gateway keys compliance by it) — lets the UI show
                // each listing's OWN MLS courtesy when several MLSes are merged.
                'slug' => is_string($slug) ? $slug : null,
                'name' => $name,
                'logo' => $block['compliance_logo_url'] ?? $block['mls_logo_url'] ?? null,
                'disclaimer' => $disclaimer,
            ];
        }

        return $blocks;
    }

    /**
     * Sample listings for UI preview (PROPERTY_SEARCH_MOCK). Shapes match card()
     * exactly so the front-end renders identically to live data. Not real MLS.
     *
     * @return array<string, mixed>
     */
    /** Raw sample rows shared by the mock list + mock detail. */
    private function mockSamples(): array
    {
        return [
            ['12 Travis Heights Blvd, Austin, TX', 1290000, 'For Sale', 'Single Family', 4, '3', 2, 2840, 30.2452, -97.7490, ['new', 'open_house'], 'Compass RE'],
            ['905 Rio Grande St, Austin, TX', 565000, 'For Sale', 'Condo', 2, '2', 1, 1180, 30.2760, -97.7480, ['price_reduced', 'floor_plan'], 'Keller Williams'],
            ['4400 Avenue G, Austin, TX', 899000, 'For Sale', 'Townhouse', 3, '2.5', 2, 1960, 30.3050, -97.7210, ['virtual_tour', 'open_house'], 'Realty Austin'],
            ['1700 Barton Springs Rd, Austin, TX', 2150000, 'For Sale', 'Single Family', 5, '4', 3, 3890, 30.2630, -97.7720, ['new', 'virtual_tour', 'floor_plan'], 'Moreland Properties'],
            ['600 Congress Ave, Austin, TX', 415000, 'For Sale', 'Condo', 1, '1', 1, 720, 30.2680, -97.7430, ['price_reduced'], 'Redfin'],
            ['2901 Bee Cave Rd, Austin, TX', 1675000, 'For Sale', 'Single Family', 4, '3.5', 2, 3120, 30.2790, -97.7950, [], 'Kuper Sotheby\'s'],
        ];
    }

    /**
     * Detail-page payload for a mock listing (MlsListing::toArray-ish shape), so
     * the standalone detail screen is previewable in mock mode too. Returns null
     * for an unknown seed.
     */
    public function mockDetail(string $mlsId): ?array
    {
        foreach ($this->mockSamples() as $i => [$addr, $price, $status, $type, $beds, $baths, $parking, $sqft, $lat, $lng, $badges, $office]) {
            if ('ps'.($i + 1) !== $mlsId) {
                continue;
            }
            $seed = 'ps'.($i + 1);
            $parts = array_map('trim', explode(',', $addr));

            return [
                'mls_number' => 'MOCK'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'status' => $status,
                'property_type' => $type,
                'price' => $price,
                'price_formatted' => '$'.number_format($price),
                'original_price' => in_array('price_reduced', $badges, true) ? (int) round($price * 1.08) : null,
                'address' => [
                    'full' => $addr,
                    'street' => $parts[0] ?? $addr,
                    'city' => $parts[1] ?? null,
                    'state_province' => $parts[2] ?? null,
                ],
                'lat' => $lat,
                'lng' => $lng,
                'bedrooms' => $beds,
                'bathrooms' => (float) $baths,
                'sqft' => $sqft,
                'lot_acres' => null,
                'year_built' => 2008 + $i,
                'garage_spaces' => $parking,
                'description' => null,
                'photos' => [
                    "https://picsum.photos/seed/{$seed}a/640/420",
                    "https://picsum.photos/seed/{$seed}b/640/420",
                    "https://picsum.photos/seed/{$seed}c/640/420",
                ],
                'virtual_tour_url' => in_array('virtual_tour', $badges, true) ? '#' : null,
                'list_office_name' => $office,
            ];
        }

        return null;
    }

    private function mockResult(AgentWebsite $site, array $filters = []): array
    {
        // Same SEO slugs as live data, so mock URLs match production shape.
        $slugs = app(ListingSlugResolver::class)->slugsFor($site, array_map(fn ($i) => [
            'mls_slug' => 'mock',
            'listing_id' => 'ps'.($i + 1),
            'address' => $this->mockSamples()[$i][0],
        ], array_keys($this->mockSamples())));

        // Feature pills are previewable in mock mode — badge-backed filtering.
        $badgeFilters = array_keys(array_filter([
            'virtual_tour' => ! empty($filters['has_virtual_tour']),
            'open_house' => ! empty($filters['has_open_house']),
            'floor_plan' => ! empty($filters['has_floor_plans']),
        ]));

        $listings = [];
        foreach ($this->mockSamples() as $i => [$addr, $price, $status, $type, $beds, $baths, $parking, $sqft, $lat, $lng, $badges, $office]) {
            if ($badgeFilters && array_diff($badgeFilters, $badges)) {
                continue;
            }
            $seed = 'ps'.($i + 1);
            $listings[] = [
                'id' => 'mock:'.$seed,
                'mls_slug' => 'mock',
                'mls_id' => $seed,
                'mls_number' => 'MOCK'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'href' => route('agent-site.property', [$site->slug, $slugs['mock:'.$seed] ?? 'listing']),
                'price' => $price,
                'price_formatted' => '$'.number_format($price),
                'status_label' => $status,
                'property_type' => $type,
                'beds' => $beds,
                'baths' => $baths,
                'parking' => $parking,
                'sqft' => number_format($sqft),
                'lot' => null,
                'address' => $addr,
                'office' => $office,
                'photos' => [
                    "https://picsum.photos/seed/{$seed}a/640/420",
                    "https://picsum.photos/seed/{$seed}b/640/420",
                    "https://picsum.photos/seed/{$seed}c/640/420",
                ],
                'lat' => $lat,
                'lng' => $lng,
                'badges' => $badges,
            ];
        }

        return [
            'integrated' => true,
            'listings' => $listings,
            'total' => count($listings),
            'page' => 1,
            'per_page' => self::PER_PAGE,
            'compliance' => [[
                'name' => 'Sample MLS',
                'logo' => null,
                'disclaimer' => 'Sample data shown for layout preview only — these are not real MLS listings.',
            ]],
            // Sample taxonomy so the type filters are previewable in mock mode.
            'taxonomy' => ['statuses' => [
                ['value' => 'Active', 'label' => 'Active'],
                ['value' => 'Pending', 'label' => 'Pending'],
                ['value' => 'Closed', 'label' => 'Sold'],
                ['value' => 'Expired', 'label' => 'Expired'],
            ], 'property_types' => [
                ['value' => 'Residential', 'label' => 'House'],
                ['value' => 'Condo', 'label' => 'Condo'],
                ['value' => 'Townhouse', 'label' => 'Townhouse'],
                ['value' => 'Land', 'label' => 'Land'],
                ['value' => 'Multi-Family', 'label' => 'Multi-Family'],
            ], 'property_subtypes' => [
                ['value' => 'Single Family Residence', 'label' => 'Single Family'],
                ['value' => 'Condominium', 'label' => 'Condominium'],
                ['value' => 'Townhouse', 'label' => 'Townhouse'],
                ['value' => 'Villa', 'label' => 'Villa'],
                ['value' => 'Duplex', 'label' => 'Duplex'],
                ['value' => 'Land', 'label' => 'Land / Lot'],
            ]],
            'error' => null,
        ];
    }

    /**
     * Whether a listing's location data is usable on the public search.
     * Some feeds carry out-of-area records with placeholder values (e.g.
     * "Other County - Not In Usa", city "Other", zip "None") and/or impossible
     * coordinates — those are filtered out of the public results entirely.
     */
    private function hasValidLocation(MlsListing $l): bool
    {
        $junk = '/\bnot in usa\b|\bout of (area|county|state)\b|^other\b|^none$|^unknown$|^n\/?a$/i';

        foreach ([$l->address?->city, $l->address?->stateProvince, $l->address?->county] as $part) {
            $part = trim((string) $part);
            if ($part !== '' && preg_match($junk, $part)) {
                return false;
            }
        }

        // Coordinates: absent is tolerated (some feeds suppress them), but
        // present-and-impossible (0,0 ocean point or out-of-range) is junk.
        if ($l->lat !== null && $l->lng !== null) {
            if (($l->lat === 0.0 && $l->lng === 0.0) || abs($l->lat) > 90 || abs($l->lng) > 180) {
                return false;
            }
        }

        return true;
    }

    /**
     * Whether the request is the unfiltered "default view" (first open of the
     * search page) — the only state where featured listings are prepended.
     */
    private function isDefaultView(array $filters): bool
    {
        $narrowing = [
            'query', 'geo', 'min_price', 'max_price', 'min_beds', 'min_baths',
            'min_sqft', 'max_sqft', 'min_year_built', 'max_year_built',
            'min_lot_acres', 'max_lot_acres', 'max_hoa_fee', 'new_within_days',
            'property_type', 'property_types', 'property_subtype', 'property_subtypes',
            'has_pool', 'has_waterfront', 'has_virtual_tour', 'has_open_house',
            'has_floor_plans', 'recently_reduced', 'sold_within_days',
            'city', 'cities', 'zip', 'zips',
        ];
        foreach ($narrowing as $key) {
            if (! empty($filters[$key])) {
                return false;
            }
        }

        // A sold/inactive status view isn't the default landing state.
        $statuses = array_map('strtolower', (array) ($filters['statuses'] ?? []));

        return $statuses === [] || in_array('active', $statuses, true);
    }

    /**
     * The owner's manually-curated CRM listings for a website section, mapped
     * into the same card shape as MLS results (mls_slug 'manual').
     *
     * @return array<int, array<string, mixed>>
     */
    private function manualSearchCards(AgentWebsite $site, string $section, int $limit = 12): array
    {
        $listings = Listing::query()
            ->where('website_section', $section)
            ->where('is_private', false)
            ->where(fn ($q) => $site->team_id
                ? $q->where('team_id', $site->team_id)
                : $q->where('user_id', $site->user_id))
            ->orderByDesc('listed_at')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        if ($listings->isEmpty()) {
            return [];
        }

        $slugs = app(ListingSlugResolver::class)->slugsFor($site, $listings->map(fn ($l) => [
            'mls_slug' => 'manual',
            'listing_id' => (string) $l->id,
            'address' => trim(implode(', ', array_filter([$l->address, $l->city, $l->state_province]))),
        ])->all());

        return $listings->map(function ($l) use ($site, $slugs) {
            $f = (array) ($l->features ?? []);
            $photos = [];
            foreach (array_slice((array) $l->photos, 0, self::MAX_PHOTOS) as $p) {
                $url = is_string($p) ? $p : (is_array($p) ? (string) ($p['url'] ?? $p['path'] ?? $p['src'] ?? '') : '');
                $url = trim($url);
                if ($url !== '') {
                    $photos[] = str_starts_with($url, 'http') ? $url : Storage::disk('public')->url($url);
                }
            }
            $slug = $slugs['manual:'.$l->id] ?? 'listing';

            return [
                'id' => 'manual:'.$l->id,
                'mls_slug' => 'manual',
                'mls_id' => (string) $l->id,
                // Exclusive / off-MLS listings have no MLS number — blank so the
                // card/detail hide the MLS® label instead of showing a placeholder.
                'mls_number' => (string) ($l->mls_number ?? ''),
                'href' => route('agent-site.property', [$site->slug, $slug]),
                'price' => $l->price !== null ? (float) $l->price : null,
                'price_formatted' => $l->price !== null ? '$'.number_format((float) $l->price) : 'Contact for price',
                'status_label' => $this->statusLabel((string) $l->status),
                'property_type' => $f['property_subtype'] ?? ucwords(str_replace(['_', '-'], ' ', (string) $l->listing_type)),
                'beds' => $l->bedrooms,
                'baths' => $l->bathrooms !== null ? $this->formatBaths((float) $l->bathrooms) : null,
                'parking' => $f['garage_spaces'] ?? null,
                'sqft' => $l->sqft ? number_format((int) $l->sqft) : null,
                'lot' => null,
                'address' => trim(implode(', ', array_filter([$l->address, $l->city, $l->state_province]))),
                'office' => $site->brokerage_name ?: null,
                'photos' => $photos,
                'lat' => isset($f['lat']) ? (float) $f['lat'] : null,
                'lng' => isset($f['lng']) ? (float) $f['lng'] : null,
                'badges' => array_values(array_filter([
                    'featured',
                    ! empty($f['virtual_tour_url']) ? 'virtual_tour' : null,
                    ! empty($f['open_houses']) ? 'open_house' : null,
                ])),
                'virtual_tour_url' => $f['virtual_tour_url'] ?? null,
                'hoa_monthly' => isset($f['hoa_fee']) ? (int) $f['hoa_fee'] : null,
                'tax_annual' => null,
            ];
        })->all();
    }

    /**
     * Total active listings across the site's feeds — a cheap count-projection
     * query (no rows), 2h-cached. Powers the search page's SEO title/meta.
     * Null when no MLS is connected or every feed errors.
     */
    public function totalActiveCount(AgentWebsite $site): ?int
    {
        $user = $this->ownerUser($site);
        if (! $user) {
            return null;
        }

        $total = Cache::remember("ps:total:{$site->id}", now()->addHours(2), function () use ($user): int {
            try {
                // Mirror the page's default view: residential, for-sale classes.
                $classes = array_column($this->taxonomyBlock($user)['property_types'] ?? [], 'value');
                $residentialSale = array_values(array_filter(
                    $classes,
                    fn ($c) => preg_match('/residential/i', (string) $c) && ! preg_match('/lease|rent/i', (string) $c),
                ));

                $query = ['projection' => MlsQuery::PROJECTION_COUNT, 'per_page' => 1];
                if ($residentialSale !== []) {
                    $query['property_types'] = $residentialSale;
                }

                $result = app(MlsGateway::class)->search($user, MlsQuery::fromArray($query), []);

                return (int) $result->total;
            } catch (\Throwable) {
                return 0;
            }
        });

        return $total > 0 ? $total : null;
    }

    /**
     * Whether the site's MLS carries SOLD/closed listings — the data a comparable
     * sales (AVM) estimate needs. Cached 6h; false when no MLS is connected.
     */
    public function hasSoldComps(AgentWebsite $site): bool
    {
        $user = $this->ownerUser($site);
        if (! $user) {
            return false;
        }

        return Cache::remember("ps:soldcomps:{$site->id}", now()->addHours(6), function () use ($user): bool {
            try {
                $result = app(MlsGateway::class)->search(
                    $user,
                    MlsQuery::fromArray([
                        'projection' => MlsQuery::PROJECTION_COUNT,
                        'per_page' => 1,
                        'statuses' => ['Closed', 'Sold'],
                    ]),
                    [],
                );

                return (int) $result->total > 0;
            } catch (\Throwable) {
                return false;
            }
        });
    }

    /**
     * Aggregate market statistics for the public Market Trends page. Returns a
     * current snapshot (median sale price, $/sqft, avg days-on-market, sales
     * count, active inventory, months of supply) plus a 6-month median-price /
     * sales-volume trend, computed from the owner's connected MLS(es).
     *
     * Sold figures come from the most recent closed sales the gateway returns
     * (sample-capped per feed via PER_PAGE), so high-volume areas report a
     * representative recent sample rather than every record — honest for a
     * public dashboard and cheap to serve. Cached 6h per site + area.
     *
     * @return array{
     *     integrated: bool,
     *     area: ?string,
     *     areas: array<int, string>,
     *     stats: ?array<string, int|float|null>,
     *     trend: array<int, array{label: string, month: string, median: ?int, count: int}>,
     *     updated_at: ?string
     * }
     */
    public function marketStats(AgentWebsite $site, ?string $city = null): array
    {
        // UI-preview mode (PROPERTY_SEARCH_MOCK) — sample stats so the dashboard
        // layout can be reviewed without a connected MLS. Same opt-in flag the
        // property search uses; never on in production.
        if (config('services.property_search.mock')) {
            return $this->mockMarketStats($city);
        }

        $user = $this->ownerUser($site);
        $blank = ['integrated' => false, 'area' => null, 'areas' => [], 'stats' => null, 'trend' => [], 'updated_at' => null];

        if (! $user) {
            return $blank;
        }

        // Cities the connected feeds declare — the area picker's options.
        $cities = array_values(array_filter(array_map(
            static fn ($l) => ($l['type'] ?? null) === 'city' ? $l['value'] : null,
            $this->taxonomyBlock($user)['locations'] ?? [],
        )));
        sort($cities);

        $area = ($city !== null && in_array($city, $cities, true)) ? $city : ($cities[0] ?? null);

        $cacheKey = 'ps:market:'.$site->id.':'.md5(($area ?? 'all').'|'.$user->id);

        $data = Cache::remember($cacheKey, now()->addHours(6), function () use ($user, $area, $site) {
            try {
                // Residential, for-sale classes only — mirrors the search page's
                // default view so the trends reflect the homes visitors browse.
                $classes = array_column($this->taxonomyBlock($user)['property_types'] ?? [], 'value');
                $residential = array_values(array_filter(
                    preg_grep('/residential/i', $classes) ?: [],
                    static fn ($c) => ! preg_match('/lease|rent/i', (string) $c),
                ));

                $soldFilters = ['statuses' => ['Closed', 'Sold'], 'sold_within_days' => 365, 'per_page' => self::PER_PAGE];
                $activeFilters = ['projection' => MlsQuery::PROJECTION_COUNT, 'per_page' => 1];
                if ($area !== null) {
                    $soldFilters['cities'] = [$area];
                    $activeFilters['cities'] = [$area];
                }
                if ($residential !== []) {
                    $soldFilters['property_types'] = $residential;
                    $activeFilters['property_types'] = $residential;
                }

                $sold = app(MlsGateway::class)->search($user, MlsQuery::fromArray($soldFilters), [])->listings;
                $active = (int) app(MlsGateway::class)->search($user, MlsQuery::fromArray($activeFilters), [])->total;

                return $this->computeMarketStats($sold, $active);
            } catch (\Throwable $e) {
                Log::warning('Market trends stats failed: '.$e->getMessage(), ['site' => $site->id]);

                return null;
            }
        });

        return [
            'integrated' => true,
            'area' => $area,
            'areas' => $cities,
            'stats' => $data['stats'] ?? null,
            'trend' => $data['trend'] ?? [],
            'updated_at' => $data['computed_at'] ?? null,
        ];
    }

    /**
     * Sample market stats for UI preview (PROPERTY_SEARCH_MOCK). Same shape as
     * the live result; numbers vary slightly per area so switching the picker
     * looks alive. Not real MLS data.
     *
     * @return array{integrated: bool, area: ?string, areas: array<int, string>, stats: array<string, int|float|null>, trend: array<int, array<string, mixed>>, updated_at: string}
     */
    private function mockMarketStats(?string $city): array
    {
        $areas = ['Austin', 'Round Rock', 'Cedar Park', 'Georgetown', 'Pflugerville'];
        $area = ($city !== null && in_array($city, $areas, true)) ? $city : $areas[0];
        $i = (int) array_search($area, $areas, true);

        $base = 540000 + $i * 45000;
        $medians = [$base - 28000, $base - 19000, $base - 9000, $base - 12000, $base + 6000, $base + 18000];
        $counts = [38, 44, 51, 47, 56, 61];

        $trend = [];
        $start = CarbonImmutable::now()->startOfMonth();
        for ($m = 5; $m >= 0; $m--) {
            $month = $start->subMonths($m);
            $idx = 5 - $m;
            $trend[] = [
                'label' => $month->format('M'),
                'month' => $month->format('Y-m'),
                'median' => $medians[$idx],
                'count' => $counts[$idx],
            ];
        }

        $active = 280 + $i * 35;
        $sales = array_sum($counts);

        return [
            'integrated' => true,
            'area' => $area,
            'areas' => $areas,
            'stats' => [
                'median_price' => $base + 18000,
                'avg_price' => $base + 24000,
                'median_ppsf' => 312 + $i * 11,
                'avg_dom' => 26 + $i * 2,
                'sales_count' => $sales,
                'active_inventory' => $active,
                'months_supply' => round($active / ($sales / 6), 1),
            ],
            'trend' => $trend,
            'updated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Reduce a set of sold listings + an active count into the dashboard's
     * snapshot + 6-month trend. Null when there are no usable sold records.
     *
     * @param  MlsListing[]  $sold
     * @return array{stats: array<string, int|float|null>, trend: array<int, array<string, mixed>>, computed_at: string}|null
     */
    private function computeMarketStats(array $sold, int $active): ?array
    {
        $sold = array_values(array_filter($sold, fn (MlsListing $l) => ($l->soldPrice ?: $l->price) && $l->soldDate));
        if ($sold === []) {
            return null;
        }

        $prices = [];
        $ppsf = [];
        $doms = [];
        $byMonth = [];

        foreach ($sold as $l) {
            $price = $l->soldPrice ?: $l->price;
            $prices[] = $price;
            if ($l->sqft) {
                $ppsf[] = $price / $l->sqft;
            }
            if ($l->daysOnMarket !== null) {
                $doms[] = $l->daysOnMarket;
            }
            try {
                $byMonth[CarbonImmutable::parse($l->soldDate)->format('Y-m')][] = $price;
            } catch (\Throwable) {
                // undated sale — counts toward the snapshot, not the monthly trend
            }
        }

        $trend = [];
        $start = CarbonImmutable::now()->startOfMonth();
        for ($i = 5; $i >= 0; $i--) {
            $month = $start->subMonths($i);
            $vals = $byMonth[$month->format('Y-m')] ?? [];
            $trend[] = [
                'label' => $month->format('M'),
                'month' => $month->format('Y-m'),
                'median' => $vals !== [] ? $this->median($vals) : null,
                'count' => count($vals),
            ];
        }

        return [
            'stats' => [
                'median_price' => $this->median($prices),
                'avg_price' => (int) round(array_sum($prices) / count($prices)),
                'median_ppsf' => $ppsf !== [] ? (int) round($this->median($ppsf)) : null,
                'avg_dom' => $doms !== [] ? (int) round(array_sum($doms) / count($doms)) : null,
                'sales_count' => count($sold),
                'active_inventory' => $active,
                'months_supply' => $this->monthsSupply($active, count($sold)),
            ],
            'trend' => $trend,
            'computed_at' => now()->toIso8601String(),
        ];
    }

    /** @param array<int, int|float> $nums */
    private function median(array $nums): int
    {
        sort($nums);
        $n = count($nums);
        if ($n === 0) {
            return 0;
        }
        $mid = intdiv($n, 2);

        return (int) round($n % 2 ? $nums[$mid] : ($nums[$mid - 1] + $nums[$mid]) / 2);
    }

    /** Months of inventory = active listings ÷ the ~monthly sales rate (12mo window). */
    private function monthsSupply(int $active, int $soldCount): ?float
    {
        $perMonth = $soldCount / 12;

        return $perMonth > 0 ? round($active / $perMonth, 1) : null;
    }

    /** The user whose MLS connections power a site's searches (handles team sites). */
    private function ownerUser(AgentWebsite $site): ?User
    {
        if ($site->user_id) {
            return User::find($site->user_id);
        }
        if ($site->team_id) {
            return User::where('team_id', $site->team_id)
                ->whereHas('idxConnections', fn ($q) => $q->where('is_active', true))
                ->first()
                ?? User::where('team_id', $site->team_id)->first();
        }

        return null;
    }
}
