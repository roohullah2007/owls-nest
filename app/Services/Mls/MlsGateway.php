<?php

declare(strict_types=1);

namespace App\Services\Mls;

use App\Models\IdxConnection;
use App\Models\User;
use App\Services\Idx\ConstraintService;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Dto\AggregatedSearchResult;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\Dto\MlsTaxonomy;
use DateTimeImmutable;
use Illuminate\Support\Facades\Log;

/**
 * Canonical entry point for any caller that wants MLS data.
 *
 * Replaces the three pre-existing paths (CRM controller → IdxSearchService,
 * MlsDataController → IdxConnection-scoped search, MlsRelayController → WP
 * relay) with one aggregator that:
 *
 *  - Resolves which datasets to search (explicit slugs, or fan-out across
 *    every active IdxConnection the user has).
 *  - Calls each dataset's driver, normalizes via the dataset's per-MLS
 *    normalize() so subtypes / custom fields / DOM compute survive.
 *  - Tags each listing with mls_slug and merges them.
 *  - Surfaces per-MLS totals + per-MLS errors — one bad MLS does not blank
 *    the response.
 *  - Applies the user's per-connection constraints before dispatch.
 *
 * Phase 2 limitation: fan-out is sequential. Latency = sum across MLSes.
 * Replace with Http::pool() once the per-driver clients are restructured to
 * cooperate (Phase 5 work).
 */
final class MlsGateway
{
    public function __construct(
        private readonly MlsDatasetRegistry $datasets,
        private readonly MlsDriverManager $drivers,
        private readonly ConstraintService $constraints,
    ) {}

    /**
     * Search across one or many MLSes for a user.
     *
     * @param  string[]  $datasetSlugs  Empty = fan-out across every connected dataset
     *                                  the user has. Non-empty = restrict to those slugs
     *                                  (still subject to the user owning a connection
     *                                  for each).
     */
    public function search(User $user, MlsQuery $query, array $datasetSlugs = []): AggregatedSearchResult
    {
        $targets = $this->resolveTargets($user, $datasetSlugs);
        if (empty($targets)) {
            return AggregatedSearchResult::empty('No connected MLS datasets resolved for this user.');
        }

        $merged = [];
        $perMlsTotal = [];
        $errors = [];
        $compliance = [];

        foreach ($targets as $slug => [$connection, $dataset]) {
            // Compliance is required on every contributing MLS — fetched up
            // front so even errored MLSes return a disclaimer for any cached
            // partial results the caller may surface.
            $compliance[$slug] = $this->complianceFor($connection, $dataset);

            $driver = $this->drivers->driver($dataset->getDriver());
            if (! $driver) {
                $errors[$slug] = "No driver registered for [{$dataset->getDriver()}].";

                continue;
            }

            try {
                $constrained = $this->constraints->apply($query->toArray(), $connection);
                $perTargetQuery = MlsQuery::fromArray($constrained);

                // Apply lifestyle translation per-dataset. A lifestyle the
                // dataset can't answer becomes a per-MLS error — other MLSes
                // still answer (the gateway never silently downgrades to
                // "everything").
                if (! empty($perTargetQuery->lifestyles)) {
                    [$translated, $lifestyleErr] = $this->applyLifestyles($dataset, $perTargetQuery);
                    if ($lifestyleErr !== null) {
                        $errors[$slug] = $lifestyleErr;

                        continue;
                    }
                    $perTargetQuery = $translated;
                }

                $result = $driver->search($dataset, $connection, $perTargetQuery);

                if ($result->error !== null) {
                    $errors[$slug] = $result->error;

                    continue;
                }

                foreach ($result->listings as $listing) {
                    $merged[] = $listing;
                }
                $perMlsTotal[$slug] = $result->total;
            } catch (\Throwable $e) {
                Log::warning('MlsGateway.search: per-MLS failure', [
                    'mls_slug' => $slug,
                    'message' => $e->getMessage(),
                ]);
                $errors[$slug] = $e->getMessage();
            }
        }

        // Dedup on (mls_slug, mls_id). Different MLSes can carry the same listing
        // (cross-MLS data sharing); keep the first seen.
        $seen = [];
        $deduped = [];
        foreach ($merged as $l) {
            $key = $l->mlsSlug.'|'.$l->mlsId;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $deduped[] = $l;
        }

        // Merge-sort across MLSes — uses the same sort dimension the query
        // requested (each MLS already returned its slice sorted, so this just
        // interleaves the streams correctly).
        usort($deduped, $this->comparatorForSort($query->sort));

        // projection=count → return totals only, no listing payload.
        if ($query->projection === MlsQuery::PROJECTION_COUNT) {
            $deduped = [];
        }

        return new AggregatedSearchResult(
            listings: $deduped,
            total: array_sum($perMlsTotal),
            perMlsTotal: $perMlsTotal,
            errors: $errors,
            compliance: $compliance,
            fetchedAt: new DateTimeImmutable,
        );
    }

