import { useEffect, useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { titleCase as humanize } from '@/utils/text';

export interface PipelineStage {
    id: number;
    name: string;
    type: string;
    color: string | null;
    position: number;
}

export interface Pipeline {
    id: number;
    name: string;
    lead_type?: string | null;
    is_default: boolean;
    stages: PipelineStage[];
}

export interface DealContact {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
}

export interface DealTag { id: number; name: string; color: string }

export interface AiDealData {
    title?: string;
    value?: string | number;
    type?: string;
    property_address?: string;
    expected_close_date?: string;
    commission_rate?: string | number;
    notes?: string;
    contact_ids?: number[];
    contact_names?: string[];
}

// ============================================================
// Contact Search & Select — multi-select with search
// ============================================================
interface ContactPickerProps {
    contacts: DealContact[];
    selected: number[];
    onChange: (ids: number[]) => void;
}

function ContactPicker({ contacts, selected, onChange }: ContactPickerProps) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = contacts.filter((c) => {
        if (selected.includes(c.id)) return false;
        const name = `${c.first_name} ${c.last_name}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const selectedContacts = contacts.filter((c) => selected.includes(c.id));

    function remove(id: number) { onChange(selected.filter((sid) => sid !== id)); }
    function add(id: number) { onChange([...selected, id]); setSearch(''); }

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className="w-full min-h-[32px] px-2 py-1 flex flex-wrap gap-1 items-center border border-[#C8CCD1] rounded bg-white text-[13px] cursor-text focus-within:border-[#1693C9] transition-colors"
                onClick={() => setOpen(true)}
            >
                {selectedContacts.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F3F4F6] text-[11px] font-medium text-[#5F656D] rounded">
                        {c.first_name} {c.last_name}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                            className="text-[#8B9096] hover:text-[#111315]"
                        >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    className="flex-1 min-w-[80px] h-7 text-sm text-[#111315] bg-transparent border-0 outline-none focus:ring-0 p-0"
                    placeholder={selected.length === 0 ? 'Search contacts...' : ''}
                />
            </div>

            {open && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-[#E4E7EB] shadow-lg rounded">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-[#8B9096]">No contacts found</div>
                    ) : (
                        filtered.slice(0, 20).map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => add(c.id)}
                                className="w-full text-left px-3 py-2 text-sm text-[#5F656D] hover:bg-[#F3F4F6] transition-colors"
                            >
                                {c.first_name} {c.last_name}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Deal Slide-Over Form
// ============================================================
export interface PropertyOption {
    id: number;
    title: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    mls_number: string | null;
    price?: string | number | null;
    photos?: string[] | null;
    /** Source label shown next to the listing — e.g. "Lead's property", "My listing", "MLS". */
    source?: string;
}

export interface EditableDeal {
    id: number;
    title: string;
    value: string | number | null;
    type: string;
    pipeline_id: number;
    pipeline_stage_id: number;
    property_address: string | null;
    expected_close_date: string | null;
    commission_rate: string | number | null;
    commission_amount: string | number | null;
    notes: string | null;
    contacts?: { id: number }[];
    tags?: { id: number }[];
}

export interface DealSlideOverProps {
    pipeline: Pipeline;
    stageId: number | null;
    contacts: DealContact[];
    tags: DealTag[];
    /** All deal types available to the user. Falls back to defaults when omitted. */
    dealTypes?: string[];
    /** All pipelines so the form can switch between them. Optional — when omitted only the active pipeline is shown. */
    pipelines?: Pipeline[];
    /** Listings available to attach as the deal's property. Optional. */
    propertyOptions?: PropertyOption[];
    /** IDX connection id to enable MLS # lookup. Optional. */
    mlsConnectionId?: number | null;
    defaults?: Partial<AiDealData> | null;
    /** When provided, the slide-over enters edit mode and PATCHes this deal. */
    deal?: EditableDeal | null;
    onClose: () => void;
}

const DEFAULT_DEAL_TYPES = ['buy', 'sell', 'lease', 'referral', 'other'];

const inputClass = formInputClass;

export default function DealSlideOver({ pipeline, stageId, contacts, tags, dealTypes, pipelines, propertyOptions = [], mlsConnectionId, defaults, deal, onClose }: DealSlideOverProps) {
    const allPipelines = pipelines && pipelines.length > 0 ? pipelines : [pipeline];
    const isEdit = !!deal;

    // Pick a pipeline whose lead_type matches the given deal type; fall back to default/first.
    function pipelineForType(type: string): Pipeline {
        return allPipelines.find((p) => (p.lead_type || '').toLowerCase() === type.toLowerCase())
            || allPipelines.find((p) => p.is_default)
            || allPipelines[0]
            || pipeline;
    }

    const initialType = deal?.type || defaults?.type || (dealTypes && dealTypes[0]) || 'buy';
    const initialPipeline = deal
        ? (allPipelines.find((p) => p.id === deal.pipeline_id) || pipelineForType(initialType))
        : pipelineForType(initialType);
    const initialStage = deal
        ? initialPipeline.stages.find((s) => s.id === deal.pipeline_stage_id)
        : (stageId
            ? initialPipeline.stages.find((s) => s.id === stageId)
            : (initialPipeline.stages.find((s) => s.type === 'open') || initialPipeline.stages[0]));

    const form = useForm({
        title: deal?.title || defaults?.title || '',
        contacts: (deal?.contacts?.map((c) => c.id) || defaults?.contact_ids || []) as number[],
        pipeline_id: initialPipeline.id.toString(),
        pipeline_stage_id: (initialStage?.id || '').toString(),
        value: deal?.value != null ? String(deal.value) : (defaults?.value ? String(defaults.value) : ''),
        type: initialType,
        property_address: deal?.property_address || defaults?.property_address || '',
        expected_close_date: deal?.expected_close_date || defaults?.expected_close_date || '',
        commission_rate: deal?.commission_rate != null ? String(deal.commission_rate) : (defaults?.commission_rate ? String(defaults.commission_rate) : ''),
        commission_amount: deal?.commission_amount != null ? String(deal.commission_amount) : '',
        notes: deal?.notes || defaults?.notes || '',
        tags: (deal?.tags?.map((t) => t.id) || []) as number[],
    });

    const [addingType, setAddingType] = useState(false);
    const [newType, setNewType] = useState('');
    const typeOptions = dealTypes && dealTypes.length > 0 ? dealTypes : DEFAULT_DEAL_TYPES;

    // Derive the active pipeline from the currently-selected type.
    const activePipeline = allPipelines.find((p) => p.id.toString() === form.data.pipeline_id) || initialPipeline;
    const availableStages = activePipeline.stages.filter((s) => s.type === 'open');
    const hasMatchingPipeline = !!allPipelines.find((p) => (p.lead_type || '').toLowerCase() === form.data.type.toLowerCase());

    function changeType(nextType: string) {
        const p = pipelineForType(nextType);
        const first = p.stages.find((s) => s.type === 'open') || p.stages[0];
        form.setData((d) => ({
            ...d,
            type: nextType,
            pipeline_id: p.id.toString(),
            pipeline_stage_id: first?.id?.toString() || '',
        }));
    }

    // --- Property address combobox ---
    const propWrapRef = useRef<HTMLDivElement>(null);
    const [propOpen, setPropOpen] = useState(false);
    const [propSearch, setPropSearch] = useState('');
    const [mlsLookupValue, setMlsLookupValue] = useState('');
    const [mlsLookupLoading, setMlsLookupLoading] = useState(false);
    const [mlsLookupResults, setMlsLookupResults] = useState<PropertyOption[]>([]);
    const [mlsLookupError, setMlsLookupError] = useState('');

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (propWrapRef.current && !propWrapRef.current.contains(e.target as Node)) setPropOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    function pickProperty(opt: PropertyOption) {
        const fullAddr = [opt.address, opt.city, opt.state_province].filter(Boolean).join(', ') || opt.title;
        form.setData((d) => ({
            ...d,
            property_address: fullAddr,
            ...(opt.price && !d.value ? { value: String(opt.price) } : {}),
        } as any));
        setPropOpen(false);
        setPropSearch('');
    }

    async function lookupMls() {
        if (!mlsLookupValue.trim() || !mlsConnectionId) return;
        setMlsLookupLoading(true);
        setMlsLookupError('');
        setMlsLookupResults([]);
        try {
            const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
            const res = await fetch(route('crm.listings.search-mls'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
                body: JSON.stringify({ connection_id: mlsConnectionId, query: mlsLookupValue.trim(), page: 1 }),
            });
            const data = await res.json();
            const listings = (data.listings || data.data || []) as any[];
            setMlsLookupResults(listings.slice(0, 10).map((ml: any) => ({
                id: 0,
                title: ml.address?.full || ml.mls_number,
                address: ml.address?.street || ml.address?.full || null,
                city: ml.address?.city || null,
                state_province: ml.address?.state_province || null,
                mls_number: ml.mls_number || null,
                price: ml.price ?? null,
                photos: ml.photos || [],
                source: 'MLS',
            })));
            if (listings.length === 0) setMlsLookupError('No listings found.');
        } catch {
            setMlsLookupError('Lookup failed.');
        } finally {
            setMlsLookupLoading(false);
        }
    }

    const filteredProps = propertyOptions.filter((o) => {
        if (!propSearch.trim()) return true;
        const q = propSearch.toLowerCase();
        return (o.address || '').toLowerCase().includes(q)
            || (o.city || '').toLowerCase().includes(q)
            || (o.title || '').toLowerCase().includes(q)
            || (o.mls_number || '').toLowerCase().includes(q);
    });

    function submitNewType(e: React.FormEvent) {
        e.preventDefault();
        const slug = newType.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!slug) return;
        router.post(route('crm.deals.deal-types.store'), { type: slug }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                form.setData('type', slug);
                setNewType('');
                setAddingType(false);
            },
        });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit && deal) {
            form.patch(route('crm.deals.update', deal.id), {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        } else {
            form.post(route('crm.deals.store'), {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    }

    function handleDelete() {
        if (!deal) return;
        if (!confirm('Delete this deal? This action cannot be undone.')) return;
        router.delete(route('crm.deals.destroy', deal.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    const formId = 'add-deal-form';

    const footer = (
        <>
            {isEdit && (
                <button
                    type="button"
                    onClick={handleDelete}
                    className="h-8 px-3 text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded transition-colors mr-auto"
                >
                    Delete
                </button>
            )}
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
                disabled={form.processing || !form.data.title.trim()}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {form.processing ? 'Saving…' : (isEdit ? 'Save' : 'Create Deal')}
            </button>
        </>
    );

    return (
        <SlideOverModal title={isEdit ? 'Edit Deal' : 'Add Deal'} onClose={onClose} footer={footer} width={520}>
            <form id={formId} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                    <div>
                        <FieldLabel htmlFor="deal_title">Deal Name <span className="text-[#DC2626]">*</span></FieldLabel>
                        <input
                            id="deal_title"
                            type="text"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            className={inputClass}
                            required
                            autoFocus
                        />
                        {form.errors.title && <p className="mt-1 text-[11px] text-red-500">{form.errors.title}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <FieldLabel htmlFor="deal_value">Price ($)</FieldLabel>
                            <input
                                id="deal_value"
                                type="number"
                                value={form.data.value}
                                onChange={(e) => form.setData('value', e.target.value)}
                                className={inputClass}
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <FieldLabel htmlFor="deal_type">Type</FieldLabel>
                                {!addingType && (
                                    <button type="button" onClick={() => setAddingType(true)} className="text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF] transition-colors mb-1">+ Add type</button>
                                )}
                            </div>
                            {addingType ? (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitNewType(e as any); } }}
                                        placeholder="e.g. lease_option"
                                        className={inputClass + ' flex-1'}
                                        autoFocus
                                    />
                                    <button type="button" onClick={(e) => submitNewType(e as any)} disabled={!newType.trim()} className="h-8 px-3 text-[11px] font-semibold text-white bg-[#1693C9] rounded hover:bg-[#1380AF] disabled:opacity-50 transition-colors">Add</button>
                                    <button type="button" onClick={() => { setAddingType(false); setNewType(''); }} className="h-8 px-2 text-[11px] font-medium text-[#5F656D] hover:text-[#111315] transition-colors">Cancel</button>
                                </div>
                            ) : (
                                <select
                                    id="deal_type"
                                    value={form.data.type}
                                    onChange={(e) => changeType(e.target.value)}
                                    className={inputClass}
                                >
                                    {typeOptions.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <FieldLabel htmlFor="deal_stage">Stage</FieldLabel>
                            <span className="text-[11px] text-[#8B9096] mb-1">
                                {hasMatchingPipeline
                                    ? <>via <strong className="text-[#5F656D] font-medium">{activePipeline.name}</strong></>
                                    : <>No pipeline for <strong className="text-[#5F656D] font-medium">{humanize(form.data.type)}</strong> — using {activePipeline.name}</>}
                            </span>
                        </div>
                        <select
                            id="deal_stage"
                            value={form.data.pipeline_stage_id}
                            onChange={(e) => form.setData('pipeline_stage_id', e.target.value)}
                            className={inputClass}
                        >
                            {availableStages.length === 0 ? (
                                <option value="">No stages available</option>
                            ) : availableStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <FieldLabel>Contacts</FieldLabel>
                        <ContactPicker contacts={contacts} selected={form.data.contacts} onChange={(ids) => form.setData('contacts', ids)} />
                    </div>

                    <div ref={propWrapRef} className="relative">
                        <FieldLabel htmlFor="deal_property">Property Address</FieldLabel>
                        <div className="flex items-stretch gap-1.5">
                            <input
                                id="deal_property"
                                type="text"
                                value={form.data.property_address}
                                onChange={(e) => form.setData('property_address', e.target.value)}
                                onFocus={() => setPropOpen(true)}
                                placeholder="Type to enter manually, or browse →"
                                className={inputClass}
                            />
                            <button type="button" onClick={() => setPropOpen((v) => !v)} className="h-8 px-3 text-[11px] font-medium text-[#5F656D] bg-white border border-[#C8CCD1] rounded hover:bg-[#F3F4F6] transition-colors shrink-0">
                                Browse
                            </button>
                        </div>
                        {propOpen && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#E4E7EB] rounded shadow-lg overflow-hidden">
                                <div className="p-2 border-b border-[#E4E7EB]">
                                    <input
                                        type="search"
                                        value={propSearch}
                                        onChange={(e) => setPropSearch(e.target.value)}
                                        placeholder="Search listings by address, city or MLS#…"
                                        className="w-full h-8 px-2.5 text-xs bg-[#F9FAFB] text-[#111315] placeholder-[#8B9096] border border-transparent rounded focus:outline-none focus:bg-white focus:border-[#1693C9]"
                                    />
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {filteredProps.length === 0 && mlsLookupResults.length === 0 ? (
                                        <p className="px-3 py-4 text-center text-[11px] text-[#8B9096]">No saved properties. Use the MLS lookup below or type manually.</p>
                                    ) : (
                                        <ul className="divide-y divide-[#F3F4F6]">
                                            {filteredProps.map((opt) => {
                                                const subtitle = [opt.city, opt.state_province].filter(Boolean).join(', ');
                                                return (
                                                    <li key={`p-${opt.id}`}>
                                                        <button type="button" onClick={() => pickProperty(opt)} className="w-full text-left px-3 py-2 hover:bg-[#F9FAFB] transition-colors">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-[12px] font-medium text-[#111315] truncate">{opt.address || opt.title}</p>
                                                                {opt.source && (
                                                                    <span className="shrink-0 text-[9px] font-semibold tracking-wider text-[#1693C9] bg-[#EBF5FF] rounded px-1.5 py-0.5">{opt.source}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#8B9096]">
                                                                {subtitle && <span>{subtitle}</span>}
                                                                {opt.mls_number && <span>MLS# {opt.mls_number}</span>}
                                                                {opt.price != null && <span>${Number(opt.price).toLocaleString()}</span>}
                                                            </div>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                            {mlsLookupResults.map((opt, i) => {
                                                const subtitle = [opt.city, opt.state_province].filter(Boolean).join(', ');
                                                return (
                                                    <li key={`m-${i}`}>
                                                        <button type="button" onClick={() => pickProperty(opt)} className="w-full text-left px-3 py-2 hover:bg-[#F9FAFB] transition-colors">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-[12px] font-medium text-[#111315] truncate">{opt.address || opt.title}</p>
                                                                <span className="shrink-0 text-[9px] font-semibold tracking-wider text-[#7C3AED] bg-[#EDE9FE] rounded px-1.5 py-0.5">MLS</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#8B9096]">
                                                                {subtitle && <span>{subtitle}</span>}
                                                                {opt.mls_number && <span>MLS# {opt.mls_number}</span>}
                                                                {opt.price != null && <span>${Number(opt.price).toLocaleString()}</span>}
                                                            </div>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                                {mlsConnectionId && (
                                    <div className="p-2 border-t border-[#E4E7EB] bg-[#F9FAFB] space-y-1.5">
                                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Look up by MLS #</p>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                value={mlsLookupValue}
                                                onChange={(e) => setMlsLookupValue(e.target.value)}
                                                placeholder="e.g. A11567890"
                                                className="flex-1 h-8 px-2.5 text-xs bg-white text-[#111315] border border-[#C8CCD1] rounded focus:outline-none focus:border-[#1693C9]"
                                            />
                                            <button type="button" onClick={lookupMls} disabled={!mlsLookupValue.trim() || mlsLookupLoading} className="h-8 px-3 text-[11px] font-semibold text-white bg-[#1693C9] rounded hover:bg-[#1380AF] disabled:opacity-50 transition-colors">
                                                {mlsLookupLoading ? '…' : 'Search'}
                                            </button>
                                        </div>
                                        {mlsLookupError && <p className="text-[10px] text-[#DC2626]">{mlsLookupError}</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <FieldLabel htmlFor="deal_close">Projected Close</FieldLabel>
                            <input id="deal_close" type="date" value={form.data.expected_close_date} onChange={(e) => form.setData('expected_close_date', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="deal_commission_rate">Commission %</FieldLabel>
                            <input id="deal_commission_rate" type="number" value={form.data.commission_rate} onChange={(e) => form.setData('commission_rate', e.target.value)} className={inputClass} min="0" max="100" step="0.01" />
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="deal_commission_amount">Commission $</FieldLabel>
                        <input id="deal_commission_amount" type="number" value={form.data.commission_amount} onChange={(e) => form.setData('commission_amount', e.target.value)} className={inputClass} min="0" step="0.01" />
                    </div>

                    {tags.length > 0 && (
                        <div>
                            <FieldLabel>Tags</FieldLabel>
                            <div className="flex flex-wrap gap-1.5">
                                {tags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => {
                                            const current = form.data.tags;
                                            form.setData('tags', current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id]);
                                        }}
                                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                                            form.data.tags.includes(tag.id) ? 'text-white' : 'text-[#5F656D] bg-[#F3F4F6] hover:bg-[#E4E7EB]'
                                        }`}
                                        style={form.data.tags.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <FieldLabel htmlFor="deal_notes">Notes</FieldLabel>
                        <textarea
                            id="deal_notes"
                            rows={3}
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            className={inputClass + ' resize-none'}
                        />
                    </div>
                </div>
            </form>
        </SlideOverModal>
    );
}
