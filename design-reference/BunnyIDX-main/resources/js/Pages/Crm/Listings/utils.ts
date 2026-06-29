import type { Column, MlsListing, MlsSortKey } from './types';

export const STORAGE_KEY = 'listings_visible_columns';

export const builtInColumns: Column[] = [
    { key: 'photo', label: 'Photo', sortable: false, defaultVisible: true, width: 60 },
    { key: 'title', label: 'Title', sortable: true, defaultVisible: true, width: 220 },
    { key: 'listing_type', label: 'Type', sortable: true, defaultVisible: true, width: 110 },
    { key: 'status', label: 'Status', sortable: true, defaultVisible: true, width: 110 },
    { key: 'price', label: 'Price', sortable: true, defaultVisible: true, width: 130 },
    { key: 'beds_baths', label: 'Beds/Baths', sortable: false, defaultVisible: true, width: 100 },
    { key: 'sqft', label: 'Sqft', sortable: false, defaultVisible: true, width: 90 },
    { key: 'mls_number', label: 'MLS#', sortable: true, defaultVisible: true, width: 110 },
    { key: 'city', label: 'City', sortable: true, defaultVisible: true, width: 130 },
    { key: 'listed_at', label: 'Listed', sortable: true, defaultVisible: true, width: 110 },
    { key: 'tags', label: 'Tags', sortable: false, defaultVisible: false, width: 120 },
    { key: 'added_by', label: 'Added By', sortable: false, defaultVisible: true, width: 130 },
    { key: 'created_at', label: 'Added', sortable: true, defaultVisible: false, width: 110 },
    { key: 'actions', label: '', sortable: false, defaultVisible: true, width: 50 },
];

export const mlsTableColumns: { key: string; label: string; sortKey: MlsSortKey }[] = [
    { key: 'photo', label: 'Photo', sortKey: '' },
    { key: 'address', label: 'Address', sortKey: 'address' },
    { key: 'type', label: 'Type', sortKey: 'type' },
    { key: 'subtype', label: 'Subtype', sortKey: '' },
    { key: 'status', label: 'Status', sortKey: 'status' },
    { key: 'price', label: 'Price', sortKey: 'price' },
    { key: 'beds', label: 'Beds', sortKey: '' },
    { key: 'full_baths', label: 'Full Ba', sortKey: '' },
    { key: 'half_baths', label: 'Half Ba', sortKey: '' },
    { key: 'sqft', label: 'Sq.Ft', sortKey: 'sqft' },
    { key: 'lot', label: 'Lot', sortKey: 'lot' },
    { key: 'year_built', label: 'Year', sortKey: 'year_built' },
    { key: 'subdivision', label: 'Subdivision', sortKey: '' },
    { key: 'mls_number', label: 'MLS #', sortKey: '' },
    { key: 'city', label: 'City', sortKey: 'city' },
    { key: 'state', label: 'State', sortKey: '' },
    { key: 'list_agent', label: 'Listing Agent', sortKey: '' },
    { key: 'list_office', label: 'Listing Office', sortKey: '' },
    { key: 'listed', label: 'Listed', sortKey: 'listed' },
    { key: 'dom', label: 'Days', sortKey: 'dom' },
    { key: 'photos_count', label: 'Pics', sortKey: '' },
];

// ─── MLS filter options (single source of truth) ─────────────

export const MLS_MIN_PRICE_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Min $' },
    { value: '50000', label: '$50K' },
    { value: '100000', label: '$100K' },
    { value: '150000', label: '$150K' },
    { value: '200000', label: '$200K' },
    { value: '300000', label: '$300K' },
    { value: '400000', label: '$400K' },
    { value: '500000', label: '$500K' },
    { value: '750000', label: '$750K' },
    { value: '1000000', label: '$1M' },
    { value: '1500000', label: '$1.5M' },
    { value: '2000000', label: '$2M' },
    { value: '3000000', label: '$3M' },
    { value: '5000000', label: '$5M' },
    { value: '10000000', label: '$10M' },
];

export const MLS_MAX_PRICE_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Max $' },
    { value: '100000', label: '$100K' },
    { value: '200000', label: '$200K' },
    { value: '300000', label: '$300K' },
    { value: '400000', label: '$400K' },
    { value: '500000', label: '$500K' },
    { value: '750000', label: '$750K' },
    { value: '1000000', label: '$1M' },
    { value: '1500000', label: '$1.5M' },
    { value: '2000000', label: '$2M' },
    { value: '3000000', label: '$3M' },
    { value: '5000000', label: '$5M' },
    { value: '10000000', label: '$10M' },
    { value: '20000000', label: '$20M' },
    { value: '50000000', label: '$50M+' },
];

export const MLS_BEDS_BATHS_OPTIONS = ['', '1', '2', '3', '4', '5'];

// NOTE: MLS property types / subtypes / statuses used to live here as hardcoded
// arrays. They now come from the canonical taxonomy API (`/api/v1/mls/taxonomy`)
// via `useMlsTaxonomy()` — never hardcode them in a component again (see
// feedback_mls_taxonomy rule #6).

// Map from CRM listing types → RESO PropertyType values that Bridge accepts.
export const typeToMlsPropertyType: Record<string, string> = {
    residential: 'Residential',
    condominium: 'Residential',
    condo: 'Residential',
    commercial: 'Commercial Sale',
    land: 'Land',
    multi_family: 'Residential Income',
    multifamily: 'Residential Income',
    rental: 'Residential Lease',
    townhouse: 'Residential',
};

