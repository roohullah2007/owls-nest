<?php

declare(strict_types=1);

namespace App\Services\Mls\Datasets\Bridge;

use App\Models\MlsProvider;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Dto\MlsTaxonomyTerm;

/**
 * Shared defaults for every Bridge-backed MLS dataset. Concrete Miami / Bright /
 * etc. classes extend this and override what their specific feed exposes.
 *
 * Default property types + statuses are the RESO StandardStatus and PropertyType
 * enums every Bridge feed accepts. Subtypes vary per MLS — defaults to empty.
 */
abstract class BridgeDataset extends MlsDataset
{
    public function getDriver(): string
    {
        return MlsProvider::SOURCE_BRIDGE;
    }

    /** @return MlsTaxonomyTerm[] */
    public function getPropertyTypes(): array
    {
        return [
            new MlsTaxonomyTerm('Residential', 'Residential'),
            new MlsTaxonomyTerm('Residential Lease', 'Rental'),
            new MlsTaxonomyTerm('Residential Income', 'Multi-Family'),
            new MlsTaxonomyTerm('Commercial Sale', 'Commercial'),
            new MlsTaxonomyTerm('Commercial Lease', 'Commercial Lease'),
            new MlsTaxonomyTerm('Land', 'Land'),
            new MlsTaxonomyTerm('Business Opportunity', 'Business'),
        ];
    }

    /** @return MlsTaxonomyTerm[] */
    public function getStatuses(): array
    {
        // RESO StandardStatus values — label is user-facing.
        return [
            new MlsTaxonomyTerm('Active', 'Active'),
            new MlsTaxonomyTerm('Active Under Contract', 'Active Under Contract'),
            new MlsTaxonomyTerm('Pending', 'Pending'),
            new MlsTaxonomyTerm('Closed', 'Sold'),
            new MlsTaxonomyTerm('Coming Soon', 'Coming Soon'),
            new MlsTaxonomyTerm('Withdrawn', 'Withdrawn'),
            new MlsTaxonomyTerm('Expired', 'Expired'),
            new MlsTaxonomyTerm('Canceled', 'Canceled'),
            new MlsTaxonomyTerm('Hold', 'On Hold'),
        ];
    }

    /**
     * Canonical RESO PropertySubType set, organised by parent PropertyType.
     * Every Bridge-backed MLS inherits this — concrete subclasses (Miami,
     * Bright, …) override only when their feed exposes more / fewer values.
     *
     * In the agent-facing Matrix UI these are grouped into classes
     * (Residential, Condo/Co-op, Income/Investment, Rental, Land, Commercial,
     * Business Opportunity); on the RESO API they normalize into the
     * PropertyType / PropertySubType pair returned here.
     *
     * @return array<string, MlsTaxonomyTerm[]>
     */
    protected function getPropertySubtypeMap(): array
    {
        // Residential AND Residential Lease share the same dwelling subtypes —
        // a "Single Family Residence" is the same shape whether it's for sale
        // or rent. Defined once, used twice.
        $dwellings = [
            new MlsTaxonomyTerm('Single Family Residence', 'Single Family'),
            new MlsTaxonomyTerm('Condominium', 'Condominium'),
            new MlsTaxonomyTerm('Townhouse', 'Townhouse'),
            new MlsTaxonomyTerm('Villa', 'Villa'),
            new MlsTaxonomyTerm('Stock Cooperative', 'Co-op (Stock Cooperative)'),
            new MlsTaxonomyTerm('Manufactured Home', 'Manufactured Home'),
            new MlsTaxonomyTerm('Mobile Home', 'Mobile Home'),
        ];

        // Same — sale and lease share the commercial shape.
        $commercial = [
            new MlsTaxonomyTerm('Office', 'Office'),
            new MlsTaxonomyTerm('Retail', 'Retail'),
            new MlsTaxonomyTerm('Industrial', 'Industrial'),
            new MlsTaxonomyTerm('Warehouse', 'Warehouse'),
            new MlsTaxonomyTerm('Mixed Use', 'Mixed Use'),
            new MlsTaxonomyTerm('Hotel Motel', 'Hotel / Motel'),
            new MlsTaxonomyTerm('Multi Family', 'Multi-Family (commercial)'),
            new MlsTaxonomyTerm('Special Purpose', 'Special Purpose'),
        ];

        $stamp = static fn (array $terms, string $parent): array =>
            array_map(static fn (MlsTaxonomyTerm $t) => new MlsTaxonomyTerm($t->value, $t->label, $parent), $terms);

        return [
            'Residential' => $stamp($dwellings, 'Residential'),
            'Residential Lease' => $stamp($dwellings, 'Residential Lease'),
            'Residential Income' => [
                new MlsTaxonomyTerm('Duplex', 'Duplex', 'Residential Income'),
                new MlsTaxonomyTerm('Triplex', 'Triplex', 'Residential Income'),
                new MlsTaxonomyTerm('Quadruplex', 'Quadruplex', 'Residential Income'),
                new MlsTaxonomyTerm('Multi Family', 'Multi-Family (5+)', 'Residential Income'),
            ],
            'Land' => [
                new MlsTaxonomyTerm('Unimproved Land', 'Unimproved / Vacant Land', 'Land'),
                new MlsTaxonomyTerm('Agriculture', 'Agricultural', 'Land'),
                new MlsTaxonomyTerm('Boat Slip', 'Boat Slip / Dockominium', 'Land'),
            ],
            'Commercial Sale' => $stamp($commercial, 'Commercial Sale'),
            'Commercial Lease' => $stamp($commercial, 'Commercial Lease'),
            'Business Opportunity' => [
                new MlsTaxonomyTerm('Business', 'Business', 'Business Opportunity'),
            ],
        ];
    }

    /**
     * Filter the canonical subtype map down to the requested parent type, or
     * return the flat list across every type when no filter is supplied.
     * Subclasses that need to add / remove subtypes should override
     * {@see self::getPropertySubtypeMap()} rather than this method.
     */
    public function getPropertySubtypes(?string $propertyType = null): array
    {
        $map = $this->getPropertySubtypeMap();
        if ($propertyType !== null) {
            return $map[$propertyType] ?? [];
        }
        return array_merge(...array_values($map));
    }

    public function getSupportedFilters(): array
    {
        // Bridge's OData builder honours the full MlsQuery surface. Declare every
        // filter the All-Filters panel exposes so none are hidden for Bridge MLSes.
        // parent provides: query, city, min_price, max_price, min_beds, min_baths,
        // property_type, property_subtype, status.
        return array_merge(parent::getSupportedFilters(), [
            'county', 'neighborhood', 'subdivision',
            'min_sqft', 'max_sqft',
            'min_lot_acres', 'max_lot_acres',
            'min_year_built', 'max_year_built',
            'agent_id', 'office_id',
            'recently_reduced', 'has_open_house_within_days', 'max_hoa_fee',
            'raw_filter',
        ]);
    }
}
