import { ReactNode, useEffect, useRef, useState } from 'react';
import { Filters, SubtypeTerm, toQueryPayload } from '../types';
import { MinMaxRow, Segmented } from './Popover';
import { searchListings } from '../lib/api';

interface Props {
    open: boolean;
    onClose: () => void;
    /** Shared draft from FilterBar — commits only via "Show Results". */
    draft: Filters;
    set: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
    /** [classValue, label] pairs — MLS top-level property types. */
    classOptions: Array<[string, string]>;
    /** Sub-type terms (with parent_value) — shown filtered by the picked class. */
    subtypeTerms: SubtypeTerm[];
    /** Live result total from useSearch (applied filters, not the draft). */
    total: number;
    /** Search feed endpoint — live-counts the draft selection for the CTA. */
    countEndpoint?: string;
    /** Current free-text query, folded into the live-count payload. */
    searchText?: string;
    /** Commit the draft + close. */
    onShow: () => void;
    /** Reset everything back to defaults (and apply). */
    onReset: () => void;
}

const CLOSE_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;

const HOA_SLIDER_MAX = 2000;
const HOA_SLIDER_STEP = 50;

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 text-[13px] font-bold text-gray-900">{title}</div>
            {children}
        </section>
    );
}

/**
 * The "All Filters" overlay — replaces the old small Filters popover. Edits
 * the same draft the bar's popovers use; "Show N Results" commits it.
 *
 * Sections deliberately NOT here (no MlsQuery backend support — don't render
 * dead controls): Virtual Tour, Floor Plans, Open House, school zones,
 * garage/stories, price-per-sqft.
 */
