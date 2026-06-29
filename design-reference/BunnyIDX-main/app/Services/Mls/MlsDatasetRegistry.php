<?php

declare(strict_types=1);

namespace App\Services\Mls;

use App\Models\IdxConnection;
use App\Services\Mls\Datasets\MlsDataset;

/**
 * Registry of MlsDataset instances, keyed by dataset slug (matches
 * IdxConnection.mls_slug). Service-provider populated at boot.
 *
 * Adding a new MLS = one register() call here + one MlsDataset subclass.
 * That is the ONLY code change required to onboard a new feed under an
 * existing provider — see feedback_mls_taxonomy rule #3.
 */
final class MlsDatasetRegistry
{
    /** @var array<string, MlsDataset> */
    private array $datasets = [];

    public function register(MlsDataset $dataset): void
    {
        $this->datasets[$dataset->getSlug()] = $dataset;
    }

    public function find(string $slug): ?MlsDataset
    {
        return $this->datasets[$slug] ?? null;
    }

    /** Resolve the dataset that powers a given IDX connection. */
    public function resolve(IdxConnection $connection): ?MlsDataset
    {
        return $this->find($connection->mls_slug ?? '');
    }

    /** @return MlsDataset[] */
    public function all(): array
    {
        return array_values($this->datasets);
    }

    /**
     * Datasets grouped by driver name — handy for the gateway when fanning out
     * a search across the user's connected MLSes.
     *
     * @return array<string, MlsDataset[]>
     */
    public function byDriver(): array
    {
        $out = [];
        foreach ($this->datasets as $d) {
            $out[$d->getDriver()][] = $d;
        }
        return $out;
    }
}
