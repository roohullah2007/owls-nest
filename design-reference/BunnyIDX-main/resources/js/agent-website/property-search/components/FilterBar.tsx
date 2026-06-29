import { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_FILTERS, Filters, LocationEntry, SubtypeTerm } from '../types';
import Popover, { MinMaxRow, Segmented } from './Popover';
import AllFiltersPanel from './AllFiltersPanel';

interface Props {
    filters: Filters;
    onApply: (next: Filters) => void;
    searchText: string;
    onSearchText: (v: string) => void;
    view: 'map' | 'grid';
    onView: (v: 'map' | 'grid') => void;
    onSaveSearch: () => void;
    /** Live result total (applied filters) — the "Show N Results" CTA. */
    total: number;
    /** [classValue, label] pairs from the LIVE MLS taxonomy (response-driven). */
    classOptions?: Array<[string, string]>;
    /** Sub-type terms (each carrying parent_value) from the LIVE MLS taxonomy. */
    subtypeTerms?: SubtypeTerm[];
    /** Search feed endpoint — lets All Filters live-count the draft selection. */
    searchEndpoint?: string;
    /** Location vocabulary (cities / counties / neighborhoods) the connected
        MLS datasets declare — drives the search box autocomplete. */
    locations?: LocationEntry[];
}

/** Fallback ONLY — used until/unless the search response carries the live MLS
    taxonomy (response.taxonomy.property_subtypes). Never the preferred source. */
const FALLBACK_SUBTYPES: SubtypeTerm[] = [
    { value: 'Single Family Residence', label: 'Single Family' },
    { value: 'Condominium', label: 'Condominium' },
    { value: 'Townhouse', label: 'Townhouse' },
    { value: 'Villa', label: 'Villa' },
    { value: 'Land', label: 'Land / Lot' },
];

const I = {
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    price: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
    type: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" /></svg>,
    built: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    beds: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>,
    sqft: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>,
    filters: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="8" cy="6" r="1.5" fill="currentColor" /><circle cx="16" cy="12" r="1.5" fill="currentColor" /><circle cx="10" cy="18" r="1.5" fill="currentColor" /></svg>,
    save: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>,
    map: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>,
    grid: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
    close: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    chevron: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
};

/**
 * The filter bar: location search, Price / Type / Built / Beds & Baths / Sqft
 * popovers, the All Filters overlay panel, Save Search, and the Map ⁄ Grid view
 * toggle. On mobile the popovers stack inside a slide-down sheet.
 *
 * Status / Sold / Price Changed / Draw live on the MAP overlay
 * (components/StatusRow.tsx), not here.
 *
 * Popovers + the All Filters panel edit a local draft; Apply / "Show Results"
 * commits it.
 */
