import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Contact } from './types';
import DealSlideOver, { EditableDeal } from '@/Components/Crm/DealSlideOver';
import { formatDate as fmtDate } from '@/utils/dateFormatters';

interface PipelineStage {
    id: number;
    name: string;
    type: string;
    color: string;
    position?: number;
}

interface Pipeline {
    id: number;
    name: string;
    is_default: boolean;
    stages: PipelineStage[];
}

interface ContactDeal {
    id: number;
    title: string;
    value: string | number | null;
    currency?: string | null;
    type: string;
    property_address?: string | null;
    expected_close_date?: string | null;
    last_activity_at?: string | null;
    created_at?: string;
    pipeline_stage?: PipelineStage | null;
}

interface Props {
    contact: Contact;
    pipelines: Pipeline[];
    dealTypes?: string[];
    userListings?: { id: number; title: string; address: string | null; city: string | null; state_province: string | null; price: string | null; photos: string[] | null; bedrooms?: number | null; bathrooms?: string | null; sqft?: number | null; mls_number?: string | null; contact_id?: number | null }[];
    idxConnections?: { id: number }[];
}

const DEAL_TYPES = [
    { value: 'buy', label: 'Buyer' },
    { value: 'sell', label: 'Seller' },
    { value: 'lease', label: 'Lease' },
    { value: 'referral', label: 'Referral' },
    { value: 'other', label: 'Other' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    buy: { bg: '#EBF5FF', text: '#1693C9' },
    sell: { bg: '#FEF3C7', text: '#A16207' },
    lease: { bg: '#DCFCE7', text: '#15803D' },
    referral: { bg: '#EDE9FE', text: '#7C3AED' },
    other: { bg: '#F3F4F6', text: '#5F656D' },
};

const STAGE_TYPE_COLORS: Record<string, string> = {
    open: '#1693C9',
    won: '#059669',
    lost: '#DC2626',
};

function formatMoney(v: string | number | null | undefined, currency: string | null = 'USD'): string {
    if (v === null || v === undefined || v === '') return '—';
    const n = typeof v === 'string' ? Number(v) : v;
    if (!Number.isFinite(n)) return '—';
    const symbol = currency === 'USD' || !currency ? '$' : '';
    if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `${symbol}${Math.round(n / 1_000)}K`;
    return `${symbol}${n.toLocaleString()}`;
}

const formatDate = (d: string | null | undefined): string => fmtDate(d, '—');

function relativeDate(d: string | null | undefined): string | null {
    if (!d) return null;
    const diffMs = Date.now() - new Date(d).getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    const months = Math.floor(diffDays / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

function DealCard({ deal, onDelete, onEdit }: { deal: ContactDeal; onDelete: () => void; onEdit: () => void }) {
    const stage = deal.pipeline_stage;
    const stageColor = stage?.color || STAGE_TYPE_COLORS[stage?.type || 'open'] || '#8B9096';
    const typeStyle = TYPE_COLORS[deal.type] || TYPE_COLORS.other;
    const lastActivity = relativeDate(deal.last_activity_at || deal.created_at);

    return (
        <article className="group bg-white border border-[#E4E7EB] rounded-[4px] overflow-hidden hover:border-[#1693C9] hover:shadow-sm transition-all">
            <Link href={route('crm.deals.show', deal.id)} className="block p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="shrink-0 h-2 w-2 rounded-full" style={{ backgroundColor: stageColor }} />
                        <h3 className="text-sm font-semibold text-[#111315] truncate group-hover:text-[#1693C9] transition-colors">{deal.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded" style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}>
                            {DEAL_TYPES.find((t) => t.value === deal.type)?.label || deal.type}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                            title="Edit deal"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#1693C9] hover:bg-[#EBF5FF] transition-all"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                            title="Delete deal"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        </button>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                    <div>
                        <p className="text-[13px] font-normal text-[#5F656D] leading-[18px]">Value</p>
                        <p className="text-sm font-semibold text-[#059669] mt-0.5">{formatMoney(deal.value, deal.currency || 'USD')}</p>
                    </div>
                    <div>
                        <p className="text-[13px] font-normal text-[#5F656D] leading-[18px]">Stage</p>
                        <p className="text-[13px] font-medium text-[#111315] mt-0.5 truncate">{stage?.name || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[13px] font-normal text-[#5F656D] leading-[18px]">Close date</p>
                        <p className="text-[13px] text-[#5F656D] mt-0.5">{formatDate(deal.expected_close_date)}</p>
                    </div>
                </div>

                {(deal.property_address || lastActivity) && (
                    <div className="mt-3 pt-3 border-t border-[#F3F4F6] flex items-center gap-3 text-[12px] text-[#111315]">
                        {deal.property_address && (
                            <span className="inline-flex items-center gap-1.5 min-w-0">
                                <svg className="h-3.5 w-3.5 shrink-0 text-[#5F656D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                                <span className="truncate">{deal.property_address}</span>
                            </span>
                        )}
                        {lastActivity && (
                            <span className="ml-auto shrink-0 whitespace-nowrap">Active {lastActivity}</span>
                        )}
                    </div>
                )}
            </Link>
        </article>
    );
}
export default function DealsTab({ contact, pipelines, dealTypes = [], userListings = [], idxConnections = [] }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingDeal, setEditingDeal] = useState<EditableDeal | null>(null);
    const deals = (contact.deals || []) as ContactDeal[];

    function openEdit(d: ContactDeal) {
        setEditingDeal({
            id: d.id,
            title: d.title,
            value: d.value,
            type: d.type,
            pipeline_id: ((d as any).pipeline_id ?? (d.pipeline_stage as any)?.pipeline_id ?? (pipelines.find((p) => p.is_default) || pipelines[0])?.id) as number,
            pipeline_stage_id: (d.pipeline_stage?.id ?? 0) as number,
            property_address: d.property_address || null,
            expected_close_date: d.expected_close_date || null,
            commission_rate: (d as any).commission_rate ?? null,
            commission_amount: (d as any).commission_amount ?? null,
            notes: (d as any).notes ?? null,
            contacts: [{ id: contact.id }],
            tags: ((d as any).tags || []) as { id: number }[],
        });
    }

    // Build property options: lead's linked listings first, then the user's other listings.
    const contactListingIds = new Set(((contact as any).listings || []).map((l: any) => l.id));
    const propertyOptions = [
        ...(((contact as any).listings || []) as any[]).map((l): any => ({
            id: l.id,
            title: l.title,
            address: l.address,
            city: l.city,
            state_province: l.state_province,
            mls_number: l.mls_number,
            price: l.price,
            photos: l.photos,
            source: "Lead's property",
        })),
        ...userListings
            .filter((l) => !contactListingIds.has(l.id) && l.contact_id !== contact.id)
            .map((l) => ({
                id: l.id,
                title: l.title,
                address: l.address,
                city: l.city,
                state_province: l.state_province,
                mls_number: l.mls_number ?? null,
                price: l.price,
                photos: l.photos,
                source: 'My listing',
            })),
    ];

    // Group by stage type: open first, then won, then lost.
    const open = deals.filter((d) => (d.pipeline_stage?.type || 'open') === 'open');
    const won = deals.filter((d) => d.pipeline_stage?.type === 'won');
    const lost = deals.filter((d) => d.pipeline_stage?.type === 'lost');
    const totalValue = open.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    function deleteDeal(id: number) {
        if (!confirm('Delete this deal? This action cannot be undone.')) return;
        router.delete(route('crm.deals.destroy', id), { preserveScroll: true });
    }

    return (
        <div className="p-3 sm:p-4 lg:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-[15px] font-semibold text-[#111315]">Deals</h2>
                    <p className="text-[13px] text-[#111315] mt-0.5">
                        {deals.length === 0
                            ? 'No deals yet. Create one to start tracking commission and pipeline progress.'
                            : `${open.length} open · ${won.length} won · ${lost.length} lost · ${formatMoney(totalValue)} in open pipeline`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {pipelines.length === 0 ? (
                        <Link href={route('crm.deals.index')} className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#5F656D] bg-white border border-[#E4E7EB] rounded-[4px] hover:bg-[#F9FAFB] transition-colors">
                            Set up a pipeline
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Create deal
                        </button>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {deals.length === 0 && (
                <div className={`rounded-[4px] p-6 border ${contact.type === 'seller' ? 'bg-[#FEF3C7] border-[#FDE68A]' : 'bg-[#EBF5FF] border-[#BFDBFE]'}`}>
                    <p className="text-[13px] font-semibold text-[#111315]">Start tracking this lead's deal</p>
                    <p className="text-xs text-[#5F656D] mt-1 leading-relaxed">
                        {contact.type === 'seller' && 'Create a Seller deal to track a listing through pricing, marketing, offers, and closing.'}
                        {contact.type === 'buyer' && 'Create a Buyer deal to track offers, inspections, and the path to closing.'}
                        {contact.type !== 'seller' && contact.type !== 'buyer' && 'Deals link a contact to a pipeline so you can track value and progress over time.'}
                    </p>
                </div>
            )}

            {/* Deal groups */}
            {open.length > 0 && (
                <section>
                    <div className="flex items-baseline gap-2 mb-3">
                        <h3 className="text-[13px] font-semibold text-[#111315]">Open</h3>
                        <span className="text-[12px] text-[#5F656D]">({open.length})</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {open.map((d) => <DealCard key={d.id} deal={d} onDelete={() => deleteDeal(d.id)} onEdit={() => openEdit(d)} />)}
                    </div>
                </section>
            )}

            {won.length > 0 && (
                <section>
                    <div className="flex items-baseline gap-2 mb-3">
                        <h3 className="text-[13px] font-semibold text-[#111315]">Won</h3>
                        <span className="text-[12px] text-[#5F656D]">({won.length})</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {won.map((d) => <DealCard key={d.id} deal={d} onDelete={() => deleteDeal(d.id)} onEdit={() => openEdit(d)} />)}
                    </div>
                </section>
            )}

            {lost.length > 0 && (
                <section>
                    <div className="flex items-baseline gap-2 mb-3">
                        <h3 className="text-[13px] font-semibold text-[#111315]">Lost</h3>
                        <span className="text-[12px] text-[#5F656D]">({lost.length})</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {lost.map((d) => <DealCard key={d.id} deal={d} onDelete={() => deleteDeal(d.id)} onEdit={() => openEdit(d)} />)}
                    </div>
                </section>
            )}

            {showCreate && pipelines.length > 0 && (
                <DealSlideOver
                    pipeline={(pipelines.find((p) => p.is_default) || pipelines[0]) as any}
                    pipelines={pipelines as any}
                    dealTypes={dealTypes}
                    propertyOptions={propertyOptions}
                    mlsConnectionId={idxConnections[0]?.id || null}
                    stageId={null}
                    contacts={[{ id: contact.id, uuid: contact.uuid, first_name: contact.first_name, last_name: contact.last_name }]}
                    tags={[]}
                    defaults={{
                        type: contact.type === 'seller' ? 'sell' : contact.type === 'buyer' ? 'buy' : 'buy',
                        contact_ids: [contact.id],
                        contact_names: [`${contact.first_name} ${contact.last_name}`],
                    }}
                    onClose={() => setShowCreate(false)}
                />
            )}

            {editingDeal && pipelines.length > 0 && (
                <DealSlideOver
                    pipeline={(pipelines.find((p) => p.is_default) || pipelines[0]) as any}
                    pipelines={pipelines as any}
                    dealTypes={dealTypes}
                    propertyOptions={propertyOptions}
                    mlsConnectionId={idxConnections[0]?.id || null}
                    stageId={null}
                    contacts={[{ id: contact.id, uuid: contact.uuid, first_name: contact.first_name, last_name: contact.last_name }]}
                    tags={[]}
                    deal={editingDeal}
                    onClose={() => setEditingDeal(null)}
                />
            )}
        </div>
    );
}
