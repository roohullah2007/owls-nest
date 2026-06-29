import { router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import RepliesThread, { Reply } from './RepliesThread';
import { Contact } from './types';

interface Listing {
    id: number;
    address?: string | null;
    city?: string | null;
    state_province?: string | null;
}

interface Inquiry {
    id: number;
    listing_id?: number | null;
    listing?: Listing | null;
    listing_address?: string | null;
    subject?: string | null;
    message?: string | null;
    submitted_at?: string | null;
    source?: string | null;
    status?: string | null;
    replies?: Reply[] | null;
}

interface IdxConnection {
    id: number;
    provider: string;
    mls_slug: string;
    display_name: string;
    agent_id: string | null;
    office_id: string | null;
}

interface Props {
    contact: Contact & { inquiries?: Inquiry[]; listings?: Listing[] };
    idxConnections?: IdxConnection[];
}

const STATUS_OPTIONS = [
    { value: 'open', label: 'Open' },
    { value: 'responded', label: 'Responded' },
    { value: 'closed', label: 'Closed' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    open: { bg: '#FEF3C7', text: '#A16207' },
    responded: { bg: '#DCFCE7', text: '#15803D' },
    closed: { bg: '#F3F4F6', text: '#5F656D' },
};

function formatDate(s?: string | null) {
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function listingLabel(l: Listing) {
    const parts = [l.address, l.city].filter(Boolean);
    return parts.join(', ') || `Listing #${l.id}`;
}

export default function InquiriesTab({ contact }: Props) {
    // idxConnections accepted for parity with OffersTab; MLS search hookup pending.
    const inquiries = contact.inquiries ?? [];
    const listings = contact.listings ?? [];
    const [showAdd, setShowAdd] = useState(false);
    const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);

    return (
        <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-semibold text-[#111315]">Inquiries</h2>
                    <p className="text-[13px] text-[#111315] mt-0.5">Questions from this lead — manually logged or submitted through your website.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#1693C9] hover:bg-[#1380AF] rounded-[4px] transition-colors"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Inquiry
                </button>
            </div>

            {/* List or empty state */}
            {inquiries.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E4E7EB] rounded-[4px] py-12 text-center">
                    <div className="mx-auto h-12 w-12 inline-flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#5F656D] mb-3">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-[#111315]">No inquiries yet</h3>
                    <p className="text-xs text-[#5F656D] mt-1.5 max-w-md mx-auto leading-relaxed">
                        Questions submitted by this lead through your website will appear here. You can also log one manually below.
                    </p>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="mt-4 inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-[#1693C9] hover:underline"
                    >
                        + Add Inquiry manually
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {inquiries.map((inquiry) => {
                        const status = (inquiry.status || 'open').toLowerCase();
                        const color = STATUS_COLORS[status] || STATUS_COLORS.open;
                        const linkedListing = inquiry.listing;
                        const addressLabel = linkedListing ? listingLabel(linkedListing) : inquiry.listing_address;
                        return (
                            <div key={inquiry.id} className="bg-white border border-[#E4E7EB] rounded-[4px] p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold text-[#111315] truncate">
                                                {inquiry.subject || addressLabel || 'Inquiry'}
                                            </span>
                                            <span
                                                className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize"
                                                style={{ backgroundColor: color.bg, color: color.text }}
                                            >
                                                {status}
                                            </span>
                                            {inquiry.source === 'website' && (
                                                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#E0F2FE] text-[#0369A1]">
                                                    Website
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-[#5F656D]">
                                            {addressLabel && inquiry.subject && <span className="truncate">{addressLabel}</span>}
                                            {inquiry.submitted_at && <span>· {formatDate(inquiry.submitted_at)}</span>}
                                        </div>
                                        {inquiry.message && <p className="text-xs text-[#111315] mt-2 leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>}
                                        <RepliesThread
                                            replies={inquiry.replies}
                                            routeName="crm.contacts.inquiries.reply"
                                            routeParams={[contact.uuid, inquiry.id]}
                                        />
                                    </div>
                                    <div className="shrink-0 flex items-center gap-0.5">
                                        <button
                                            onClick={() => setEditingInquiry(inquiry)}
                                            className="text-[#8B9096] hover:text-[#1693C9] p-1"
                                            title="Edit"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Delete this inquiry?')) {
                                                    router.delete(route('crm.contacts.inquiries.destroy', [contact.uuid, inquiry.id]), { preserveScroll: true });
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

            {(showAdd || editingInquiry) && (
                <InquiryModal
                    contactUuid={contact.uuid}
                    listings={listings}
                    inquiry={editingInquiry}
                    onClose={() => { setShowAdd(false); setEditingInquiry(null); }}
                />
            )}
        </div>
    );
}

function InquiryModal({
    contactUuid,
    listings,
    inquiry,
    onClose,
}: {
    contactUuid: string;
    listings: Listing[];
    inquiry?: Inquiry | null;
    onClose: () => void;
}) {
    const isEdit = !!inquiry;
    const subjectRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, patch, processing, errors } = useForm({
        listing_id: (inquiry?.listing_id ?? '') as string | number,
        listing_address: inquiry?.listing_address ?? '',
        subject: inquiry?.subject ?? '',
        message: inquiry?.message ?? '',
        status: inquiry?.status ?? 'open',
        submitted_at: inquiry?.submitted_at ? String(inquiry.submitted_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    });

    useEffect(() => {
        const t = setTimeout(() => subjectRef.current?.focus(), 200);
        return () => clearTimeout(t);
    }, []);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit && inquiry) {
            patch(route('crm.contacts.inquiries.update', [contactUuid, inquiry.id]), {
                preserveScroll: true,
                onSuccess: onClose,
            });
            return;
        }
        post(route('crm.contacts.inquiries.store', contactUuid), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    const formId = 'inquiry-form';

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
                {processing ? 'Saving…' : isEdit ? 'Update Inquiry' : 'Save Inquiry'}
            </button>
        </>
    );

    return (
        <SlideOverModal title={isEdit ? 'Edit Inquiry' : 'Add Inquiry'} onClose={onClose} footer={footer}>
            <form id={formId} onSubmit={submit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                    <div>
                        <FieldLabel htmlFor="inq_subject">Subject</FieldLabel>
                        <input
                            id="inq_subject"
                            ref={subjectRef}
                            type="text"
                            value={data.subject}
                            onChange={(e) => setData('subject', e.target.value)}
                            placeholder="Showing request, pricing question…"
                            className={inputClass}
                        />
                        {errors.subject && <p className="mt-1 text-[11px] text-red-500">{errors.subject}</p>}
                    </div>

                    <div>
                        <FieldLabel htmlFor="inq_listing">Listing</FieldLabel>
                        <select
                            id="inq_listing"
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
                        <FieldLabel htmlFor="inq_address" help="Use this if the listing isn't in your CRM yet.">Or address</FieldLabel>
                        <input
                            id="inq_address"
                            type="text"
                            value={data.listing_address}
                            onChange={(e) => setData('listing_address', e.target.value)}
                            placeholder="123 Main St, Miami FL"
                            className={inputClass}
                        />
                        {errors.listing_address && <p className="mt-1 text-[11px] text-red-500">{errors.listing_address}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <FieldLabel htmlFor="inq_status">Status</FieldLabel>
                            <select
                                id="inq_status"
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
                        <div>
                            <FieldLabel htmlFor="inq_received">Received on</FieldLabel>
                            <input
                                id="inq_received"
                                type="date"
                                value={data.submitted_at}
                                onChange={(e) => setData('submitted_at', e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="inq_message">Message</FieldLabel>
                        <textarea
                            id="inq_message"
                            rows={4}
                            value={data.message}
                            onChange={(e) => setData('message', e.target.value)}
                            placeholder="What did they ask?"
                            className={inputClass + ' resize-none'}
                        />
                        {errors.message && <p className="mt-1 text-[11px] text-red-500">{errors.message}</p>}
                    </div>
                </div>
            </form>
        </SlideOverModal>
    );
}
