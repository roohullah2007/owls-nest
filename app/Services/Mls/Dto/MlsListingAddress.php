<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

final readonly class MlsListingAddress
{
    public function __construct(
        public string $full,
        public ?string $street = null,
        public ?string $city = null,
        public ?string $stateProvince = null,
        public ?string $postalCode = null,
        public string $country = 'US',
        public ?string $county = null,
    ) {}

    public static function fromArray(array $a): self
    {
        return new self(
            full: (string) ($a['full'] ?? ''),
            street: $a['street'] ?? null,
            city: $a['city'] ?? null,
            stateProvince: $a['state_province'] ?? null,
            postalCode: $a['postal_code'] ?? null,
            country: (string) ($a['country'] ?? 'US'),
            county: $a['county'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'full' => $this->full,
            'street' => $this->street,
            'city' => $this->city,
            'state_province' => $this->stateProvince,
            'postal_code' => $this->postalCode,
            'country' => $this->country,
            'county' => $this->county,
        ];
    }
}
