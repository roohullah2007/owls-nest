<?php

declare(strict_types=1);

namespace App\Services\Idx;

use App\Models\IdxConnection;
use App\Models\Listing;
use App\Models\MlsProvider;
use App\Models\User;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsDatasetRegistry;
use App\Services\Mls\MlsDriverManager;

class IdxSearchService
{
    public function __construct(
        private readonly BridgeApiClient $bridgeClient,
        private readonly RepliersApiClient $repliersClient,
        private readonly RealtynaApiClient $realtynaClient,
        private readonly ConstraintService $constraintService,
        private readonly MlsDatasetRegistry $datasetRegistry,
        private readonly MlsDriverManager $driverManager,
    ) {}

    /**
     * For Realtyna we need the MlsProvider to know which OriginatingSystemName
     * to filter by (stored in data_source_config). Helper extracts it safely.
     */
    private function realtynaOsName(IdxConnection $connection): ?string
    {
        $config = $connection->mlsProvider?->data_source_config ?? [];

        return $config['originating_system_name'] ?? null;
    }

    /**
     * Search listings through an MLS connection.
     * Automatically applies connection constraints before querying.
     *
     * Dispatch order:
     *   1. If a concrete MlsDataset is registered for this connection, use the
     *      new MlsDriver path (typed DTOs, per-MLS class).
     *   2. Otherwise fall back to the legacy match — keeps unregistered MLSes
     *      working until each gets its own dataset subclass.
     */
    public function search(IdxConnection $connection, array $filters = [], bool $applyConstraints = true): array
    {
        if ($applyConstraints) {
            $filters = $this->constraintService->apply($filters, $connection);
        }

        $dataset = $this->datasetRegistry->resolve($connection);
        if ($dataset && ($driver = $this->driverManager->driver($dataset->getDriver()))) {
            return $driver->search($dataset, $connection, MlsQuery::fromArray($filters))->toArray();
        }

        return $this->legacySearch($connection, $filters);
    }

    /**
     * Get a single listing by ID from an MLS connection.
     */
    public function getListing(IdxConnection $connection, string $listingId): ?array
    {
        $dataset = $this->datasetRegistry->resolve($connection);
        if ($dataset && ($driver = $this->driverManager->driver($dataset->getDriver()))) {
            return $driver->get($dataset, $connection, $listingId)?->toArray();
        }

        return $this->legacyGetListing($connection, $listingId);
    }

    /** Legacy match-based dispatch — kept as fallback until every MLS has a dataset class. */
    private function legacySearch(IdxConnection $connection, array $filters): array
    {
        return match ($this->resolveDataSource($connection)) {
            MlsProvider::SOURCE_BRIDGE => $this->bridgeClient->searchListings($connection->mls_slug, $filters),
            MlsProvider::SOURCE_REPLIERS => $this->repliersClient->searchListings($connection->api_key, $filters),
            MlsProvider::SOURCE_REALTYNA => $this->realtynaOsName($connection)
                ? $this->realtynaClient->searchListings($this->realtynaOsName($connection), array_merge(
                    $filters,
                    $connection->agent_id ? ['agent_id' => $connection->agent_id] : [],
                ), RealtynaCredentials::fromConnection($connection))
                : ['listings' => [], 'total' => 0],
            default => ['listings' => [], 'total' => 0],
        };
    }

    private function legacyGetListing(IdxConnection $connection, string $listingId): ?array
    {
        return match ($this->resolveDataSource($connection)) {
            MlsProvider::SOURCE_BRIDGE => $this->bridgeClient->getListing($connection->mls_slug, $listingId),
            MlsProvider::SOURCE_REPLIERS => $this->repliersClient->getListing($connection->api_key, $listingId),
            MlsProvider::SOURCE_REALTYNA => $this->realtynaOsName($connection)
                ? $this->realtynaClient->getListing($this->realtynaOsName($connection), $listingId, RealtynaCredentials::fromConnection($connection))
                : null,
            default => null,
        };
    }

