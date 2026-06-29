import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { useMlsTaxonomy, subtypesForParent } from '@/hooks/useMlsTaxonomy';

/** Per-tab hero search configuration, persisted as flat `hero_tab_{key}_*` page_data keys. */
export interface HeroTabCfg {
    ai: boolean;
    ptype: string;        // property class (MLS top-level type); '' = any
    subtypes: string[];   // MLS sub-type values, filtered to the chosen class
    status: string;       // '' = Active (default) | 'all' | 'sold'
    loc: string;          // default location prefilled into the search box
    minPrice: string;
    maxPrice: string;
}

export const EMPTY_TAB_CFG: HeroTabCfg = {
    ai: false, ptype: '', subtypes: [], status: '', loc: '', minPrice: '', maxPrice: '',
};

interface Props {
    tabKey: string;       // buy | rent | sell | value
    label: string;
    cfg: HeroTabCfg;
    /** Global IDX restrictions (page_data._config.search) the defaults must respect. */
    excludedTypes: string[];
    excludedSubtypes: string[];
    allowedTransactions: string[]; // ['sale','rent'] = no restriction
    onChange: (cfg: HeroTabCfg) => void;
    onClose: () => void;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
            className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors shrink-0 ${on ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}>
            <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
        </button>
    );
}

function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
            {options.map((o) => (
                <button key={o.value} type="button" onClick={() => onChange(o.value)}
                    className={`h-7 px-3 text-[12px] font-medium rounded-[3px] transition-colors ${value === o.value ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/**
 * Sub-modal opened from the gear icon next to a hero search tab. Lets the owner
 * pre-configure that tab's search: an AI natural-language toggle plus default
 * filters (property type / sub-types / status / location / price) — all MLS
 * values pulled live from the taxonomy, never hardcoded.
 *
 * Sell/Value tabs collect a street address for a valuation, so search filters
 * don't apply there — only the AI prompt is offered.
 */
export default function HeroTabSettingsModal({ tabKey, label, cfg, excludedTypes, excludedSubtypes, allowedTransactions, onChange, onClose }: Props) {
    const tax = useMlsTaxonomy([]);
    const isSearch = tabKey === 'buy' || tabKey === 'rent';
    const set = <K extends keyof HeroTabCfg>(k: K, v: HeroTabCfg[K]) => onChange({ ...cfg, [k]: v });

    // Stay within the website's global IDX restrictions: never offer a globally
    // hidden type/sub-type, and flag a tab whose transaction is globally disabled.
    const propertyTypes = tax.propertyTypes.filter((t) => !excludedTypes.includes(t.value));
    const subtypes = subtypesForParent(tax.propertySubtypes, cfg.ptype || null)
        .filter((s) => !excludedSubtypes.includes(s.value));
    const tabTxn = tabKey === 'rent' ? 'rent' : 'sale';
    const txnDisabled = isSearch && !allowedTransactions.includes(tabTxn);
    const toggleSubtype = (value: string) => {
        const next = cfg.subtypes.includes(value)
            ? cfg.subtypes.filter((v) => v !== value)
            : [...cfg.subtypes, value];
        set('subtypes', next);
    };

    const footer = (
        <button type="button" onClick={onClose} className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] transition-colors">Done</button>
    );

    return (
        <SlideOverModal title={`${label} — Search Settings`} onClose={onClose} footer={footer} width={460}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
                {/* AI search */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[13px] font-medium text-[#111315]">AI Search</p>
                        <p className="text-[11px] text-[#8B9096] mt-0.5 leading-relaxed">
                            Let visitors describe what they want in plain language (e.g. “3-bed condo near the water under $800k”).
                        </p>
                    </div>
                    <Toggle on={cfg.ai} onChange={(v) => set('ai', v)} />
                </div>

                {txnDisabled && (
                    <div className="rounded-md border border-[#F1C0C0] bg-[#FCEDED] px-3 py-2 text-[11px] text-[#A33A3A] leading-relaxed">
                        {tabTxn === 'rent' ? 'Rentals' : 'For-sale listings'} are turned off in your IDX settings (Property Search → Restrictions), so this tab won’t return results. Enable {tabTxn === 'rent' ? 'rentals' : 'sales'} there or hide this tab.
                    </div>
                )}

                {!isSearch && (
                    <p className="text-[12px] text-[#8B9096] border-t border-[#E4E7EB] pt-5 leading-relaxed">
                        This tab collects a property address for a home valuation, so search filters don’t apply here.
                    </p>
                )}

                {isSearch && (
                    <>
                        <div className="border-t border-[#E4E7EB] pt-5 space-y-4">
                            <p className="text-[12px] font-semibold text-[#111315]">Default Filters</p>
                            <p className="text-[11px] text-[#8B9096] -mt-2.5">Pre-applied when a visitor searches from this tab — and kept within your global IDX settings (Property Search → Restrictions). Visitors can still change them on the results page.</p>

                            {tax.loading && <p className="text-[12px] text-[#8B9096]">Loading MLS options…</p>}

                            {!tax.loading && propertyTypes.length === 0 && (
                                <p className="text-[12px] text-[#8B9096]">Connect an MLS to set property-type, sub-type and status defaults.</p>
                            )}

                            <div>
                                <FieldLabel>Default Location</FieldLabel>
                                <input type="text" value={cfg.loc} onChange={(e) => set('loc', e.target.value)} className={formInputClass} placeholder="e.g. Miami, FL" />
                            </div>

                            {!tax.loading && propertyTypes.length > 0 && (
                                <>
                                    <div>
                                        <FieldLabel>Property Type</FieldLabel>
                                        <select
                                            value={cfg.ptype}
                                            onChange={(e) => { set('ptype', e.target.value); set('subtypes', []); }}
                                            className={formInputClass}
                                        >
                                            <option value="">Any type</option>
                                            {propertyTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>

                                    {subtypes.length > 0 && (
                                        <div>
                                            <FieldLabel>Property Sub Types</FieldLabel>
                                            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                                                {subtypes.map((s) => {
                                                    const on = cfg.subtypes.includes(s.value);
                                                    return (
                                                        <label key={s.value} className="flex items-center gap-2 text-[12px] text-[#111315] cursor-pointer">
                                                            <input type="checkbox" checked={on} onChange={() => toggleSubtype(s.value)}
                                                                className="h-3.5 w-3.5 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-[#1693C9]" />
                                                            <span className="truncate">{s.label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <FieldLabel>Status</FieldLabel>
                                        <Seg value={cfg.status} onChange={(v) => set('status', v)} options={[{ value: '', label: 'Active' }, { value: 'all', label: 'All' }, { value: 'sold', label: 'Sold' }]} />
                                    </div>
                                </>
                            )}

                            <div>
                                <FieldLabel>Price Range</FieldLabel>
                                <div className="flex items-center gap-2">
                                    <input type="number" min={0} step={1000} value={cfg.minPrice} onChange={(e) => set('minPrice', e.target.value)} className={formInputClass} placeholder="No min" />
                                    <span className="text-[#8B9096] text-[12px]">–</span>
                                    <input type="number" min={0} step={1000} value={cfg.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} className={formInputClass} placeholder="No max" />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </SlideOverModal>
    );
}
