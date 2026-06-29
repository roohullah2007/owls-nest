import CrmLayout from '@/Layouts/CrmLayout';
import Avatar from '@/Components/Crm/Avatar';
import NotesList from '@/Components/Crm/NotesList';
import TimelineFeed from '@/Components/Crm/TimelineFeed';
import SidebarCard, { CardEmptyState, DashedAddButton } from '@/Components/Crm/SidebarCard';
import { InlineEdit, SectionLabel } from '@/Components/Crm/Contact/InlineEdit';
import TagPicker from '@/Components/Crm/Contact/TagPicker';
import AssignedUsersPicker from '@/Components/Crm/Contact/AssignedUsersPicker';
import { Head, Link, router } from '@inertiajs/react';
import { ReactNode, useEffect, useRef, useState } from 'react';

interface PipelineStage {
    id: number;
    name: string;
    type: string;
    color: string | null;
    position: number;
}

interface Contact {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
}

interface TeamMember {
    id: number;
    name: string;
    email: string;
}

interface Props {
    deal: {
        id: number;
        title: string;
        value: string;
        currency: string;
        type: string;
        property_address: string | null;
        mls_number: string | null;
        expected_close_date: string | null;
        actual_close_date: string | null;
        commission_rate: string | null;
        commission_amount: string | null;
        arv: string | null;
        repair_cost: string | null;
        assignment_fee: string | null;
        mao: string | null;
        inspection_date: string | null;
        walkthrough_date: string | null;
        possession_date: string | null;
        earnest_money_due_date: string | null;
        due_diligence_date: string | null;
        notes: string | null;
        won_at: string | null;
        lost_at: string | null;
        lost_reason: string | null;
        created_at: string;
        pipeline_id: number;
        pipeline_stage_id: number;
        company_id: number | null;
        custom_fields: Record<string, string> | null;
        pipeline_stage?: PipelineStage | null;
        pipeline?: { id: number; name: string; stages: PipelineStage[] } | null;
        tags?: { id: number; name: string; color: string }[];
        contacts?: Contact[];
        company?: { id: number; name: string } | null;
        assigned_users?: { id: number; name: string; email: string }[];
        timeline_events: any[];
        notes_list: any[];
    };
    allContacts: Contact[];
    companies: { id: number; name: string }[];
    tags: { id: number; name: string; color: string }[];
    teamMembers: TeamMember[];
}

const typeLabels: Record<string, string> = { buy: 'Buyer', sell: 'Seller', lease: 'Lease', referral: 'Referral', other: 'Other' };

const typeColors: Record<string, { bg: string; text: string }> = {
    buy: { bg: '#1693C9', text: '#FFFFFF' },
    sell: { bg: '#D97706', text: '#FFFFFF' },
    lease: { bg: '#0891B2', text: '#FFFFFF' },
    referral: { bg: '#4F46E5', text: '#FFFFFF' },
    other: { bg: '#5F656D', text: '#FFFFFF' },
};
const defaultTypeColor = { bg: '#5F656D', text: '#FFFFFF' };

function formatCurrency(amount: string | number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(amount));
}

