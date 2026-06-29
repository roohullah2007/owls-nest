<?php

declare(strict_types=1);

namespace App\Services\Mls\Drivers;

use App\Models\IdxConnection;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\Dto\MlsSearchResult;
use App\Services\Mls\Dto\MlsTaxonomy;
use DateTimeImmutable;

/**
 * Shared driver scaffolding: feed enforcement, error short-circuit, per-listing
 * normalization, search-result wrapping, default taxonomy surfacing.
 *
 * Concrete drivers implement two transport methods (`callSearch`, `callGet`)
 * and optionally override `prepareFilters` to inject provider-specific filter
 * defaults (Realtyna's per-agent scoping, Bridge's per-dataset `select_extras`).
 *
 * No driver should hand-roll the search/get/taxonomy plumbing — those flows
 * live here so behaviour stays uniform across providers.
 */
abstract class AbstractMlsDriver implements MlsDriver
{
    final public function search(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query): MlsSearchResult
    {
        if (! $dataset->supportsFeed($query->feed)) {
            return MlsSearchResult::empty("Dataset [{$dataset->getSlug()}] does not support [{$query->feed->value}] feed.");
        }

        $filters = $this->prepareFilters($dataset, $connection, $query);
        $raw = $this->callSearch($dataset, $connection, $query, $filters);

        if (! empty($raw['error'])) {
            return MlsSearchResult::empty((string) $raw['error']);
        }

        $listings = array_map(
            static fn (array $item) => $dataset->normalize($item, $query->feed),
            $raw['listings'] ?? [],
        );

        return new MlsSearchResult(
            listings: $listings,
            total: (int) ($raw['total'] ?? count($listings)),
            fetchedAt: new DateTimeImmutable,
        );
    }

    final public function get(MlsDataset $dataset, IdxConnection $connection, string $listingId): ?MlsListing
    {
        $raw = $this->callGet($dataset, $connection, $listingId);

        return $raw ? $dataset->normalize($raw) : null;
    }

    /**
     * Default: surface what the dataset hardcodes. Phase 3 enriches with
     * persisted discoveries from `mls_taxonomies`.
     *
     * Final because taxonomy is a dataset concern — drivers must never override
     * it. If a per-MLS taxonomy quirk emerges, override the relevant
     * `getPropertyTypes()` / `getStatuses()` etc. on the dataset.
     */
    final public function discoverTaxonomy(MlsDataset $dataset, IdxConnection $connection): MlsTaxonomy
    {
        return new MlsTaxonomy(
            propertyTypes: $dataset->getPropertyTypes(),
            propertySubtypes: $dataset->getPropertySubtypes(),
            statuses: $dataset->getStatuses(),
            customFields: $dataset->getCustomFields(),
            cities: $dataset->getCities(),
            counties: $dataset->getCounties(),
            neighborhoods: $dataset->getNeighborhoods(),
            subdivisions: $dataset->getSubdivisions(),
            zipCodes: $dataset->getZipCodes(),
            supportedFilters: $dataset->getSupportedFilters(),
        );
    }

    /**
     * Hook for provider-specific filter mutation. Default: forward MlsQuery
     * unchanged. Override to inject connection-scoped defaults (Realtyna's
     * agent_id) or per-dataset add-ons (Bridge's select_extras).
     */
    protected function prepareFilters(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query): array
    {
        return $query->toArray();
    }

    /** @return array{listings: array<int,array>, total?: int, error?: string} */
    /** Default: no open-house data (drivers with an OpenHouse resource override). */
    public function openHouses(MlsDataset $dataset, IdxConnection $connection, array $listingKeys): array
    {
        return [];
    }

    abstract protected function callSearch(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query, array $filters): array;

    abstract protected function callGet(MlsDataset $dataset, IdxConnection $connection, string $listingId): ?array;
}
