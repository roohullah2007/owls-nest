import CrmLayout from '@/Layouts/CrmLayout';
import TimelineFeed from '@/Components/Crm/TimelineFeed';
import NotesList from '@/Components/Crm/NotesList';
import ConversationsCard from '@/Components/Crm/ConversationsCard';
import TasksList from '@/Components/Crm/TasksList';
import { Head, Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { formatStatusLabel } from './utils';
import { formatDate as fmtDate } from '@/utils/dateFormatters';

interface Listing {
    id: number;
    listing_type: string;
    status: string;
    title: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    postal_code: string | null;
    country: string;
    mls_number: string | null;
    price: string | null;
    bedrooms: number | null;
    bathrooms: string | null;
    sqft: number | null;
    lot_size: string | null;
    year_built: number | null;
    description: string | null;
    features: Record<string, any> | null;
    photos: string[] | null;
    listed_at: string | null;
    sold_at: string | null;
    expired_at: string | null;
    created_at: string;
    contact: { id: number; uuid: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
    deal: { id: number; title: string } | null;
    tags: { id: number; name: string; color: string }[];
    user?: { id: number; name: string } | null;
    notes: any[];
    tasks: any[];
    timeline_events: any[];
}

interface Props {
    listing: Listing;
}

const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#DCFCE7', text: '#166534' },
    pending: { bg: '#FEF9C3', text: '#854D0E' },
    sold: { bg: '#DBEAFE', text: '#1E40AF' },
    expired: { bg: '#FEE2E2', text: '#991B1B' },
    withdrawn: { bg: '#F3F4F6', text: '#5F656D' },
    coming_soon: { bg: '#F3E8FF', text: '#6B21A8' },
};

function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPrice(p: string | null) {
    if (!p) return '—';
    return '$' + Number(p).toLocaleString();
}

const formatDate = (d: string | null): string => fmtDate(d, '—');

const tabs = ['Timeline', 'Details', 'Notes', 'Tasks'];

export default function ListingShow({ listing }: Props) {
    const [activeTab, setActiveTab] = useState('Timeline');
    const [selectedPhoto, setSelectedPhoto] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const colors = statusColors[listing.status] || { bg: '#F3F4F6', text: '#5F656D' };
    const fullAddress = [listing.address, listing.city, listing.state_province, listing.postal_code].filter(Boolean).join(', ');
    const photos = listing.photos || [];

    function handleDelete() {
        if (confirm('Are you sure you want to delete this listing?')) {
            router.delete(route('crm.listings.destroy', listing.id));
        }
    }

    function openLightbox(index: number) {
        setLightboxIndex(index);
        setLightboxOpen(true);
    }

    const handleLightboxKey = useCallback((e: KeyboardEvent) => {
        if (!lightboxOpen) return;
        if (e.key === 'Escape') setLightboxOpen(false);
        if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + photos.length) % photos.length);
        if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % photos.length);
    }, [lightboxOpen, photos.length]);

    useEffect(() => {
        document.addEventListener('keydown', handleLightboxKey);
        return () => document.removeEventListener('keydown', handleLightboxKey);
    }, [handleLightboxKey]);

    useEffect(() => {
        if (lightboxOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [lightboxOpen]);

    return (
        <CrmLayout>
            <Head title={listing.title} />

            <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-[#F3F4F6]">

                {/* Toolbar header */}
                <div className="shrink-0 flex items-center h-11 bg-white border-b border-[#E4E7EB] px-3 sm:px-6">
                    <Link href={route('crm.listings.index')} className="text-[#8B9096] hover:text-[#111315] transition-colors mr-3">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                    <h1 className="text-xs font-semibold text-[#111315] tracking-wider truncate">{listing.title}</h1>
                    <div className="ml-auto flex items-center gap-2">
                        <Link
                            href={route('crm.listings.edit', listing.id)}
                            className="h-7 px-3 flex items-center text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F3F4F6] transition-colors"
                        >
                            Edit
                        </Link>
                        <button
                            onClick={handleDelete}
                            className="h-7 px-3 flex items-center text-[11px] font-medium text-red-500 border border-[#E4E7EB] rounded-md hover:bg-red-50 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
                    <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-3">
                        {/* Left sidebar */}
                        <div className="space-y-4 lg:col-span-1">
                            {/* Listing card */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                {/* Photo gallery */}
                                {photos.length > 0 ? (
                                    <div className="mb-4">
                                        <div className="relative h-48 overflow-hidden rounded-xl cursor-pointer group" onClick={() => openLightbox(selectedPhoto)}>
                                            <img
                                                src={photos[selectedPhoto]}
                                                alt={listing.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                                                {photos.length} photo{photos.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {photos.length > 1 && (
                                            <div className="grid grid-cols-4 gap-1 mt-1">
                                                {photos.map((url, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setSelectedPhoto(i)}
                                                        className={`aspect-[4/3] overflow-hidden rounded-lg border-2 transition-colors ${
                                                            i === selectedPhoto ? 'border-[#1693C9]' : 'border-transparent hover:border-[#E4E7EB]'
                                                        }`}
                                                    >
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-[#F9FAFB]">
                                        <svg className="h-12 w-12 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
                                        </svg>
                                    </div>
                                )}

                                {/* Price */}
                                <p className="text-2xl font-bold text-[#111315] mb-2">{formatPrice(listing.price)}</p>

                                {/* Badges */}
                                <div className="flex gap-2 mb-4">
                                    <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-[#F3F4F6] text-[#5F656D] rounded-full">
                                        {capitalize(listing.listing_type)}
                                    </span>
                                    <span
                                        className="inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full"
                                        style={{ backgroundColor: colors.bg, color: colors.text }}
                                    >
                                        {formatStatusLabel(listing.status)}
                                    </span>
                                </div>

                                {/* Key stats */}
                                {(listing.bedrooms !== null || listing.bathrooms !== null || listing.sqft !== null) && (
                                    <div className="flex gap-4 mb-4 text-sm text-[#5F656D]">
                                        {listing.bedrooms !== null && <span><strong className="text-[#5F656D]">{listing.bedrooms}</strong> beds</span>}
                                        {listing.bathrooms !== null && <span><strong className="text-[#5F656D]">{listing.bathrooms}</strong> baths</span>}
                                        {listing.sqft !== null && <span><strong className="text-[#5F656D]">{listing.sqft.toLocaleString()}</strong> sqft</span>}
                                    </div>
                                )}

                                <dl className="space-y-3 text-sm">
                                    {fullAddress && (
                                        <div>
                                            <dt className="text-[#8B9096] text-xs">Address</dt>
                                            <dd className="text-[#111315]">{fullAddress}</dd>
                                        </div>
                                    )}
                                    {listing.mls_number && (
                                        <div>
                                            <dt className="text-[#8B9096] text-xs">MLS#</dt>
                                            <dd className="text-[#111315]">{listing.mls_number}</dd>
                                        </div>
                                    )}
                                    {listing.lot_size && (
                                        <div>
                                            <dt className="text-[#8B9096] text-xs">Lot Size</dt>
                                            <dd className="text-[#111315]">{listing.lot_size} acres</dd>
                                        </div>
                                    )}
                                    {listing.year_built && (
                                        <div>
                                            <dt className="text-[#8B9096] text-xs">Year Built</dt>
                                            <dd className="text-[#111315]">{listing.year_built}</dd>
                                        </div>
                                    )}
                                    {listing.listed_at && (
                                        <div>
                                            <dt className="text-[#8B9096] text-xs">Listed</dt>
                                            <dd className="text-[#111315]">{formatDate(listing.listed_at)}</dd>
                                        </div>
                                    )}
                                    {listing.sold_at && (
                                        <div>
                                            <dt className="text-[#8B9096] text-xs">Sold</dt>
                                            <dd className="text-[#111315]">{formatDate(listing.sold_at)}</dd>
                                        </div>
                                    )}
                                    {listing.expired_at && (
                                        <div>
                                            <dt className="text-[#8B9096] text-xs">Expired</dt>
                                            <dd className="text-[#111315]">{formatDate(listing.expired_at)}</dd>
                                        </div>
                                    )}
                                </dl>

                                {listing.tags.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-1">
                                        {listing.tags.map((tag) => (
                                            <span key={tag.id} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {listing.user && (
                                    <div className="mt-4 pt-3 border-t border-[#E4E7EB]">
                                        <span className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Added By</span>
                                        <p className="text-xs text-[#5F656D] mt-0.5">{listing.user.name}</p>
                                    </div>
                                )}
                            </div>

                            {/* Linked contact */}
                            {listing.contact && (
                                <div className="border border-[#E4E7EB] bg-white rounded-xl p-4">
                                    <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">Linked Contact</p>
                                    <Link href={route('crm.contacts.show', listing.contact.uuid)} className="text-sm font-medium text-[#1693C9] hover:underline">
                                        {listing.contact.first_name} {listing.contact.last_name}
                                    </Link>
                                    {listing.contact.email && <p className="text-xs text-[#5F656D]">{listing.contact.email}</p>}
                                    {listing.contact.phone && <p className="text-xs text-[#5F656D]">{listing.contact.phone}</p>}
                                </div>
                            )}

                            {/* Linked deal */}
                            {listing.deal && (
                                <div className="border border-[#E4E7EB] bg-white rounded-xl p-4">
                                    <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">Linked Deal</p>
                                    <Link href={route('crm.deals.show', listing.deal.id)} className="text-sm font-medium text-[#1693C9] hover:underline">
                                        {listing.deal.title}
                                    </Link>
                                </div>
                            )}

                            {/* Quick actions */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-4">
                                <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-3">Quick Actions</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setActiveTab('Notes')}
                                        className="flex-1 h-8 rounded-md border border-[#E4E7EB] text-xs font-medium text-[#5F656D] hover:bg-[#F3F4F6] transition-colors"
                                    >
                                        Add Note
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('Tasks')}
                                        className="flex-1 h-8 rounded-md border border-[#E4E7EB] text-xs font-medium text-[#5F656D] hover:bg-[#F3F4F6] transition-colors"
                                    >
                                        Add Task
                                    </button>
                                </div>
                            </div>

                            {/* Team Conversations */}
                            <ConversationsCard listingId={listing.id} />
                        </div>

                        {/* Right tabbed content */}
                        <div className="lg:col-span-2">
                            <div className="border border-[#E4E7EB] bg-white rounded-xl overflow-hidden">
                                <div className="border-b border-[#E4E7EB]">
                                    <nav className="flex">
                                        {tabs.map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                                                    activeTab === tab
                                                        ? 'border-[#111315] text-[#111315]'
                                                        : 'border-transparent text-[#8B9096] hover:text-[#5F656D] hover:border-[#E4E7EB]'
                                                }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </nav>
                                </div>

                                <div className="p-5">
                                    {activeTab === 'Timeline' && (
                                        <TimelineFeed events={(listing as any).timeline_events || []} />
                                    )}

                                    {activeTab === 'Details' && (
                                        (() => {
                                            const f = listing.features || {};
                                            const cap = (s: string) => String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                                            const money = (v: any) => {
                                                const n = v != null && v !== '' ? Number(v) : NaN;
                                                return Number.isNaN(n) ? null : '$' + n.toLocaleString();
                                            };
                                            const arr = (v: any): string[] => (Array.isArray(v) ? v.filter(Boolean) : []);

                                            const facts: Array<[string, string]> = [];
                                            if (f.subdivision) facts.push(['Subdivision', f.subdivision]);
                                            if (f.mls_area) facts.push(['County / Area', f.mls_area]);
                                            if (f.hoa_name) facts.push(['HOA / Association', f.hoa_name]);
                                            if (f.hoa_fee && money(f.hoa_fee)) facts.push(['HOA fee', money(f.hoa_fee)! + (f.hoa_frequency ? ` / ${cap(f.hoa_frequency)}` : '')]);
                                            if (f.tax_annual_amount && money(f.tax_annual_amount)) facts.push(['Annual taxes', money(f.tax_annual_amount)! + (f.tax_year ? ` (${f.tax_year})` : '')]);
                                            if (f.furnished) facts.push(['Furnished', cap(f.furnished)]);

                                            const highlights = [
                                                f.pool ? 'Pool' : null,
                                                f.waterfront ? 'Waterfront' : null,
                                                f.new_construction ? 'New Construction' : null,
                                            ].filter(Boolean) as string[];

                                            const groups: Array<[string, string[]]> = ([
                                                ['View', f.view], ['Appliances', f.appliances], ['Heating', f.heating],
                                                ['Cooling', f.cooling], ['Flooring', f.flooring], ['Exterior', f.exterior_features],
                                                ['Security', f.security_features],
                                            ] as Array<[string, any]>)
                                                .map(([label, v]) => [label, arr(v)] as [string, string[]])
                                                .filter(([, v]) => v.length > 0);

                                            const custom = arr(f.custom_features);
                                            const amenities = arr(f.amenities);
                                            const structured = facts.length || highlights.length || groups.length || custom.length;

                                            return (
                                                <div className="space-y-5">
                                                    {listing.description && (
                                                        <div>
                                                            <h3 className="text-xs font-medium text-[#111315] mb-1">Description</h3>
                                                            <p className="text-sm text-[#5F656D] whitespace-pre-wrap">{listing.description}</p>
                                                        </div>
                                                    )}

                                                    {highlights.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {highlights.map((h) => (
                                                                <span key={h} className="inline-flex items-center rounded-full bg-[#E0F2FE] px-2.5 py-1 text-xs font-medium text-[#1693C9]">{h}</span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {facts.length > 0 && (
                                                        <div>
                                                            <h3 className="text-xs font-medium text-[#111315] mb-2">Property details</h3>
                                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                                                                {facts.map(([label, value]) => (
                                                                    <div key={label} className="flex justify-between gap-3 border-b border-[#F3F4F6] pb-1.5">
                                                                        <dt className="text-xs text-[#8B9096]">{label}</dt>
                                                                        <dd className="text-sm text-[#111315] text-right">{value}</dd>
                                                                    </div>
                                                                ))}
                                                            </dl>
                                                        </div>
                                                    )}

                                                    {groups.map(([label, values]) => (
                                                        <div key={label}>
                                                            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B9096] mb-1.5">{label}</h4>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {values.map((v) => (
                                                                    <span key={v} className="inline-flex items-center rounded-full border border-[#E4E7EB] bg-[#FAFBFC] px-2.5 py-1 text-xs text-[#5F656D]">{v}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {custom.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B9096] mb-1.5">Additional features</h4>
                                                            <ul className="list-disc list-inside text-sm text-[#5F656D]">
                                                                {custom.map((c, i) => <li key={i}>{c}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Legacy / imported listings carry only the flat amenities list. */}
                                                    {!structured && amenities.length > 0 && (
                                                        <div>
                                                            <h3 className="text-xs font-medium text-[#111315] mb-1">Features</h3>
                                                            <ul className="list-disc list-inside text-sm text-[#5F656D]">
                                                                {amenities.map((a, i) => <li key={i}>{a}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {!listing.description && !structured && amenities.length === 0 && (
                                                        <p className="text-sm text-[#8B9096]">No additional details</p>
                                                    )}
                                                </div>
                                            );
                                        })()
                                    )}

                                    {activeTab === 'Notes' && (
                                        <NotesList notes={(listing as any).notes || []} notableType="listing" notableId={listing.id} />
                                    )}

                                    {activeTab === 'Tasks' && (
                                        <TasksList tasks={(listing as any).tasks || []} taskableType="listing" taskableId={listing.id} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Photo lightbox */}
            {lightboxOpen && photos.length > 0 && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
                    {/* Close button */}
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Counter */}
                    <span className="absolute top-4 left-4 text-white/70 text-sm font-medium z-10">
                        {lightboxIndex + 1} / {photos.length}
                    </span>

                    {/* Previous */}
                    {photos.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + photos.length) % photos.length); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                    )}

                    {/* Image */}
                    <img
                        src={photos[lightboxIndex]}
                        alt={`Photo ${lightboxIndex + 1}`}
                        className="max-h-[90vh] max-w-[90vw] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Next */}
                    {photos.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % photos.length); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </CrmLayout>
    );
}