    /** Comparator matching the sort dimension chosen on MlsQuery. */
    private function comparatorForSort(string $sort): callable
    {
        return match ($sort) {
            MlsQuery::SORT_NEWEST => static fn (MlsListing $a, MlsListing $b) => strcmp((string) $b->listDate, (string) $a->listDate),
            MlsQuery::SORT_PRICE_ASC => static fn (MlsListing $a, MlsListing $b) => ($a->price ?? PHP_INT_MAX) <=> ($b->price ?? PHP_INT_MAX),
            MlsQuery::SORT_PRICE_DESC => static fn (MlsListing $a, MlsListing $b) => ($b->price ?? -1) <=> ($a->price ?? -1),
            MlsQuery::SORT_BEDS_DESC => static fn (MlsListing $a, MlsListing $b) => ($b->bedrooms ?? -1) <=> ($a->bedrooms ?? -1),
            MlsQuery::SORT_SQFT_DESC => static fn (MlsListing $a, MlsListing $b) => ($b->sqft ?? -1) <=> ($a->sqft ?? -1),
            MlsQuery::SORT_DOM_ASC => static fn (MlsListing $a, MlsListing $b) => ($a->daysOnMarket ?? PHP_INT_MAX) <=> ($b->daysOnMarket ?? PHP_INT_MAX),
            MlsQuery::SORT_DOM_DESC => static fn (MlsListing $a, MlsListing $b) => ($b->daysOnMarket ?? -1) <=> ($a->daysOnMarket ?? -1),
            default => static fn (MlsListing $a, MlsListing $b) => strcmp((string) $b->modificationTs, (string) $a->modificationTs),
        };
    }

    /**
     * Walk `query.lifestyles[]`, ask the dataset to translate each one, fold
     * the overlays into the query. Returns [translatedQuery, errorOrNull].
     *
     * @return array{0: MlsQuery, 1: ?string}
     */
    private function applyLifestyles(MlsDataset $dataset, MlsQuery $query): array
    {
        $current = $query;
        foreach ($query->lifestyles as $lifestyle) {
            $overlay = $dataset->translateLifestyle($lifestyle);
            if ($overlay === null) {
                return [$query, "Lifestyle [{$lifestyle}] not supported by [{$dataset->getSlug()}]."];
            }
            $current = $current->withLifestyleTranslation($overlay);
        }

        return [$current, null];
    }

