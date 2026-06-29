export interface AreaData {
    id: number;
    name: string;
    slug: string;
    image: string | null;
    description: string | null;
    /** Main heading above the description on the public page (default "Welcome to {name}"). */
    description_heading?: string | null;
    search_criteria: Record<string, unknown> | null;
    sub_areas?: SubAreaRow[] | null;
    lifestyle_pages?: LifestylePageRow[] | null;
    property_pages?: PropertyPageRow[] | null;
    sort_order: number;
    is_active: boolean;
}

/** A community SEO sub-page (own URL under /neighborhoods/{area}/…). */
export interface SubAreaRow {
    type: 'city' | 'zip' | 'neighborhood';
    label: string;
    /** The MLS filter value — defaults to the label when blank. */
    value: string;
    slug?: string;
}

/** A lifestyle-page catalog entry (from the areas API). */
export interface LifestyleDef {
    key: string;
    label: string;
    lifestyle: string;
}

/** An enabled lifestyle page on a community, with optional custom copy. */
export interface LifestylePageRow {
    key: string;
    copy?: string | null;
}

/**
 * An enabled property type / sub-type SEO page on a community. `value` is the
 * MLS enum verbatim (from the taxonomy endpoint — never hardcoded).
 */
export interface PropertyPageRow {
    kind: 'property_type' | 'property_subtype';
    value: string;
    copy?: string | null;
}

/** MLS-aligned community filters (keys mirror MlsQuery snake_case). Numbers held as strings in the form. */
export interface CommunityFilters {
    cities: string[];
    counties: string[];
    zips: string[];
    subdivisions: string[];
    neighborhoods: string[];
    min_price: string;
    max_price: string;
    min_beds: string;
    max_beds: string;
    min_baths: string;
    min_sqft: string;
    max_sqft: string;
    min_year_built: string;
    max_year_built: string;
    property_types: string[];
    statuses: string[];
    scope: 'all' | 'office' | 'agent';
    limit: string;
    /** When set, the community replays this Properties-tab hotsheet instead of manual filters. */
    hotsheet_id: string;
}

export const EMPTY_FILTERS: CommunityFilters = {
    cities: [], counties: [], zips: [], subdivisions: [], neighborhoods: [],
    min_price: '', max_price: '', min_beds: '', max_beds: '', min_baths: '',
    min_sqft: '', max_sqft: '', min_year_built: '', max_year_built: '',
    property_types: [], statuses: [], scope: 'all', limit: '', hotsheet_id: '',
};

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const numStr = (v: unknown): string => (v === null || v === undefined || v === '' ? '' : String(v));

/** Read stored search_criteria (new aligned shape, with legacy fallback) into the form shape. */
export function criteriaToForm(sc: Record<string, unknown> | null): CommunityFilters {
    if (!sc) return { ...EMPTY_FILTERS };

    // Legacy shape: { price_min, price_max, bedrooms_min, bathrooms_min, zip_codes (csv) }
    const legacyZips = typeof sc.zip_codes === 'string'
        ? (sc.zip_codes as string).split(',').map((z) => z.trim()).filter(Boolean)
        : [];

    return {
        cities: strArr(sc.cities),
        counties: strArr(sc.counties),
        zips: sc.zips ? strArr(sc.zips) : legacyZips,
        subdivisions: strArr(sc.subdivisions),
        neighborhoods: strArr(sc.neighborhoods),
        min_price: numStr(sc.min_price ?? sc.price_min),
        max_price: numStr(sc.max_price ?? sc.price_max),
        min_beds: numStr(sc.min_beds ?? sc.bedrooms_min),
        max_beds: numStr(sc.max_beds),
        min_baths: numStr(sc.min_baths ?? sc.bathrooms_min),
        min_sqft: numStr(sc.min_sqft),
        max_sqft: numStr(sc.max_sqft),
        min_year_built: numStr(sc.min_year_built),
        max_year_built: numStr(sc.max_year_built),
        property_types: strArr(sc.property_types),
        statuses: strArr(sc.statuses),
        scope: (sc.scope === 'office' || sc.scope === 'agent') ? sc.scope : 'all',
        limit: numStr(sc.limit),
        hotsheet_id: numStr(sc.hotsheet_id),
    };
}

const toInt = (v: string): number | null => (v.trim() === '' ? null : parseInt(v, 10));
const toNum = (v: string): number | null => (v.trim() === '' ? null : Number(v));

/** Convert the form shape into the stored/MLS-aligned search_criteria payload. */
export function formToCriteria(f: CommunityFilters): Record<string, unknown> {
    return {
        cities: f.cities,
        counties: f.counties,
        zips: f.zips,
        subdivisions: f.subdivisions,
        neighborhoods: f.neighborhoods,
        min_price: toNum(f.min_price),
        max_price: toNum(f.max_price),
        min_beds: toInt(f.min_beds),
        max_beds: toInt(f.max_beds),
        min_baths: toNum(f.min_baths),
        min_sqft: toInt(f.min_sqft),
        max_sqft: toInt(f.max_sqft),
        min_year_built: toInt(f.min_year_built),
        max_year_built: toInt(f.max_year_built),
        property_types: f.property_types,
        // No statuses key: communities always show active listings only — the
        // MLS drivers default to Active when no status filter is sent.
        scope: f.scope,
        limit: toInt(f.limit),
        hotsheet_id: toInt(f.hotsheet_id),
    };
}
