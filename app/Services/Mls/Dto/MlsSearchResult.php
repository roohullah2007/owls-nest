<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

use DateTimeImmutable;

final readonly class MlsSearchResult
{
    /**
     * @param  MlsListing[]  $listings
     */
    public function __construct(
        public array $listings,
        public int $total,
        public DateTimeImmutable $fetchedAt,
        public ?string $error = null,
    ) {}

    public static function empty(?string $error = null): self
    {
        return new self([], 0, new DateTimeImmutable, $error);
    }

    /**
     * Legacy array shape — matches what the existing clients return so
     * IdxSearchService can hand it straight to MlsDataService::wrap().
     */
    public function toArray(): array
    {
        $out = [
            'listings' => array_map(static fn (MlsListing $l) => $l->toArray(), $this->listings),
            'total' => $this->total,
        ];
        if ($this->error !== null) {
            $out['error'] = $this->error;
        }

        return $out;
    }
}
