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
    /** State/province the listing is in, e.g. "NH" / "VT". */
    state?: string;
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
    /** MLS listing number (RESO ListingId), e.g. "4912345". */
    mlsNumber?: string;
    /** Listing office name for the MLS® attribution line. */
    office?: string;
    /** Listing agent full name (from the MLS feed). */
    agent?: string;
    /** Subdivision / development name, when the feed provides one. */
    subdivision?: string;
    /** Garage/parking spaces (0 when unknown). */
    parking?: number;
    /** Whether the listing is waterfront (from the MLS feed). */
    waterfront?: boolean;
    /** View description (e.g. lake/river view), when present. */
    view?: string;
    /** HOA fee, preformatted (e.g. "$350 / Monthly"); empty when none. */
    hoa?: string;
    /** Annual property tax, preformatted (e.g. "$4,200"); empty when unknown. */
    taxAnnual?: string;
    /** Tax year the annual-tax figure applies to (0 when unknown). */
    taxYear?: number;
    /** Days on market — drives the top-left card badge when no price change. */
    daysOnMarket?: number | null;
    /** Whether the listing has an unbranded virtual tour. */
    virtualTour?: boolean;
    /** Price movement vs the original list price, for the card badge. */
    priceChange?: 'reduced' | 'increased' | null;
    /** Original list price (when it differs from the current price). */
    priceOriginal?: number;
}
