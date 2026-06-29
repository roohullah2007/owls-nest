import { useEffect, useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { usePinnedListings } from '@/hooks/usePinnedListings';
import type { MlsListing } from '../types';
import { formatDate, formatPrice, joinField } from '../utils';

interface Props {
    listing: MlsListing | null;
    onClose: () => void;
    onOpenLightbox: (photos: string[], index: number) => void;
}

type DrawerTab = 'gallery' | 'overview' | 'details' | 'agent';

const TAB_LABELS: Record<DrawerTab, string> = {
    overview: 'Overview',
    gallery: 'Gallery',
    details: 'Details',
    agent: 'Agent',
};

/**
 * Right-side drawer for an MLS listing. Uses the shared SlideOverModal so the
 * header / backdrop / transitions match every other drawer in the CRM.
 * Tab strip sits directly below the modal header.
 */
export default function MlsDetailDrawer({ listing, onClose, onOpenLightbox }: Props) {
    const [tab, setTab] = useState<DrawerTab>('overview');
    const [photoIndex, setPhotoIndex] = useState(0);

    useEffect(() => {
        setPhotoIndex(0);
        setTab('overview');
    }, [listing?.mls_id]);

    useEffect(() => {
        if (!listing) return;
        const photoCount = listing.photos?.length ?? 0;
        const onKey = (e: KeyboardEvent) => {
            if (tab === 'gallery' && photoCount > 1) {
                if (e.key === 'ArrowLeft') setPhotoIndex((i) => (i > 0 ? i - 1 : photoCount - 1));
                if (e.key === 'ArrowRight') setPhotoIndex((i) => (i < photoCount - 1 ? i + 1 : 0));
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [listing, tab]);

    const { isPinned, togglePin } = usePinnedListings();

    if (!listing) return null;
    const ml = listing;
    const hasPhotos = (ml.photos?.length ?? 0) > 0;
    const pinned = isPinned(ml.mls_slug, ml.mls_id);

    const headerRight = (
        <button
            type="button"
            onClick={() => togglePin(ml.mls_slug, ml.mls_id)}
            title={pinned ? 'Unpin listing' : 'Pin listing'}
            className={`inline-flex items-center gap-1 h-7 px-2 rounded-[4px] text-xs font-medium transition-colors ${
                pinned
                    ? 'bg-[#1693C9] text-white hover:bg-[#1380AF]'
                    : 'text-[#5F656D] hover:text-[#111315] hover:bg-white'
            }`}
        >
            <svg className="h-3.5 w-3.5" fill={pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
            {pinned ? 'Pinned' : 'Pin'}
        </button>
    );

    return (
        <SlideOverModal
            title={ml.address?.full || `MLS# ${ml.mls_number}`}
            onClose={onClose}
            headerRight={headerRight}
            width={640}
        >
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
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#1693C9] rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto">
                {tab === 'gallery' && hasPhotos && (
                    <GalleryTab
                        photos={ml.photos}
                        index={photoIndex}
                        setIndex={setPhotoIndex}
                        onOpenLightbox={onOpenLightbox}
                    />
                )}
                {tab === 'overview' && <OverviewTab listing={ml} />}
                {tab === 'details' && <DetailsTab listing={ml} />}
                {tab === 'agent' && <AgentTab listing={ml} />}
            </div>
        </SlideOverModal>
    );
}

// ─── Tabs ───────────────────────────────────────────────────

function GalleryTab({ photos, index, setIndex, onOpenLightbox }: {
    photos: string[];
    index: number;
    setIndex: (i: number | ((prev: number) => number)) => void;
    onOpenLightbox: (photos: string[], index: number) => void;
}) {
    const hero = photos[index];

    return (
        <div className="flex flex-col h-full">
            {/* Hero */}
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

            {/* Thumbnails */}
            {photos.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto px-4 py-3 border-t border-[#E4E7EB] shrink-0">
                    {photos.map((photo, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-all ${
                                i === index ? 'border-[#1693C9] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
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

function OverviewTab({ listing: ml }: { listing: MlsListing }) {
    return (
        <>
            <div className="px-5 py-5 border-b border-[#E4E7EB]">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {ml.subdivision && (
                            <p className="text-xs font-medium text-[#5F656D] mb-1">{ml.subdivision}</p>
                        )}
                        <h2 className="text-lg font-semibold text-[#111315]">{ml.address?.full}</h2>
                        {(ml.address?.city || ml.address?.state_province) && (
                            <p className="text-sm text-[#5F656D] mt-1">
                                {[ml.address?.city, ml.address?.state_province, ml.address?.postal_code].filter(Boolean).join(', ')}
                            </p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-[#111315]">{ml.price_formatted || formatPrice(ml.price)}</p>
                        {ml.price_per_sqft != null && (
                            <p className="text-xs text-[#5F656D] mt-0.5">${ml.price_per_sqft.toLocaleString()}/sqft</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                    <Stat label="Beds" value={ml.bedrooms ?? '—'} />
                    <Stat label="Baths" value={ml.bathrooms ?? '—'} sublabel={ml.bathrooms_half ? `${ml.bathrooms_half} half` : undefined} />
                    <Stat label="Sq.Ft" value={ml.sqft ? ml.sqft.toLocaleString() : '—'} />
                    {ml.lot_sqft != null && <Stat label="Lot Sq.Ft" value={ml.lot_sqft.toLocaleString()} />}
                    {ml.garage_spaces != null && ml.garage_spaces > 0 && <Stat label="Garage" value={ml.garage_spaces} />}
                    {ml.stories != null && <Stat label={ml.stories === 1 ? 'Story' : 'Stories'} value={ml.stories} />}
                    {ml.year_built != null && <Stat label="Year Built" value={ml.year_built} />}
                </div>
            </div>

            {ml.description && (
                <Section title="Description">
                    <p className="text-sm text-[#111315] leading-relaxed">{ml.description}</p>
                </Section>
            )}

            <Section title="Quick Facts">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Fact label="MLS #" value={ml.mls_number} />
                    <Fact label="Type" value={`${ml.property_type}${ml.property_subtype ? ` — ${ml.property_subtype}` : ''}`} />
                    <Fact label="Days on Market" value={ml.days_on_market ?? '—'} />
                    <Fact label="Listed" value={ml.list_date ? formatDate(ml.list_date) : '—'} />
                    {ml.sold_date && <Fact label="Sold" value={formatDate(ml.sold_date)} />}
                    {ml.sold_price != null && <Fact label="Sold Price" value={formatPrice(ml.sold_price)} />}
                </div>
            </Section>
        </>
    );
}

function DetailsTab({ listing: ml }: { listing: MlsListing }) {
    const hasInterior = ml.features?.length > 0 || joinField(ml.flooring) || joinField(ml.cooling) || joinField(ml.heating) || ml.appliances?.length > 0 || ml.furnished;
    const hasExterior = ml.exterior_features?.length > 0 || ml.pool || ml.waterfront || joinField(ml.view) || joinField(ml.parking);

    return (
        <>
            <Section title="Facts">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Fact label="MLS #" value={ml.mls_number} />
                    <Fact label="Type" value={`${ml.property_type}${ml.property_subtype ? ` — ${ml.property_subtype}` : ''}`} />
                    {ml.style && <Fact label="Style" value={joinField(ml.style)} />}
                    <Fact label="Year Built" value={ml.year_built || '—'} />
                    {joinField(ml.construction) && <Fact label="Construction" value={joinField(ml.construction)} />}
                    {joinField(ml.roof) && <Fact label="Roof" value={joinField(ml.roof)} />}
                    {ml.address?.county && <Fact label="County" value={ml.address.county} />}
                    <Fact label="Days on Market" value={ml.days_on_market ?? '—'} />
                    <Fact label="Listed" value={ml.list_date ? formatDate(ml.list_date) : '—'} />
                    {ml.sold_date && <Fact label="Sold" value={formatDate(ml.sold_date)} />}
                    {ml.sold_price != null && <Fact label="Sold Price" value={formatPrice(ml.sold_price)} />}
                    <Fact label="Photos" value={ml.photo_count} />
                </div>
            </Section>

            {hasInterior && (
                <Section title="Interior">
                    <div className="space-y-2">
                        {ml.features?.length > 0 && <KeyValueRow label="Features" value={ml.features.join(', ')} />}
                        {ml.appliances?.length > 0 && <KeyValueRow label="Appliances" value={ml.appliances.join(', ')} />}
                        {joinField(ml.flooring) && <KeyValueRow label="Flooring" value={joinField(ml.flooring)} />}
                        {joinField(ml.cooling) && <KeyValueRow label="Cooling" value={joinField(ml.cooling)} />}
                        {joinField(ml.heating) && <KeyValueRow label="Heating" value={joinField(ml.heating)} />}
                        {ml.furnished && <KeyValueRow label="Furnished" value={joinField(ml.furnished)} />}
                        {ml.fireplaces != null && ml.fireplaces > 0 && <KeyValueRow label="Fireplaces" value={ml.fireplaces} />}
                    </div>
                </Section>
            )}

            {hasExterior && (
                <Section title="Exterior">
                    <div className="space-y-2">
                        {ml.exterior_features?.length > 0 && <KeyValueRow label="Features" value={ml.exterior_features.join(', ')} />}
                        {ml.waterfront && (
                            <KeyValueRow label="Waterfront" value={`Yes${joinField(ml.waterfront_features) ? ` — ${joinField(ml.waterfront_features)}` : ''}`} />
                        )}
                        {ml.pool && (
                            <KeyValueRow label="Pool" value={`Yes${joinField(ml.pool_features) ? ` — ${joinField(ml.pool_features)}` : ''}`} />
                        )}
                        {joinField(ml.view) && <KeyValueRow label="View" value={joinField(ml.view)} />}
                        {joinField(ml.parking) && <KeyValueRow label="Parking" value={joinField(ml.parking)} />}
                        {ml.garage_spaces != null && ml.garage_spaces > 0 && <KeyValueRow label="Garage" value={`${ml.garage_spaces} spaces`} />}
                    </div>
                </Section>
            )}

            {!hasInterior && !hasExterior && (
                <div className="p-10 text-center">
                    <p className="text-sm text-[#5F656D]">No additional details available for this listing.</p>
                </div>
            )}
        </>
    );
}

function AgentTab({ listing: ml }: { listing: MlsListing }) {
    // Defensive: every MLS shape these slightly differently — prefer the typed
    // listing_agent sub-DTO, fall back to the flat legacy aliases, treat
    // empty/whitespace as missing.
    const clean = (v: unknown): string | null => {
        if (v == null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
    };
    const a = ml.listing_agent;
    const agentName = clean(a?.name ?? ml.list_agent_name);
    const agentEmail = clean(a?.email ?? ml.list_agent_email);
    const agentPhone = clean(a?.phone ?? ml.list_agent_phone);
    const officeName = clean(a?.office_name ?? ml.list_office_name);
    const officePhone = clean(a?.office_phone ?? ml.list_office_phone);

    const hasFinancial = ml.hoa_fee != null || ml.tax_amount != null;
    const hasAgent = !!(agentName || agentEmail || agentPhone || officeName || officePhone);

    return (
        <>
            {hasAgent && (
                <Section title="Listing Agent">
                    <div className="space-y-2">
                        {agentName && <KeyValueRow label="Agent" value={<span className="text-[#111315] font-medium">{agentName}</span>} />}
                        {agentEmail && <KeyValueRow label="Email" value={<a href={`mailto:${agentEmail}`} className="text-[#1693C9] hover:underline break-all">{agentEmail}</a>} />}
                        {agentPhone && <KeyValueRow label="Phone" value={<a href={`tel:${agentPhone}`} className="text-[#1693C9] hover:underline">{agentPhone}</a>} />}
                        {officeName && <KeyValueRow label="Office" value={officeName} />}
                        {officePhone && <KeyValueRow label="Office Phone" value={<a href={`tel:${officePhone}`} className="text-[#1693C9] hover:underline">{officePhone}</a>} />}
                        {!agentEmail && !agentPhone && (
                            <p className="text-[11px] text-[#5F656D] italic">This MLS doesn't expose direct contact details for the listing agent (typically VOW-only).</p>
                        )}
                    </div>
                </Section>
            )}

            {hasFinancial && (
                <Section title="Financial">
                    <div className="space-y-2">
                        {ml.hoa_fee != null && (
                            <KeyValueRow label="HOA Fee" value={`$${ml.hoa_fee.toLocaleString()}${ml.hoa_frequency ? `/${ml.hoa_frequency}` : ''}`} />
                        )}
                        {ml.tax_amount != null && (
                            <KeyValueRow label="Tax" value={`$${ml.tax_amount.toLocaleString()}/yr${ml.tax_year ? ` (${ml.tax_year})` : ''}`} />
                        )}
                    </div>
                </Section>
            )}

            {ml.virtual_tour_url && (
                <div className="px-5 py-5 border-b border-[#E4E7EB]">
                    <a
                        href={ml.virtual_tour_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1693C9] hover:underline"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                        Open Virtual Tour
                    </a>
                </div>
            )}

            {!hasAgent && !hasFinancial && !ml.virtual_tour_url && (
                <div className="p-10 text-center">
                    <p className="text-sm text-[#5F656D]">No agent or financial information available for this listing.</p>
                </div>
            )}
        </>
    );
}

// ─── Shared ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="px-5 py-5 border-b border-[#E4E7EB]">
            <h5 className="text-[13px] font-semibold text-[#111315] mb-3">{title}</h5>
            {children}
        </div>
    );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <span className="text-xs font-medium text-[#5F656D]">{label}</span>
            <p className="text-sm text-[#111315] font-medium mt-1">{value}</p>
        </div>
    );
}

function Stat({ label, value, sublabel }: { label: string; value: React.ReactNode; sublabel?: string }) {
    return (
        <div className="bg-[#F3F4F6] rounded-[4px] px-3 py-2">
            <p className="text-[11px] font-medium text-[#5F656D]">{label}</p>
            <p className="text-sm font-semibold text-[#111315] mt-1">{value}</p>
            {sublabel && <p className="text-[11px] text-[#5F656D]">{sublabel}</p>}
        </div>
    );
}

function KeyValueRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-1">
            <span className="text-xs font-medium text-[#5F656D] w-28 shrink-0">{label}</span>
            <span className="text-sm text-[#111315] flex-1">{value}</span>
        </div>
    );
}
