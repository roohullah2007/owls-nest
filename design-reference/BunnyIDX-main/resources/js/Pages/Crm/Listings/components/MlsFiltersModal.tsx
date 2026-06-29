import SlideOverModal, { slideOverInputClass } from '@/Components/Crm/SlideOverModal';
import Combobox from '@/Components/Crm/Combobox';
import MultiTokenInput from '@/Components/Crm/MultiTokenInput';
import Select from '@/Components/Crm/Select';
import type { TaxonomyTerm } from '@/hooks/useMlsTaxonomy';
import { subtypesForParent } from '@/hooks/useMlsTaxonomy';
import {
    MLS_BEDS_BATHS_OPTIONS,
    MLS_MAX_PRICE_OPTIONS,
    MLS_MIN_PRICE_OPTIONS,
} from '../utils';

interface Props {
    open: boolean;
    onClose: () => void;

    /** Taxonomy from /api/v1/mls/taxonomy — replaces the hardcoded constants. */
    propertyTypes: TaxonomyTerm[];
    propertySubtypes: TaxonomyTerm[];
    statuses: TaxonomyTerm[];
    /** Pre-known cities the MLS covers — fed to the City combobox autocomplete. */
    cities: string[];
    /** Counties the MLS serves — drives the County dropdown. */
    counties: string[];
    /** Sub-city neighborhoods keyed by area heading — drives the Neighborhood dropdown. */
    neighborhoods: Record<string, string[]>;
    /** Subdivisions the MLS indexes — feeds the Subdivision combobox autocomplete. */
    subdivisions: string[];
    /**
     * Filter keys the selected MLS honours (from the dataset's getSupportedFilters()).
     * Each filter row only renders when its key is in this list, so switching MLS
     * reconfigures the panel. Empty = not loaded yet → show everything (no gating).
     */
    supportedFilters: string[];

    keyword: string;
    city: string;
    county: string;
    neighborhood: string;
    subdivision: string;
    minBeds: string;
    minBaths: string;
    minPrice: string;
    maxPrice: string;
    minSqft: string;
    maxSqft: string;
    minLotAcres: string;
    maxLotAcres: string;
    minYearBuilt: string;
    maxYearBuilt: string;
    propertyType: string;
    propertySubtype: string;
    status: string;
    /** Comma-separated agent MLS IDs. */
    agentId: string;
    /** Comma-separated office MLS IDs. */
    officeId: string;
    /** Price-reduced within last N days. Empty = off. */
    recentlyReducedDays: string;
    /** Has open house within next N days. Empty = off. */
    openHouseWithinDays: string;
    /** Max HOA / monthly maintenance fee. */
    maxHoaFee: string;
    /** Subtypes observed in the loaded MLS results — augments taxonomy when present. */
    availableSubtypes?: string[];

    setKeyword: (v: string) => void;
    setCity: (v: string) => void;
    setCounty: (v: string) => void;
    setNeighborhood: (v: string) => void;
    setSubdivision: (v: string) => void;
    setMinBeds: (v: string) => void;
    setMinBaths: (v: string) => void;
    setMinPrice: (v: string) => void;
    setMaxPrice: (v: string) => void;
    setMinSqft: (v: string) => void;
    setMaxSqft: (v: string) => void;
    setMinLotAcres: (v: string) => void;
    setMaxLotAcres: (v: string) => void;
    setMinYearBuilt: (v: string) => void;
    setMaxYearBuilt: (v: string) => void;
    setPropertyType: (v: string) => void;
    setPropertySubtype: (v: string) => void;
    setStatus: (v: string) => void;
    setAgentId: (v: string) => void;
    setOfficeId: (v: string) => void;
    setRecentlyReducedDays: (v: string) => void;
    setOpenHouseWithinDays: (v: string) => void;
    setMaxHoaFee: (v: string) => void;

    onClear: () => void;
    onApply: () => void;
}

// Match the shared form primitives used by the Add Person modal (FieldLabel +
// formInputClass) so the Filters panel has the same label/input treatment.
const labelClass = 'flex items-center gap-1 text-[13px] font-normal text-[#5F656D] leading-[18px] mb-1';
const textInputClass = slideOverInputClass;

function splitTokens(s: string): string[] {
    return s.split(',').map((t) => t.trim()).filter(Boolean);
}

function joinTokens(arr: string[]): string {
    return arr.join(',');
}

