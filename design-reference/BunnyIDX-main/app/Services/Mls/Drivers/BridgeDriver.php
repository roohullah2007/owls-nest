<?php

declare(strict_types=1);

namespace App\Services\Mls\Drivers;

use App\Models\IdxConnection;
use App\Models\MlsProvider;
use App\Services\Idx\BridgeApiClient;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Dto\MlsCapabilities;
use App\Services\Mls\Dto\MlsQuery;

/**
 * Bridge OData driver. Common plumbing (feed check, normalize loop, error
 * handling, taxonomy) lives in AbstractMlsDriver — this class is only the
 * Bridge-specific bits: transport calls + the per-dataset `select_extras`
 * injection so MLS-specific fields like `SchoolDistrict` can be requested
 * without bloating the universal SELECT.
 */
final class BridgeDriver extends AbstractMlsDriver
{
    public function __construct(
        private readonly BridgeApiClient $client,
    ) {}

    public function getName(): string
    {
        return MlsProvider::SOURCE_BRIDGE;
    }

    public function capabilities(): MlsCapabilities
    {
        return new MlsCapabilities(
            supportsWebhooks: true,
            supportsAgentScoping: true,
            supportsOfficeScoping: true,
            supportsRawODataFilter: true,
        );
    }

    /** Bridge exposes the RESO OpenHouse resource — fetch upcoming ones per key. */
    public function openHouses(MlsDataset $dataset, IdxConnection $connection, array $listingKeys): array
    {
        return $this->client->openHousesFor($dataset->getDatasetPath(), $listingKeys);
    }

    protected function prepareFilters(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query): array
    {
        $filters = $query->toArray();
        $extras = $dataset->getExtraSelectFields();
        if (! empty($extras)) {
            $filters['select_extras'] = $extras;
        }

        return $filters;
    }

    protected function callSearch(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query, array $filters): array
    {
        return $this->client->searchListings($dataset->getDatasetPath($query->feed), $filters);
    }

    protected function callGet(MlsDataset $dataset, IdxConnection $connection, string $listingId): ?array
    {
        return $this->client->getListing($dataset->getDatasetPath(), $listingId);
    }
}