export default function AllFiltersPanel({ open, onClose, draft, set, classOptions, subtypeTerms, total, countEndpoint, searchText, onShow, onReset }: Props) {
    // Live count for the draft selection — refreshes the "Show N Results" CTA
    // as the user toggles filters inside the panel (debounced; falls back to the
    // applied total while a request is in flight or no endpoint is wired).
    const [liveCount, setLiveCount] = useState<number | null>(null);
    const draftKey = JSON.stringify({ d: draft, q: searchText ?? '' });
    useEffect(() => {
        if (!open || !countEndpoint) return;
        const ctrl = new AbortController();
        const t = window.setTimeout(() => {
            const payload = toQueryPayload(draft, searchText ?? '', 'recommended', null);
            searchListings(countEndpoint, payload, 1, ctrl.signal)
                .then((res) => setLiveCount(typeof res.total === 'number' ? res.total : null))
                .catch(() => { /* keep last count */ });
        }, 350);
        return () => { window.clearTimeout(t); ctrl.abort(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, countEndpoint, draftKey]);

    if (!open) return null;

    const shownCount = liveCount ?? total;

    const toggleType = (value: string) =>
        set('types', draft.types.includes(value) ? draft.types.filter((t) => t !== value) : [...draft.types, value]);

    // Sub-types narrowed to the picked class (terms without a parent always
    // show) — same rule as the CRM MLS filters modal — then deduped by value
    // for display (MiamiRE repeats e.g. Condominium under sale + lease classes).
    const visibleSubtypes = subtypeTerms
        .filter((t) => !draft.propClass || !t.parent_value || t.parent_value === draft.propClass)
        .filter((t, i, arr) => arr.findIndex((o) => o.value === t.value) === i);

    // Switching class prunes selected sub-types that no longer apply.
    const pickClass = (cls: string) => {
        set('propClass', cls);
        if (cls) {
            const valid = new Set(subtypeTerms.filter((t) => !t.parent_value || t.parent_value === cls).map((t) => t.value));
            set('types', draft.types.filter((v) => valid.has(v)));
        }
    };

    // Slider parked at the right end = no cap ("Any").
    const hoaVal = draft.maxHoa.trim() === '' ? HOA_SLIDER_MAX : Math.max(0, Math.min(HOA_SLIDER_MAX, Number(draft.maxHoa) || 0));
    const hoaPct = (hoaVal / HOA_SLIDER_MAX) * 100;

    return (
        <div className="ps-allf-panel flex flex-col overflow-hidden rounded-2xl">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                <span className="text-sm font-bold text-gray-900">All Filters</span>
                <button type="button" onClick={onClose} aria-label="Close all filters" className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                    {CLOSE_ICON}
                </button>
            </div>

            {/* Scrollable body */}
            <div className="ps-allf-body min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3">
                {classOptions.length > 0 && (
                    <Section title="Property Type">
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="ps-type-pill" aria-pressed={draft.propClass === ''} onClick={() => pickClass('')}>
                                Any
                            </button>
                            {classOptions.map(([value, label]) => (
                                <button key={value} type="button" className="ps-type-pill" aria-pressed={draft.propClass === value} onClick={() => pickClass(draft.propClass === value ? '' : value)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </Section>
                )}

                <Section title="Property Sub Types">
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className="ps-type-pill" aria-pressed={draft.types.length === 0} onClick={() => set('types', [])}>
                            All Sub Types
                        </button>
                        {visibleSubtypes.map(({ value, label }) => (
                            <button key={value} type="button" className="ps-type-pill" aria-pressed={draft.types.includes(value)} onClick={() => toggleType(value)}>
                                {label}
                            </button>
                        ))}
                    </div>
                </Section>

                <Section title="Beds & Baths">
                    <p className="ps-pop-label">Bedrooms</p>
                    <Segmented options={['1', '2', '3', '4', '5']} value={draft.minBeds} onChange={(v) => set('minBeds', v)} />
                    <p className="ps-pop-label">Bathrooms</p>
                    <Segmented options={['1', '2', '3', '4']} value={draft.minBaths} onChange={(v) => set('minBaths', v)} />
                </Section>

                <Section title="Year Built">
                    <MinMaxRow labels={['From', 'To']} placeholder={['Any', 'Any']} min={1800} values={[draft.minYear, draft.maxYear]} onChange={([a, b]) => { set('minYear', a); set('maxYear', b); }} />
                </Section>

                <Section title="Square Feet">
                    <MinMaxRow step={100} values={[draft.minSqft, draft.maxSqft]} onChange={([a, b]) => { set('minSqft', a); set('maxSqft', b); }} />
                </Section>

                <Section title="Lot Size (acres)">
                    <MinMaxRow step={0.1} values={[draft.minLot, draft.maxLot]} onChange={([a, b]) => { set('minLot', a); set('maxLot', b); }} />
                </Section>

                <Section title="Max HOA / Maintenance Fee">
                    {/* Max-only on purpose: MlsQuery exposes max_hoa_fee but no min,
                        so it's a single-thumb slider + one input (no dead min control). */}
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Monthly fee</span>
                        <span className="text-xs font-bold text-gray-900">
                            {draft.maxHoa.trim() === '' ? 'Any amount' : `Up to $${(Number(draft.maxHoa) || 0).toLocaleString()}/mo`}
                        </span>
                    </div>
                    <input
                        type="range"
                        className="ps-range"
                        min={0}
                        max={HOA_SLIDER_MAX}
                        step={HOA_SLIDER_STEP}
                        value={hoaVal}
                        aria-label="Maximum HOA fee per month"
                        onChange={(e) => { const v = Number(e.target.value); set('maxHoa', v >= HOA_SLIDER_MAX ? '' : String(v)); }}
                        style={{ background: `linear-gradient(to right, var(--ps-theme-primary, #0f1115) ${hoaPct}%, #e5e7eb ${hoaPct}%)` }}
                    />
                    <div className="ps-pop-row" style={{ marginTop: 12 }}>
                        <label>Max $ / mo<input type="number" min={0} step={HOA_SLIDER_STEP} value={draft.maxHoa} placeholder="Any" onChange={(e) => set('maxHoa', e.target.value)} /></label>
                    </div>
                </Section>

                <Section title="New Listings">
                    <select className="ps-pop-select" style={{ marginTop: 0 }} value={draft.newDays} aria-label="New on market" onChange={(e) => set('newDays', e.target.value)}>
                        <option value="">Any time</option>
                        <option value="7">Last 7 days</option>
                        <option value="14">Last 14 days</option>
                        <option value="30">Last 30 days</option>
                    </select>
                </Section>
            </div>

            {/* Sticky footer */}
            <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
                <button type="button" onClick={onReset} className="h-10 flex-1 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    Reset All Filters
                </button>
                <button type="button" onClick={onShow} className="ps-allf-show h-10 flex-1 rounded-xl text-xs font-semibold text-white">
                    Show {shownCount.toLocaleString()} Results
                </button>
            </div>
        </div>
    );
}
