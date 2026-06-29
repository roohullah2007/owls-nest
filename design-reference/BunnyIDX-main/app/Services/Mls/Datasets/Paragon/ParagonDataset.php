<?php

declare(strict_types=1);

namespace App\Services\Mls\Datasets\Paragon;

use App\Models\MlsProvider;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Dto\MlsFeed;
use App\Services\Mls\Dto\MlsTaxonomyTerm;

/**
 * Shared defaults for Paragon-backed MLS datasets.
 *
 * Paragon serves a RESO Data Dictionary feed under the `/DD1.7` path of each
 * MLS's dedicated service root (https://{MLS}.paragonrels.com/OData/{MLS}).
 * Because each Paragon MLS is its own server, the concrete subclass supplies
 * the service-root base URL via {@see self::getBaseUrl()}; the driver pairs it
 * with the connection's OAuth credentials.
 *
 * Concrete Paragon MLSes are added as their own subclasses (analogous to
 * Bridge\MiamiReMls / Realtyna\BeachesMls) — see PrimeMls for the reference.
 */
abstract class ParagonDataset extends MlsDataset
{
    public function getDriver(): string
    {
        return MlsProvider::SOURCE_PARAGON;
    }

    /**
     * The OData service root for this MLS — token endpoint + data resources
     * both hang off it. e.g. https://PrimeMLS.paragonrels.com/OData/PrimeMLS
     */
    abstract public function getBaseUrl(): string;

    /**
     * RESO Data Dictionary path. `/DD1.7` carries the RESO-mapped fields
     * (`/Paragon` holds non-RESO native fields — we use the RESO feed).
     */
    public function getDatasetPath(MlsFeed $feed = MlsFeed::IDX): string
    {
        return 'DD1.7';
    }

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
     * Canonical RESO PropertySubType set, organised by parent PropertyType.
     * Concrete MLSes override only when their feed exposes more / fewer values.
     *
     * @return array<string, MlsTaxonomyTerm[]>
     */
    protected function getPropertySubtypeMap(): array
    {
        $dwellings = [
            new MlsTaxonomyTerm('Single Family Residence', 'Single Family'),
            new MlsTaxonomyTerm('Condominium', 'Condominium'),
            new MlsTaxonomyTerm('Townhouse', 'Townhouse'),
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
                new MlsTaxonomyTerm('Mixed Use', 'Mixed Use', 'Commercial Sale'),
            ],
        ];
    }

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
        // Mirrors what ParagonApiClient::buildOdataFilter() actually translates.
        // County works only with the feed-exact state-prefixed value (getCounties()).
        // has_pool/has_view/new_construction have no filterable field on Paragon
        // DD1.7; has_waterfront maps to Water_View.
        return array_merge(parent::getSupportedFilters(), [
            'county', 'zip', 'subdivision', 'neighborhood', 'state',
            'min_sqft', 'max_sqft',
            'min_year_built', 'max_year_built',
            'has_waterfront',
            'agent_id', 'office_id',
            'raw_filter',
        ]);
    }
}
