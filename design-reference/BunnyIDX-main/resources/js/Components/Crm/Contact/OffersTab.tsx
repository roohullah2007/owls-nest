import { router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import MlsSearchPickerModal from './MlsSearchPickerModal';
import RepliesThread, { Reply } from './RepliesThread';
import { Contact } from './types';

interface Listing {
    id: number;
    address?: string | null;
    city?: string | null;
    state_province?: string | null;
}

interface IdxConnection {
    id: number;
    provider: string;
    mls_slug: string;
    display_name: string;
    agent_id: string | null;
    office_id: string | null;
}

interface Offer {
    id: number;
    listing_id?: number | null;
    listing?: Listing | null;
    listing_address?: string | null;
    amount?: number | string | null;
    status?: string | null;
    submitted_at?: string | null;
    notes?: string | null;
    source?: string | null;
    replies?: Reply[] | null;
}

interface Props {
    contact: Contact & { offers?: Offer[]; listings?: Listing[] };
    idxConnections?: IdxConnection[];
}

const STATUS_OPTIONS = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'countered', label: 'Countered' },
    { value: 'withdrawn', label: 'Withdrawn' },
    { value: 'expired', label: 'Expired' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    submitted: { bg: '#EDE9FE', text: '#7C3AED' },
    accepted: { bg: '#DCFCE7', text: '#15803D' },
    rejected: { bg: '#FEE2E2', text: '#B91C1C' },
    countered: { bg: '#FEF3C7', text: '#A16207' },
    withdrawn: { bg: '#F3F4F6', text: '#5F656D' },
    expired: { bg: '#F3F4F6', text: '#5F656D' },
};

