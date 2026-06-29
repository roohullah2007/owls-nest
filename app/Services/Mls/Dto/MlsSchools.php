<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

/**
 * School zoning for the listing's address. Fill rates vary heavily by MLS —
 * suburban MLSes populate fully; urban (e.g. Miami) sometimes ~10%.
 */
final readonly class MlsSchools
{
    public function __construct(
        public ?string $elementary = null,
        public ?string $middle = null,
        public ?string $high = null,
        public ?string $district = null,
    ) {}

    public function isEmpty(): bool
    {
        return $this->elementary === null && $this->middle === null
            && $this->high === null && $this->district === null;
    }

    public function toArray(): array
    {
        return [
            'elementary' => $this->elementary,
            'middle' => $this->middle,
            'high' => $this->high,
            'district' => $this->district,
        ];
    }

    public static function fromArray(?array $a): ?self
    {
        if (! $a) {
            return null;
        }
        $schools = new self(
            elementary: $a['elementary'] ?? null,
            middle: $a['middle'] ?? null,
            high: $a['high'] ?? null,
            district: $a['district'] ?? null,
        );

        return $schools->isEmpty() ? null : $schools;
    }
}
