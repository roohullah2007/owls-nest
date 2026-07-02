<?php

declare(strict_types=1);

namespace App\Services\Mls\Drivers;

use App\Models\IdxConnection;
use App\Models\MlsProvider;
use App\Services\Idx\ParagonApiClient;
use App\Services\Idx\ParagonCredentials;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Datasets\Paragon\ParagonDataset;
use App\Services\Mls\Dto\MlsCapabilities;
use App\Services\Mls\Dto\MlsQuery;
use RuntimeException;

/**
 * Paragon (paragonrels.com) RESO driver. Common plumbing lives in
 * AbstractMlsDriver — Paragon's twists are per-connection OAuth credentials and
 * a per-MLS service-root base URL (each Paragon MLS is its own subdomain),
 * supplied by the dataset. Optional per-connection agent scoping is applied via
 * the RESO `ListAgentMlsId` filter, same as Realtyna.
 */
final class ParagonDriver extends AbstractMlsDriver
{
    public function __construct(
        private readonly ParagonApiClient $client,
    ) {}

    public function getName(): string
    {
        return MlsProvider::SOURCE_PARAGON;
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

    protected function prepareFilters(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query): array
    {
        $filters = $query->toArray();
        if ($connection->agent_id && empty($filters['agent_id']) && empty($filters['agent_ids'])) {
            $filters['agent_id'] = $connection->agent_id;
        }
        if ($extras = $dataset->getExtraSelectFields()) {
            $filters['select_extras'] = $extras;
        }

        // Translate the canonical `sort` token into the sort_by/sort_dir pair the
        // Paragon client turns into $orderby — otherwise sorting is dropped at the
        // API layer and only the current page is (locally) re-ordered.
        if (! empty($filters['sort']) && empty($filters['sort_by'])) {
            [$by, $dir] = match ((string) $filters['sort']) {
                MlsQuery::SORT_PRICE_ASC => ['price', 'asc'],
                MlsQuery::SORT_PRICE_DESC => ['price', 'desc'],
                MlsQuery::SORT_BEDS_DESC => ['beds', 'desc'],
                MlsQuery::SORT_SQFT_DESC => ['sqft', 'desc'],
                default => ['date', 'desc'],
            };
            $filters['sort_by'] = $by;
            $filters['sort_dir'] = $dir;
        }

        return $filters;
    }

    protected function callSearch(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query, array $filters): array
    {
        return $this->client->searchListings(
            $this->credentials($dataset, $connection),
            $dataset->getDatasetPath($query->feed),
            $filters,
        );
    }

    protected function callGet(MlsDataset $dataset, IdxConnection $connection, string $listingId): ?array
    {
        return $this->client->getListing(
            $this->credentials($dataset, $connection),
            $dataset->getDatasetPath(),
            $listingId,
        );
    }

    /** Per-connection credentials + the dataset's per-MLS service-root base URL. */
    private function credentials(MlsDataset $dataset, IdxConnection $connection): ParagonCredentials
    {
        if (! $dataset instanceof ParagonDataset) {
            throw new RuntimeException('ParagonDriver requires a ParagonDataset, got '.$dataset::class);
        }

        return ParagonCredentials::fromConnection($connection, $dataset->getBaseUrl());
    }
}
