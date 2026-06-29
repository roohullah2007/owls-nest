import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Contact } from './types';
import Avatar from '@/Components/Crm/Avatar';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';

interface SearchFilters {
    city?: string;
    state_province?: string;
    postal_code?: string;
    property_type?: string;
    min_price?: number | string;
    max_price?: number | string;
    min_beds?: number | string;
    min_baths?: number | string;
    min_sqft?: number | string;
    max_sqft?: number | string;
    year_built_min?: number | string;
    features?: string[];
}

interface ContactSearch {
    id: number;
    name: string;
    filters: SearchFilters;
    notes: string | null;
    last_run_at: string | null;
    created_at: string;
    user?: { id: number; name: string } | null;
}

interface Props {
    contact: Contact & { searches?: ContactSearch[] };
}

const PROPERTY_TYPES = [
    { value: '', label: 'Any' },
    { value: 'Residential', label: 'Residential' },
    { value: 'Condominium', label: 'Condominium' },
    { value: 'Townhouse', label: 'Townhouse' },
    { value: 'Multi-Family', label: 'Multi-Family' },
    { value: 'Land', label: 'Land' },
    { value: 'Commercial', label: 'Commercial' },
];

const FEATURE_OPTIONS = ['Pool', 'Waterfront', 'Garage', 'Pet-friendly', 'New construction', 'Fenced yard', 'Updated kitchen', 'Open floor plan'];

