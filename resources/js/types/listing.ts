// Shared real-estate content types. Reused across home, property-search,
// featured-properties and any page that renders listing cards.

export interface Listing {
    id: string;
    image: string;
    alt: string;
    /** Presentational status badge, e.g. "Active" or "For Sale". */
    status: string;
    /** Pre-formatted price string, e.g. "$1,395,000". */
    price: string;
    beds: number;
    baths: number;
    /** Pre-formatted square footage, e.g. "3,840". */
    sqft: string;
    address: string;
    href: string;
    /**
     * Long-form blurb shown by the Featured Properties large rows under a
     * "Property Description" heading. Optional: cards that don't show prose
     * (e.g. the compact results card) omit it.
     */
    description?: string;
}

/** One slide of the home "Featured Properties" slider: a big card + two thumbnails. */
export interface PropertySlide {
    big: Listing;
    thumbnails: Listing[];
}

/** A path/teaser card (Home Search / Home Valuation / Contact). */
export interface PathCardItem {
    image: string;
    alt: string;
    title: string;
    href: string;
    cta: string;
}