function formatDate(d: string | null) {
    if (!d) return null;
    return new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ---- Field row: label on left, InlineEdit on right (mirrors Contact LeftCard Details pattern) ---- */
function FieldRow({
    label,
    value,
    display,
    placeholder = '—',
    type = 'text',
    options,
    onSave,
}: {
    label: string;
    value: string;
    display?: ReactNode;
    placeholder?: string;
    type?: 'text' | 'email' | 'tel' | 'date' | 'number';
    options?: { value: string; label: string }[];
    onSave: (v: string) => void;
}) {
    const hasValue = value !== '' && value != null;
    return (
        <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-[#5F656D] shrink-0">{label}</span>
            <div className="flex-1 min-w-0 max-w-[60%]">
                <InlineEdit value={value} onSave={onSave} type={type} options={options}>
                    {hasValue
                        ? <span className="text-[13px] text-[#111315] text-right block truncate">{display ?? value}</span>
                        : <span className="text-[13px] text-[#C4C9D1] text-right block">{placeholder}</span>}
                </InlineEdit>
            </div>
        </div>
    );
}

/* ---- Contact Picker (search + multi-select), styled to match Contacts patterns ---- */
function ContactPicker({ allContacts, selected, onSave }: { allContacts: Contact[]; selected: Contact[]; onSave: (ids: number[]) => void }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const selectedIds = selected.map((c) => c.id);

    useEffect(() => {
        function handleClick(e: MouseEvent) { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false); }
        function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    useEffect(() => {
        if (open) {
            setSearch('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const filtered = allContacts.filter((c) => {
        if (selectedIds.includes(c.id)) return false;
        if (!search) return true;
        return `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase());
    });

    function add(id: number) {
        onSave([...selectedIds, id]);
        setSearch('');
    }

    function remove(id: number) {
        onSave(selectedIds.filter((sid) => sid !== id));
    }

    return (
        <div ref={wrapperRef} className="relative">
            {selected.length > 0 ? (
                <ul className="space-y-1 mb-2">
                    {selected.map((c) => (
                        <li
                            key={c.id}
                            className="group flex items-center gap-2.5 px-2 py-1.5 rounded-[4px] hover:bg-[#F9FAFB] transition-colors"
                        >
                            <Avatar id={c.id} name={`${c.first_name} ${c.last_name}`} size="md" />
                            <div className="flex-1 min-w-0">
                                <Link
                                    href={route('crm.contacts.show', c.uuid)}
                                    className="block text-[13px] font-medium text-[#111315] hover:text-[#1693C9] truncate leading-tight"
                                >
                                    {c.first_name} {c.last_name}
                                </Link>
                                <p className="text-[11px] text-[#8B9096] truncate leading-tight">
                                    {c.email || c.phone || '—'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => remove(c.id)}
                                title={`Unlink ${c.first_name}`}
                                className="shrink-0 opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-full text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <CardEmptyState
                    label="No contacts linked"
                    icon={
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                    }
                />
            )}

            <DashedAddButton onClick={() => setOpen((o) => !o)} label="Add contact" />

            {open && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-[#E4E7EB]">
                        <div className="relative">
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B9096] pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search contacts..."
                                className="w-full h-8 pl-8 pr-2.5 text-xs bg-[#F9FAFB] text-[#111315] placeholder-[#8B9096] border border-transparent rounded-[4px] focus:outline-none focus:bg-white focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9] transition-colors"
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                                <p className="text-xs text-[#8B9096]">
                                    {search ? 'No contacts match' : 'No contacts available'}
                                </p>
                            </div>
                        ) : (
                            filtered.slice(0, 30).map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => add(c.id)}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-[#F3F4F6] transition-colors text-left"
                                >
                                    <Avatar id={c.id} name={`${c.first_name} ${c.last_name}`} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-[#111315] truncate leading-tight">{c.first_name} {c.last_name}</p>
                                        <p className="text-[11px] text-[#8B9096] truncate leading-tight">{c.email || c.phone || '—'}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---- Custom Fields Card ---- */
function CustomFieldsCard({ customFields, onSave }: { customFields: Record<string, string>; onSave: (fields: Record<string, string>) => void }) {
    const [adding, setAdding] = useState(false);
    const [newKey, setNewKey] = useState('');
    const addRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

    function handleAddField() {
        const key = newKey.trim();
        if (!key || key in customFields) { setNewKey(''); return; }
        onSave({ ...customFields, [key]: '' });
        setNewKey('');
        setAdding(false);
    }

    function handleSaveField(key: string, value: string) {
        onSave({ ...customFields, [key]: value });
    }

    function handleRemoveField(key: string) {
        const updated = { ...customFields };
        delete updated[key];
        onSave(updated);
    }

    const entries = Object.entries(customFields);

    return (
        <div>
            <div className="flex items-center justify-end mb-2">
                <button type="button" onClick={() => setAdding(!adding)} className="flex items-center gap-1 text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF] transition-colors">
                    {adding ? (
                        'Cancel'
                    ) : (
                        <>
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Add
                        </>
                    )}
                </button>
            </div>
            {entries.length > 0 && (
                <dl className="space-y-2.5">
                    {entries.map(([key, value]) => (
                        <div key={key} className="group relative">
                            <FieldRow
                                label={key}
                                value={value || ''}
                                placeholder="—"
                                onSave={(v) => handleSaveField(key, v)}
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveField(key)}
                                className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center bg-white border border-[#E4E7EB] rounded-full text-[#8B9096] hover:text-red-500 hover:border-red-200 transition-all"
                            >
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </dl>
            )}
            {entries.length === 0 && !adding && (
                <p className="text-xs text-[#C4C9D1]">No custom fields</p>
            )}
            {adding && (
                <div className="mt-2 flex gap-1.5">
                    <input
                        ref={addRef}
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddField(); if (e.key === 'Escape') { setAdding(false); setNewKey(''); } }}
                        placeholder="Field name"
                        className="flex-1 h-7 px-2 text-xs border border-[#ECEEF1] bg-white text-[#111315] rounded-[4px] focus:outline-none focus:border-[#1693C9] transition-colors"
                    />
                    <button type="button" onClick={handleAddField} className="h-7 px-3 text-[10px] font-medium bg-[#1693C9] text-white rounded-[4px] hover:bg-[#1380AF] transition-colors">Add</button>
                </div>
            )}
        </div>
    );
}

export default function DealShow({ deal, allContacts, companies, tags, teamMembers = [] }: Props) {
    const [mobileSection, setMobileSection] = useState<'info' | 'timeline' | 'sidebar'>('timeline');
    const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
    const stageDropdownRef = useRef<HTMLDivElement>(null);

    const stages = deal.pipeline?.stages?.sort((a, b) => a.position - b.position) || [];

    useEffect(() => {
        if (!stageDropdownOpen) return;
        function onDoc(e: MouseEvent) {
            if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) setStageDropdownOpen(false);
        }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setStageDropdownOpen(false); }
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [stageDropdownOpen]);

    function saveDeal(fields: Record<string, any>) {
        router.put(route('crm.deals.update', deal.id), {
            title: deal.title,
            contacts: deal.contacts?.map((c) => c.id) || [],
            company_id: deal.company_id || '',
            pipeline_id: deal.pipeline_id,
            pipeline_stage_id: deal.pipeline_stage_id,
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
            custom_fields: deal.custom_fields || {},
            notes: deal.notes || '',
            tags: deal.tags?.map((t) => t.id) || [],
            ...fields,
        }, { preserveScroll: true });
    }

    function handleStageClick(stageId: number) {
        router.patch(route('crm.deals.stage', deal.id), { pipeline_stage_id: stageId }, { preserveScroll: true });
    }

    function handleDelete() {
        if (confirm('Are you sure you want to delete this deal?')) {
            router.delete(route('crm.deals.destroy', deal.id));
        }
    }

    return (
        <CrmLayout>
            <Head title={deal.title} />

            <div className="flex flex-col min-h-[calc(100vh-56px)] bg-[#F2F3F7]">

                {/* Top header bar — mirrors Contacts/Show: stage dropdown on the left + right-side actions */}
                {stages.length > 0 && (
                    <div className="shrink-0 bg-white border-b border-[#E4E7EB] px-3 sm:px-6 py-2.5 flex items-center gap-3">
                        <Link href={route('crm.deals.index')} className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#111315] hover:bg-[#F3F4F6] transition-colors" title="Back to deals">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </Link>

                        {/* Stage dropdown */}
                        {(() => {
                            const current = deal.pipeline_stage;
                            const currentBg = current?.type === 'won' ? '#059669'
                                : current?.type === 'lost' ? '#DC2626'
                                : current?.color || '#1693C9';
                            return (
                                <div className="relative" ref={stageDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setStageDropdownOpen((o) => !o)}
                                        aria-haspopup="menu"
                                        aria-expanded={stageDropdownOpen}
                                        className="inline-flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-[4px] border border-[#E4E7EB] bg-white hover:bg-[#F9FAFB] transition-colors"
                                    >
                                        <span
                                            className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-[4px] text-white"
                                            style={{ backgroundColor: currentBg }}
                                        >
                                            {current?.name || 'No Stage'}
                                        </span>
                                        <svg className={`h-3.5 w-3.5 text-[#8B9096] transition-transform ${stageDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </button>
                                    {stageDropdownOpen && (
                                        <div role="menu" className="absolute left-0 top-full mt-1.5 z-30 w-56 bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg overflow-hidden">
                                            <div className="px-3 py-2 text-[10px] font-semibold text-[#8B9096] tracking-wider border-b border-[#F3F4F6]">
                                                Change Stage
                                            </div>
                                            {stages.map((stage) => {
                                                const isCurrent = stage.id === deal.pipeline_stage?.id;
                                                const dotBg = stage.type === 'won' ? '#059669'
                                                    : stage.type === 'lost' ? '#DC2626'
                                                    : stage.color || '#1693C9';
                                                return (
                                                    <button
                                                        key={stage.id}
                                                        type="button"
                                                        onClick={() => { if (!isCurrent) handleStageClick(stage.id); setStageDropdownOpen(false); }}
                                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-left transition-colors ${isCurrent ? 'bg-[#F9FAFB]' : 'hover:bg-[#F9FAFB]'}`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotBg }} />
                                                            <span className="text-[#111315]">{stage.name}</span>
                                                        </span>
                                                        {isCurrent && (
                                                            <svg className="h-3.5 w-3.5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Right-side actions */}
                        <div className="ml-auto flex items-center gap-2 shrink-0">
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-[#DC2626] bg-[#FEF2F2] rounded-[4px] hover:bg-[#FEE2E2] transition-colors"
                                title="Delete deal"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                                <span className="hidden sm:inline">Delete</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Mobile section tabs */}
                <div className="flex border-b border-[#E4E7EB] bg-white lg:hidden shrink-0">
                    {([
                        { key: 'info' as const, label: 'Details' },
                        { key: 'timeline' as const, label: 'Timeline' },
                        { key: 'sidebar' as const, label: 'More' },
                    ]).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setMobileSection(tab.key)}
                            className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${
                                mobileSection === tab.key
                                    ? 'text-[#111315] border-b-2 border-[#111315] -mb-px'
                                    : 'text-[#8B9096] hover:text-[#5F656D]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 3-column layout — mirrors Contacts/Show */}
                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-3 lg:gap-4 p-3 sm:p-4 lg:p-6 pb-20">

                    {/* LEFT 25% — Deal info card */}
                    <div className={`min-w-0 border border-[#E4E7EB] bg-white rounded-[4px] flex flex-col ${mobileSection !== 'info' ? 'hidden lg:flex' : ''}`}>
                        {/* Teal header */}
                        <div className="bg-[#0B577A] rounded-t-[3px] px-5 py-4 space-y-3">
                            <div className="flex items-center gap-1.5">
                                <span
                                    className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full text-white"
                                    style={{ backgroundColor: (typeColors[deal.type] || defaultTypeColor).bg }}
                                >
                                    {typeLabels[deal.type] || deal.type}
                                </span>
                                {deal.pipeline_stage && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/15 text-white">
                                        {deal.pipeline_stage.name}
                                    </span>
                                )}
                            </div>

                            <div>
                                <InlineEdit
                                    value={deal.title}
                                    onSave={(next) => { if (next.trim() && next !== deal.title) saveDeal({ title: next.trim() }); }}
                                    pencilTone="light"
                                >
                                    <h1 className="text-base font-semibold text-white leading-tight">{deal.title}</h1>
                                </InlineEdit>
                                <p className="text-xs text-white/80 mt-0.5">Added {formatDate(deal.created_at)}</p>
                            </div>
                        </div>

                        <div>
                            {/* Deal details */}
                            <div className="px-5 py-4 space-y-2.5 border-t border-[#E4E7EB]">
                                <SectionLabel>Deal Details</SectionLabel>
                                <FieldRow
                                    label="Price"
                                    value={deal.value || ''}
                                    display={deal.value ? formatCurrency(deal.value) : undefined}
                                    type="number"
                                    onSave={(v) => saveDeal({ value: v })}
                                />
                                <FieldRow
                                    label="Type"
                                    value={deal.type}
                                    display={typeLabels[deal.type] || deal.type}
                                    options={[
                                        { value: 'buy', label: 'Buyer' },
                                        { value: 'sell', label: 'Seller' },
                                        { value: 'lease', label: 'Lease' },
                                        { value: 'referral', label: 'Referral' },
                                        { value: 'other', label: 'Other' },
                                    ]}
                                    onSave={(v) => saveDeal({ type: v })}
                                />
                                <FieldRow
                                    label="Property"
                                    value={deal.property_address || ''}
                                    placeholder="Add address"
                                    onSave={(v) => saveDeal({ property_address: v })}
                                />
                                <FieldRow
                                    label="MLS #"
                                    value={deal.mls_number || ''}
                                    placeholder="Add MLS #"
                                    onSave={(v) => saveDeal({ mls_number: v })}
                                />
                                <FieldRow
                                    label="Projected Close"
                                    value={deal.expected_close_date || ''}
                                    display={formatDate(deal.expected_close_date) || undefined}
                                    type="date"
                                    onSave={(v) => saveDeal({ expected_close_date: v })}
                                />
                                <FieldRow
                                    label="Actual Close"
                                    value={deal.actual_close_date || ''}
                                    display={formatDate(deal.actual_close_date) || undefined}
                                    type="date"
                                    onSave={(v) => saveDeal({ actual_close_date: v })}
                                />
                                <FieldRow
                                    label="Commission %"
                                    value={deal.commission_rate || ''}
                                    display={deal.commission_rate ? `${deal.commission_rate}%` : undefined}
                                    type="number"
                                    onSave={(v) => saveDeal({ commission_rate: v })}
                                />
                                <FieldRow
                                    label="Commission $"
                                    value={deal.commission_amount || ''}
                                    display={deal.commission_amount ? formatCurrency(deal.commission_amount) : undefined}
                                    type="number"
                                    onSave={(v) => saveDeal({ commission_amount: v })}
                                />
                                <FieldRow
                                    label="Company"
                                    value={deal.company_id?.toString() || ''}
                                    display={deal.company?.name}
                                    options={[
                                        { value: '', label: 'None' },
                                        ...companies.map((c) => ({ value: c.id.toString(), label: c.name })),
                                    ]}
                                    onSave={(v) => saveDeal({ company_id: v })}
                                />
                            </div>

                            {/* Investor Analysis */}
                            <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2.5">
                                <SectionLabel>Investor Analysis</SectionLabel>
                                <FieldRow
                                    label="ARV"
                                    value={deal.arv || ''}
                                    display={deal.arv ? formatCurrency(deal.arv) : undefined}
                                    type="number"
                                    onSave={(v) => saveDeal({ arv: v })}
                                />
                                <FieldRow
                                    label="Repair Cost"
                                    value={deal.repair_cost || ''}
                                    display={deal.repair_cost ? formatCurrency(deal.repair_cost) : undefined}
                                    type="number"
                                    onSave={(v) => saveDeal({ repair_cost: v })}
                                />
                                <FieldRow
                                    label="Assignment Fee"
                                    value={deal.assignment_fee || ''}
                                    display={deal.assignment_fee ? formatCurrency(deal.assignment_fee) : undefined}
                                    type="number"
                                    onSave={(v) => saveDeal({ assignment_fee: v })}
                                />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-[#5F656D]">MAO</span>
                                    <span className="text-[13px] text-[#111315] font-semibold">
                                        {deal.mao ? formatCurrency(deal.mao) : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                <SectionLabel>Tags</SectionLabel>
                                <TagPicker
                                    tags={deal.tags || []}
                                    allTags={tags}
                                    onChange={(ids) => saveDeal({ tags: ids })}
                                />
                            </div>

                            {/* Custom Fields */}
                            <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                <SectionLabel>Custom Fields</SectionLabel>
                                <CustomFieldsCard
                                    customFields={deal.custom_fields || {}}
                                    onSave={(fields) => saveDeal({ custom_fields: fields })}
                                />
                            </div>

                            {/* Lost reason */}
                            {deal.lost_reason && (
                                <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-xs text-[#5F656D]">Lost Reason</span>
                                        <span className="text-red-600 text-[13px] font-medium">{deal.lost_reason}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MIDDLE 50% — Action Box + Timeline (mirrors Contacts pattern) */}
                    <div className={`min-w-0 flex flex-col gap-4 lg:gap-5 ${mobileSection !== 'timeline' ? 'hidden lg:flex' : ''}`}>
                        {/* Action box — note input wrapped in gray panel matching Contacts */}
                        <div className="bg-[#F3F4F6] border border-[#E4E7EB] rounded-[4px] shrink-0">
                            <div className="p-2">
                                <div className="bg-white rounded-[4px] border border-[#E4E7EB] p-3">
                                    <NotesList notes={[]} notableType="deal" notableId={deal.id} inputOnly />
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="flex-1">
                            <TimelineFeed events={deal.timeline_events || []} />
                            {(deal.timeline_events || []).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <svg className="h-10 w-10 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                    <p className="mt-3 text-sm text-[#8B9096]">No activity yet</p>
                                    <p className="text-xs text-[#C4C9D1]">Activity on this deal will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT 25% — Sidebar cards */}
                    <div className={`min-w-0 flex flex-col gap-4 ${mobileSection !== 'sidebar' ? 'hidden lg:flex' : ''}`}>
                        {/* Contacts */}
                        <SidebarCard
                            title="Contacts"
                            count={(deal.contacts || []).length}
                            icon={
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                            }
                        >
                            <ContactPicker
                                allContacts={allContacts}
                                selected={deal.contacts || []}
                                onSave={(ids) => saveDeal({ contacts: ids })}
                            />
                        </SidebarCard>

                        {/* Team Members */}
                        {teamMembers.length > 0 && (
                            <SidebarCard
                                title="Team Members"
                                count={(deal.assigned_users || []).length}
                                icon={
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                                    </svg>
                                }
                            >
                                <AssignedUsersPicker
                                    assignedUsers={deal.assigned_users || []}
                                    teamMembers={teamMembers}
                                    onSave={(ids) => saveDeal({ assigned_user_ids: ids })}
                                />
                            </SidebarCard>
                        )}

                        {/* Key Dates */}
                        <SidebarCard
                            title="Key Dates"
                            icon={
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                            }
                        >
                            <dl className="space-y-2.5">
                                <FieldRow
                                    label="Inspection"
                                    value={deal.inspection_date || ''}
                                    display={formatDate(deal.inspection_date) || undefined}
                                    type="date"
                                    onSave={(v) => saveDeal({ inspection_date: v })}
                                />
                                <FieldRow
                                    label="Walkthrough"
                                    value={deal.walkthrough_date || ''}
                                    display={formatDate(deal.walkthrough_date) || undefined}
                                    type="date"
                                    onSave={(v) => saveDeal({ walkthrough_date: v })}
                                />
                                <FieldRow
                                    label="Possession"
                                    value={deal.possession_date || ''}
                                    display={formatDate(deal.possession_date) || undefined}
                                    type="date"
                                    onSave={(v) => saveDeal({ possession_date: v })}
                                />
                                <FieldRow
                                    label="Earnest Money Due"
                                    value={deal.earnest_money_due_date || ''}
                                    display={formatDate(deal.earnest_money_due_date) || undefined}
                                    type="date"
                                    onSave={(v) => saveDeal({ earnest_money_due_date: v })}
                                />
                                <FieldRow
                                    label="Due Diligence"
                                    value={deal.due_diligence_date || ''}
                                    display={formatDate(deal.due_diligence_date) || undefined}
                                    type="date"
                                    onSave={(v) => saveDeal({ due_diligence_date: v })}
                                />
                            </dl>
                        </SidebarCard>
                    </div>
                </div>
            </div>
        </CrmLayout>
    );
}
