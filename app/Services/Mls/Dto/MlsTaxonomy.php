<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

/**
 * The complete taxonomy surface for one MLS — what `/api/v1/mls/{slug}/taxonomy`
 * returns. Frontend taxonomy pickers consume this shape.
 *
 * `customFields` carries per-MLS field descriptors (key/label/type) so the UI
 * can render extra inputs without per-MLS frontend code.
 */
final readonly class MlsTaxonomy
{
    /**
     * @param  MlsTaxonomyTerm[]  $propertyTypes
     * @param  MlsTaxonomyTerm[]  $propertySubtypes  Terms with parent_value set to the parent property type.
     * @param  MlsTaxonomyTerm[]  $statuses
     * @param  array<int,array{key:string,label:string,type:string}>  $customFields
     * @param  string[]  $cities  Pre-known cities the MLS covers ("City, ST").
     * @param  string[]  $counties  Counties the MLS covers.
     * @param  array<string, string[]>  $neighborhoods  Sub-city neighborhoods keyed by area heading.
     * @param  string[]  $subdivisions  Subdivisions / developments the MLS indexes (flat list).
     * @param  string[]  $zipCodes  ZIP codes the MLS indexes (exact PostalCode values).
     * @param  string[]  $supportedFilters  Filter keys this MLS actually honours — drives which filter inputs the UI shows.
     */
    public function __construct(
        public array $propertyTypes = [],
        public array $propertySubtypes = [],
        public array $statuses = [],
        public array $customFields = [],
        public array $cities = [],
        public array $counties = [],
        public array $neighborhoods = [],
        public array $subdivisions = [],
        public array $zipCodes = [],
        public array $supportedFilters = [],
    ) {}

    public function toArray(): array
    {
        return [
            'property_types' => array_map(static fn (MlsTaxonomyTerm $t) => $t->toArray(), $this->propertyTypes),
            'property_subtypes' => array_map(static fn (MlsTaxonomyTerm $t) => $t->toArray(), $this->propertySubtypes),
            'statuses' => array_map(static fn (MlsTaxonomyTerm $t) => $t->toArray(), $this->statuses),
            'custom_fields' => $this->customFields,
            'cities' => $this->cities,
            'counties' => $this->counties,
            'neighborhoods' => $this->neighborhoods,
            'subdivisions' => $this->subdivisions,
            'zip_codes' => $this->zipCodes,
            'supported_filters' => $this->supportedFilters,
        ];
    }
}
