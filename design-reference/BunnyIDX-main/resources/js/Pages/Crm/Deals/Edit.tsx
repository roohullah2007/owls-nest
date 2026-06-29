import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useRef, useState, useEffect } from 'react';
import { titleCase as humanize } from '@/utils/text';

interface Pipeline {
    id: number;
    name: string;
    stages: { id: number; name: string; type: string }[];
}

interface Contact {
    id: number;
    first_name: string;
    last_name: string;
}

interface Props {
    deal: {
        id: number;
        title: string;
        value: string;
        type: string;
        pipeline_id: number;
        pipeline_stage_id: number;
        company_id: number | null;
        property_address: string | null;
        mls_number: string | null;
        expected_close_date: string | null;
        actual_close_date: string | null;
        commission_rate: string | null;
        commission_amount: string | null;
        arv: string | null;
        repair_cost: string | null;
        assignment_fee: string | null;
        inspection_date: string | null;
        walkthrough_date: string | null;
        possession_date: string | null;
        earnest_money_due_date: string | null;
        due_diligence_date: string | null;
        notes: string | null;
        tags?: { id: number }[];
        contacts?: { id: number }[];
    };
    contacts: Contact[];
    companies: { id: number; name: string }[];
    pipelines: Pipeline[];
    tags: { id: number; name: string; color: string }[];
    dealTypes?: string[];
}

