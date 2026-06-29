import { Head, router, usePage } from '@inertiajs/react';
import type { PageProps as InertiaPageProps } from '@/types';
import { useState, useEffect } from 'react';
import CrmLayout from '@/Layouts/CrmLayout';
import type { IdxConnection, IdxSearch, IdxWidget, WidgetAppearance } from '../Index';
import { defaultAppearance } from '../Index';
import WidgetPreview from '../components/WidgetPreview';
import ColorPicker from '../components/ColorPicker';
import FieldToggleGroup from '../components/FieldToggleGroup';

const inputClass = 'block w-full h-9 px-3 text-sm border border-[#cbd5e1] bg-white text-[#0f172a] focus:outline-none focus:border-[#0f172a] focus:ring-0 rounded-lg';
const selectClass = 'block w-full h-9 pl-3 pr-10 text-sm border border-[#cbd5e1] bg-white text-[#0f172a] focus:outline-none focus:border-[#0f172a] focus:ring-0 rounded-lg appearance-none py-0 bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=")] bg-[right_0.5rem_center] bg-no-repeat bg-[length:1.5em_1.5em]';
const labelClass = 'block text-[12px] font-medium text-[#334155] mb-1.5';

const widgetTypeLabels: Record<string, string> = { grid: 'Grid', carousel: 'Carousel', map: 'Map', search_form: 'Search Form' };
const widgetTypeIcons: Record<string, string> = {
    grid: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z',
    carousel: 'M6 6h.008M6 18h.008M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Zm4.5 6 3 3 3-3',
    map: 'M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z',
    search_form: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
};

const shadowOptions = ['none', 'sm', 'md', 'lg', 'xl'];
const hoverOptions = ['none', 'lift', 'shadow', 'scale'];
const aspectRatioOptions = ['4:3', '16:9', '3:2', '1:1'];
const fontOptions = ['Inter, sans-serif', 'Roboto, sans-serif', 'Open Sans, sans-serif', 'Lato, sans-serif', 'System UI, sans-serif'];
const layoutOptions = ['horizontal', 'vertical', 'grid'];
const searchFormFields = ['city', 'min_price', 'max_price', 'min_beds', 'min_baths', 'property_type', 'status', 'postal_code', 'min_sqft', 'max_sqft'];
const propertyTypeOptions = ['Residential', 'Condominium', 'Commercial', 'Land', 'Multi-Family', 'Rental'];
const statusOptions = ['Active', 'Pending', 'Sold', 'Expired', 'Withdrawn'];

const visibleFieldsDef = [
    { key: 'photo', label: 'Photo' }, { key: 'price', label: 'Price' }, { key: 'address', label: 'Address' },
    { key: 'cityStateZip', label: 'City/State/Zip' }, { key: 'beds', label: 'Beds' }, { key: 'baths', label: 'Baths' },
    { key: 'sqft', label: 'Sq Ft' }, { key: 'lotSize', label: 'Lot Size' }, { key: 'yearBuilt', label: 'Year Built' },
    { key: 'mlsNumber', label: 'MLS #' }, { key: 'statusBadge', label: 'Status Badge' }, { key: 'daysOnMarket', label: 'Days on Market' },
    { key: 'agent', label: 'Agent' }, { key: 'office', label: 'Office' }, { key: 'photoCount', label: 'Photo Count' },
];

interface WidgetFilter {
    cities?: string[];
    postal_codes?: string[];
    min_price?: number | null;
    max_price?: number | null;
    min_beds?: number | null;
    min_baths?: number | null;
    property_types?: string[];
    statuses?: string[];
    min_sqft?: number | null;
    max_sqft?: number | null;
}

function migrateFilters(raw: any): WidgetFilter {
    if (!raw || typeof raw !== 'object') return {};
    const migrated: WidgetFilter = {};
    if (raw.city && !raw.cities) migrated.cities = [String(raw.city)];
    if (raw.cities) migrated.cities = Array.isArray(raw.cities) ? raw.cities : [String(raw.cities)];
    if (raw.postal_code && !raw.postal_codes) migrated.postal_codes = [String(raw.postal_code)];
    if (raw.postal_codes) migrated.postal_codes = Array.isArray(raw.postal_codes) ? raw.postal_codes : [String(raw.postal_codes)];
    if (raw.property_type && !raw.property_types) migrated.property_types = [String(raw.property_type)];
    if (raw.property_types) migrated.property_types = Array.isArray(raw.property_types) ? raw.property_types : [String(raw.property_types)];
    if (raw.status && !raw.statuses) migrated.statuses = [String(raw.status)];
    if (raw.statuses) migrated.statuses = Array.isArray(raw.statuses) ? raw.statuses : [String(raw.statuses)];
    migrated.min_price = raw.min_price ?? null;
    migrated.max_price = raw.max_price ?? null;
    migrated.min_beds = raw.min_beds ?? null;
    migrated.min_baths = raw.min_baths ?? null;
    migrated.min_sqft = raw.min_sqft ?? null;
    migrated.max_sqft = raw.max_sqft ?? null;
    return migrated;
}

function TagInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (vals: string[]) => void; placeholder?: string }) {
    const [input, setInput] = useState('');
    const tags = values || [];

    function addTag(val: string) {
        const trimmed = val.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
        }
        setInput('');
    }

    function removeTag(val: string) {
        onChange(tags.filter((t) => t !== val));
    }

    return (
        <div>
            <label className={labelClass}>{label}</label>
            <div className="w-full min-h-[36px] px-2 py-1 flex flex-wrap gap-1 items-center border border-[#cbd5e1] bg-white rounded-lg focus-within:border-[#0f172a] transition-colors">
                {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f1f5f9] text-[11px] font-medium text-[#475569] rounded">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="text-[#64748b] hover:text-[#0f172a]">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTag(input);
                        }
                    }}
                    onBlur={() => { if (input.trim()) addTag(input); }}
                    className="flex-1 min-w-[80px] h-7 text-sm text-[#0f172a] bg-transparent border-0 outline-none focus:ring-0 p-0"
                    placeholder={tags.length === 0 ? placeholder : ''}
                />
            </div>
        </div>
    );
}

function MultiToggle({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (vals: string[]) => void }) {
    const selected = values || [];
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => {
                    const active = selected.includes(opt);
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${active ? 'bg-[#0f172a] border-[#0f172a] text-white shadow-sm' : 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#94a3b8] hover:bg-[#f8fafc]'}`}
                        >
                            {active && (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            )}
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface PageProps extends InertiaPageProps {
    widget: IdxWidget | null;
    connections: IdxConnection[];
    searches: IdxSearch[];
    widgetDefaults: Partial<WidgetAppearance>;
}

function mergeAppearance(src: WidgetAppearance | null): WidgetAppearance {
    return {
        ...defaultAppearance,
        ...src,
        card: { ...defaultAppearance.card, ...(src?.card || {}) },
        typography: { ...defaultAppearance.typography, ...(src?.typography || {}) },
        colors: { ...defaultAppearance.colors, ...(src?.colors || {}) },
        fields: { ...defaultAppearance.fields, ...(src?.fields || {}) },
        searchForm: { ...defaultAppearance.searchForm, ...(src?.searchForm || {}) },
    };
}

export default function WidgetEdit() {
    const { widget, connections, searches, widgetDefaults } = usePage<PageProps>().props;
    const isEdit = widget !== null;

    const [name, setName] = useState(widget?.name || '');
    const [widgetType, setWidgetType] = useState(widget?.widget_type || 'grid');
    const [mlsSlug, setMlsSlug] = useState(widget?.mls_slug || '');
    const [idxSearchId, setIdxSearchId] = useState<number | null>(widget?.idx_search_id || null);
    const [config, setConfig] = useState<Record<string, any>>(widget?.config || {});
    const [appearance, setAppearance] = useState<WidgetAppearance>(mergeAppearance(widget?.appearance || widgetDefaults as WidgetAppearance || null));
    const [customCss, setCustomCss] = useState(widget?.custom_css || '');
    const [filters, setFilters] = useState<WidgetFilter>(migrateFilters(widget?.config?.filters));
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ general: true, filters: true, layout: true });
    const [showEmbedCode, setShowEmbedCode] = useState(false);
    const [copied, setCopied] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);

    useEffect(() => {
        if (!isEdit && widgetDefaults) {
            setAppearance(mergeAppearance(widgetDefaults as WidgetAppearance));
        }
    }, [isEdit, widgetDefaults]);

    function updateConfig(key: string, value: any) {
        setConfig((prev) => ({ ...prev, [key]: value }));
    }

    function updateAppearance(section: keyof WidgetAppearance, key: string, value: any) {
        setAppearance((prev) => ({ ...prev, [section]: { ...(prev[section] as any), [key]: value } }));
    }

    function updateFilter(key: keyof WidgetFilter, value: any) {
        setFilters((prev) => ({ ...prev, [key]: value === '' || value === undefined ? undefined : value }));
    }

    function toggleSection(key: string) {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function handleSave() {
        setSaving(true);
        const payload: Record<string, any> = {
            name,
            widget_type: widgetType,
            mls_slug: mlsSlug,
            idx_search_id: idxSearchId,
            appearance,
            custom_css: customCss,
            config: { ...config, filters },
        };

        const opts = {
            onSuccess: () => router.visit(route('crm.idx.index', { tab: 'widgets' })),
            onError: (errors: Record<string, string>) => setFormErrors(errors),
            onFinish: () => setSaving(false),
        };

        if (isEdit && widget) {
            router.patch(route('crm.idx.widgets.update', widget.id), payload, opts);
        } else {
            router.post(route('crm.idx.widgets.store'), payload, opts);
        }
    }

    function handleDelete() {
        if (widget && confirm('Delete this widget?')) {
            router.delete(route('crm.idx.widgets.destroy', widget.id));
        }
    }

    function generateSnippet() {
        const key = 'YOUR-LICENSE-KEY';
        const wId = widget?.id || 'NEW';
        return `<script src="https://cdn.bunnychamp.com/idx-embed.js"\n  data-license="${key}"\n  data-widget="${widgetType}"\n  data-mls="${mlsSlug}"\n  data-widget-id="${wId}">\n</script>\n<div id="bunnychamp-idx-${wId}"></div>`;
    }

    function handleCopy(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const SectionHeader = ({ id, title, icon }: { id: string; title: string; icon?: string }) => (
        <button onClick={() => toggleSection(id)} className="flex items-center justify-between w-full py-3 text-left group">
            <div className="flex items-center gap-2">
                {icon && <svg className="h-4 w-4 text-[#64748b] group-hover:text-[#475569]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>}
                <span className="text-[12px] font-semibold text-[#0f172a]">{title}</span>
            </div>
            <svg className={`h-3.5 w-3.5 text-[#64748b] transition-transform ${openSections[id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
        </button>
    );

    return (
        <CrmLayout>
            <Head title={isEdit ? 'Edit Widget' : 'New Widget'} />

            <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc]">
                {/* Header */}
                <div className="h-14 bg-white border-b border-[#cbd5e1] px-4 flex items-center gap-4 shrink-0">
                    <button onClick={() => router.visit(route('crm.idx.index', { tab: 'widgets' }))} className="flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#0f172a] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                        Back
                    </button>
                    <div className="h-6 w-px bg-[#cbd5e1]" />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="h-5 w-5 text-[#64748b] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
                        <span className="text-sm font-semibold text-[#0f172a] truncate">{isEdit ? 'Edit Widget' : 'New Widget'}</span>
                        {name && <span className="text-sm text-[#64748b] truncate">— {name}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {isEdit && (
                            <button onClick={handleDelete} className="h-9 px-4 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                Delete
                            </button>
                        )}
                        <button onClick={() => router.visit(route('crm.idx.index', { tab: 'widgets' }))} className="h-9 px-4 text-sm font-medium text-[#475569] hover:text-[#0f172a] transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={saving || !name || !mlsSlug} className="h-9 px-5 bg-[#0f172a] text-white text-[13px] font-medium rounded-lg hover:bg-[#1e3a5f] disabled:opacity-40 transition-colors">
                            {saving ? 'Saving...' : isEdit ? 'Update Widget' : 'Create Widget'}
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-80 bg-white border-r border-[#cbd5e1] overflow-y-auto shrink-0">
                        <div className="divide-y divide-[#f1f5f9]">
                            {/* General */}
                            <div className="px-4">
                                <SectionHeader id="general" title="General" icon="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                                {openSections.general && (
                                    <div className="pb-4 space-y-3">
                                        <div>
                                            <label className={labelClass}>Widget Name</label>
                                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Homepage Property Grid" className={inputClass} />
                                            {formErrors.name && <p className="text-[11px] text-red-500 mt-1">{formErrors.name}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Widget Type</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['grid', 'carousel', 'map', 'search_form'] as const).map((t) => {
                                                    const active = widgetType === t;
                                                    return (
                                                        <button key={t} type="button" onClick={() => setWidgetType(t)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${active ? 'ring-1 ring-[#0f172a] border-[#0f172a] bg-[#f1f5f9]' : 'border-[#cbd5e1] hover:border-[#94a3b8] bg-white'}`}>
                                                            <svg className="h-4 w-4 shrink-0 text-[#475569]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={widgetTypeIcons[t]} /></svg>
                                                            <span className={`text-xs font-medium ${active ? 'text-[#0f172a]' : 'text-[#475569]'}`}>{widgetTypeLabels[t]}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>MLS Connection</label>
                                            <select value={mlsSlug} onChange={(e) => setMlsSlug(e.target.value)} className={selectClass}>
                                                <option value="">Select MLS...</option>
                                                {connections.map((c) => <option key={c.id} value={c.mls_slug}>{c.display_name}</option>)}
                                            </select>
                                            {formErrors.mls_slug && <p className="text-[11px] text-red-500 mt-1">{formErrors.mls_slug}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Linked Search <span className="text-[#64748b] font-normal">(optional)</span></label>
                                            <select value={idxSearchId || ''} onChange={(e) => setIdxSearchId(e.target.value ? parseInt(e.target.value) : null)} className={selectClass}>
                                                <option value="">None — use widget filters</option>
                                                {searches.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Filters */}
                            <div className="px-4">
                                <SectionHeader id="filters" title="Filters" icon="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                {openSections.filters && (
                                    <div className="pb-4 space-y-3">
                                        <p className="text-[11px] text-[#64748b]">Filter listings shown in this widget. Linked search filters take precedence.</p>
                                        <TagInput label="City" values={filters.cities || []} onChange={(vals) => updateFilter('cities', vals)} placeholder="Type a city and press Enter" />
                                        <TagInput label="Zip Code" values={filters.postal_codes || []} onChange={(vals) => updateFilter('postal_codes', vals)} placeholder="Type a zip and press Enter" />
                                        <MultiToggle label="Property Type" options={propertyTypeOptions} values={filters.property_types || []} onChange={(vals) => updateFilter('property_types', vals)} />
                                        <MultiToggle label="Status" options={statusOptions} values={filters.statuses || []} onChange={(vals) => updateFilter('statuses', vals)} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>Min Beds</label>
                                                <input type="number" value={filters.min_beds ?? ''} onChange={(e) => updateFilter('min_beds', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Any" min={0} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Min Baths</label>
                                                <input type="number" value={filters.min_baths ?? ''} onChange={(e) => updateFilter('min_baths', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="Any" min={0} step={0.5} className={inputClass} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>Min Price</label>
                                                <input type="number" value={filters.min_price ?? ''} onChange={(e) => updateFilter('min_price', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="0" min={0} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Max Price</label>
                                                <input type="number" value={filters.max_price ?? ''} onChange={(e) => updateFilter('max_price', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="No max" min={0} className={inputClass} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>Min Sqft</label>
                                                <input type="number" value={filters.min_sqft ?? ''} onChange={(e) => updateFilter('min_sqft', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="0" min={0} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Max Sqft</label>
                                                <input type="number" value={filters.max_sqft ?? ''} onChange={(e) => updateFilter('max_sqft', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="No max" min={0} className={inputClass} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Layout */}
                            <div className="px-4">
                                <SectionHeader id="layout" title="Layout" icon="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
                                {openSections.layout && (
                                    <div className="pb-4 space-y-3">
                                        {widgetType === 'grid' && (<><div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Columns</label><select value={config?.cols ?? ''} onChange={(e) => updateConfig('cols', e.target.value ? parseInt(e.target.value) : undefined)} className={selectClass}><option value="">Default (3)</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div><div><label className={labelClass}>Count</label><input type="number" value={config?.count ?? ''} onChange={(e) => updateConfig('count', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="9" min={1} max={50} className={inputClass} /></div></div><div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Pagination</label><select value={config?.showPagination ? 'true' : 'false'} onChange={(e) => updateConfig('showPagination', e.target.value === 'true')} className={selectClass}><option value="false">Off</option><option value="true">On</option></select></div><div><label className={labelClass}>Load More</label><select value={config?.loadMore ? 'true' : 'false'} onChange={(e) => updateConfig('loadMore', e.target.value === 'true')} className={selectClass}><option value="false">Off</option><option value="true">On</option></select></div></div></>)}
                                        {widgetType === 'carousel' && (<><div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Visible Slides</label><input type="number" value={config?.visibleSlides ?? ''} onChange={(e) => updateConfig('visibleSlides', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="3" min={1} max={6} className={inputClass} /></div><div><label className={labelClass}>Count</label><input type="number" value={config?.count ?? ''} onChange={(e) => updateConfig('count', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="8" min={1} max={50} className={inputClass} /></div></div><div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Autoplay</label><select value={config?.autoplay ? 'true' : 'false'} onChange={(e) => updateConfig('autoplay', e.target.value === 'true')} className={selectClass}><option value="false">Off</option><option value="true">On</option></select></div><div><label className={labelClass}>Speed (ms)</label><input type="number" value={config?.autoplaySpeed ?? ''} onChange={(e) => updateConfig('autoplaySpeed', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="5000" min={1000} max={15000} step={500} className={inputClass} /></div></div></>)}
                                        {widgetType === 'map' && (<><div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Count</label><input type="number" value={config?.count ?? ''} onChange={(e) => updateConfig('count', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="50" min={1} max={200} className={inputClass} /></div><div><label className={labelClass}>Default Zoom</label><input type="number" value={config?.defaultZoom ?? ''} onChange={(e) => updateConfig('defaultZoom', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="12" min={1} max={20} className={inputClass} /></div></div><div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>List Panel</label><select value={config?.showListPanel !== false ? 'true' : 'false'} onChange={(e) => updateConfig('showListPanel', e.target.value === 'true')} className={selectClass}><option value="true">Show</option><option value="false">Hide</option></select></div><div><label className={labelClass}>Clusters</label><select value={config?.clusterMarkers !== false ? 'true' : 'false'} onChange={(e) => updateConfig('clusterMarkers', e.target.value === 'true')} className={selectClass}><option value="true">On</option><option value="false">Off</option></select></div></div></>)}
                                        {widgetType === 'search_form' && (<div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Submit Action</label><select value={config?.submitAction || 'filter_in_place'} onChange={(e) => updateConfig('submitAction', e.target.value)} className={selectClass}><option value="filter_in_place">Filter In Place</option></select></div><div><label className={labelClass}>Show Count</label><select value={config?.showResultCount !== false ? 'true' : 'false'} onChange={(e) => updateConfig('showResultCount', e.target.value === 'true')} className={selectClass}><option value="true">Yes</option><option value="false">No</option></select></div></div>)}
                                    </div>
                                )}
                            </div>

                            {/* Card Style */}
                            <div className="px-4">
                                <SectionHeader id="card" title="Card Style" icon="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                                {openSections.card && (
                                    <div className="pb-4 space-y-3">
                                        <div>
                                            <label className={labelClass}>Border Radius — {appearance.card.borderRadius}px</label>
                                            <input type="range" min={0} max={24} value={appearance.card.borderRadius} onChange={(e) => updateAppearance('card', 'borderRadius', parseInt(e.target.value))} className="w-full accent-[#0f172a]" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className={labelClass}>Padding</label><input type="number" value={appearance.card.padding} onChange={(e) => updateAppearance('card', 'padding', parseInt(e.target.value) || 0)} min={0} max={48} className={inputClass} /></div>
                                            <div><label className={labelClass}>Margin/Gap</label><input type="number" value={appearance.card.margin} onChange={(e) => updateAppearance('card', 'margin', parseInt(e.target.value) || 0)} min={0} max={48} className={inputClass} /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className={labelClass}>Shadow</label><select value={appearance.card.shadow} onChange={(e) => updateAppearance('card', 'shadow', e.target.value)} className={selectClass}>{shadowOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                                            <div><label className={labelClass}>Hover</label><select value={appearance.card.hoverEffect} onChange={(e) => updateAppearance('card', 'hoverEffect', e.target.value)} className={selectClass}>{hoverOptions.map((h) => <option key={h} value={h}>{h}</option>)}</select></div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Image Aspect Ratio</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {aspectRatioOptions.map((ar) => (
                                                    <button key={ar} type="button" onClick={() => updateAppearance('card', 'imageAspectRatio', ar)} className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${appearance.card.imageAspectRatio === ar ? 'border-[#0f172a] bg-[#0f172a] text-white' : 'border-[#cbd5e1] text-[#475569] hover:border-[#94a3b8]'}`}>{ar}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Typography */}
                            <div className="px-4">
                                <SectionHeader id="typography" title="Typography" icon="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                                {openSections.typography && (
                                    <div className="pb-4 space-y-3">
                                        <div><label className={labelClass}>Font Family</label><select value={appearance.typography.fontFamily} onChange={(e) => updateAppearance('typography', 'fontFamily', e.target.value)} className={selectClass}>{fontOptions.map((f) => <option key={f} value={f}>{f.split(',')[0]}</option>)}</select></div>
                                        <div><label className={labelClass}>Price Size — {appearance.typography.priceSize}px</label><input type="range" min={12} max={28} value={appearance.typography.priceSize} onChange={(e) => updateAppearance('typography', 'priceSize', parseInt(e.target.value))} className="w-full accent-[#0f172a]" /></div>
                                        <div><label className={labelClass}>Address Size — {appearance.typography.addressSize}px</label><input type="range" min={10} max={20} value={appearance.typography.addressSize} onChange={(e) => updateAppearance('typography', 'addressSize', parseInt(e.target.value))} className="w-full accent-[#0f172a]" /></div>
                                        <div><label className={labelClass}>Details Size — {appearance.typography.detailsSize}px</label><input type="range" min={9} max={16} value={appearance.typography.detailsSize} onChange={(e) => updateAppearance('typography', 'detailsSize', parseInt(e.target.value))} className="w-full accent-[#0f172a]" /></div>
                                    </div>
                                )}
                            </div>

                            {/* Colors */}
                            <div className="px-4">
                                <SectionHeader id="colors" title="Colors" icon="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
                                {openSections.colors && (
                                    <div className="pb-4">
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                                            <ColorPicker label="Primary" value={appearance.colors.primary} onChange={(v) => updateAppearance('colors', 'primary', v)} />
                                            <ColorPicker label="Background" value={appearance.colors.background} onChange={(v) => updateAppearance('colors', 'background', v)} />
                                            <ColorPicker label="Card BG" value={appearance.colors.cardBackground} onChange={(v) => updateAppearance('colors', 'cardBackground', v)} />
                                            <ColorPicker label="Text" value={appearance.colors.text} onChange={(v) => updateAppearance('colors', 'text', v)} />
                                            <ColorPicker label="Text Secondary" value={appearance.colors.textSecondary} onChange={(v) => updateAppearance('colors', 'textSecondary', v)} />
                                            <ColorPicker label="Accent" value={appearance.colors.accent} onChange={(v) => updateAppearance('colors', 'accent', v)} />
                                            <ColorPicker label="Price Badge" value={appearance.colors.priceBadge} onChange={(v) => updateAppearance('colors', 'priceBadge', v)} />
                                            <ColorPicker label="Price Text" value={appearance.colors.priceBadgeText} onChange={(v) => updateAppearance('colors', 'priceBadgeText', v)} />
                                            <ColorPicker label="Status Badge" value={appearance.colors.statusBadge} onChange={(v) => updateAppearance('colors', 'statusBadge', v)} />
                                            <ColorPicker label="Status Text" value={appearance.colors.statusBadgeText} onChange={(v) => updateAppearance('colors', 'statusBadgeText', v)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Visible Fields */}
                            <div className="px-4">
                                <SectionHeader id="fields" title="Visible Fields" icon="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                {openSections.fields && (
                                    <div className="pb-4">
                                        <FieldToggleGroup fields={visibleFieldsDef} values={appearance.fields} onChange={(k, v) => updateAppearance('fields', k, v)} />
                                    </div>
                                )}
                            </div>

                            {/* Search Form (only for search_form type) */}
                            {widgetType === 'search_form' && (
                                <div className="px-4">
                                    <SectionHeader id="searchForm" title="Search Form" icon="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    {openSections.searchForm && (
                                        <div className="pb-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className={labelClass}>Layout</label><select value={appearance.searchForm.layout} onChange={(e) => updateAppearance('searchForm', 'layout', e.target.value)} className={selectClass}>{layoutOptions.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
                                                <div><label className={labelClass}>Border Radius</label><input type="number" value={appearance.searchForm.borderRadius} onChange={(e) => updateAppearance('searchForm', 'borderRadius', parseInt(e.target.value) || 0)} min={0} max={24} className={inputClass} /></div>
                                            </div>
                                            <div><label className={labelClass}>Button Text</label><input type="text" value={appearance.searchForm.buttonText} onChange={(e) => updateAppearance('searchForm', 'buttonText', e.target.value)} className={inputClass} /></div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <ColorPicker label="Button Color" value={appearance.searchForm.buttonColor} onChange={(v) => updateAppearance('searchForm', 'buttonColor', v)} />
                                                <ColorPicker label="Button Text" value={appearance.searchForm.buttonTextColor} onChange={(v) => updateAppearance('searchForm', 'buttonTextColor', v)} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Visible Fields</label>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {searchFormFields.map((f) => {
                                                        const isActive = appearance.searchForm.visibleFields?.includes(f);
                                                        return (
                                                            <button key={f} type="button" onClick={() => {
                                                                const current = appearance.searchForm.visibleFields || [];
                                                                updateAppearance('searchForm', 'visibleFields', isActive ? current.filter((x: string) => x !== f) : [...current, f]);
                                                            }} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${isActive ? 'bg-[#0f172a] border-[#0f172a] text-white shadow-sm' : 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#94a3b8] hover:bg-[#f8fafc]'}`}>
                                                                {isActive && (
                                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                                    </svg>
                                                                )}
                                                                {f.replace(/_/g, ' ')}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Custom CSS */}
                            <div className="px-4">
                                <SectionHeader id="customCss" title="Custom CSS" icon="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                                {openSections.customCss && (
                                    <div className="pb-4">
                                        <label className={labelClass}>Custom Styles</label>
                                        <textarea
                                            value={customCss}
                                            onChange={(e) => setCustomCss(e.target.value)}
                                            placeholder={'/* Add your custom CSS here */\n.widget-preview-card {\n  /* your styles */\n}'}
                                            className="block w-full h-40 px-3 py-2 text-[11px] font-mono border border-[#cbd5e1] bg-[#f8fafc] text-[#0f172a] rounded-lg focus:outline-none focus:border-[#0f172a] focus:ring-0 resize-none transition-all"
                                            spellCheck={false}
                                        />
                                        <p className="text-[10px] text-[#64748b] mt-1">Styles are injected into the widget preview.</p>
                                    </div>
                                )}
                            </div>
                            <div className="h-4" />
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="h-11 bg-white border-b border-[#cbd5e1] px-4 flex items-center gap-3 shrink-0">
                            <span className="text-[12px] font-semibold text-[#0f172a]">Live Preview</span>
                            <div className="flex-1" />
                            <button
                                onClick={() => setPreviewKey((k) => k + 1)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors border border-[#cbd5e1]"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
                                Refresh
                            </button>
                            <button onClick={() => setShowEmbedCode(!showEmbedCode)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${showEmbedCode ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] border-[#cbd5e1]'}`}>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
                                Embed
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 flex flex-col items-center">
                            <div className="w-full">
                                <div className="rounded-xl border border-[#cbd5e1] overflow-hidden bg-white shadow-lg">
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f8fafc] border-b border-[#cbd5e1]">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                                        </div>
                                        <div className="flex-1 mx-4">
                                            <div className="bg-white rounded-md px-3 py-1 text-[11px] text-[#94a3b8] text-center border border-[#cbd5e1]">yoursite.com/listings</div>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden">
                                        <WidgetPreview
                                            key={previewKey}
                                            appearance={appearance}
                                            widgetType={widgetType}
                                            config={config}
                                            mlsSlug={mlsSlug}
                                            idxSearchId={idxSearchId}
                                            customCss={customCss}
                                            widgetFilters={filters}
                                        />
                                    </div>
                                </div>
                            </div>

                            {showEmbedCode && (
                                <div className="w-full mt-6">
                                    <div className="rounded-xl border border-[#cbd5e1] bg-white overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 bg-[#f8fafc] border-b border-[#cbd5e1]">
                                            <div className="flex items-center gap-2">
                                                <svg className="h-4 w-4 text-[#475569]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
                                                <span className="text-[12px] font-semibold text-[#0f172a]">Embed Code</span>
                                            </div>
                                            <button onClick={() => handleCopy(generateSnippet())} className={`text-[11px] font-semibold transition-colors ${copied ? 'text-green-600' : 'text-[#0f172a] hover:underline'}`}>
                                                {copied ? 'Copied!' : 'Copy to Clipboard'}
                                            </button>
                                        </div>
                                        <pre className="px-4 py-3 text-[11px] text-[#475569] bg-[#f8fafc] overflow-x-auto font-mono leading-relaxed select-all">{generateSnippet()}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </CrmLayout>
    );
}
