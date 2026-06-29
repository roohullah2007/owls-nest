<?php

declare(strict_types=1);

namespace App\Services\Mls;

use App\Models\AgentWebsite;
use App\Models\Hotsheet;
use App\Models\IdxConnection;
use App\Models\Listing;
use App\Models\User;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\DTO\MlsQuery;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Resolves the Featured Listings block's MLS source into renderable property
 * cards. All MLS access goes through MlsGateway (see [[feedback-mls-taxonomy]]).
 * Returns null on any failure or when nothing is connected/returned, so the
 * block falls back to the agent's own listings / placeholders.
 */
class FeaturedListingsResolver
{
    /** Public-page MLS pulls are cached this long — visits must not hit the MLS API. */
    private const CACHE_HOURS = 8;

    /**
     * Stale-while-revalidate window for the public-page pulls: past
     * CACHE_HOURS a visitor is served the stale pull instantly and the
     * refresh runs after the response; only a pull idle past this many hours
     * blocks a request again. Keeps cache expiry from ever stacking upstream
     * MLS latency in front of a page view.
     *
     * @return array{0: int, 1: int} [fresh seconds, total seconds]
     */
    private static function cacheTtl(): array
    {
        return [self::CACHE_HOURS * 3600, self::CACHE_HOURS * 3 * 3600];
    }

    /**
     * Fingerprint of the owner's active MLS connections for cache keys — so
     * connecting/disconnecting an MLS busts cached pulls immediately instead
     * of serving stale single-MLS results for up to CACHE_HOURS.
     */
    private static function connectionFingerprint(AgentWebsite $site): string
    {
        $user = self::ownerUser($site);
        if (! $user) {
            return 'none';
        }

        return IdxConnection::where('is_active', true)
            ->where(function ($w) use ($user) {
                $w->where('user_id', $user->id);
                if ($user->team_id) {
                    $w->orWhere('team_id', $user->team_id);
                }
            })
            ->orderBy('id')
            ->pluck('id')
            ->implode(',') ?: 'none';
    }

    /**
     * @return array{listings: array<int, array<string, string>>, compliance: ?string}|null
     */
    public static function resolve(AgentWebsite $site, array $data): ?array
    {
        // 8h cache (config changes change the key). Null (no MLS result) is
        // cached as a sentinel too, so a dead/empty feed isn't re-queried on
        // every page view either.
        $key = sprintf('fl:resolve:%d:%s', $site->id, md5(json_encode([
            $site->slug,
            self::connectionFingerprint($site),
            $data['limit'] ?? $data['mls_limit'] ?? null,
            $data['mls_mode'] ?? null,
            $data['mls_hotsheet_id'] ?? null,
            $data['mls_office_ids'] ?? null,
            $data['mls_agent_ids'] ?? null,
            $data['mls_datasets'] ?? null,
        ])));

        $cached = Cache::flexible($key, self::cacheTtl(), fn () => self::doResolve($site, $data) ?? ['_empty' => true]);

        return isset($cached['_empty']) ? null : $cached;
    }

