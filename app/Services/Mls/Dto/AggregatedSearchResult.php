<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

use DateTimeImmutable;

/**
 * What the MlsGateway returns when a query fans out across multiple datasets.
 *
 * Each listing is tagged with its `mls_slug` (already on MlsListing). Per-MLS
 * totals, errors, AND compliance blocks are kept as side-channel maps so the
 * UI can render: the merged listings, a per-MLS error banner where applicable,
 * and the required attribution/disclaimer for every MLS that contributed.
 *
 * Compliance is non-optional — every MLS legally requires their disclaimer
 * appear alongside listings sourced from them.
 */
final readonly class AggregatedSearchResult
{
    /**
     * @param  MlsListing[]  $listings  Merged, mls_slug-tagged.
     * @param  array<string,int>  $perMlsTotal  Map of mls_slug → total available on that MLS.
     * @param  array<string,string>  $errors  Map of mls_slug → error message for that MLS only.
     * @param  array<string,array<string,mixed>>  $compliance  Map of mls_slug → compliance block (disclaimer, attribution, logo, rules).
     */
    public function __construct(
        public array $listings,
        public int $total,
        public array $perMlsTotal,
        public array $errors,
        public array $compliance,
        public DateTimeImmutable $fetchedAt,
    ) {}

    public static function empty(?string $error = null): self
    {
        return new self(
            listings: [],
            total: 0,
            perMlsTotal: [],
            errors: $error ? ['_gateway' => $error] : [],
            compliance: [],
            fetchedAt: new DateTimeImmutable,
        );
    }

    public function toArray(): array
    {
        return [
            'listings' => array_map(static fn (MlsListing $l) => $l->toArray(), $this->listings),
            'total' => $this->total,
            'per_mls_total' => $this->perMlsTotal,
            'errors' => $this->errors,
            'compliance' => $this->compliance,
            'fetched_at' => $this->fetchedAt->format(DateTimeImmutable::ATOM),
        ];
    }
}