export default function MlsFiltersModal(props: Props) {
    if (!props.open) return null;

    // Source of truth: taxonomy terms from /api/v1/mls/taxonomy. Filter the
    // subtype list to whatever parent the user has selected (or show all).
    const subtypeTerms: TaxonomyTerm[] = subtypesForParent(props.propertySubtypes, props.propertyType);
    // Merge in subtypes observed in current results that the dataset hasn't
    // surfaced yet — keeps the picker accurate without bloating the dataset class.
    const observedExtras = (props.availableSubtypes || [])
        .filter((s) => !subtypeTerms.some((t) => t.value === s))
        .map((s) => ({ value: s, label: s } as TaxonomyTerm));
    const subtypeOptions: TaxonomyTerm[] = [...subtypeTerms, ...observedExtras];

    // Filter visibility is driven by the MLS dataset's getSupportedFilters().
    // A row shows only when the selected MLS honours its filter key — so
    // switching MLS reconfigures the panel and we never show a filter that the
    // backend would silently drop. Before taxonomy loads the list is empty, so
    // fall back to showing everything (no gating) to avoid a flash of a blank panel.
    const supportedSet = new Set(props.supportedFilters);
    const gated = supportedSet.size > 0;
    const supports = (...keys: string[]) => !gated || keys.some((k) => supportedSet.has(k));
    // Every filter key the panel can render — used to detect when the selected
    // MLS hides some so we can explain it to the user.
    const ALL_FILTER_KEYS = [
        'query', 'county', 'city', 'neighborhood', 'subdivision',
        'min_beds', 'min_baths', 'min_price', 'min_sqft', 'min_lot_acres',
        'min_year_built', 'recently_reduced', 'has_open_house_within_days',
        'max_hoa_fee', 'property_type', 'property_subtype', 'status',
        'agent_id', 'office_id',
    ];
    const someHidden = gated && ALL_FILTER_KEYS.some((k) => !supportedSet.has(k));

    return (
        <SlideOverModal
            title="All Filters"
            onClose={props.onClose}
            width={520}
            footer={(
                <>
                    <button
                        type="button"
                        onClick={props.onClear}
                        className="h-9 px-4 text-xs font-medium text-[#5F656D] border border-[#ECEEF1] rounded-[4px] hover:bg-[#F3F4F6] transition-colors"
                    >
                        Clear All
                    </button>
                    <button
                        type="button"
                        onClick={props.onApply}
                        className="h-9 px-6 text-xs font-medium bg-[#1693C9] text-white rounded-[4px] hover:bg-[#1380AF] transition-colors"
                    >
                        Apply
                    </button>
                </>
            )}
        >
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                {/* Keyword */}
                {supports('query') && (
                    <div>
                        <label className={labelClass}>Keyword</label>
                        <input
                            type="text"
                            value={props.keyword}
                            onChange={(e) => props.setKeyword(e.target.value)}
                            placeholder="Search address, MLS#, remarks…"
                            className={textInputClass}
                        />
                    </div>
                )}

                {/* County + City */}
                {(supports('county') || supports('city')) && (
                    <div className="grid grid-cols-2 gap-3">
                        {supports('county') && (
                            <div>
                                <label className={labelClass}>County</label>
                                <Select
                                    fullWidth
                                    appearance="form"
                                    value={props.county}
                                    onChange={props.setCounty}
                                    placeholder="Any county"
                                    options={[
                                        { value: '', label: 'Any county' },
                                        ...props.counties.map((c) => ({ value: c, label: c })),
                                    ]}
                                />
                            </div>
                        )}
                        {supports('city') && (
                            <div>
                                <label className={labelClass}>City</label>
                                <Combobox
                                    fullWidth
                                    appearance="form"
                                    value={props.city}
                                    onChange={props.setCity}
                                    placeholder="Start typing a city…"
                                    filterByInput
                                    maxResults={50}
                                    suggestions={props.cities.map((c) => ({ value: c, label: c }))}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Neighborhood + Subdivision */}
                {(supports('neighborhood') || supports('subdivision')) && (
                    <div className="grid grid-cols-2 gap-3">
                        {supports('neighborhood') && (
                            <div>
                                <label className={labelClass}>Neighborhood</label>
                                <Select
                                    fullWidth
                                    appearance="form"
                                    value={props.neighborhood}
                                    onChange={props.setNeighborhood}
                                    placeholder="Any neighborhood"
                                    options={(() => {
                                        const out: { value: string; label: string }[] = [{ value: '', label: 'Any neighborhood' }];
                                        // Flatten the area-grouped map into a flat list with
                                        // the area shown as a soft prefix so users can tell
                                        // "Brickell (City of Miami)" from a same-named one elsewhere.
                                        Object.entries(props.neighborhoods).forEach(([area, hoods]) => {
                                            hoods.forEach((h) => out.push({ value: h, label: `${h} · ${area}` }));
                                        });
                                        return out;
                                    })()}
                                />
                            </div>
                        )}
                        {supports('subdivision') && (
                            <div>
                                <label className={labelClass}>Subdivision</label>
                                <Combobox
                                    fullWidth
                                    appearance="form"
                                    value={props.subdivision}
                                    onChange={props.setSubdivision}
                                    placeholder="Start typing a subdivision…"
                                    filterByInput
                                    maxResults={50}
                                    suggestions={props.subdivisions.map((s) => ({ value: s, label: s }))}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Bedrooms */}
                {supports('min_beds') && (
                    <SegmentedPicker
                        label="Bedrooms"
                        options={MLS_BEDS_BATHS_OPTIONS}
                        value={props.minBeds}
                        onChange={props.setMinBeds}
                        formatOption={(v) => (v === '' ? 'Any' : `${v}+`)}
                    />
                )}

                {/* Bathrooms */}
                {supports('min_baths') && (
                    <SegmentedPicker
                        label="Bathrooms"
                        options={MLS_BEDS_BATHS_OPTIONS}
                        value={props.minBaths}
                        onChange={props.setMinBaths}
                        formatOption={(v) => (v === '' ? 'Any' : `${v}+`)}
                    />
                )}

                {/* Price */}
                {supports('min_price', 'max_price') && (
                <div>
                    <label className={labelClass}>Price Range</label>
                    <div className="flex items-center gap-3">
                        <Combobox
                            fullWidth
                            appearance="form"
                            value={props.minPrice}
                            onChange={props.setMinPrice}
                            placeholder="Min $"
                            inputMode="numeric"
                            suggestions={MLS_MIN_PRICE_OPTIONS}
                        />
                        <span className="text-[#8B9096] shrink-0">—</span>
                        <Combobox
                            fullWidth
                            appearance="form"
                            value={props.maxPrice}
                            onChange={props.setMaxPrice}
                            placeholder="Max $"
                            inputMode="numeric"
                            suggestions={MLS_MAX_PRICE_OPTIONS}
                        />
                    </div>
                </div>
                )}

                {/* Sqft */}
                {supports('min_sqft', 'max_sqft') && (
                <div>
                    <label className={labelClass}>Living Area (sqft)</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={props.minSqft}
                            onChange={(e) => props.setMinSqft(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Min sqft"
                            className={textInputClass}
                        />
                        <span className="text-[#8B9096] shrink-0">—</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={props.maxSqft}
                            onChange={(e) => props.setMaxSqft(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Max sqft"
                            className={textInputClass}
                        />
                    </div>
                </div>
                )}

                {/* Lot acres */}
                {supports('min_lot_acres', 'max_lot_acres') && (
                <div>
                    <label className={labelClass}>Lot Size (acres)</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={props.minLotAcres}
                            onChange={(e) => props.setMinLotAcres(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="Min acres"
                            className={textInputClass}
                        />
                        <span className="text-[#8B9096] shrink-0">—</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={props.maxLotAcres}
                            onChange={(e) => props.setMaxLotAcres(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="Max acres"
                            className={textInputClass}
                        />
                    </div>
                </div>
                )}

                {/* Year built */}
                {supports('min_year_built', 'max_year_built') && (
                <div>
                    <label className={labelClass}>Year Built</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={props.minYearBuilt}
                            onChange={(e) => props.setMinYearBuilt(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                            placeholder="Min year"
                            className={textInputClass}
                        />
                        <span className="text-[#8B9096] shrink-0">—</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={props.maxYearBuilt}
                            onChange={(e) => props.setMaxYearBuilt(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                            placeholder="Max year"
                            className={textInputClass}
                        />
                    </div>
                </div>
                )}

                {/* Price reduced */}
                {supports('recently_reduced') && (
                <div>
                    <label className={labelClass}>Price Reduced</label>
                    <Select
                        fullWidth
                        appearance="form"
                        value={props.recentlyReducedDays}
                        onChange={props.setRecentlyReducedDays}
                        options={[
                            { value: '', label: 'Any time' },
                            { value: '7', label: 'Last 7 days' },
                            { value: '14', label: 'Last 14 days' },
                            { value: '30', label: 'Last 30 days' },
                            { value: '60', label: 'Last 60 days' },
                            { value: '90', label: 'Last 90 days' },
                        ]}
                    />
                </div>
                )}

                {/* Open house */}
                {supports('has_open_house_within_days') && (
                <div>
                    <label className={labelClass}>Has Open House</label>
                    <Select
                        fullWidth
                        appearance="form"
                        value={props.openHouseWithinDays}
                        onChange={props.setOpenHouseWithinDays}
                        options={[
                            { value: '', label: 'Any time' },
                            { value: '3', label: 'Next 3 days' },
                            { value: '7', label: 'Next 7 days' },
                            { value: '14', label: 'Next 14 days' },
                            { value: '30', label: 'Next 30 days' },
                        ]}
                    />
                </div>
                )}

                {/* Max HOA / maintenance fee */}
                {supports('max_hoa_fee') && (
                <div>
                    <label className={labelClass}>Max HOA / Maintenance Fee</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={props.maxHoaFee}
                        onChange={(e) => props.setMaxHoaFee(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Max $/month"
                        className={textInputClass}
                    />
                </div>
                )}

                {/* Property type */}
                {supports('property_type') && props.propertyTypes.length > 0 && (
                    <div>
                        <label className={labelClass}>Property Type</label>
                        <Select
                            fullWidth
                            appearance="form"
                            value={props.propertyType}
                            onChange={(v) => {
                                props.setPropertyType(v);
                                if (v !== props.propertyType) props.setPropertySubtype('');
                            }}
                            placeholder="Any property type"
                            options={[
                                { value: '', label: 'Any property type' },
                                ...props.propertyTypes.map((t) => ({ value: t.value, label: t.label })),
                            ]}
                        />
                    </div>
                )}

                {/* Property subtype */}
                {supports('property_subtype') && subtypeOptions.length > 0 && (
                    <div>
                        <label className={labelClass}>Property Subtype</label>
                        <Select
                            fullWidth
                            appearance="form"
                            value={props.propertySubtype}
                            onChange={props.setPropertySubtype}
                            placeholder="Any subtype"
                            options={[
                                { value: '', label: 'Any subtype' },
                                ...subtypeOptions.map((s) => ({ value: s.value, label: s.label })),
                            ]}
                        />
                    </div>
                )}

                {/* Status */}
                {supports('status') && props.statuses.length > 0 && (
                    <div>
                        <label className={labelClass}>Status</label>
                        <Select
                            fullWidth
                            appearance="form"
                            value={props.status}
                            onChange={props.setStatus}
                            placeholder="Any status"
                            options={[
                                { value: '', label: 'Any status' },
                                ...props.statuses.map((s) => ({ value: s.value, label: s.label })),
                            ]}
                        />
                    </div>
                )}

                {/* Agent & Office — multi-value token inputs */}
                {(supports('agent_id') || supports('office_id')) && (
                    <div className="space-y-4">
                        {supports('agent_id') && (
                            <div>
                                <label className={labelClass}>Agent IDs</label>
                                <MultiTokenInput
                                    appearance="form"
                                    values={splitTokens(props.agentId)}
                                    onChange={(arr) => props.setAgentId(joinTokens(arr))}
                                    placeholder="Enter agent ID and press Enter"
                                />
                                <p className="mt-1 text-[10px] text-[#8B9096]">Filter listings by one or more listing-agent MLS IDs.</p>
                            </div>
                        )}
                        {supports('office_id') && (
                            <div>
                                <label className={labelClass}>Office IDs</label>
                                <MultiTokenInput
                                    appearance="form"
                                    values={splitTokens(props.officeId)}
                                    onChange={(arr) => props.setOfficeId(joinTokens(arr))}
                                    placeholder="Enter office ID and press Enter"
                                />
                                <p className="mt-1 text-[10px] text-[#8B9096]">Filter listings by one or more listing-office MLS IDs.</p>
                            </div>
                        )}
                    </div>
                )}

                {someHidden && (
                    <p className="text-[11px] text-[#8B9096] border-t border-[#F0F1F3] pt-3">
                        This MLS supports a limited set of filters. Only the ones it can apply are shown — switch MLS to see others.
                    </p>
                )}
            </div>
        </SlideOverModal>
    );
}

function SegmentedPicker({ label, options, value, onChange, formatOption }: {
    label: string;
    options: string[];
    value: string;
    onChange: (v: string) => void;
    formatOption: (v: string) => string;
}) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                {options.map((val) => (
                    <button
                        key={val}
                        type="button"
                        onClick={() => onChange(val)}
                        className={`min-w-[44px] h-8 px-3 text-[13px] font-medium rounded-[3px] transition-colors cursor-pointer ${
                            value === val
                                ? 'bg-white text-[#111315] shadow-sm'
                                : 'text-[#5F656D] hover:text-[#111315]'
                        }`}
                    >
                        {formatOption(val)}
                    </button>
                ))}
            </div>
        </div>
    );
}

