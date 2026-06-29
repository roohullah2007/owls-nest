<?php

declare(strict_types=1);

namespace App\Services\Mls;

use App\Models\IdxConnection;
use App\Models\MlsProvider;
use App\Services\Idx\IdxSearchService;

/**
 * Canonical entry point for ALL MLS data consumption.
 *
 * Every consumer — CRM IDX page, widgets, agent websites, WordPress relay —
 * goes through this service. Routing to the underlying provider (Bridge /
 * Realtyna / Repliers) happens here so the contract above stays stable.
 *
 * Every response includes a `compliance` block alongside the listings. Consumers
 * are expected to render the compliance block (disclaimer, attribution, logo)
 * — see `<MlsCompliance />` for the canonical UI.
 */
class MlsDataService
{
    public function __construct(
        private readonly IdxSearchService $idxSearchService,
    ) {}

    /**
     * Search listings via a user's IDX connection. Returns the unified shape.
     *
     * Shape:
     *   {
     *     listings: array,
     *     total: int,
     *     compliance: {
     *       mls_name, mls_logo_url, compliance_logo_url, disclaimer,
     *       attribution_template, terms_url, rules: {...}
     *     },
     *     fetched_at: ISO8601 timestamp,
     *   }
     */
    public function search(IdxConnection $connection, array $filters = [], bool $applyConstraints = true): array
    {
        $result = $this->idxSearchService->search($connection, $filters, $applyConstraints);

        return $this->wrap($connection, $result['listings'] ?? [], $result['total'] ?? 0);
    }

    /**
     * Fetch a single listing by ID. Same wrapped shape (with a single-item listings array).
     */
    public function getListing(IdxConnection $connection, string $listingId): array
    {
        $listing = $this->idxSearchService->getListing($connection, $listingId);

        return $this->wrap($connection, $listing ? [$listing] : [], $listing ? 1 : 0);
    }

    /**
     * Standalone compliance fetch — for renderers that want the metadata
     * without running a full search (e.g. a website footer).
     */
    public function compliance(MlsProvider $provider): array
    {
        return [
            'compliance' => $provider->complianceBlock(),
            'fetched_at' => now()->toISOString(),
        ];
    }

    private function wrap(IdxConnection $connection, array $listings, int $total): array
    {
        $provider = $connection->mlsProvider;

        return [
            'listings' => $listings,
            'total' => $total,
            'compliance' => $provider
                ? $provider->complianceBlock()
                : $this->fallbackCompliance($connection),
            'fetched_at' => now()->toISOString(),
        ];
    }

    /**
     * For legacy connections that pre-date the mls_providers table.
     * Empty compliance — admin should migrate these by linking mls_provider_id.
     */
    private function fallbackCompliance(IdxConnection $connection): array
    {
        return [
            'mls_name' => $connection->display_name,
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
    }
}
