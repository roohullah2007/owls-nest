<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

/**
 * Listing agent + their brokerage. Returned for `listingAgent`,
 * `coListingAgent`, and `buyerAgent` on MlsListing. All fields nullable —
 * agent data is partly IDX-restricted (email/phone often VOW-only).
 */
final readonly class MlsAgent
{
    public function __construct(
        public ?string $name = null,
        public ?string $mlsId = null,
        public ?string $email = null,
        public ?string $phone = null,
        public ?string $officeName = null,
        public ?string $officeMlsId = null,
        public ?string $officePhone = null,
    ) {}

    /** True if every field is null/empty — agents on imported listings can be entirely blank. */
    public function isEmpty(): bool
    {
        return $this->name === null && $this->mlsId === null && $this->email === null
            && $this->phone === null && $this->officeName === null
            && $this->officeMlsId === null && $this->officePhone === null;
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'mls_id' => $this->mlsId,
            'email' => $this->email,
            'phone' => $this->phone,
            'office_name' => $this->officeName,
            'office_mls_id' => $this->officeMlsId,
            'office_phone' => $this->officePhone,
        ];
    }

    public static function fromArray(?array $a): ?self
    {
        if (! $a) {
            return null;
        }
        $agent = new self(
            name: $a['name'] ?? null,
            mlsId: $a['mls_id'] ?? null,
            email: $a['email'] ?? null,
            phone: $a['phone'] ?? null,
            officeName: $a['office_name'] ?? null,
            officeMlsId: $a['office_mls_id'] ?? null,
            officePhone: $a['office_phone'] ?? null,
        );

        return $agent->isEmpty() ? null : $agent;
    }
}