function formatMoney(n?: number | string | null) {
    if (n === null || n === undefined || n === '') return '';
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (Number.isNaN(num)) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function formatDate(s?: string | null) {
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function listingLabel(l: Listing) {
    const parts = [l.address, l.city].filter(Boolean);
    return parts.join(', ') || `Listing #${l.id}`;
}

export default function OffersTab({ contact, idxConnections = [] }: Props) {
    const offers = contact.offers ?? [];
    const listings = contact.listings ?? [];
    const [showAdd, setShowAdd] = useState(false);
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

    return (
        <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-semibold text-[#111315]">Offers</h2>
                    <p className="text-[13px] text-[#111315] mt-0.5">Offers from this lead — manually logged or submitted through your website.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#1693C9] hover:bg-[#1380AF] rounded-[4px] transition-colors"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Offer
                </button>
            </div>

            {/* List or empty state */}
            {offers.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E4E7EB] rounded-[4px] py-12 text-center">
                    <div className="mx-auto h-12 w-12 inline-flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#5F656D] mb-3">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-[#111315]">No offers yet</h3>
                    <p className="text-xs text-[#5F656D] mt-1.5 max-w-md mx-auto leading-relaxed">
                        Offers submitted by this lead through your website will appear here. You can also log one manually below.
                    </p>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="mt-4 inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-[#1693C9] hover:underline"
                    >
                        + Add Offer manually
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {offers.map((offer) => {
                        const status = (offer.status || 'submitted').toLowerCase();
                        const color = STATUS_COLORS[status] || STATUS_COLORS.submitted;
                        const linkedListing = offer.listing;
                        const addressLabel = linkedListing ? listingLabel(linkedListing) : (offer.listing_address || 'Unspecified listing');
                        return (
                            <div key={offer.id} className="bg-white border border-[#E4E7EB] rounded-[4px] p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold text-[#111315] truncate">{addressLabel}</span>
                                            <span
                                                className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize"
                                                style={{ backgroundColor: color.bg, color: color.text }}
                                            >
                                                {status}
                                            </span>
                                            {offer.source === 'website' && (
                                                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#E0F2FE] text-[#0369A1]">
                                                    Website
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-[#5F656D]">
                                            {offer.amount ? <span className="text-[#111315] font-semibold">{formatMoney(offer.amount)}</span> : <span className="italic text-[#8B9096]">No amount</span>}
                                            {offer.submitted_at && <span>· {formatDate(offer.submitted_at)}</span>}
                                        </div>
                                        {offer.notes && <p className="text-xs text-[#111315] mt-2 leading-relaxed whitespace-pre-wrap">{offer.notes}</p>}
                                        <RepliesThread
                                            replies={offer.replies}
                                            routeName="crm.contacts.offers.reply"
                                            routeParams={[contact.uuid, offer.id]}
                                        />
                                    </div>
                                    <div className="shrink-0 flex items-center gap-0.5">
                                        <button
                                            onClick={() => setEditingOffer(offer)}
                                            className="text-[#8B9096] hover:text-[#1693C9] p-1"
                                            title="Edit"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Delete this offer?')) {
                                                    router.delete(route('crm.contacts.offers.destroy', [contact.uuid, offer.id]), { preserveScroll: true });
                                                }
                                            }}
                                            className="text-[#8B9096] hover:text-[#DC2626] p-1"
                                            title="Delete"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {(showAdd || editingOffer) && (
                <OfferModal
                    contact={contact}
                    listings={listings}
                    idxConnections={idxConnections}
                    offer={editingOffer}
                    onClose={() => { setShowAdd(false); setEditingOffer(null); }}
                />
            )}
        </div>
    );
}

function OfferModal({
    contact,
    listings,
    idxConnections,
    offer,
    onClose,
}: {
    contact: Contact;
    listings: Listing[];
    idxConnections: IdxConnection[];
    offer?: Offer | null;
    onClose: () => void;
}) {
    const isEdit = !!offer;
    const amountRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, patch, processing, errors } = useForm({
        listing_id: (offer?.listing_id ?? '') as string | number,
        listing_address: offer?.listing_address ?? '',
        amount: (offer?.amount ?? '') as string | number,
        status: offer?.status ?? 'submitted',
        notes: offer?.notes ?? '',
        submitted_at: offer?.submitted_at ? String(offer.submitted_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    const [showMls, setShowMls] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => amountRef.current?.focus(), 200);
        return () => clearTimeout(t);
    }, []);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit && offer) {
            patch(route('crm.contacts.offers.update', [contact.uuid, offer.id]), {
                preserveScroll: true,
                onSuccess: onClose,
            });
            return;
        }
        post(route('crm.contacts.offers.store', contact.uuid), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    const formId = 'offer-form';

    const headerRight = idxConnections.length > 0 ? (
        <button
            type="button"
            onClick={() => setShowMls(true)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1693C9] hover:text-[#1380AF]"
        >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            Search MLS
        </button>
    ) : null;

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
                disabled={processing}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {processing ? 'Saving…' : isEdit ? 'Update Offer' : 'Save Offer'}
            </button>
        </>
    );

    return (
        <>
            <SlideOverModal title={isEdit ? 'Edit Offer' : 'Add Offer'} onClose={onClose} headerRight={headerRight} footer={footer}>
                <form id={formId} onSubmit={submit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel htmlFor="offer_amount">Amount</FieldLabel>
                                <input
                                    id="offer_amount"
                                    ref={amountRef}
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    placeholder="450000"
                                    className={inputClass}
                                />
                                {errors.amount && <p className="mt-1 text-[11px] text-red-500">{errors.amount}</p>}
                            </div>
                            <div>
                                <FieldLabel htmlFor="offer_status">Status</FieldLabel>
                                <select
                                    id="offer_status"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className={inputClass}
                                >
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                                {errors.status && <p className="mt-1 text-[11px] text-red-500">{errors.status}</p>}
                            </div>
                        </div>

                        <div>
                            <FieldLabel htmlFor="offer_listing">Listing</FieldLabel>
                            <select
                                id="offer_listing"
                                value={String(data.listing_id)}
                                onChange={(e) => setData('listing_id', e.target.value)}
                                className={inputClass}
                            >
                                <option value="">No specific listing</option>
                                {listings.map((l) => (
                                    <option key={l.id} value={String(l.id)}>{listingLabel(l)}</option>
                                ))}
                            </select>
                            {errors.listing_id && <p className="mt-1 text-[11px] text-red-500">{errors.listing_id}</p>}
                        </div>

                        <div>
                            <FieldLabel htmlFor="offer_address" help="Use this if the listing isn't in your CRM yet.">Or address</FieldLabel>
                            <input
                                id="offer_address"
                                type="text"
                                value={data.listing_address}
                                onChange={(e) => setData('listing_address', e.target.value)}
                                placeholder="123 Main St, Miami FL"
                                className={inputClass}
                            />
                            {errors.listing_address && <p className="mt-1 text-[11px] text-red-500">{errors.listing_address}</p>}
                        </div>

                        <div>
                            <FieldLabel htmlFor="offer_submitted">Submitted on</FieldLabel>
                            <input
                                id="offer_submitted"
                                type="date"
                                value={data.submitted_at}
                                onChange={(e) => setData('submitted_at', e.target.value)}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <FieldLabel htmlFor="offer_notes">Notes</FieldLabel>
                            <textarea
                                id="offer_notes"
                                rows={3}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Contingencies, financing details, deadlines…"
                                className={inputClass + ' resize-none'}
                            />
                            {errors.notes && <p className="mt-1 text-[11px] text-red-500">{errors.notes}</p>}
                        </div>
                    </div>
                </form>
            </SlideOverModal>

            {showMls && (
                <MlsSearchPickerModal
                    contact={contact}
                    idxConnections={idxConnections}
                    onClose={() => setShowMls(false)}
                    onPick={(ml) => {
                        const addr = ml.address || {};
                        const full = addr.full
                            || [addr.street, addr.city, addr.state_province, addr.postal_code].filter(Boolean).join(', ');
                        setData((prev) => ({
                            ...prev,
                            listing_id: '',
                            listing_address: full,
                            amount: ml.price ? String(ml.price) : prev.amount,
                        }));
                    }}
                />
            )}
        </>
    );
}
