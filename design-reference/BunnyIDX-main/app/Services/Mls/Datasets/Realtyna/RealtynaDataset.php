<?php

declare(strict_types=1);

namespace App\Services\Mls\Datasets\Realtyna;

use App\Models\MlsProvider;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Dto\MlsFeed;
use App\Services\Mls\Dto\MlsTaxonomyTerm;

/**
 * Shared defaults for Realtyna-backed MLS datasets. Realtyna's RESO feed
 * partitions MLSes by OriginatingSystemName — the concrete subclass returns
 * that as `getDatasetPath()`.
 *
 * Concrete Realtyna MLSes are added as their own subclasses (analogous to
 * Bridge\MiamiReMls) — see BeachesMls for the reference implementation.
 */
abstract class RealtynaDataset extends MlsDataset
{
    public function getDriver(): string
    {
        return MlsProvider::SOURCE_REALTYNA;
    }

    /**
     * Realtyna's RESO feed serves IDX and VOW from the same OriginatingSystemName —
     * scope is determined by the OAuth token's claim. Subclasses can override if
     * a particular tenant uses separate identifiers.
     */
    public function supportedFeeds(): array
    {
        return [MlsFeed::IDX];
    }

    /** @return MlsTaxonomyTerm[] */
    public function getPropertyTypes(): array
    {
        return [
            new MlsTaxonomyTerm('Residential', 'Residential'),
            new MlsTaxonomyTerm('Residential Lease', 'Rental'),
            new MlsTaxonomyTerm('Residential Income', 'Multi-Family'),
            new MlsTaxonomyTerm('Commercial Sale', 'Commercial'),
            new MlsTaxonomyTerm('Land', 'Land'),
        ];
    }

    /** @return MlsTaxonomyTerm[] */
    public function getStatuses(): array
    {
        return [
            new MlsTaxonomyTerm('Active', 'Active'),
            new MlsTaxonomyTerm('Active Under Contract', 'Active Under Contract'),
            new MlsTaxonomyTerm('Pending', 'Pending'),
            new MlsTaxonomyTerm('Closed', 'Sold'),
            new MlsTaxonomyTerm('Coming Soon', 'Coming Soon'),
            new MlsTaxonomyTerm('Withdrawn', 'Withdrawn'),
            new MlsTaxonomyTerm('Expired', 'Expired'),
        ];
    }

    /**
     * Canonical RESO PropertySubType set served by RealtyFeed, organised by
     * parent PropertyType. Concrete MLSes override only when their feed
     * exposes more / fewer values.
     *
     * @return array<string, MlsTaxonomyTerm[]>
     */
    protected function getPropertySubtypeMap(): array
    {
        // Sale and lease share the same dwelling shapes — defined once.
        $dwellings = [
            new MlsTaxonomyTerm('Single Family Residence', 'Single Family'),
            new MlsTaxonomyTerm('Condominium', 'Condominium'),
            new MlsTaxonomyTerm('Townhouse', 'Townhouse'),
            new MlsTaxonomyTerm('Villa', 'Villa'),
            new MlsTaxonomyTerm('Stock Cooperative', 'Co-op (Stock Cooperative)'),
            new MlsTaxonomyTerm('Manufactured Home', 'Manufactured Home'),
            new MlsTaxonomyTerm('Mobile Home', 'Mobile Home'),
        ];

        $stamp = static fn (array $terms, string $parent): array => array_map(static fn (MlsTaxonomyTerm $t) => new MlsTaxonomyTerm($t->value, $t->label, $parent), $terms);

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
            ],
            'Commercial Sale' => [
                new MlsTaxonomyTerm('Office', 'Office', 'Commercial Sale'),
                new MlsTaxonomyTerm('Retail', 'Retail', 'Commercial Sale'),
                new MlsTaxonomyTerm('Industrial', 'Industrial', 'Commercial Sale'),
                new MlsTaxonomyTerm('Warehouse', 'Warehouse', 'Commercial Sale'),
                new MlsTaxonomyTerm('Mixed Use', 'Mixed Use', 'Commercial Sale'),
                new MlsTaxonomyTerm('Multi Family', 'Multi-Family (commercial)', 'Commercial Sale'),
            ],
        ];
    }

    /**
     * Filter the canonical subtype map down to the requested parent type, or
     * return the flat list across every type when no filter is supplied.
     * Subclasses should override {@see self::getPropertySubtypeMap()} rather
     * than this method.
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
        // Mirrors what RealtynaApiClient::buildOdataFilter() actually translates —
        // declaring a filter the client ignores would silently no-op.
        return array_merge(parent::getSupportedFilters(), [
            'county', 'zip', 'subdivision', 'neighborhood', 'state',
            'min_sqft', 'max_sqft',
            'min_year_built', 'max_year_built',
            'agent_id', 'office_id',
            'raw_filter',
        ]);
    }
}