function formatMoney(v: number | string | null | undefined): string {
    if (v === null || v === undefined || v === '') return '';
    const n = typeof v === 'string' ? Number(v) : v;
    if (!Number.isFinite(n)) return '';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${n.toLocaleString()}`;
}

function formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function summarizeFilters(f: SearchFilters): string[] {
    const chips: string[] = [];
    if (f.property_type) chips.push(f.property_type);
    if (f.city) chips.push(f.city + (f.state_province ? `, ${f.state_province}` : ''));
    else if (f.state_province) chips.push(f.state_province);
    if (f.postal_code) chips.push(f.postal_code);
    if (f.min_price || f.max_price) {
        const lo = f.min_price ? formatMoney(f.min_price) : '';
        const hi = f.max_price ? formatMoney(f.max_price) : '';
        if (lo && hi) chips.push(`${lo} – ${hi}`);
        else if (lo) chips.push(`${lo}+`);
        else if (hi) chips.push(`Up to ${hi}`);
    }
    if (f.min_beds) chips.push(`${f.min_beds}+ bd`);
    if (f.min_baths) chips.push(`${f.min_baths}+ ba`);
    if (f.min_sqft || f.max_sqft) {
        const lo = f.min_sqft ? `${Number(f.min_sqft).toLocaleString()}` : '';
        const hi = f.max_sqft ? `${Number(f.max_sqft).toLocaleString()}` : '';
        if (lo && hi) chips.push(`${lo}–${hi} sqft`);
        else if (lo) chips.push(`${lo}+ sqft`);
        else if (hi) chips.push(`Up to ${hi} sqft`);
    }
    if (f.year_built_min) chips.push(`Built ${f.year_built_min}+`);
    if (f.features?.length) chips.push(...f.features);
    return chips;
}

function SearchCard({ search, contactUuid, onEdit }: { search: ContactSearch; contactUuid: string; onEdit: () => void }) {
    const chips = summarizeFilters(search.filters);

    function destroy() {
        if (!confirm(`Delete "${search.name}"?`)) return;
        router.delete(route('crm.contacts.searches.destroy', [contactUuid, search.id]), { preserveScroll: true });
    }

    function runOnProperties() {
        // Navigate to the global Properties index pre-filtered. Keys map to fields the
        // listings index already understands; unknown keys are ignored harmlessly.
        const params = new URLSearchParams();
        if (search.filters.city) params.set('city', search.filters.city);
        if (search.filters.min_price) params.set('min_price', String(search.filters.min_price));
        if (search.filters.max_price) params.set('max_price', String(search.filters.max_price));
        if (search.filters.min_beds) params.set('min_beds', String(search.filters.min_beds));
        if (search.filters.min_baths) params.set('min_baths', String(search.filters.min_baths));
        if (search.filters.property_type) params.set('property_type', search.filters.property_type);
        window.open(route('crm.listings.index') + (params.toString() ? `?${params}` : ''), '_blank');
    }

    return (
        <article className="group bg-white border border-[#E4E7EB] rounded-[4px] p-4 hover:border-[#1693C9] hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <svg className="h-4 w-4 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    <h3 className="text-sm font-semibold text-[#111315] truncate">{search.name}</h3>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={runOnProperties} title="Run on Properties" className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-[#1693C9] hover:bg-[#EBF5FF] transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                    </button>
                    <button type="button" onClick={onEdit} title="Edit" className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                    </button>
                    <button type="button" onClick={destroy} title="Delete" className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                </div>
            </div>

            {chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {chips.map((c, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#F3F4F6] text-[#5F656D]">{c}</span>
                    ))}
                </div>
            )}

            {search.notes && (
                <p className="mt-3 text-xs text-[#5F656D] leading-relaxed whitespace-pre-wrap line-clamp-2">{search.notes}</p>
            )}

            <div className="mt-3 pt-3 border-t border-[#F3F4F6] flex items-center gap-3 text-[11px] text-[#8B9096]">
                {search.user && (
                    <span className="inline-flex items-center gap-1.5">
                        <Avatar id={search.user.id} name={search.user.name} size="sm" />
                        <span>Added by {search.user.name}</span>
                    </span>
                )}
                <span className="ml-auto">Saved {formatDate(search.created_at)}</span>
            </div>
        </article>
    );
}

interface FormProps {
    contactUuid: string;
    initial?: ContactSearch | null;
    onClose: () => void;
}

function SearchFormModal({ contactUuid, initial, onClose }: FormProps) {
    const isEdit = !!initial;
    const form = useForm({
        name: initial?.name || '',
        notes: initial?.notes || '',
        filters: {
            city: initial?.filters?.city || '',
            state_province: initial?.filters?.state_province || '',
            postal_code: initial?.filters?.postal_code || '',
            property_type: initial?.filters?.property_type || '',
            min_price: initial?.filters?.min_price?.toString() || '',
            max_price: initial?.filters?.max_price?.toString() || '',
            min_beds: initial?.filters?.min_beds?.toString() || '',
            min_baths: initial?.filters?.min_baths?.toString() || '',
            min_sqft: initial?.filters?.min_sqft?.toString() || '',
            max_sqft: initial?.filters?.max_sqft?.toString() || '',
            year_built_min: initial?.filters?.year_built_min?.toString() || '',
            features: (initial?.filters?.features as string[] | undefined) || [],
        },
    });

    function setFilter<K extends keyof typeof form.data.filters>(key: K, value: typeof form.data.filters[K]) {
        form.setData('filters', { ...form.data.filters, [key]: value });
    }

    function toggleFeature(f: string) {
        const cur = form.data.filters.features as string[];
        const next = cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f];
        setFilter('features', next as any);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        // Strip empty strings out of filters so the server-side gets clean values.
        const cleanFilters: Record<string, any> = {};
        Object.entries(form.data.filters).forEach(([k, v]) => {
            if (Array.isArray(v)) { if (v.length > 0) cleanFilters[k] = v; return; }
            if (v !== '' && v != null) cleanFilters[k] = v;
        });
        const payload = { name: form.data.name, notes: form.data.notes || null, filters: cleanFilters };

        if (isEdit && initial) {
            router.patch(route('crm.contacts.searches.update', [contactUuid, initial.id]), payload as any, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        } else {
            router.post(route('crm.contacts.searches.store', contactUuid), payload as any, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    }

    const formId = 'contact-search-form';

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                form={formId}
                disabled={form.processing || !form.data.name.trim()}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {form.processing ? 'Saving…' : (isEdit ? 'Save changes' : 'Save search')}
            </button>
        </>
    );

    return (
        <SlideOverModal title={isEdit ? 'Edit search' : 'Save a search'} onClose={onClose} footer={footer} width={520}>
            <form id={formId} onSubmit={submit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-5">
                    <div>
                        <FieldLabel htmlFor="search_name">Search name <span className="text-[#DC2626]">*</span></FieldLabel>
                        <input
                            id="search_name"
                            type="text"
                            required
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            placeholder="e.g. 3+ bed homes under $500K in Miami"
                            className={inputClass}
                            autoFocus
                        />
                        {form.errors.name && <p className="mt-1 text-[11px] text-red-500">{form.errors.name}</p>}
                    </div>

                    <fieldset className="space-y-3 pt-3 border-t border-[#E4E7EB]">
                        <legend className="text-[10px] font-semibold text-[#8B9096] tracking-wider uppercase">Location</legend>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <FieldLabel htmlFor="search_city">City</FieldLabel>
                                <input id="search_city" type="text" value={form.data.filters.city} onChange={(e) => setFilter('city', e.target.value)} placeholder="Miami" className={inputClass} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="search_state">State</FieldLabel>
                                <input id="search_state" type="text" value={form.data.filters.state_province} onChange={(e) => setFilter('state_province', e.target.value)} placeholder="FL" className={inputClass} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="search_zip">Postal code</FieldLabel>
                                <input id="search_zip" type="text" value={form.data.filters.postal_code} onChange={(e) => setFilter('postal_code', e.target.value)} className={inputClass} />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="space-y-3 pt-3 border-t border-[#E4E7EB]">
                        <legend className="text-[10px] font-semibold text-[#8B9096] tracking-wider uppercase">Property</legend>
                        <div>
                            <FieldLabel htmlFor="search_type">Property type</FieldLabel>
                            <select id="search_type" value={form.data.filters.property_type} onChange={(e) => setFilter('property_type', e.target.value)} className={inputClass}>
                                {PROPERTY_TYPES.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel htmlFor="search_minbeds">Min beds</FieldLabel>
                                <input id="search_minbeds" type="number" min={0} value={form.data.filters.min_beds} onChange={(e) => setFilter('min_beds', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="search_minbaths">Min baths</FieldLabel>
                                <input id="search_minbaths" type="number" min={0} step="0.5" value={form.data.filters.min_baths} onChange={(e) => setFilter('min_baths', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="search_minsqft">Min sqft</FieldLabel>
                                <input id="search_minsqft" type="number" min={0} value={form.data.filters.min_sqft} onChange={(e) => setFilter('min_sqft', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="search_maxsqft">Max sqft</FieldLabel>
                                <input id="search_maxsqft" type="number" min={0} value={form.data.filters.max_sqft} onChange={(e) => setFilter('max_sqft', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="search_minprice">Min price</FieldLabel>
                                <input id="search_minprice" type="number" min={0} value={form.data.filters.min_price} onChange={(e) => setFilter('min_price', e.target.value)} placeholder="$" className={inputClass} />
                            </div>
                            <div>
                                <FieldLabel htmlFor="search_maxprice">Max price</FieldLabel>
                                <input id="search_maxprice" type="number" min={0} value={form.data.filters.max_price} onChange={(e) => setFilter('max_price', e.target.value)} placeholder="$" className={inputClass} />
                            </div>
                            <div className="col-span-2">
                                <FieldLabel htmlFor="search_year">Year built (min)</FieldLabel>
                                <input id="search_year" type="number" min={1800} max={2100} value={form.data.filters.year_built_min} onChange={(e) => setFilter('year_built_min', e.target.value)} className={inputClass} />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="space-y-2 pt-3 border-t border-[#E4E7EB]">
                        <legend className="text-[10px] font-semibold text-[#8B9096] tracking-wider uppercase">Features</legend>
                        <div className="flex flex-wrap gap-1.5">
                            {FEATURE_OPTIONS.map((f) => {
                                const active = (form.data.filters.features as string[]).includes(f);
                                return (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => toggleFeature(f)}
                                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                                            active ? 'bg-[#1693C9] text-white border-[#1693C9]' : 'text-[#5F656D] bg-white border-[#E4E7EB] hover:border-[#1693C9]'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="pt-3 border-t border-[#E4E7EB]">
                        <FieldLabel htmlFor="search_notes">Notes</FieldLabel>
                        <textarea
                            id="search_notes"
                            rows={3}
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder="Anything else worth remembering about this search…"
                            className={inputClass + ' resize-none'}
                        />
                    </div>
                </div>
            </form>
        </SlideOverModal>
    );
}

export default function SearchesTab({ contact }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<ContactSearch | null>(null);
    const searches = (contact.searches || []) as ContactSearch[];

    function openAdd() { setEditing(null); setShowForm(true); }
    function openEdit(s: ContactSearch) { setEditing(s); setShowForm(true); }
    function close() { setShowForm(false); setEditing(null); }

    return (
        <div className="p-3 sm:p-4 lg:p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-[15px] font-semibold text-[#111315]">Saved Searches</h2>
                    <p className="text-[13px] text-[#111315] mt-0.5">Searches this lead saved from your website. Each one will trigger a property alert when a matching MLS or office listing appears — alert delivery is being wired up.</p>
                </div>
                <button
                    type="button"
                    onClick={openAdd}
                    className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Save a search
                </button>
            </div>

            {searches.length === 0 ? (
                <div className={`rounded-[4px] p-6 border ${contact.type === 'buyer' ? 'bg-[#EBF5FF] border-[#BFDBFE]' : 'bg-[#F9FAFB] border-[#E4E7EB]'}`}>
                    <p className="text-[13px] font-semibold text-[#111315]">No saved searches yet</p>
                    <p className="text-xs text-[#5F656D] mt-1 leading-relaxed">
                        Saved searches will show up here once this lead saves one on your website. You can also add one manually — the lead will be auto-notified when a matching listing comes in from the MLS or your office once alert delivery is live.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {searches.map((s) => (
                        <SearchCard key={s.id} search={s} contactUuid={contact.uuid} onEdit={() => openEdit(s)} />
                    ))}
                </div>
            )}

            {showForm && <SearchFormModal contactUuid={contact.uuid} initial={editing} onClose={close} />}
        </div>
    );
}
