<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

/**
 * A single taxonomy value (e.g. "Closed" / "Sold") with optional parent
 * for hierarchical kinds like property_subtype.
 */
final readonly class MlsTaxonomyTerm
{
    public function __construct(
        public string $value,
        public string $label,
        public ?string $parentValue = null,
    ) {}

    public function toArray(): array
    {
        return array_filter([
            'value' => $this->value,
            'label' => $this->label,
            'parent_value' => $this->parentValue,
        ], static fn ($v) => $v !== null);
    }
}