    /**
     * @return array{listings: array<int, array<string, string>>, compliance: ?string}|null
     */
    private static function doResolve(AgentWebsite $site, array $data): ?array
    {
        if (! $site->user_id) {
            return null;
        }
        $user = User::find($site->user_id);
        if (! $user) {
            return null;
        }

        try {
            $limit = max(1, min(36, (int) ($data['limit'] ?? $data['mls_limit'] ?? 12)));
            $mode = $data['mls_mode'] ?? 'datasets';

            if ($mode === 'hotsheet') {
                // Replay a saved hotsheet (same shape /properties persists, incl. polygon).
                $hotsheet = ! empty($data['mls_hotsheet_id'])
                    ? Hotsheet::query()->visibleTo($user)->find((int) $data['mls_hotsheet_id'])
                    : null;
                if (! $hotsheet) {
                    return null;
                }
                $query = self::hotsheetToQuery(is_array($hotsheet->filters) ? $hotsheet->filters : []);
            } else {
                $query = [];
                if ($mode === 'office' && ($ids = self::ids($data['mls_office_ids'] ?? ''))) {
                    $query['office_ids'] = $ids;
                } elseif ($mode === 'agent' && ($ids = self::ids($data['mls_agent_ids'] ?? ''))) {
                    $query['agent_ids'] = $ids;
                }
            }

            // Over-request so the image-only filter still leaves enough cards.
            $query['per_page'] = max($limit * 2, 24);
            $query['sort'] = MlsQuery::SORT_MODIFIED_DESC;

            $datasetSlugs = self::ids($data['mls_datasets'] ?? '');

            $result = app(MlsGateway::class)->search($user, MlsQuery::fromArray($query), $datasetSlugs);

            $cards = self::cardsFromResult($result, $limit, $site);
            if (empty($cards)) {
                return null;
            }

            return ['listings' => $cards, 'compliance' => self::complianceFromResult($result)];
        } catch (\Throwable $e) {
            Log::warning('Featured Listings MLS resolve failed: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Resolve MLS listings for a community / area page from its saved filters.
     * Unlike {@see resolve()}, this takes the community's full MLS-aligned filter
     * set (cities, price, beds…) plus an office/agent scope, and reports whether
     * an MLS is connected so the page can show a public "coming soon" / owner
     * "integrate your MLS" notice.
     *
     * Paginated: $page selects the slice (per_page = the community's limit,
     * default 12); `total` in the return powers the page controls.
     *
     * @param  array<string, mixed>  $criteria  The community's search_criteria.
     * @return array{listings: array<int, array<string, string>>, compliance: ?string, integrated: bool, total: int, page: int, per_page: int}
     */
    public static function resolveForArea(AgentWebsite $site, array $criteria, int $page = 1): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(36, (int) ($criteria['limit'] ?? 12)));
        $blank = ['listings' => [], 'compliance' => null, 'integrated' => false, 'total' => 0, 'page' => $page, 'per_page' => $perPage];

        $user = self::ownerUser($site);
        if (! $user) {
            return $blank;
        }

        // Connections the gateway would use for this owner (own + team-wide).
        $connections = IdxConnection::where('is_active', true)
            ->where(function ($w) use ($user) {
                $w->where('user_id', $user->id);
                if ($user->team_id) {
                    $w->orWhere('team_id', $user->team_id);
                }
            })
            ->get();

        if ($connections->isEmpty()) {
            return $blank; // integrated=false → page shows the not-connected notice
        }

        $key = sprintf('fl:area:%d:%s', $site->id, md5(json_encode([$site->slug, self::connectionFingerprint($site), $criteria, $page])));

        return Cache::flexible($key, self::cacheTtl(), function () use ($site, $user, $connections, $criteria, $page, $perPage): array {
            try {
                $limit = $perPage;

                // A selected Properties-tab hotsheet replays its saved filters; otherwise
                // the community's own manual filters drive the search.
                $hotsheetId = (int) ($criteria['hotsheet_id'] ?? 0);
                if ($hotsheetId) {
                    $hotsheet = Hotsheet::visibleTo($user)->find($hotsheetId);
                    $query = $hotsheet ? self::hotsheetToQuery(is_array($hotsheet->filters) ? $hotsheet->filters : []) : [];
                } else {
                    $query = self::criteriaToQuery($criteria);
                }

                // Office / agent scoping resolves to the connection's IDs (falling back
                // to the user's own idx_office_id / idx_agent_id).
                $scope = $criteria['scope'] ?? 'all';
                if ($scope === 'office' || $scope === 'agent') {
                    $field = $scope === 'office' ? 'office_id' : 'agent_id';
                    $ids = $connections->pluck($field)->filter()->unique()->values()->all();
                    if (empty($ids)) {
                        $own = $scope === 'office' ? $user->idx_office_id : $user->idx_agent_id;
                        if ($own) {
                            $ids = [$own];
                        }
                    }
                    if (! empty($ids)) {
                        $query[$scope === 'office' ? 'office_ids' : 'agent_ids'] = $ids;
                    }
                }

                // Community pages are FOR-SALE surfaces: without an explicit
                // class filter, exclude lease/rental classes (same
                // taxonomy-value derivation the public search uses) so rentals
                // never mix into "Homes for Sale". Pages that explicitly
                // target a lease class (the Residential Lease property page)
                // pass property_types and are untouched.
                if (empty($query['property_types'])) {
                    $saleClasses = self::saleClasses($user);
                    if ($saleClasses !== []) {
                        $query['property_types'] = $saleClasses;
                    }
                }

                $query['per_page'] = $perPage;
                $query['page'] = $page;
                $query['sort'] = MlsQuery::SORT_MODIFIED_DESC;

                $result = app(MlsGateway::class)->search($user, MlsQuery::fromArray($query), []);

                return [
                    'listings' => self::cardsFromResult($result, $limit, $site),
                    'compliance' => self::complianceFromResult($result),
                    'integrated' => true,
                    'total' => (int) $result->total,
                    'page' => $page,
                    'per_page' => $perPage,
                ];
            } catch (\Throwable $e) {
                Log::warning('Community MLS resolve failed: '.$e->getMessage());

                return ['listings' => [], 'compliance' => null, 'integrated' => true, 'total' => 0, 'page' => $page, 'per_page' => $perPage];
            }
        });
    }

    /**
     * Cache-only read of resolveForArea()'s listing total, for decorative
     * counts on public pages (the "(24)" suffixes {property_links} renders).
     * Returns instantly: the cached total, or null when this slice hasn't
     * been pulled yet — in which case the pull is deferred to after the
     * response, so counts appear from the next page view onward. A visitor
     * request is never blocked on an upstream MLS call per count (a cold
     * community page used to make one search per lifestyle page, stacking
     * seconds of upstream latency before first byte).
     */
    public static function cachedAreaTotal(AgentWebsite $site, array $criteria, int $page = 1): ?int
    {
        // Must mirror resolveForArea()'s key exactly so both sides share the cache.
        $key = sprintf('fl:area:%d:%s', $site->id, md5(json_encode([$site->slug, self::connectionFingerprint($site), $criteria, $page])));

        $cached = Cache::get($key);
        if (is_array($cached)) {
            return ! empty($cached['integrated']) ? (int) ($cached['total'] ?? 0) : null;
        }

        defer(fn () => self::resolveForArea($site, $criteria, $page), 'fl-warm:'.$key);

        return null;
    }

    /**
     * Distinct ZIP codes present in a community's live MLS listings — extends
     * the manually configured ZIP sub-areas so the community page links every
     * ZIP that actually has inventory, and lets those ZIP URLs resolve as
     * sub-pages without being configured. Cached like the other public pulls;
     * empty on any failure or when no MLS is connected.
     *
     * @param  array<string, mixed>  $criteria  The community's search_criteria.
     * @return string[] Sorted 5-digit ZIPs.
     */
    public static function zipsForArea(AgentWebsite $site, array $criteria): array
    {
        $user = self::ownerUser($site);
        if (! $user) {
            return [];
        }

        $key = sprintf('fl:zips:%d:%s', $site->id, md5(json_encode([$site->slug, self::connectionFingerprint($site), $criteria])));

        // strval: numeric-string array keys come back as ints from array_keys.
        return array_map('strval', Cache::flexible($key, self::cacheTtl(), function () use ($user, $criteria): array {
            try {
                $query = self::criteriaToQuery($criteria);
                if (empty($query)) {
                    return []; // no location filters — a ZIP sweep would scan the whole feed
                }
                $query['per_page'] = 100;
                $query['sort'] = MlsQuery::SORT_MODIFIED_DESC;

                $result = app(MlsGateway::class)->search($user, MlsQuery::fromArray($query), []);

                $zips = [];
                foreach ($result->listings as $listing) {
                    $zip = substr(trim((string) ($listing->address?->postalCode ?? '')), 0, 5);
                    if (preg_match('/^\d{5}$/', $zip)) {
                        $zips[$zip] = true;
                    }
                }
                $zips = array_keys($zips);
                sort($zips);

                return $zips;
            } catch (\Throwable $e) {
                Log::warning('Community ZIP discovery failed: '.$e->getMessage());

                return [];
            }
        }));
    }

    /**
     * Cards for a site's curated listings SECTION — the dedicated Featured
     * Properties ('featured') / Past Transactions ('sold') pages. Combines:
     *   1. Manual CRM listings the owner flagged (listings.website_section),
     *      linked to the shared property-detail template via 'manual' slugs.
     *   2. MLS listings pulled by the section's saved config
     *      (page_data._config.listings.{section}: agent_ids / office_ids /
     *      mls_numbers) through MlsGateway.
     *
     * @return array{listings: array<int, array<string, string>>, compliance: ?string}
     */
    public static function resolveSection(AgentWebsite $site, string $section, int $limit = 60): array
    {
        $section = $section === 'sold' ? 'sold' : 'featured';
        $cards = self::manualSectionCards($site, $section, $limit);
        $compliance = null;

        $cfg = (array) data_get($site->page_data, "_config.listings.{$section}", []);
        $remaining = $limit - count($cards);

        if ($remaining > 0 && (! empty($cfg['agent_ids']) || ! empty($cfg['office_ids']) || ! empty($cfg['mls_numbers']))) {
            $user = self::ownerUser($site);
            if ($user) {
                // Only the MLS pull is cached (8h); the manual CRM cards above
                // stay live so owner edits show immediately.
                $key = sprintf('fl:section:%d:%s:%d:%s', $site->id, $section, $remaining, md5(json_encode([$site->slug, self::connectionFingerprint($site), $cfg])));
                $mlsBlock = Cache::flexible($key, self::cacheTtl(), function () use ($user, $cfg, $section, $remaining, $site): array {
                    try {
                        $mls = self::mlsSectionListings($user, $cfg, $section, $remaining);
                        if (! $mls['listings']) {
                            return ['cards' => [], 'compliance' => null];
                        }
                        $slugItems = [];
                        foreach ($mls['listings'] as $l) {
                            $a = $l->toArray();
                            $slugItems[] = [
                                'mls_slug' => (string) ($a['mls_slug'] ?? ''),
                                'listing_id' => (string) ($a['mls_id'] ?? ''),
                                'address' => (string) (data_get($a, 'address.full') ?? ''),
                            ];
                        }
                        $slugs = app(ListingSlugResolver::class)->slugsFor($site, $slugItems);
                        $mlsCards = [];
                        foreach ($mls['listings'] as $l) {
                            $a = $l->toArray();
                            $slug = $slugs[(string) ($a['mls_slug'] ?? '').':'.(string) ($a['mls_id'] ?? '')] ?? null;
                            $mlsCards[] = self::mlsCard($a, $site, $slug);
                        }

                        return ['cards' => $mlsCards, 'compliance' => $mls['compliance']];
                    } catch (\Throwable $e) {
                        Log::warning("Website {$section} listings MLS resolve failed: ".$e->getMessage(), ['site' => $site->id]);

                        return ['cards' => [], 'compliance' => null];
                    }
                });

                $cards = array_merge($cards, array_slice($mlsBlock['cards'], 0, $remaining));
                $compliance = $mlsBlock['compliance'];
            }
        }

        return ['listings' => $cards, 'compliance' => $compliance];
    }

    /**
     * A team member's listings (their public /team/{slug} page) — MLS search
     * scoped to their MLS agent id. Sold=true pulls closed transactions.
     *
     * @return array{listings: array<int, array<string, string>>, compliance: ?string}
     */
    public static function resolveForAgentId(AgentWebsite $site, string $mlsAgentId, bool $sold = false, int $limit = 12): array
    {
        $user = self::ownerUser($site);
        if (! $user || trim($mlsAgentId) === '') {
            return ['listings' => [], 'compliance' => null];
        }

        $key = sprintf('fl:agent:%d:%s:%d:%d', $site->id, md5($site->slug.'|'.self::connectionFingerprint($site).'|'.trim($mlsAgentId)), (int) $sold, $limit);

        return Cache::flexible($key, self::cacheTtl(), function () use ($site, $user, $mlsAgentId, $sold, $limit): array {
            try {
                $query = [
                    'agent_ids' => [trim($mlsAgentId)],
                    'per_page' => max($limit * 2, 24),
                    'sort' => MlsQuery::SORT_MODIFIED_DESC,
                ];
                if ($sold) {
                    $query['statuses'] = ['Closed', 'Sold'];
                }
                $result = app(MlsGateway::class)->search($user, MlsQuery::fromArray($query), []);

                return [
                    'listings' => self::cardsFromResult($result, $limit, $site),
                    'compliance' => self::complianceFromResult($result),
                ];
            } catch (\Throwable $e) {
                Log::warning('Team member MLS resolve failed: '.$e->getMessage(), ['site' => $site->id]);

                return ['listings' => [], 'compliance' => null];
            }
        });
    }

    /**
     * Manual (CRM) listings the owner flagged for a website section, as cards
     * linked to the shared detail template (mls_slug 'manual').
     *
     * @return array<int, array<string, string>>
     */
    public static function manualSectionCards(AgentWebsite $site, string $section, int $limit = 60): array
    {
        $listings = self::manualSectionQuery($site, $section)
            ->orderByDesc($section === 'sold' ? 'sold_at' : 'listed_at')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        if ($listings->isEmpty()) {
            return [];
        }

        $slugs = app(ListingSlugResolver::class)->slugsFor($site, $listings->map(fn (Listing $l) => [
            'mls_slug' => 'manual',
            'listing_id' => (string) $l->id,
            'address' => trim(implode(', ', array_filter([$l->address, $l->city, $l->state_province]))),
        ])->all());

        return $listings->map(function (Listing $l) use ($site, $slugs) {
            $slug = $slugs['manual:'.$l->id] ?? null;

            return [
                'image' => self::firstPhotoUrl($l->photos),
                'status' => self::statusLabel((string) $l->status),
                'price' => $l->price ? '$'.number_format((float) $l->price) : '',
                'address' => trim(implode(', ', array_filter([$l->address, $l->city, $l->state_province]))),
                'beds' => $l->bedrooms !== null ? (string) $l->bedrooms : '',
                'baths' => $l->bathrooms !== null ? rtrim(rtrim((string) $l->bathrooms, '0'), '.') : '',
                'sqft' => $l->sqft ? number_format((int) $l->sqft) : '',
                'property_subtype' => (string) (((array) ($l->features ?? []))['property_subtype'] ?? ucwords(str_replace(['_', '-'], ' ', (string) $l->listing_type))),
                'link' => $slug ? route('agent-site.property', [$site->slug, $slug]) : '',
            ];
        })->all();
    }

    /** A flagged manual CRM listing by id, scoped to the site's owner — for the public detail page. */
    public static function manualListing(AgentWebsite $site, int $id): ?Listing
    {
        return Listing::query()
            ->whereKey($id)
            ->whereNotNull('website_section')
            ->where('is_private', false)
            ->where(fn ($q) => $site->team_id
                ? $q->where('team_id', $site->team_id)
                : $q->where('user_id', $site->user_id))
            ->first();
    }

    /**
     * A manual CRM listing as the MlsListing::toArray-shaped payload the shared
     * property-detail template renders (same screen as MLS/IDX listings).
     *
     * @return array<string, mixed>
     */
    public static function manualDetail(AgentWebsite $site, Listing $l): array
    {
        $photos = [];
        foreach ((array) $l->photos as $p) {
            $url = is_string($p) ? $p : (is_array($p) ? (string) ($p['url'] ?? $p['path'] ?? $p['src'] ?? '') : '');
            $url = trim($url);
            if ($url !== '') {
                $photos[] = Str::startsWith($url, ['http://', 'https://']) ? $url : Storage::disk('public')->url($url);
            }
        }
        $f = (array) ($l->features ?? []);

        return [
            'mls_id' => (string) $l->id,
            'mls_slug' => 'manual',
            // Exclusive / off-MLS listings have no MLS number — leave it blank
            // so the detail page hides the "MLS® #" line entirely (don't show a
            // placeholder like "OFF-MLS").
            'mls_number' => (string) ($l->mls_number ?? ''),
            'status' => self::statusLabel((string) $l->status),
            'property_type' => $f['property_subtype'] ?? ucwords(str_replace(['_', '-'], ' ', (string) $l->listing_type)),
            'price' => $l->price !== null ? (float) $l->price : null,
            'price_formatted' => $l->price !== null ? '$'.number_format((float) $l->price) : null,
            'original_price' => null,
            'sold_price' => $l->website_section === 'sold' && $l->price !== null ? (float) $l->price : null,
            'address' => [
                'full' => trim(implode(', ', array_filter([$l->address, $l->city, $l->state_province, $l->postal_code]))),
                'street' => $l->address,
                'city' => $l->city,
                'state_province' => $l->state_province,
                'zip' => $l->postal_code,
            ],
            'lat' => isset($f['lat']) ? (float) $f['lat'] : null,
            'lng' => isset($f['lng']) ? (float) $f['lng'] : null,
            'bedrooms' => $l->bedrooms,
            'bathrooms' => $l->bathrooms !== null ? (float) $l->bathrooms : null,
            'bathrooms_full' => $f['full_baths'] ?? null,
            'bathrooms_half' => $f['half_baths'] ?? null,
            'sqft' => $l->sqft,
            'lot_acres' => $l->lot_size !== null ? (float) $l->lot_size : null,
            'year_built' => $l->year_built,
            'stories' => $f['stories'] ?? null,
            'garage_spaces' => $f['garage_spaces'] ?? null,
            'description' => $l->description,
            'photos' => $photos,
            'virtual_tour_url' => $f['virtual_tour_url'] ?? null,
            // MLS-shaped detail fields — the shared property-detail template reads
            // these for the "About the Building" rows + mortgage/tax prefill, so a
            // manual listing surfaces the same data an MLS listing would.
            'subdivision' => $f['subdivision'] ?? null,
            'mls_area' => $f['mls_area'] ?? null,
            'hoa_fee' => $f['hoa_fee'] ?? null,
            'hoa_frequency' => $f['hoa_frequency'] ?? null,
            'hoa_name' => $f['hoa_name'] ?? null,
            'tax_amount' => isset($f['tax_annual_amount']) ? (float) $f['tax_annual_amount'] : null,
            'tax_year' => $f['tax_year'] ?? null,
            'furnished' => $f['furnished'] ?? null,
            'new_construction' => ! empty($f['new_construction']),
            'pool' => ! empty($f['pool']),
            'waterfront' => ! empty($f['waterfront']),
            'view' => array_values((array) ($f['view'] ?? [])),
            'appliances' => array_values((array) ($f['appliances'] ?? [])),
            'heating' => array_values((array) ($f['heating'] ?? [])),
            'cooling' => array_values((array) ($f['cooling'] ?? [])),
            'flooring' => array_values((array) ($f['flooring'] ?? [])),
            'exterior_features' => array_values((array) ($f['exterior_features'] ?? [])),
            'security_features' => array_values((array) ($f['security_features'] ?? [])),
            // The flat, deduped amenity list (chips + custom) the agent authored.
            'features' => array_values((array) ($f['amenities'] ?? [])),
            'list_date' => $l->listed_at?->toDateString(),
            'sold_date' => $l->sold_at?->toDateString(),
            'list_office_name' => $site->brokerage_name ?: $site->agent_name,
        ];
    }

    /** Base query for owner-flagged section listings. */
    private static function manualSectionQuery(AgentWebsite $site, string $section)
    {
        return Listing::query()
            ->where('website_section', $section)
            ->where('is_private', false)
            ->where(fn ($q) => $site->team_id
                ? $q->where('team_id', $site->team_id)
                : $q->where('user_id', $site->user_id));
    }

    /**
     * MLS listings for a section config: agent/office searches plus individual
     * MLS listing ids ("dataset:listingKey" or bare key, tried across datasets).
     *
     * @return array{listings: array<int, MlsListing>, compliance: ?string}
     */
    private static function mlsSectionListings(User $user, array $cfg, string $section, int $limit): array
    {
        $gateway = app(MlsGateway::class);
        $listings = [];
        $compliance = null;
        $seen = [];

        $agentIds = self::ids((string) ($cfg['agent_ids'] ?? ''));
        $officeIds = self::ids((string) ($cfg['office_ids'] ?? ''));

        if ($agentIds || $officeIds) {
            $query = ['per_page' => max($limit, 12), 'sort' => MlsQuery::SORT_MODIFIED_DESC];
            if ($agentIds) {
                $query['agent_ids'] = $agentIds;
            }
            if ($officeIds) {
                $query['office_ids'] = $officeIds;
            }
            if ($section === 'sold') {
                $query['statuses'] = ['Closed', 'Sold'];
            }
            $result = $gateway->search($user, MlsQuery::fromArray($query), []);
            foreach ($result->listings as $l) {
                $key = $l->mlsSlug.':'.$l->mlsId;
                if (! isset($seen[$key])) {
                    $seen[$key] = true;
                    $listings[] = $l;
                }
            }
            $compliance = self::complianceFromResult($result);
        }

        // Individual MLS listing ids (capped — each is a gateway lookup).
        foreach (array_slice(self::ids((string) ($cfg['mls_numbers'] ?? '')), 0, 12) as $entry) {
            if (count($listings) >= $limit) {
                break;
            }
            $found = str_contains($entry, ':')
                ? $gateway->get($user, ...array_pad(explode(':', $entry, 2), 2, ''))
                : self::findAcrossDatasets($gateway, $user, $entry);
            if ($found) {
                $key = $found->mlsSlug.':'.$found->mlsId;
                if (! isset($seen[$key])) {
                    $seen[$key] = true;
                    $listings[] = $found;
                }
            }
        }

        return ['listings' => array_slice($listings, 0, $limit), 'compliance' => $compliance];
    }

    /** Try a bare MLS listing id against each of the owner's datasets. */
    private static function findAcrossDatasets(MlsGateway $gateway, User $user, string $listingId): ?MlsListing
    {
        foreach ($gateway->listAvailableDatasets($user) as $dataset) {
            $slug = is_array($dataset) ? (string) ($dataset['slug'] ?? '') : (string) $dataset;
            if ($slug === '') {
                continue;
            }
            try {
                if ($found = $gateway->get($user, $slug, $listingId)) {
                    return $found;
                }
            } catch (\Throwable) {
                // Try the next dataset.
            }
        }

        return null;
    }

    /** A normalized MLS listing array → section card (with detail link). */
    private static function mlsCard(array $a, AgentWebsite $site, ?string $slug): array
    {
        $baths = $a['bathrooms'] ?? null;

        return [
            'image' => (string) ($a['photos'][0] ?? ''),
            'status' => (string) ($a['status'] ?? ''),
            'price' => (string) ($a['price_formatted'] ?? ''),
            'address' => (string) (data_get($a, 'address.full') ?? ''),
            'beds' => isset($a['bedrooms']) && $a['bedrooms'] !== null ? (string) $a['bedrooms'] : '',
            'baths' => $baths !== null ? rtrim(rtrim(number_format((float) $baths, 1), '0'), '.') : '',
            'sqft' => ! empty($a['sqft']) ? number_format((int) $a['sqft']) : '',
            'property_subtype' => (string) ($a['property_subtype'] ?? $a['property_type'] ?? ''),
            'link' => $slug ? route('agent-site.property', [$site->slug, $slug]) : '',
        ];
    }

    /** The user whose MLS connections power a site's searches (handles team sites). */
    private static function ownerUser(AgentWebsite $site): ?User
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

    /**
     * The user's property-type classes from the live taxonomy (1h-cached).
     *
     * @return string[]
     */
    private static function propertyClasses(User $user): array
    {
        return Cache::remember("fl:classes:{$user->id}", 3600, function () use ($user): array {
            try {
                return array_map(
                    static fn ($t) => $t->value,
                    app(MlsGateway::class)->taxonomy($user, [])->propertyTypes,
                );
            } catch (\Throwable) {
                return [];
            }
        });
    }

    /**
     * Non-lease classes — the default class set for community/area surfaces.
     *
     * @return string[]
     */
    private static function saleClasses(User $user): array
    {
        return array_values(array_filter(self::propertyClasses($user), fn ($c) => ! preg_match('/lease|rent/i', (string) $c)));
    }

    /**
     * Lease/rental classes — powers the secondary "Homes for Rent" grid.
     *
     * @return string[]
     */
    private static function leaseClasses(User $user): array
    {
        return array_values(array_filter(self::propertyClasses($user), fn ($c) => (bool) preg_match('/lease|rent/i', (string) $c)));
    }

    /**
     * The community's RENTAL listings — same location filters narrowed to the
     * lease classes. Empty result when the feeds have no lease classes.
     *
     * @param  array<string, mixed>  $criteria
     * @return array{listings: array<int, array<string, string>>, compliance: ?string, integrated: bool, total: int, page: int, per_page: int}
     */
    public static function resolveRentalsForArea(AgentWebsite $site, array $criteria, int $limit = 6): array
    {
        $blank = ['listings' => [], 'compliance' => null, 'integrated' => false, 'total' => 0, 'page' => 1, 'per_page' => $limit];

        $user = self::ownerUser($site);
        if (! $user) {
            return $blank;
        }

        $lease = self::leaseClasses($user);
        if ($lease === []) {
            return $blank;
        }

        $criteria['property_types'] = $lease;
        $criteria['limit'] = $limit;

        return self::resolveForArea($site, $criteria, 1);
    }

    /**
     * Keep only the MLS filter keys (which already match MlsQuery) and drop empties.
     *
     * @param  array<string, mixed>  $c
     * @return array<string, mixed>
     */
    private static function criteriaToQuery(array $c): array
    {
        $q = [];
        // No 'statuses': community pages always show active listings only (the
        // drivers default to Active when no status filter is sent). Older saved
        // criteria may still carry a statuses array — deliberately ignored.
        // 'lifestyles' carries the lifestyle-page keyword (condominium,
        // waterfront, …) CommunityLifestyles::criteriaFor() sets — without it
        // lifestyle sub-pages would show the whole community unfiltered.
        foreach (['cities', 'counties', 'zips', 'subdivisions', 'neighborhoods', 'property_types', 'lifestyles'] as $k) {
            if (! empty($c[$k]) && is_array($c[$k])) {
                $q[$k] = array_values($c[$k]);
            }
        }
        foreach (['min_price', 'max_price', 'min_beds', 'max_beds', 'min_baths', 'min_sqft', 'max_sqft', 'min_year_built', 'max_year_built'] as $k) {
            if (isset($c[$k]) && $c[$k] !== null && $c[$k] !== '') {
                $q[$k] = $c[$k];
            }
        }

        // Free-text query — the New Development pages send the building's
        // street address here (drivers match it against UnparsedAddress).
        if (! empty($c['query']) && is_string($c['query'])) {
            $q['query'] = $c['query'];
        }

        return $q;
    }

    /**
     * Map an aggregated MLS result into renderable property cards (image-only),
     * capped at $limit. Cards link to the site's public property detail page.
     *
     * @return array<int, array<string, string>>
     */
    private static function cardsFromResult(mixed $result, int $limit, ?AgentWebsite $site = null): array
    {
        // SEO detail-URL slugs for every linkable listing, resolved in one batch.
        $slugs = [];
        if ($site) {
            $slugItems = [];
            foreach ($result->listings as $l) {
                $a = $l->toArray();
                $slugItems[] = [
                    'mls_slug' => (string) ($a['mls_slug'] ?? ''),
                    'listing_id' => (string) ($a['mls_id'] ?? ''),
                    'address' => (string) (data_get($a, 'address.full') ?? ''),
                ];
            }
            $slugs = app(ListingSlugResolver::class)->slugsFor($site, $slugItems);
        }

        $cards = [];
        foreach ($result->listings as $listing) {
            $a = $listing->toArray();
            $img = (string) ($a['photos'][0] ?? '');
            if ($img === '') {
                continue; // only show listings with an image
            }
            $baths = $a['bathrooms'] ?? null;
            $slug = $slugs[(string) ($a['mls_slug'] ?? '').':'.(string) ($a['mls_id'] ?? '')] ?? null;
            $cards[] = [
                'image' => $img,
                'status' => (string) ($a['status'] ?? ''),
                'price' => (string) ($a['price_formatted'] ?? ''),
                'address' => (string) (data_get($a, 'address.full') ?? ''),
                'beds' => isset($a['bedrooms']) && $a['bedrooms'] !== null ? (string) $a['bedrooms'] : '',
                'baths' => $baths !== null ? rtrim(rtrim(number_format((float) $baths, 1), '0'), '.') : '',
                'sqft' => ! empty($a['sqft']) ? number_format((int) $a['sqft']) : '',
                'property_subtype' => (string) ($a['property_subtype'] ?? $a['property_type'] ?? ''),
                'mls_number' => (string) ($a['mls_number'] ?? ''),
                'link' => ($site && $slug) ? route('agent-site.property', [$site->slug, $slug]) : '',
            ];
            if (count($cards) >= $limit) {
                break;
            }
        }

        return $cards;
    }

    /** First non-empty compliance disclaimer/attribution — required wherever MLS data shows. */
    private static function complianceFromResult(mixed $result): ?string
    {
        foreach ($result->compliance as $block) {
            $c = trim((string) ($block['disclaimer'] ?? $block['attribution'] ?? ''));
            if ($c !== '') {
                return $c;
            }
        }

        return null;
    }

    /**
     * The agent's own listings from the CRM Properties tab (the `listings`
     * table), scoped to the site owner. Returns card rows or null.
     *
     * @return array<int, array<string, string>>|null
     */
    public static function resolveOwn(AgentWebsite $site, array $data): ?array
    {
        if (! $site->user_id) {
            return null;
        }
        try {
            $limit = max(1, min(36, (int) ($data['limit'] ?? $data['mls_limit'] ?? 12)));
            $query = Listing::query()->where('is_private', false);
            if ($site->team_id) {
                $query->where('team_id', $site->team_id);
            } else {
                $query->where('user_id', $site->user_id);
            }
            // Over-fetch generously, then keep only listings that have a usable image.
            $listings = $query
                ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
                ->orderByDesc('listed_at')
                ->orderByDesc('created_at')
                ->limit(max($limit * 8, 100))
                ->get();

            if ($listings->isEmpty()) {
                return null;
            }

            $cards = [];
            foreach ($listings as $l) {
                $img = self::firstPhotoUrl($l->photos);
                if ($img === '') {
                    continue; // only show listings with an image
                }
                $addr = trim(implode(', ', array_filter([$l->address, $l->city, $l->state_province])));
                $cards[] = [
                    'image' => $img,
                    'status' => self::statusLabel((string) $l->status),
                    'price' => $l->price ? '$'.number_format((float) $l->price) : '',
                    'address' => $addr,
                    'beds' => $l->bedrooms !== null ? (string) $l->bedrooms : '',
                    'baths' => $l->bathrooms !== null ? rtrim(rtrim((string) $l->bathrooms, '0'), '.') : '',
                    'sqft' => $l->sqft ? number_format((int) $l->sqft) : '',
                    'link' => '',
                ];
                if (count($cards) >= $limit) {
                    break;
                }
            }

            return $cards ?: null;
        } catch (\Throwable $e) {
            Log::warning('Featured Listings own resolve failed: '.$e->getMessage());

            return null;
        }
    }

    /** CRM listing status → display label. (Our own field, not MLS taxonomy.) */
    private static function statusLabel(string $status): string
    {
        return match (strtolower(trim($status))) {
            'active' => 'For Sale',
            'pending', 'under_contract', 'under contract' => 'Pending',
            'sold', 'closed' => 'Sold',
            'coming_soon', 'coming soon' => 'Coming Soon',
            '' => 'For Sale',
            default => ucwords(str_replace(['_', '-'], ' ', $status)),
        };
    }

    /** First usable photo URL from a listing's photos array (string or {url|path|src}). */
    private static function firstPhotoUrl(mixed $photos): string
    {
        foreach ((array) $photos as $p) {
            $val = is_string($p) ? $p : (is_array($p) ? (string) ($p['url'] ?? $p['path'] ?? $p['src'] ?? '') : '');
            $val = trim($val);
            if ($val === '') {
                continue;
            }

            return Str::startsWith($val, ['http://', 'https://']) ? $val : Storage::disk('public')->url($val);
        }

        return '';
    }

    /**
     * Map a saved hotsheet's stored filters (the snake_case shape /properties
     * persists) into an MlsQuery::fromArray() input. Polygon is converted from
     * Leaflet [lat,lng] to GeoJSON [lng,lat] under `geo`, exactly as
     * buildMlsSearchPayload does on the front end.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private static function hotsheetToQuery(array $filters): array
    {
        $q = $filters;

        $polygon = $q['polygon'] ?? null;
        unset($q['polygon']);
        if (is_array($polygon) && count($polygon) >= 3) {
            $q['geo'] = ['polygon' => array_values(array_map(
                static fn ($pt) => [$pt[1] ?? null, $pt[0] ?? null],
                $polygon
            ))];
        }

        // Hotsheets store free-text under `query`; MlsQuery reads `keyword`.
        if (! empty($q['query']) && empty($q['keyword'])) {
            $q['keyword'] = $q['query'];
        }

        return $q;
    }

    /** @return string[] */
    private static function ids(string $csv): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $csv))));
    }
}
