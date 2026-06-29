/* Shared types for the public property-search React app. */

export interface PsConfig {
    endpoint: string;
    leadEndpoint: string;
    mapsKey: string;
    currency: string;
    isOwner: boolean;
    connectUrl: string;
    /** Logged-in site visitor (null/absent = guest). */
    visitor?: { name: string } | null;
    /** Visitor-account endpoints (favorites, saved searches, view tracking). */
    account?: PsAccountEndpoints;
    /** Marketing-consent disclosure for guest lead forms (editor-overridable). */
    consentText?: string;
    /** Site agent for the detail sidebar card. */
    agent?: { name?: string | null; title?: string | null; phone?: string | null; photo?: string | null; bg?: string | null };
    /** Tour-request endpoint (CRM lead + calendar task). */
    showingEndpoint?: string;
    /** Owner-authored detail-page blocks (merge fields, status rules). */
    detailBlocks?: import('./lib/merge').PsDetailBlock[];
    /** Marketing CTA tiles for the results grid. */
    gridCards?: import('./lib/merge').PsGridCard[];
    /** Built-in detail-section order/visibility/renames. */
    detailSections?: Array<{ key: string; label?: string; enabled?: boolean }>;
}

export interface PsAccountEndpoints {
    favorites: string;
    favoriteIds: string;
    savedSearches: string;
    trackView: string;
}

export interface PsListing {
    id: string;
    mls_slug: string;
    mls_id: string;
    mls_number: string;
    href: string;
    price: number | null;
    price_formatted: string;
    /** Dollar amount of the most recent price reduction (null unless reduced). */
    price_drop?: number | null;
    price_drop_formatted?: string | null;
    status_label: string;
    property_type: string | null;
    beds: number | null;
    baths: string | null;
    parking: number | null;
    sqft: string | null;
    lot: string | null;
    address: string;
    office: string | null;
    photos: string[];
    lat: number | null;
    lng: number | null;
    badges: string[];
    virtual_tour_url?: string | null;
    /** Upcoming open houses (preformatted label, next 3). */
    open_houses?: { start: string; end: string | null; label: string }[];
    /** Floor-plan images split out of the MLS media (when the feed flags them). */
    floorplans?: string[];
    hoa_monthly?: number | null;
    tax_annual?: number | null;
}

export interface PsCompliance {
    /** Dataset slug (matches PsListing.mls_slug) — keys each block to its MLS. */
    slug?: string | null;
    name: string | null;
    logo: string | null;
    disclaimer: string | null;
}

/** A location the connected MLS datasets declare (city / county / neighborhood).
    `label` is shown in the dropdown; `value` is what gets searched. */
export interface LocationEntry {
    label: string;
    value: string;
    type: string;
}

export interface PsResponse {
    integrated: boolean;
    listings: PsListing[];
    total: number;
    page: number;
    per_page: number;
    compliance: PsCompliance[];
    /** Live MLS taxonomy (union across the owner's connected MLSes). Optional —
        older payloads / failures omit it and the UI falls back to static lists. */
    taxonomy?: { property_types: Array<{ value: string; label: string }>; property_subtypes?: SubtypeTerm[]; statuses?: Array<{ value: string; label: string }>; locations?: LocationEntry[] };
    error: string | null;
}

/** Map viewport box (NE + SW corners) — the shape MlsGeoQuery.bounds expects. */
export interface PsBounds {
    ne_lat: number;
    ne_lng: number;
    sw_lat: number;
    sw_lng: number;
}

/**
 * UI-level listing status concepts. These are NOT raw MLS statuses — they map
 * onto the canonical `statuses` values the gateway accepts (see
 * STATUS_QUERY_VALUES). 'all' must send the explicit union: drivers default an
 * empty `statuses` filter to Active-only.
 */
export type StatusMode = 'all' | 'active' | 'sold';

export const STATUS_QUERY_VALUES: Record<StatusMode, string[]> = {
    active: ['Active'],
    sold: ['Closed', 'Sold'],
    all: ['Active', 'Closed', 'Sold'],
};