function ContactPicker({ contacts, selected, onChange }: { contacts: Contact[]; selected: number[]; onChange: (ids: number[]) => void }) {
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

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className="w-full min-h-[36px] px-2 py-1 flex flex-wrap gap-1 items-center border border-[#ECEEF1] bg-white text-[13px] rounded-lg cursor-text focus-within:border-[#111315] transition-colors mt-1"
                onClick={() => setOpen(true)}
            >
                {selectedContacts.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E6F0FF] text-[11px] font-medium text-[#1693C9] rounded-md">
                        {c.first_name} {c.last_name}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(selected.filter((sid) => sid !== c.id)); }}
                            className="text-[#93C5FD] hover:text-[#1693C9]"
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
                    className="flex-1 min-w-[80px] h-7 text-[13px] text-[#111315] bg-transparent border-0 outline-none focus:ring-0 p-0"
                    placeholder={selected.length === 0 ? 'Search contacts...' : ''}
                />
            </div>
            {open && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-[#E4E7EB] rounded-lg shadow-lg">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2.5 text-xs text-[#8B9096]">No contacts found</div>
                    ) : (
                        filtered.slice(0, 20).map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => { onChange([...selected, c.id]); setSearch(''); }}
                                className="w-full text-left px-3 py-2 text-[13px] text-[#5F656D] hover:bg-[#F3F4F6] transition-colors first:rounded-t-lg last:rounded-b-lg"
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

export default function DealEdit({ deal, contacts, companies, pipelines, tags, dealTypes = ['buy', 'sell', 'lease', 'referral', 'other'] }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        title: deal.title,
        contacts: deal.contacts?.map((c) => c.id) || ([] as number[]),
        company_id: deal.company_id?.toString() || '',
        pipeline_id: deal.pipeline_id.toString(),
        pipeline_stage_id: deal.pipeline_stage_id.toString(),
        value: deal.value || '',
        type: deal.type,
        property_address: deal.property_address || '',
        mls_number: deal.mls_number || '',
        expected_close_date: deal.expected_close_date || '',
        actual_close_date: deal.actual_close_date || '',
        commission_rate: deal.commission_rate || '',
        commission_amount: deal.commission_amount || '',
        arv: deal.arv || '',
        repair_cost: deal.repair_cost || '',
        assignment_fee: deal.assignment_fee || '',
        inspection_date: deal.inspection_date || '',
        walkthrough_date: deal.walkthrough_date || '',
        possession_date: deal.possession_date || '',
        earnest_money_due_date: deal.earnest_money_due_date || '',
        due_diligence_date: deal.due_diligence_date || '',
        notes: deal.notes || '',
        tags: deal.tags?.map((t) => t.id) || ([] as number[]),
    });

    const selectedPipeline = pipelines.find((p) => p.id === Number(data.pipeline_id));
    const availableStages = selectedPipeline?.stages || [];

    function handlePipelineChange(pipelineId: string) {
        const pipeline = pipelines.find((p) => p.id === Number(pipelineId));
        const firstOpenStage = pipeline?.stages.find((s) => s.type === 'open') || pipeline?.stages[0];
        setData((prev) => ({
            ...prev,
            pipeline_id: pipelineId,
            pipeline_stage_id: firstOpenStage?.id?.toString() || '',
        }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        put(route('crm.deals.update', deal.id));
    }

    const inputClass = 'mt-1 w-full h-9 px-3 text-[13px] border border-[#ECEEF1] bg-white text-[#111315] rounded-lg focus:outline-none focus:border-[#111315] transition-colors';
    const labelClass = 'block text-xs font-medium text-[#5F656D]';

    return (
        <CrmLayout>
            <Head title="Edit Deal" />
            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
                <div className="flex items-center gap-3 mb-6">
                    <Link href={route('crm.deals.show', deal.id)} className="text-[#8B9096] hover:text-[#111315] transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    </Link>
                    <h1 className="text-sm font-semibold text-[#111315]">Edit Deal</h1>
                </div>

                <form onSubmit={handleSubmit} className="border border-[#E4E7EB] bg-white rounded-xl">
                    <div className="p-6 space-y-5">
                        <div>
                            <label className={labelClass}>Deal Name *</label>
                            <input type="text" value={data.title} onChange={(e) => setData('title', e.target.value)} className={inputClass} required />
                            {errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Contacts</label>
                                <ContactPicker
                                    contacts={contacts}
                                    selected={data.contacts}
                                    onChange={(ids) => setData('contacts', ids)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Company</label>
                                <select value={data.company_id} onChange={(e) => setData('company_id', e.target.value)} className={inputClass}>
                                    <option value="">None</option>
                                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Price ($)</label>
                                <input type="number" value={data.value} onChange={(e) => setData('value', e.target.value)} className={inputClass} min="0" step="0.01" />
                            </div>
                            <div>
                                <label className={labelClass}>Pipeline</label>
                                <select value={data.pipeline_id} onChange={(e) => handlePipelineChange(e.target.value)} className={inputClass}>
                                    {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Stage</label>
                                <select value={data.pipeline_stage_id} onChange={(e) => setData('pipeline_stage_id', e.target.value)} className={inputClass}>
                                    {availableStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Type</label>
                            <select value={data.type} onChange={(e) => setData('type', e.target.value)} className={inputClass}>
                                {dealTypes.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Property Address</label>
                                <input type="text" value={data.property_address} onChange={(e) => setData('property_address', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>MLS Number</label>
                                <input type="text" value={data.mls_number} onChange={(e) => setData('mls_number', e.target.value)} className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Projected Close</label>
                                <input type="date" value={data.expected_close_date} onChange={(e) => setData('expected_close_date', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Actual Close</label>
                                <input type="date" value={data.actual_close_date} onChange={(e) => setData('actual_close_date', e.target.value)} className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Commission %</label>
                                <input type="number" value={data.commission_rate} onChange={(e) => setData('commission_rate', e.target.value)} className={inputClass} min="0" max="100" step="0.01" />
                            </div>
                            <div>
                                <label className={labelClass}>Commission $</label>
                                <input type="number" value={data.commission_amount} onChange={(e) => setData('commission_amount', e.target.value)} className={inputClass} min="0" step="0.01" />
                            </div>
                        </div>

                        {/* Investor Analysis */}
                        <div className="pt-4 mt-1 border-t border-[#E4E7EB]">
                            <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-3">Investor Analysis</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>ARV ($)</label>
                                    <input type="number" value={data.arv} onChange={(e) => setData('arv', e.target.value)} className={inputClass} min="0" step="0.01" />
                                </div>
                                <div>
                                    <label className={labelClass}>Repair Cost ($)</label>
                                    <input type="number" value={data.repair_cost} onChange={(e) => setData('repair_cost', e.target.value)} className={inputClass} min="0" step="0.01" />
                                </div>
                                <div>
                                    <label className={labelClass}>Assignment Fee ($)</label>
                                    <input type="number" value={data.assignment_fee} onChange={(e) => setData('assignment_fee', e.target.value)} className={inputClass} min="0" step="0.01" />
                                </div>
                            </div>
                        </div>

                        {/* Key Dates */}
                        <div className="pt-4 mt-1 border-t border-[#E4E7EB]">
                            <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-3">Key Dates</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Inspection</label>
                                    <input type="date" value={data.inspection_date} onChange={(e) => setData('inspection_date', e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Walkthrough</label>
                                    <input type="date" value={data.walkthrough_date} onChange={(e) => setData('walkthrough_date', e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Possession</label>
                                    <input type="date" value={data.possession_date} onChange={(e) => setData('possession_date', e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Earnest Money Due</label>
                                    <input type="date" value={data.earnest_money_due_date} onChange={(e) => setData('earnest_money_due_date', e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Due Diligence</label>
                                    <input type="date" value={data.due_diligence_date} onChange={(e) => setData('due_diligence_date', e.target.value)} className={inputClass} />
                                </div>
                            </div>
                        </div>

                        {tags.length > 0 && (
                            <div>
                                <label className={`${labelClass} mb-2`}>Tags</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {tags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => {
                                                const current = data.tags;
                                                setData('tags', current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id]);
                                            }}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full transition-all ${
                                                data.tags.includes(tag.id) ? 'text-white shadow-sm' : 'hover:opacity-100'
                                            }`}
                                            style={data.tags.includes(tag.id) ? { backgroundColor: tag.color, color: '#fff' } : { backgroundColor: tag.color + '15', color: tag.color }}
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: data.tags.includes(tag.id) ? 'rgba(255,255,255,0.5)' : tag.color }} />
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className={labelClass}>Notes</label>
                            <textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 text-[13px] border border-[#E4E7EB] bg-white text-[#111315] rounded-lg focus:outline-none focus:border-[#111315] resize-none transition-colors" />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E4E7EB]">
                        <Link href={route('crm.deals.show', deal.id)} className="text-xs text-[#5F656D] hover:text-[#111315] rounded-lg transition-colors">Cancel</Link>
                        <button type="submit" disabled={processing} className="h-9 px-5 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-30 transition-colors">
                            {processing ? 'Saving...' : 'Update Deal'}
                        </button>
                    </div>
                </form>
            </div>
        </CrmLayout>
    );
}