    /**
     * Resolve which data backend powers a connection.
     * Prefers the admin-managed MlsProvider.data_source; falls back to the
     * legacy IdxConnection.provider column for any pre-Phase 3 rows.
     */
    private function resolveDataSource(IdxConnection $connection): string
    {
        if ($connection->mls_provider_id) {
            return $connection->mlsProvider?->data_source ?? $connection->provider ?? '';
        }

        return $connection->provider ?? '';
    }

    /**
     * Find the first active MLS connection for a user (handles team ownership).
     */
    public function getConnectionForUser(User $user): ?IdxConnection
    {
        return IdxConnection::forUser($user)->connected()->first();
    }

    /**
     * Import a normalized MLS listing into the CRM Listings table.
     */
    public function importListing(User $user, IdxConnection $connection, array $normalized): Listing
    {
        $address = $normalized['address'] ?? [];

        // Check if already imported (dedup by mls_listing_id + mls_slug)
        $existing = $user->listings()
            ->where('mls_listing_id', $normalized['mls_id'])
            ->where('mls_slug', $normalized['mls_slug'])
            ->first();

        $data = [
            'user_id' => $user->id,
            'idx_connection_id' => $connection->id,
            'mls_listing_id' => $normalized['mls_id'],
            'mls_slug' => $normalized['mls_slug'],
            'mls_number' => $normalized['mls_number'],
            'title' => $address['full'] ?: ($normalized['mls_number'] ?? 'Imported Listing'),
            'listing_type' => $this->mapPropertyType($normalized['property_type']),
            'status' => $this->mapStatus($normalized['status']),
            'address' => $address['street'],
            'city' => $address['city'],
            'state_province' => $address['state_province'],
            'postal_code' => $address['postal_code'],
            'country' => $address['country'] ?? 'US',
            'price' => $normalized['price'],
            'bedrooms' => $normalized['bedrooms'],
            'bathrooms' => $normalized['bathrooms'],
            'sqft' => $normalized['sqft'],
            'year_built' => $normalized['year_built'],
            'description' => $normalized['description'],
            'features' => is_array($normalized['features']) && ! empty($normalized['features']) ? $normalized['features'] : null,
            'photos' => ! empty($normalized['photos']) ? $normalized['photos'] : null,
            'listed_at' => $normalized['list_date'],
            'sold_at' => $normalized['sold_date'],
            'synced_at' => now(),
            'sync_status' => 'synced',
        ];

        if ($existing) {
            $existing->update($data);

            return $existing->fresh();
        }

        return Listing::create($data);
    }

    /**
     * Re-sync an existing imported listing from MLS.
     */
    public function resyncListing(Listing $listing): bool
    {
        $connection = $listing->idxConnection;
        if (! $connection || ! $listing->mls_listing_id) {
            return false;
        }

        $normalized = $this->getListing($connection, $listing->mls_listing_id);
        if (! $normalized) {
            $listing->update(['sync_status' => 'stale']);

            return false;
        }

        $this->importListing($listing->user, $connection, $normalized);

        return true;
    }

    private function mapPropertyType(?string $type): string
    {
        if (! $type) {
            return 'residential';
        }

        $lower = strtolower($type);

        return match (true) {
            str_contains($lower, 'commercial') => 'commercial',
            str_contains($lower, 'land') || str_contains($lower, 'lot') => 'land',
            str_contains($lower, 'rent') || str_contains($lower, 'lease') => 'rental',
            default => 'residential',
        };
    }

    private function mapStatus(?string $status): string
    {
        if (! $status) {
            return 'active';
        }

        $lower = strtolower($status);

        return match (true) {
            str_contains($lower, 'active') => 'active',
            str_contains($lower, 'pending') => 'pending',
            str_contains($lower, 'sold') || str_contains($lower, 'closed') => 'sold',
            str_contains($lower, 'expired') => 'expired',
            str_contains($lower, 'withdrawn') || str_contains($lower, 'cancel') => 'withdrawn',
            default => 'active',
        };
    }
}