    /**
     * Compliance block for one connection — provider-supplied if linked,
     * fallback otherwise. The dataset class's code-defined branding logo fills
     * in whenever no admin-uploaded logo exists (so every MLS ships with its
     * mark out of the box).
     */
    private function complianceFor(IdxConnection $connection, ?MlsDataset $dataset = null): array
    {
        $provider = $connection->mlsProvider;

        $block = $provider ? $provider->complianceBlock() : [
            'mls_name' => $connection->display_name ?? $connection->mls_slug,
            'mls_logo_url' => null,
            'compliance_logo_url' => null,
            'disclaimer' => null,
            'attribution_template' => null,
            'terms_url' => null,
            'rules' => [
                'show_updated_at' => false,
                'link_back_required' => false,
                'fair_housing_required' => false,
                'refresh_minutes' => 60,
            ],
        ];

        $codeLogo = $dataset?->getBrandingLogoUrl();
        if ($codeLogo) {
            $block['mls_logo_url'] = $block['mls_logo_url'] ?: $codeLogo;
            $block['compliance_logo_url'] = $block['compliance_logo_url'] ?: $codeLogo;
        }

        return $block;
    }

    /**
     * Compliance block for a single dataset — courtesy/attribution + MLS logo
     * for listing-detail pages and anywhere a single MLS's data is shown.
     */
    public function complianceForSlug(User $user, string $mlsSlug): ?array
    {
        $targets = $this->resolveTargets($user, [$mlsSlug]);
        if (empty($targets)) {
            return null;
        }
        [$connection, $dataset] = $targets[$mlsSlug];

        return $this->complianceFor($connection, $dataset);
    }

    /** Get a single listing across datasets — searches by mls_slug + mls_id. */
    public function get(User $user, string $mlsSlug, string $listingId): ?MlsListing
    {
        $targets = $this->resolveTargets($user, [$mlsSlug]);
        if (empty($targets)) {
            return null;
        }
        [$connection, $dataset] = $targets[$mlsSlug];
        $driver = $this->drivers->driver($dataset->getDriver());
        if (! $driver) {
            return null;
        }

        return $driver->get($dataset, $connection, $listingId);
    }

