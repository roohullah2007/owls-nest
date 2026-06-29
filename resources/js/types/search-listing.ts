// Property Search needs more fields than the marketing `Listing` card type:
// numeric values for client-side filtering/sorting, the full photo gallery for
// the detail modal, MLS-style metadata, and precomputed map coordinates.
import type { Listing } from './listing';

export interface SearchListing extends Listing {
    /** Town/city, e.g. "Thornton" — used for search + map clustering + comps. */
    town: string;
    /** Full photo gallery for the detail modal (first entry === `image`). */
    photos: string[];
    /** Raw "N" full-bath count from the feed (may be empty). */
    fullBaths: string;
    /** Numeric square footage for range filtering (0 when unknown). */
    sqftNum: number;
    /** Lot size in acres, as a raw string (may be empty). */
    acres: string;
    /** Year built (0 when unknown). */
    year: number;
    /** Top-level MLS property category, e.g. "Residential". */
    propType: string;
    /** MLS sub-type, e.g. "Single Family" / "Condo". */
    subType: string;
    /** County, e.g. "NH-Grafton". */
    county: string;
    /** Price per square foot, e.g. "$301.34". */
    ppsf: string;
    /** Long MLS remarks for the modal description. */
    desc: string;
    /** Original bed label, e.g. "3 bd". */
    bedsLabel: string;
    /** Original bath label, e.g. "2 ba". */
    bathsLabel: string;
    /** Numeric price for range filtering / sorting. */
    priceNum: number;
    /** Abbreviated price for the map marker badge, e.g. "$449k". */
    shortPrice: string;
    /** Map marker latitude. */
    lat: number;
    /** Map marker longitude. */
    lng: number;
}