/** Applied (committed) filter values — popovers edit drafts, Apply commits here. */
/** MLS sub-type term; parent_value ties it to its property class. */
export interface SubtypeTerm {
    value: string;
    label: string;
    parent_value?: string;
}

export interface Filters {
    statusMode: StatusMode;
    /** Transaction type — 'sale' (default) or 'rent'. */
    transaction: 'sale' | 'rent';
    /** Property class (MLS top-level type, e.g. Residential); '' = any. */
    propClass: string;
    /** Only meaningful while statusMode === 'sold'. '' = any time. */
    soldWithinDays: string;
    minPrice: string;
    maxPrice: string;
    minBeds: string;
    minBaths: string;
    types: string[];
    minYear: string;
    maxYear: string;
    minSqft: string;
    maxSqft: string;
    keywords: string;
    hasPool: boolean;
    hasWaterfront: boolean;
    priceReduced: boolean;
    /** Results-header feature pills (Virtual Tour / Floor Plans / Open House). */
    hasVirtualTour: boolean;
    hasFloorPlans: boolean;
    hasOpenHouse: boolean;
    newDays: string;
    maxHoa: string;
    minLot: string;
    maxLot: string;
}

export const EMPTY_FILTERS: Filters = {
    statusMode: 'active', transaction: 'sale', propClass: '', soldWithinDays: '',
    minPrice: '', maxPrice: '', minBeds: '', minBaths: '', types: [],
    minYear: '', maxYear: '', minSqft: '', maxSqft: '', keywords: '',
    hasPool: false, hasWaterfront: false, priceReduced: false,
    hasVirtualTour: false, hasFloorPlans: false, hasOpenHouse: false,
    newDays: '', maxHoa: '', minLot: '', maxLot: '',
};

/** Map the UI filter state onto the MlsQuery-shaped payload the API expects. */
export function toQueryPayload(
    f: Filters,
    searchText: string,
    sort: string,
    polygon: number[][] | null,
    bounds: PsBounds | null = null,
): Record<string, unknown> {
    const p: Record<string, unknown> = { sort };
    const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
    const set = (key: string, val: unknown) => { if (val !== undefined && val !== false && val !== '') p[key] = val; };

    set('min_price', num(f.minPrice));
    set('max_price', num(f.maxPrice));
    set('min_beds', num(f.minBeds));
    set('min_baths', num(f.minBaths));
    set('min_year_built', num(f.minYear));
    set('max_year_built', num(f.maxYear));
    set('min_sqft', num(f.minSqft));
    set('max_sqft', num(f.maxSqft));
    set('min_lot_acres', num(f.minLot));
    set('max_lot_acres', num(f.maxLot));
    set('max_hoa_fee', num(f.maxHoa));
    set('new_within_days', num(f.newDays));
    set('has_pool', f.hasPool || undefined);
    set('has_waterfront', f.hasWaterfront || undefined);
    set('has_virtual_tour', f.hasVirtualTour || undefined);
    set('has_floor_plans', f.hasFloorPlans || undefined);
    set('has_open_house', f.hasOpenHouse || undefined);
    // MlsQuery::fromArray only honours recently_reduced as an array shape
    // ({within_days}); a bare boolean is silently dropped server-side.
    if (f.priceReduced) p.recently_reduced = { within_days: 30 };
    if (f.propClass) p.property_types = [f.propClass];
    if (f.types.length) p.property_subtypes = f.types;
    if (f.transaction) p.transaction = f.transaction;

    // The location search box and the Keywords filter share the free-text query.
    const q = [searchText, f.keywords].map(s => s.trim()).filter(Boolean).join(' ');
    if (q) p.query = q;

    p.statuses = STATUS_QUERY_VALUES[f.statusMode];
    if (f.statusMode === 'sold') set('sold_within_days', num(f.soldWithinDays));
    // Geo precedence: a committed drawn polygon always wins over the live
    // map-viewport box (MlsGeoQuery accepts only one of polygon/bounds/near).
    if (polygon && polygon.length >= 3) p.geo = { polygon };
    else if (bounds) p.geo = { bounds };

    return p;
}
