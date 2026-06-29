<?php

declare(strict_types=1);

namespace App\Services\Mls\Drivers;

use App\Models\IdxConnection;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Dto\MlsCapabilities;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\Dto\MlsSearchResult;
use App\Services\Mls\Dto\MlsTaxonomy;

/**
 * One MlsDriver per provider (Bridge, Realtyna, Repliers). Drivers know
 * transport (HTTP/auth/pagination); they do NOT know per-MLS quirks — those
 * live on the MlsDataset they're handed.
 *
 * Adding a new provider = one new class implementing this interface. Adding a
 * new MLS within an existing provider does NOT touch a driver — see
 * feedback_mls_taxonomy rules #1–#3.
 */
interface MlsDriver
{
    /** Driver key, matches MlsProvider::SOURCE_* and MlsDataset::getDriver(). */
    public function getName(): string;

    public function search(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query): MlsSearchResult;

    public function get(MlsDataset $dataset, IdxConnection $connection, string $listingId): ?MlsListing;

    /**
     * Upcoming open houses for a set of listing keys —
     * [listingKey => [{start, end, remarks}], …]. Drivers without an
     * OpenHouse resource return [].
     *
     * @param  string[]  $listingKeys
     * @return array<string, array<int, array{start: string, end: ?string, remarks: ?string}>>
     */
    public function openHouses(MlsDataset $dataset, IdxConnection $connection, array $listingKeys): array;

    /**
     * Surface the taxonomy for this dataset+connection. Default implementations
     * may return what the dataset class hardcodes; Phase 3 will enrich with
     * persisted taxonomies discovered from real results.
     */
    public function discoverTaxonomy(MlsDataset $dataset, IdxConnection $connection): MlsTaxonomy;

    public function capabilities(): MlsCapabilities;
}