// ─── Color tokens ────────────────────────────────────────────

const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#059669', text: '#FFFFFF' },
    pending: { bg: '#D97706', text: '#FFFFFF' },
    sold: { bg: '#1693C9', text: '#FFFFFF' },
    expired: { bg: '#8B9096', text: '#FFFFFF' },
    withdrawn: { bg: '#5F656D', text: '#FFFFFF' },
    coming_soon: { bg: '#7C3AED', text: '#FFFFFF' },
    closed: { bg: '#4F46E5', text: '#FFFFFF' },
};

const typeColors: Record<string, { bg: string; text: string }> = {
    residential: { bg: '#1693C9', text: '#FFFFFF' },
    residential_lease: { bg: '#4F46E5', text: '#FFFFFF' },
    residential_income: { bg: '#7C3AED', text: '#FFFFFF' },
    condominium: { bg: '#0891B2', text: '#FFFFFF' },
    condo: { bg: '#0891B2', text: '#FFFFFF' },
    commercial_sale: { bg: '#D97706', text: '#FFFFFF' },
    commercial_lease: { bg: '#B45309', text: '#FFFFFF' },
    commercial: { bg: '#D97706', text: '#FFFFFF' },
    land: { bg: '#059669', text: '#FFFFFF' },
    business_opportunity: { bg: '#9333EA', text: '#FFFFFF' },
    business: { bg: '#9333EA', text: '#FFFFFF' },
    multi_family: { bg: '#7C3AED', text: '#FFFFFF' },
    multifamily: { bg: '#7C3AED', text: '#FFFFFF' },
    rental: { bg: '#4F46E5', text: '#FFFFFF' },
    townhouse: { bg: '#0D9488', text: '#FFFFFF' },
};

const FALLBACK_COLOR = { bg: '#5F656D', text: '#FFFFFF' };

export function getTypeColors(type: string) {
    const t = type.toLowerCase().replace(/[\s-]/g, '_');
    return typeColors[t] || FALLBACK_COLOR;
}

export function getStatusColors(status: string) {
    const s = status.toLowerCase().replace(/[\s-]/g, '_');
    if (statusColors[s]) return statusColors[s];
    if (s.includes('active')) return statusColors.active;
    if (s.includes('pending')) return statusColors.pending;
    return FALLBACK_COLOR;
}

// ─── Formatters ──────────────────────────────────────────────

export function formatDate(d: string | null) {
    if (!d) return '—';
    const hasTime = /[T ]\d{2}:/.test(d);
    const parsed = new Date(hasTime ? d : d + 'T00:00:00');
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatPrice(p: string | number | null) {
    if (!p) return '—';
    return '$' + Number(p).toLocaleString();
}

export function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// RESO StandardStatus → user-facing label. Matches what every MLS dataset's
// taxonomy ships (see MlsTaxonomyTerm('Closed', 'Sold') in Bridge/MlsGrid/
// Realtyna datasets) — done client-side so MLS feeds keep returning the raw
// RESO value while the UI shows the term agents actually use.
const STATUS_LABEL_OVERRIDES: Record<string, string> = {
    closed: 'Sold',
    hold: 'On Hold',
};
export function formatStatusLabel(status: string): string {
    if (!status) return '—';
    const key = status.toLowerCase().replace(/[\s-]/g, '_');
    return STATUS_LABEL_OVERRIDES[key] ?? capitalize(status);
}

export function joinField(val: string | string[] | null): string {
    if (!val) return '';
    return Array.isArray(val) ? val.join(', ') : val;
}

// USPS state / territory abbreviation → full name. Used to render the State
// column with the full name instead of the 2-letter code MLS feeds return.
const US_STATE_NAMES: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia',
    PR: 'Puerto Rico', VI: 'US Virgin Islands', GU: 'Guam', AS: 'American Samoa', MP: 'Northern Mariana Islands',
};

export function stateName(value: string | null | undefined): string {
    if (!value) return '';
    const upper = value.toUpperCase();
    return US_STATE_NAMES[upper] || value;
}

// ─── Column persistence ──────────────────────────────────────

export function getInitialColumns(allCols: Column[]): string[] {
    const defaults = allCols.filter((c) => c.defaultVisible).map((c) => c.key);
    if (typeof window === 'undefined') return defaults;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as string[];
            const validKeys = new Set(allCols.map((c) => c.key));
            const filtered = parsed.filter((k) => validKeys.has(k));
            if (filtered.length > 0) {
                // Always include 'photo' so the image column is present even if older stored prefs omit it.
                return filtered.includes('photo') ? filtered : ['photo', ...filtered];
            }
        }
    } catch {}
    return defaults;
}

// ─── MLS sorting ─────────────────────────────────────────────

export function getMlsSortValue(ml: MlsListing, key: MlsSortKey): string | number {
    switch (key) {
        case 'address': return ml.address?.full?.toLowerCase() || '';
        case 'price': return ml.price ?? 0;
        case 'sqft': return ml.sqft ?? 0;
        case 'lot': return ml.lot_sqft ?? 0;
        case 'year_built': return ml.year_built ?? 0;
        case 'city': return ml.address?.city?.toLowerCase() || '';
        case 'listed': return ml.list_date || '';
        case 'dom': return ml.days_on_market ?? 0;
        case 'type': return ml.property_type?.toLowerCase() || '';
        case 'status': return ml.status?.toLowerCase() || '';
        default: return '';
    }
}