export default function FilterBar({ filters, onApply, searchText, onSearchText, view, onView, onSaveSearch, total, classOptions, subtypeTerms, searchEndpoint, locations }: Props) {
    const subtypes = subtypeTerms?.length ? subtypeTerms : FALLBACK_SUBTYPES;
    const [draft, setDraft] = useState<Filters>(filters);
    const [openPop, setOpenPop] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [allOpen, setAllOpen] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);

    // Dataset-declared locations matching what's typed — word-prefix matches
    // rank above mid-word ones so "boca" puts "Boca Raton, FL" first.
    const locationMatches = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (q.length < 2 || !locations?.length) return [];
        const starts: LocationEntry[] = [];
        const contains: LocationEntry[] = [];
        for (const entry of locations) {
            const hay = entry.label.toLowerCase();
            if (hay.startsWith(q) || hay.split(/[\s,]+/).some((w) => w.startsWith(q))) starts.push(entry);
            else if (hay.includes(q)) contains.push(entry);
            if (starts.length >= 6) break;
        }
        return [...starts, ...contains].slice(0, 6).filter((m) => m.value.toLowerCase() !== q);
    }, [locations, searchText]);

    const allRef = useRef<HTMLDivElement>(null);

    // Keep the local draft in sync if the applied filters change elsewhere
    // (map status-row quick toggles, "Reset All Filters", a future saved-view
    // restore) so the popover inputs don't drift from what's being searched.
    useEffect(() => { setDraft(filters); }, [filters]);

    // Outside-click close for the All Filters panel.
    useEffect(() => {
        if (!allOpen) return;
        const onDoc = (e: MouseEvent) => {
            if (!allRef.current?.contains(e.target as Node)) setAllOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [allOpen]);

    const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setDraft((d) => ({ ...d, [key]: value }));
    const toggle = (id: string) => setOpenPop((cur) => (cur === id ? null : id));
    const apply = () => { setOpenPop(null); onApply(draft); };

    const applyBtn = <button type="button" className="ps-pop-apply" onClick={apply}>Apply</button>;
    const pop = (id: string, label: string, icon: ReactElement, body: ReactElement, align: 'left' | 'right' = 'left', panelClassName = '') => (
        <Popover label={label} icon={icon} open={openPop === id} onToggle={() => toggle(id)} onClose={() => setOpenPop(null)} align={align} panelClassName={panelClassName}>
            {body}
            {applyBtn}
        </Popover>
    );

    const viewToggle = (compact: boolean) => (
        <div className={`flex shrink-0 items-center overflow-hidden border border-gray-300 ${compact ? 'rounded-xl' : 'rounded-lg'}`} style={{ height: compact ? 40 : 36 }}>
            {(['map', 'grid'] as const).map((v, i) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    aria-label={`${v} view`}
                    onClick={() => onView(v)}
                    className={`ps-view-btn flex h-full items-center justify-center gap-1.5 px-3 text-xs font-semibold ${i > 0 ? 'border-l border-gray-300' : ''}`}
                    style={{ whiteSpace: 'nowrap' }}
                >
                    {I[v]}
                    {!compact && (v === 'map' ? 'Map' : 'Grid')}
                </button>
            ))}
        </div>
    );

    return (
        <div className="ps-filterbar relative z-[2000] shrink-0 border-b border-gray-200 bg-white py-2.5">
            {/* ── Row 1: search + popovers + All Filters + Save Search + view ── */}
            <div className="flex max-w-full flex-wrap items-center gap-2 px-4 lg:flex-nowrap">
                {/* Transaction type — For Sale / For Rent (maps to MLS classes). */}
                <select
                    value={filters.transaction}
                    onChange={(e) => {
                        const transaction = e.target.value as 'sale' | 'rent';
                        // Price Changed is a for-sale concept — drop it on rentals.
                        onApply({ ...filters, transaction, priceReduced: transaction === 'rent' ? false : filters.priceReduced });
                    }}
                    aria-label="Transaction type"
                    className="ps-txn-select hidden lg:block h-10 shrink-0 cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white py-0 pl-3 pr-8 text-[13px] font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus:border-gray-400 focus:outline-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                >
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                </select>

                {/* Location search — suggestions come from the MLS datasets'
                    declared vocabulary (feed-exact city/neighborhood/county
                    spellings), so visitors pick values the feed can answer. */}
                <div className="relative min-w-0 flex-1 lg:w-auto lg:flex-1 lg:min-w-[200px] lg:max-w-[380px]">
                    <form className="relative flex" onSubmit={(e) => e.preventDefault()} autoComplete="off">
                        <div className="relative flex-1">
                            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{I.search}</div>
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => onSearchText(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                                placeholder="Search city, neighborhood, or address..."
                                className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-sm transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                            />
                            {searchFocused && locationMatches.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                                    {locationMatches.map((m) => (
                                        <button
                                            key={`${m.type}|${m.value}`}
                                            type="button"
                                            // mousedown beats the input's blur timeout
                                            onMouseDown={(e) => { e.preventDefault(); onSearchText(m.value); setSearchFocused(false); }}
                                            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                                        >
                                            <span className="truncate">{m.label}</span>
                                            <span className="ml-3 shrink-0 text-[11px] uppercase tracking-wide text-gray-400">{m.type}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Mobile: icon-only sheet toggle + compact view toggle */}
                <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    aria-label="Filters"
                    title="Filters"
                    className="ps-pop-btn flex items-center justify-center rounded-xl border border-gray-300 bg-white transition-colors hover:bg-gray-50 lg:hidden"
                    style={{ height: 40, width: 40, flexShrink: 0 }}
                >
                    {I.filters}
                </button>
                <div className="lg:hidden">{viewToggle(true)}</div>

                {/* Desktop pops — stacked sheet on mobile */}
                <div className={`ps-pops ${sheetOpen ? 'is-open' : ''} hidden lg:contents`}>
                    <div className="ps-pops-head lg:hidden">
                        <span>Filters</span>
                        <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close filters">{I.close}</button>
                    </div>

                    {/* Transaction toggle — mobile-only (the desktop top-row select is hidden on small screens). */}
                    <div className="ps-sheet-txn">
                        <p className="ps-pop-label">Listing Type</p>
                        <div className="ps-seg">
                            {(['sale', 'rent'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={filters.transaction === t ? 'is-active' : ''}
                                    onClick={() => onApply({ ...filters, transaction: t, priceReduced: t === 'rent' ? false : filters.priceReduced })}
                                >
                                    {t === 'sale' ? 'For Sale' : 'For Rent'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {pop('price', 'Price', I.price,
                        <MinMaxRow values={[draft.minPrice, draft.maxPrice]} step={1000} onChange={([a, b]) => { set('minPrice', a); set('maxPrice', b); }} />)}

                    {/* Property sub-type checklist lives in All Filters only. */}

                    {pop('built', 'Built', I.built,
                        <MinMaxRow labels={['From', 'To']} placeholder={['Any', 'Any']} min={1800} values={[draft.minYear, draft.maxYear]} onChange={([a, b]) => { set('minYear', a); set('maxYear', b); }} />)}

                    {pop('beds', 'Beds & Baths', I.beds,
                        <>
                            <p className="ps-pop-label">Bedrooms</p>
                            <Segmented options={['1', '2', '3', '4', '5']} value={draft.minBeds} onChange={(v) => set('minBeds', v)} />
                            <p className="ps-pop-label">Bathrooms</p>
                            <Segmented options={['1', '2', '3', '4']} value={draft.minBaths} onChange={(v) => set('minBaths', v)} />
                        </>)}

                    {pop('sqft', 'Sqft', I.sqft,
                        <MinMaxRow values={[draft.minSqft, draft.maxSqft]} step={100} onChange={([a, b]) => { set('minSqft', a); set('maxSqft', b); }} />)}

                    {/* All Filters overlay panel (replaces the old small Filters popover). */}
                    <div ref={allRef} className="ps-pop relative">
                        <button
                            type="button"
                            onClick={() => setAllOpen((o) => !o)}
                            aria-expanded={allOpen}
                            className="ps-pop-btn flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-[13px] font-medium transition-colors hover:bg-gray-50"
                            style={{ height: 40, whiteSpace: 'nowrap' }}
                        >
                            {I.filters}
                            All Filters
                            {I.chevron}
                        </button>
                        <AllFiltersPanel
                            open={allOpen}
                            onClose={() => setAllOpen(false)}
                            draft={draft}
                            set={set}
                            classOptions={classOptions ?? []}
                            subtypeTerms={subtypes}
                            total={total}
                            countEndpoint={searchEndpoint}
                            searchText={searchText}
                            onShow={() => { setAllOpen(false); onApply(draft); }}
                            onReset={() => onApply({ ...EMPTY_FILTERS, statusMode: filters.statusMode, soldWithinDays: filters.soldWithinDays })}
                        />
                    </div>

                    {/* Save Search */}
                    <button
                        type="button"
                        onClick={onSaveSearch}
                        className="ps-save-btn flex shrink-0 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-opacity hover:opacity-90"
                        style={{ height: 36, whiteSpace: 'nowrap', letterSpacing: '.3px' }}
                    >
                        {I.save}
                        Save Search
                    </button>

                    <div className="hidden flex-1 lg:block" />

                    {/* Desktop view toggle */}
                    <div className="hidden lg:block">{viewToggle(false)}</div>
                </div>
            </div>

        </div>
    );
}
