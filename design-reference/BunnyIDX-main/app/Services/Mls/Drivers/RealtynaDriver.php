<?php

declare(strict_types=1);

namespace App\Services\Mls\Drivers;

use App\Models\IdxConnection;
use App\Models\MlsProvider;
use App\Services\Idx\RealtynaApiClient;
use App\Services\Idx\RealtynaCredentials;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Dto\MlsCapabilities;
use App\Services\Mls\Dto\MlsQuery;

/**
 * Realtyna RESO driver. Common plumbing lives in AbstractMlsDriver — Realtyna's
 * twists are per-connection agent scoping (RESO `ListAgentMlsId` filter) and
 * per-connection account credentials, both supplied by the IdxConnection.
 */
final class RealtynaDriver extends AbstractMlsDriver
{
    public function __construct(
        private readonly RealtynaApiClient $client,
    ) {}

    public function getName(): string
    {
        return MlsProvider::SOURCE_REALTYNA;
    }

    public function capabilities(): MlsCapabilities
    {
        return new MlsCapabilities(
            supportsWebhooks: false,
            supportsAgentScoping: true,
            supportsOfficeScoping: true,
            supportsRawODataFilter: true,
        );
    }

    /** Realtyna exposes the RESO OpenHouse resource — fetch upcoming ones per key. */
    public function openHouses(MlsDataset $dataset, IdxConnection $connection, array $listingKeys): array
    {
        return $this->client->openHousesFor(
            $dataset->getDatasetPath(),
            $listingKeys,
            RealtynaCredentials::fromConnection($connection),
        );
    }

    protected function prepareFilters(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query): array
    {
        $filters = $query->toArray();
        if ($connection->agent_id && empty($filters['agent_id']) && empty($filters['agent_ids'])) {
            $filters['agent_id'] = $connection->agent_id;
        }
        if ($extras = $dataset->getExtraSelectFields()) {
            $filters['select_extras'] = $extras;
        }

        return $filters;
    }

    protected function callSearch(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query, array $filters): array
    {
        return $this->client->searchListings(
            $dataset->getDatasetPath($query->feed),
            $filters,
            RealtynaCredentials::fromConnection($connection),
        );
    }

    protected function callGet(MlsDataset $dataset, IdxConnection $connection, string $listingId): ?array
    {
        return $this->client->getListing(
            $dataset->getDatasetPath(),
            $listingId,
            RealtynaCredentials::fromConnection($connection),
        );
    }
}