    /**
     * Upcoming open houses for listings on one dataset —
     * [listingKey => [{start, end, remarks}], …]. Best-effort: unsupported
     * drivers / failures return [].
     *
     * @param  string[]  $listingKeys
     * @return array<string, array<int, array{start: string, end: ?string, remarks: ?string}>>
     */
    public function openHousesFor(User $user, string $mlsSlug, array $listingKeys): array
    {
        if ($listingKeys === []) {
            return [];
        }

        $targets = $this->resolveTargets($user, [$mlsSlug]);
        if (empty($targets)) {
            return [];
        }
        [$connection, $dataset] = $targets[$mlsSlug];
        $driver = $this->drivers->driver($dataset->getDriver());
        if (! $driver) {
            return [];
        }

        try {
            return $driver->openHouses($dataset, $connection, $listingKeys);
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Get taxonomy (property types / subtypes / statuses / custom fields) for
     * one or more datasets. Multi-slug = union (deduped).
     *
     * @param  string[]  $datasetSlugs
     */
    public function taxonomy(User $user, array $datasetSlugs): MlsTaxonomy
    {
        $targets = $this->resolveTargets($user, $datasetSlugs);
        if (empty($targets)) {
            return new MlsTaxonomy;
        }

        $types = [];
        $subtypes = [];
        $statuses = [];
        $customFields = [];
        $cities = [];
        $counties = [];
        $neighborhoods = [];
        $subdivisions = [];
        $zipCodes = [];
        $supportedFilters = [];
        $seen = [];

        $push = static function (string $kind, array $terms) use (&$seen) {
            $out = [];
            foreach ($terms as $t) {
                $key = $kind.'|'.$t->value;
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $out[] = $t;
            }

            return $out;
        };

        foreach ($targets as [$connection, $dataset]) {
            $driver = $this->drivers->driver($dataset->getDriver());
            if (! $driver) {
                continue;
            }
            $tax = $driver->discoverTaxonomy($dataset, $connection);
            $types = array_merge($types, $push('type', $tax->propertyTypes));
            $subtypes = array_merge($subtypes, $push('subtype', $tax->propertySubtypes));
            $statuses = array_merge($statuses, $push('status', $tax->statuses));
            $customFields = array_merge($customFields, $tax->customFields);
            $cities = array_merge($cities, $tax->cities);
            $counties = array_merge($counties, $tax->counties);
            $subdivisions = array_merge($subdivisions, $tax->subdivisions);
            $zipCodes = array_merge($zipCodes, $tax->zipCodes);
            // Supported filters: union across targets — a filter usable by ANY
            // selected MLS stays available in the UI.
            $supportedFilters = array_merge($supportedFilters, $tax->supportedFilters);
            // Neighborhoods are area-keyed; merge per-key and dedupe values.
            foreach ($tax->neighborhoods as $area => $hoods) {
                $existing = $neighborhoods[$area] ?? [];
                $neighborhoods[$area] = array_values(array_unique(array_merge($existing, $hoods)));
            }
        }

        return new MlsTaxonomy(
            propertyTypes: $types,
            propertySubtypes: $subtypes,
            statuses: $statuses,
            customFields: $customFields,
            cities: array_values(array_unique($cities)),
            counties: array_values(array_unique($counties)),
            neighborhoods: $neighborhoods,
            subdivisions: array_values(array_unique($subdivisions)),
            zipCodes: array_values(array_unique($zipCodes)),
            supportedFilters: array_values(array_unique($supportedFilters)),
        );
    }

    /**
     * List the datasets a user can actually query — every active IdxConnection
     * they own where we have a registered MlsDataset. Powers the dataset
     * picker UI and the `GET /api/v1/mls/datasets` endpoint.
     *
     * @return array<int, array{slug:string, display_name:string, driver:string,
     *                          supported_feeds:string[], connection_id:int}>
     */
    public function listAvailableDatasets(User $user): array
    {
        $out = [];
        foreach ($this->userConnections($user) as $conn) {
            $dataset = $this->datasets->resolve($conn);
            if (! $dataset) {
                continue;
            }
            $driver = $this->drivers->driver($dataset->getDriver());
            $caps = $driver?->capabilities();
            $out[] = [
                'slug' => $dataset->getSlug(),
                'display_name' => $dataset->getDisplayName(),
                'driver' => $dataset->getDriver(),
                'supported_feeds' => array_map(static fn ($f) => $f->value, $dataset->supportedFeeds()),
                'supported_lifestyles' => $dataset->getSupportedLifestyles(),
                'capabilities' => $caps ? [
                    'supports_webhooks' => $caps->supportsWebhooks,
                    'supports_vow' => $caps->supportsVow,
                    'supports_agent_scoping' => $caps->supportsAgentScoping,
                    'supports_office_scoping' => $caps->supportsOfficeScoping,
                    'supports_raw_odata_filter' => $caps->supportsRawODataFilter,
                ] : null,
                'connection_id' => $conn->id,
            ];
        }

        return $out;
    }

    /**
     * Resolve {slug → [connection, dataset]} for a user, optionally restricted
     * to a specific list of slugs. A slug requested that the user has no
     * connection for is silently skipped (rather than 403'd) so multi-tenant
     * fan-out behaves sanely when one user is missing a feed others have.
     *
     * @param  string[]  $datasetSlugs
     * @return array<string, array{0: IdxConnection, 1: MlsDataset}>
     */
    private function resolveTargets(User $user, array $datasetSlugs): array
    {
        $connections = $this->userConnections($user);
        $bySlug = [];
        foreach ($connections as $conn) {
            $dataset = $this->datasets->resolve($conn);
            if ($dataset) {
                $bySlug[$dataset->getSlug()] = [$conn, $dataset];
            }
        }
        if (empty($datasetSlugs)) {
            return $bySlug;
        }

        return array_intersect_key($bySlug, array_flip($datasetSlugs));
    }

    /** @return iterable<IdxConnection> */
    private function userConnections(User $user): iterable
    {
        return IdxConnection::forUser($user)->connected()->get();
    }
}
