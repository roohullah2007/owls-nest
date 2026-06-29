export interface ListingContact {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
}

export interface ListingFeatures {
    listing_category?: string;
    property_subtype?: string;
    full_baths?: number | string;
    half_baths?: number | string;
    stories?: number | string;
    parking_spaces?: number | string;
    garage_spaces?: number | string;
    hoa_fee?: number | string;
    virtual_tour_url?: string;
    lat?: number;
    lng?: number;
    open_houses?: { date: string; start: string; end: string; notes?: string }[];
    amenities?: string[];
    // Community & financials (MLS-aligned)
    subdivision?: string;
    mls_area?: string;
    hoa_name?: string;
    hoa_frequency?: string;
    tax_annual_amount?: number | string;
    tax_year?: number | string;
    // Features & amenities — structured chip groups + highlights
    pool?: boolean;
    waterfront?: boolean;
    new_construction?: boolean;
    furnished?: string;
    view?: string[];
    appliances?: string[];
    heating?: string[];
    cooling?: string[];
    flooring?: string[];
    exterior_features?: string[];
    security_features?: string[];
    custom_features?: string[];
}

export interface Listing {
    id: number;
    user_id: number;
    contact_id?: number | null;
    deal_id?: number | null;
    listing_type: string;
    status: string;
    title: string;
    address: string | null;
    unit?: string | null;
    city: string | null;
    state_province: string | null;
    postal_code?: string | null;
    country?: string | null;
    mls_number: string | null;
    price: string | null;
    bedrooms: number | null;
    bathrooms: string | null;
    sqft: number | null;
    lot_size?: string | null;
    year_built?: number | null;
    description?: string | null;
    features?: ListingFeatures | null;
    listed_at: string | null;
    photos: string[] | null;
    custom_fields: Record<string, string> | null;
    contact: ListingContact | null;
    user: { id: number; name: string } | null;
    tags: { id: number; name: string; color: string }[];
    created_at: string;
}

export interface PaginatedListings {
    data: Listing[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
}

export interface CustomFieldDef {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
}

export interface IdxConnection {
    id: number;
    provider: string;
    mls_slug: string;
    display_name: string;
    agent_id: string | null;
    office_id: string | null;
}

export interface MlsListing {
    mls_id: string;
    mls_number: string;
    mls_slug: string;
    lat: number | null;
    lng: number | null;
    status: string;
    property_type: string;
    property_subtype: string | null;
    style: string | null;
    price: number | null;
    currency: string;
    price_formatted: string;
    price_per_sqft: number | null;
    original_price: number | null;
    sold_price: number | null;
    address: { full: string; street: string; city: string; state_province: string; postal_code: string; county: string | null };
    subdivision: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    bathrooms_full: number | null;
    bathrooms_half: number | null;
    sqft: number | null;
    lot_sqft: number | null;
    year_built: number | null;
    stories: number | null;
    construction: string | string[] | null;
    roof: string | string[] | null;
    photos: string[];
    photo_count: number;
    days_on_market: number | null;
    list_date: string | null;
    sold_date: string | null;
    modification_ts: string | null;
    description: string | null;
    features: string[];
    appliances: string[];
    flooring: string | string[] | null;
    cooling: string | string[] | null;
    heating: string | string[] | null;
    furnished: string | null;
    fireplaces: number | null;
    exterior_features: string[];
    pool: boolean;
    pool_features: string | string[] | null;
    waterfront: boolean;
    waterfront_features: string | string[] | null;
    view: string | string[] | null;
    garage_spaces: number | null;
    parking: string | string[] | null;
    hoa_fee: number | null;
    hoa_frequency: string | null;
    tax_amount: number | null;
    tax_year: number | null;
    list_agent_name: string | null;
    list_agent_email: string | null;
    list_agent_phone: string | null;
    list_agent_id: string | null;
    list_office_name: string | null;
    list_office_id: string | null;
    list_office_phone: string | null;
    listing_agent?: {
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        mls_id?: string | null;
        office_name?: string | null;
        office_mls_id?: string | null;
        office_phone?: string | null;
    } | null;
    buyer_agent_name: string | null;
    buyer_office_name: string | null;
    virtual_tour_url: string | null;
}

export interface SavedView {
    id: number;
    name: string;
    filters: Record<string, string>;
    is_default: boolean;
}

export interface HotsheetFilters {
    query?: string;
    city?: string;
    subdivision?: string;
    min_price?: string;
    max_price?: string;
    min_beds?: string;
    min_baths?: string;
    min_sqft?: string;
    max_sqft?: string;
    min_lot_acres?: string;
    max_lot_acres?: string;
    min_year_built?: string;
    max_year_built?: string;
    property_type?: string;
    property_subtype?: string;
    status?: string;
    agent_id?: string;
    office_id?: string;
    recently_reduced_days?: string;
    open_house_within_days?: string;
    max_hoa_fee?: string;
    /** Polygon as [lat, lng] pairs. Converted to GeoJSON [lng, lat] before shipping. */
    polygon?: [number, number][] | null;
}

export interface Hotsheet {
    id: number;
    name: string;
    scope: 'personal' | 'team';
    filters: HotsheetFilters;
    position: number;
    user_id: number;
    team_id: number | null;
}

export interface TeamInfo {
    id: number;
    name: string;
    mls_office_id: string | null;
}

export interface OfficeConfig {
    office_id: string | null;
    can_edit: boolean;
    scope: 'team' | 'personal';
}

export type ListingsTab = 'mine' | 'office' | 'all';
export type ListingsView = 'list' | 'grid' | 'map';
export type MlsSortKey = 'address' | 'price' | 'sqft' | 'city' | 'listed' | 'dom' | 'type' | 'status' | 'year_built' | 'lot' | '';

export interface Column {
    key: string;
    label: string;
    sortable: boolean;
    defaultVisible: boolean;
    width: number;
    isCustom?: boolean;
}
