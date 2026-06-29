import { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import type { Listing } from '../types';
import { capitalize, formatDate, formatPrice, formatStatusLabel } from '../utils';
import StatusBadge from './StatusBadge';

interface Props {
    listing: Listing | null;
    onClose: () => void;
    onOpenLightbox: (photos: string[], index: number) => void;
}

type DrawerTab = 'gallery' | 'overview' | 'details';

const TAB_LABELS: Record<DrawerTab, string> = {
    gallery: 'Gallery',
    overview: 'Overview',
    details: 'Details',
};

/**
 * Right-side drawer showing a CRM listing's details.
 * Tabbed (Gallery / Overview / Details).
 */
export default function ListingDetailDrawer({ listing, onClose, onOpenLightbox }: Props) {
    const [tab, setTab] = useState<DrawerTab>('overview');
    const [photoIndex, setPhotoIndex] = useState(0);

    useEffect(() => {
        setPhotoIndex(0);
        setTab((listing?.photos?.length ?? 0) > 0 ? 'gallery' : 'overview');
    }, [listing?.id]);

    useEffect(() => {
        if (!listing) return;
        const photoCount = listing.photos?.length ?? 0;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (tab === 'gallery' && photoCount > 1) {
                if (e.key === 'ArrowLeft') setPhotoIndex((i) => (i > 0 ? i - 1 : photoCount - 1));
                if (e.key === 'ArrowRight') setPhotoIndex((i) => (i < photoCount - 1 ? i + 1 : 0));
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [listing, onClose, tab]);

    if (!listing) return null;

    const photos = listing.photos || [];
    const hasPhotos = photos.length > 0;
    const fullAddress = [listing.address, listing.city, listing.state_province].filter(Boolean).join(', ');

    return (
        <>
            <div className="fixed inset-0 z-[1050] bg-black/30" onClick={onClose} />

            <aside
                className="fixed top-0 right-0 bottom-0 z-[1060] w-full sm:w-[560px] lg:w-[640px] bg-white shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 h-14 border-b border-[#E4E7EB] shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge value={listing.status} />
                        <StatusBadge value={listing.listing_type} variant="type" />
                        {listing.mls_number && <span className="text-xs text-[#8B9096] truncate">MLS# {listing.mls_number}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                        <Link
                            href={route('crm.listings.edit', listing.id)}
                            className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] rounded-md transition-colors"
                            title="Edit"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                            </svg>
                            Edit
                        </Link>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors"
                        >
                            <svg className="h-4 w-4 text-[#5F656D]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-stretch h-11 border-b border-[#E4E7EB] shrink-0 px-2">
                    {(Object.keys(TAB_LABELS) as DrawerTab[]).map((t) => {
                        if (t === 'gallery' && !hasPhotos) return null;
                        return (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 text-sm font-medium transition-colors relative ${
                                    tab === t ? 'text-[#111315]' : 'text-[#8B9096] hover:text-[#5F656D]'
                                }`}
                            >
                                {TAB_LABELS[t]}
                                {tab === t && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#7C36EE] rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab body */}
                <div className="flex-1 overflow-y-auto">
                    {tab === 'gallery' && hasPhotos && (
                        <GalleryTab photos={photos} index={photoIndex} setIndex={setPhotoIndex} onOpenLightbox={onOpenLightbox} />
                    )}
                    {tab === 'overview' && (
                        <>
                            <div className="px-5 py-5 border-b border-[#E4E7EB]">
                                <h2 className="text-lg font-semibold text-[#111315]">{listing.title}</h2>
                                {fullAddress && <p className="text-sm text-[#5F656D] mt-1">{fullAddress}</p>}
                                <p className="text-xl font-bold text-[#111315] mt-3">{formatPrice(listing.price)}</p>

                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <Stat label="Beds" value={listing.bedrooms ?? '—'} />
                                    <Stat label="Baths" value={listing.bathrooms ?? '—'} />
                                    <Stat label="Sq.Ft" value={listing.sqft ? listing.sqft.toLocaleString() : '—'} />
                                </div>
                            </div>

                            <Section title="Quick Facts">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    {listing.mls_number && <Fact label="MLS #" value={listing.mls_number} />}
                                    <Fact label="Type" value={capitalize(listing.listing_type)} />
                                    <Fact label="Status" value={formatStatusLabel(listing.status)} />
                                    <Fact label="Listed" value={listing.listed_at ? formatDate(listing.listed_at) : '—'} />
                                    <Fact label="Added" value={formatDate(listing.created_at)} />
                                    {listing.user && <Fact label="Added By" value={listing.user.name} />}
                                </div>
                            </Section>

                            {listing.contact && (
                                <Section title="Contact">
                                    <Link
                                        href={route('crm.contacts.show', listing.contact.uuid)}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-[#7C36EE] hover:underline"
                                    >
                                        {listing.contact.first_name} {listing.contact.last_name}
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                    </Link>
                                </Section>
                            )}

                            {listing.tags?.length > 0 && (
                                <Section title="Tags">
                                    <div className="flex flex-wrap gap-1.5">
                                        {listing.tags.map((tag) => (
                                            <span
                                                key={tag.id}
                                                className="inline-flex px-2 py-0.5 text-xs font-medium rounded"
                                                style={{ backgroundColor: tag.color + '15', color: tag.color }}
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                </Section>
                            )}
                        </>
                    )}

                    {tab === 'details' && (
                        <>
                            {listing.custom_fields && Object.keys(listing.custom_fields).length > 0 ? (
                                <Section title="Custom Fields">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {Object.entries(listing.custom_fields).map(([key, value]) => (
                                            <Fact key={key} label={capitalize(key)} value={value || '—'} />
                                        ))}
                                    </div>
                                </Section>
                            ) : (
                                <div className="p-10 text-center">
                                    <p className="text-sm text-[#8B9096]">No additional details for this listing.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}

// ─── Shared ─────────────────────────────────────────────────

function GalleryTab({ photos, index, setIndex, onOpenLightbox }: {
    photos: string[];
    index: number;
    setIndex: (i: number | ((prev: number) => number)) => void;
    onOpenLightbox: (photos: string[], index: number) => void;
}) {
    const hero = photos[index];
    return (
        <div className="flex flex-col h-full">
            <div className="relative bg-black flex-1 min-h-[280px] group cursor-pointer" onClick={() => onOpenLightbox(photos, index)}>
                <img src={hero} alt="" className="w-full h-full object-contain" />
                {photos.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIndex((i) => (i > 0 ? i - 1 : photos.length - 1)); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIndex((i) => (i < photos.length - 1 ? i + 1 : 0)); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-black/60 text-white rounded-full pointer-events-none">
                            {index + 1} / {photos.length}
                        </span>
                    </>
                )}
            </div>
            {photos.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto px-4 py-3 border-t border-[#E4E7EB] shrink-0">
                    {photos.map((photo, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-all ${
                                i === index ? 'border-[#7C36EE] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="px-5 py-5 border-b border-[#E4E7EB]">
            <h5 className="text-xs font-semibold text-[#8B9096] tracking-wider mb-3">{title}</h5>
            {children}
        </div>
    );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <span className="text-xs text-[#8B9096]">{label}</span>
            <p className="text-sm text-[#111315] font-medium mt-1">{value}</p>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg px-3 py-2.5">
            <div className="text-xs text-[#8B9096] mb-0.5">{label}</div>
            <div className="text-base font-semibold text-[#111315] leading-tight">{value}</div>
        </div>
    );
}
