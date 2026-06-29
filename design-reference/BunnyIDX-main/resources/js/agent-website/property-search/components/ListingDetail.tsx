import { useEffect, useMemo, useRef, useState } from 'react';
import { PsListing } from '../types';
import { copyText, onImgError, PHOTO_PLACEHOLDER, statusColor } from '../lib/format';
import { buildListingDetail, cityFrom, money, mortgageMonthly } from '../lib/detail';
import { searchListings } from '../lib/api';
import TourRequestModal from './TourRequestModal';
import CustomBlock from './CustomBlock';
import { blocksFor, PsDetailBlock } from '../lib/merge';

interface Props {
    listing: PsListing | null;
    accent: string;
    leadEndpoint: string;
    /** 'modal' = overlay opened from a card; 'page' = the standalone detail screen. */
    mode: 'modal' | 'page';
    onClose?: () => void;
    /** Page mode: a "Back to search" link target shown where Close sits in modal mode. */
    backHref?: string;
    /** Page mode: real MLS remarks override the synthesized blurb when available. */
    descriptionOverride?: string | null;
    /** Site search feed — powers the real Comparable Sales / Similar For Sale data. */
    searchEndpoint?: string;
    /** MLS courtesy/attribution (listing office + MLS name, logo, disclaimer). */
    courtesy?: { office?: string | null; mlsName?: string | null; logo?: string | null; disclaimer?: string | null };
    /** Visitor-account favorite state — when provided, Save persists to the
        account (guests get the auth modal via the handler); otherwise Save
        falls back to per-browser localStorage. */
    favorited?: boolean;
    onToggleFavorite?: (listing: PsListing) => void;
    /** Marketing-consent disclosure for the showing-request form. */
    consentText?: string;
    /** Site agent (photo/name/title/phone) — drives the sidebar agent card. */
    agent?: { name?: string | null; title?: string | null; phone?: string | null; photo?: string | null; bg?: string | null };
    /** Dedicated tour endpoint (CRM lead + calendar task). */
    showingEndpoint?: string;
    /** Condo "About the Building" rows ([label, value]); page mode only. */
    building?: Array<[string, string]> | null;
    /** Owner-authored content blocks (merge fields, status-conditional). */
    customBlocks?: PsDetailBlock[];
    /** Built-in section order/visibility/renames (array order = page order). */
    detailSections?: Array<{ key: string; label?: string; enabled?: boolean }>;
}

type TabKey = 'details' | 'history' | 'comparables';
const TABS: Array<[TabKey, string]> = [
    ['details', 'Property Details'],
    ['history', 'Property History'],
    ['comparables', 'Comparable Sales'],
];

const BADGE_LABELS: Record<string, { label: string; bg: string }> = {
    new: { label: 'New Listing', bg: '#1e40af' },
    price_reduced: { label: 'Price Reduced', bg: '#16a34a' },
    // Price increases deliberately carry no badge (we only flag reductions).
    virtual_tour: { label: 'Virtual Tour', bg: '#1C49FA' },
    open_house: { label: 'Open House', bg: '#047857' },
    floor_plan: { label: 'Floor Plans', bg: '#7C3AED' },
};

/**
 * Shared property-detail UI. Renders inside ListingModal (overlay) and as the
 * standalone detail page (mode="page"), so both screens are identical. Every
 * control is wired; section data is synthesized in lib/detail.ts (swap for a
 * real MLS detail fetch later) while real remarks can be passed via descriptionOverride.
 */
export default function ListingDetail({ listing, accent, leadEndpoint, mode, onClose, backHref, descriptionOverride, searchEndpoint, courtesy, favorited, onToggleFavorite, consentText, agent, showingEndpoint, building, customBlocks, detailSections }: Props) {
    const isModal = mode === 'modal';
    const [idx, setIdx] = useState(0);
    const [tab, setTab] = useState<TabKey>('details');
    const [saved, setSaved] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [descOpen, setDescOpen] = useState(false);
    const [roomsOpen, setRoomsOpen] = useState(false);
    const [gridOpen, setGridOpen] = useState(false);
    const [histTab, setHistTab] = useState<'sales' | 'tax'>('sales');
    const [compTab, setCompTab] = useState<'sold' | 'forsale'>(listing?.status_label === 'For Rent' ? 'forsale' : 'sold');
    // Real nearby listings per comparables tab; null = not fetched yet.
    const [comps, setComps] = useState<{ sold: PsListing[] | null; forsale: PsListing[] | null }>({ sold: null, forsale: null });
    const [compsBusy, setCompsBusy] = useState(false);
    // Mortgage calculator — price + synced down payment %/$ + extras.
    const [homePrice, setHomePrice] = useState(0);
    const [down, setDown] = useState(20);
    const [rate, setRate] = useState(6.5);
    const [term, setTerm] = useState(30);
    const [taxMo, setTaxMo] = useState(0);
    const [insMo, setInsMo] = useState(125);
    const [hoaMo, setHoaMo] = useState(0);
    const [showOpen, setShowOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    // Photo-grid overlay: clicking a tile expands it into a lightbox.
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
    // Live market sentiment (active vs recently-sold inventory nearby).
    const [sentiment, setSentiment] = useState<{ label: string; pct: number; note: string } | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const toastTimer = useRef<number | null>(null);

    const detail = useMemo(() => (listing ? buildListingDetail(listing) : null), [listing]);

    useEffect(() => {
        if (!listing) return;
        setIdx(0); setTab('details'); setDescOpen(false); setRoomsOpen(false);
        setGridOpen(false); setShowOpen(false); setContactOpen(false); setExpanded(false); setLightboxIdx(null);
        setComps({ sold: null, forsale: null });
        setSentiment(null);
        setHomePrice(listing.price ?? 0);
        // Real listing data first; standard estimates only as fallback.
        setTaxMo(listing.tax_annual ? Math.round(listing.tax_annual / 12) : (listing.price ? Math.round((listing.price * 0.011) / 12) : 0));
        setInsMo(125);
        setHoaMo(listing.hoa_monthly ?? 0);
        setSaved(localStorage.getItem(`ps_saved_${listing.id}`) === '1');
        if (!isModal) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listing]);

    // Esc closes the photo grid first; in modal mode it then closes the modal.
    useEffect(() => {
        if (!listing) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (lightboxIdx !== null) setLightboxIdx(null); else if (gridOpen) setGridOpen(false); else if (isModal) onClose?.(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [listing, gridOpen, lightboxIdx, onClose, isModal]);

    useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

    // Lazy-fetch real comparables for the active tab (nearby sold / active
    // listings from the site's own search feed); cached per tab per listing.
    useEffect(() => {
        if (!listing || !searchEndpoint || comps[compTab] !== null) return;
        const ctrl = new AbortController();
        setCompsBusy(true);
        const rental = listing.status_label === 'For Rent';
        const filters: Record<string, unknown> = {
            sort: 'newest',
            // Rentals: only similar active rentals (sold comps are meaningless).
            statuses: rental ? ['Active'] : (compTab === 'sold' ? ['Closed', 'Sold'] : ['Active']),
            ...(rental ? { transaction: 'rent' } : {}),
        };
        if (listing.lat != null && listing.lng != null) {
            filters.geo = { near: { lat: listing.lat, lng: listing.lng, radius_miles: 2 } };
        } else {
            const city = cityFrom(listing.address);
            if (city) filters.city = city;
        }
        if (listing.price) {
            filters.min_price = Math.round(listing.price * 0.7);
            filters.max_price = Math.round(listing.price * 1.3);
        }
        searchListings(searchEndpoint, filters, 1, ctrl.signal)
            .then((res) => {
                const items = (res.listings || [])
                    .filter((c) => c.id !== listing.id && (!listing.mls_number || c.mls_number !== listing.mls_number))
                    .slice(0, 6);
                setComps((p) => ({ ...p, [compTab]: items }));
            })
            .catch(() => { if (!ctrl.signal.aborted) setComps((p) => ({ ...p, [compTab]: [] })); })
            .finally(() => setCompsBusy(false));
        return () => ctrl.abort();
    }, [listing, searchEndpoint, compTab, comps]);

    // Live market sentiment — months-of-supply from the site's own feed:
    // active inventory vs. closings in the last 90 days within ~2 miles.
    useEffect(() => {
        if (!listing || !searchEndpoint || listing.lat == null || listing.lng == null) return;
        const ctrl = new AbortController();
        const geo = { near: { lat: listing.lat, lng: listing.lng, radius_miles: 2 } };
        Promise.all([
            searchListings(searchEndpoint, { geo, statuses: ['Active'] }, 1, ctrl.signal),
            searchListings(searchEndpoint, { geo, statuses: ['Closed', 'Sold'], sold_within_days: 90 }, 1, ctrl.signal),
        ]).then(([activeRes, soldRes]) => {
            const active = activeRes.total || 0;
            const sold90 = soldRes.total || 0;
            if (!active && !sold90) return; // no data — keep the card hidden
            const perMonth = Math.max(sold90 / 3, 0.5);
            const months = active / perMonth;
            const [label, pct] = months < 3 ? ["Seller's Market", 80]
                : months < 4 ? ["Leaning Seller's", 65]
                : months <= 6 ? ['Balanced Market', 50]
                : months <= 9 ? ["Leaning Buyer's", 35]
                : ["Buyer's Market", 20] as [string, number];
            setSentiment({
                label: label as string,
                pct: pct as number,
                note: `${sold90} sale${sold90 === 1 ? '' : 's'} in the last 90 days · ${active} active listing${active === 1 ? '' : 's'} within 2 miles`,
            });
        }).catch(() => { /* card stays hidden */ });
        return () => ctrl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listing?.id, searchEndpoint]);

    if (!listing || !detail) return null;
    const l = listing;
    const photos = l.photos.length ? l.photos : [''];
    const navy = accent || '#022E50';
    // Rentals get different pricing/comps treatment (no mortgage, no sold comps).
    const isRental = l.status_label === 'For Rent';
    const blue = '#0454C3';
    const stickyTop = isModal ? 0 : 64;
    const sideTop = isModal ? 16 : 80;
    const description = (descriptionOverride && descriptionOverride.trim()) || detail.description;
    const courtesyOffice = courtesy?.office || l.office;
    const agentName = agent?.name || detail.agent.name;
    const agentPhoto = agent?.photo || null;
    const blocksAt = (pos: PsDetailBlock['position']) => blocksFor(customBlocks, pos, l, agent);
    // Built-in left-column sections: order, visibility and display names come
    // from the IDX Settings config; rendering order is applied via flex `order`
    // so the markup itself never has to move.
    const DEFAULT_SECTIONS: Array<[string, string]> = [
        ['description', 'Property Description'],
        ['building', 'About the Building'],
        ['details', 'Property Details'],
        ['rooms', 'Rooms'],
        ['bathrooms', 'Bathroom Details'],
        ['amenities', 'Amenities & Features'],
        ['history', 'Property History'],
        ['location', 'Location'],
        ['calculator', 'Mortgage Calculator'],
        ['comparables', 'Comparable Sales'],
    ];
    const sectionCfg = (key: string) => detailSections?.find((x: { key: string }) => x.key === key);
    const secOn = (key: string) => sectionCfg(key)?.enabled !== false;
    const secLabel = (key: string) => {
        const custom = sectionCfg(key)?.label?.trim();
        return custom || DEFAULT_SECTIONS.find(([k]) => k === key)?.[1] || key;
    };
    const secOrder = (key: string) => {
        const configured = detailSections?.findIndex((x: { key: string }) => x.key === key) ?? -1;
        const idx = configured >= 0 ? configured : DEFAULT_SECTIONS.findIndex(([k]) => k === key) + (detailSections?.length ?? 0);
        return idx * 10;
    };

    // Special block CTAs: #tour → tour-request modal, #register → signup modal.
    const handleBlockCta = (url: string) => {
        if (url === '#tour') setShowOpen(true);
        else if (url === '#register' || url === '#login') window.dispatchEvent(new CustomEvent('ps:open-auth', { detail: url.slice(1) }));
    };

    function flash(msg: string) {
        setToast(msg);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 2400);
    }
    const go = (dir: number) => setIdx((c) => (c + dir + photos.length) % photos.length);
    const gotoSection = (key: TabKey) => {
        setTab(key);
        const el = sectionRefs.current[key];
        if (!el) return;
        if (isModal && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
        else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (stickyTop + 14), behavior: 'smooth' });
    };

    async function share() {
        const url = new URL(l.href, window.location.origin).href;
        const nav = navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> };
        if (nav.share) {
            try { await nav.share({ title: l.address, url }); return; }
            catch { return; /* user dismissed the share sheet */ }
        }
        flash(await copyText(url) ? 'Link copied to clipboard' : 'Could not copy — copy the URL from your browser');
    }
    // Account-backed favorite when wired (guests get the auth modal via the
    // handler); per-browser localStorage otherwise.
    const isSaved = onToggleFavorite ? !!favorited : saved;
    function toggleSave() {
        if (onToggleFavorite) {
            onToggleFavorite(l);
            return;
        }
        const next = !saved; setSaved(next);
        localStorage.setItem(`ps_saved_${l.id}`, next ? '1' : '0');
        flash(next ? 'Saved to favourites' : 'Removed from favourites');
    }
    // Scrolls to the on-page Location map section (falls back to Google Maps
    // in a new tab only when the listing has no coordinates to embed).
    function openMap() {
        const el = sectionRefs.current['location'];
        if (el) {
            if (isModal && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
            else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (stickyTop + 14), behavior: 'smooth' });
            return;
        }
        flash('Map location unavailable for this listing');
    }
    const hasTour = !!l.virtual_tour_url;
    function tour() {
        if (l.virtual_tour_url) window.open(l.virtual_tour_url, '_blank', 'noopener');
        else flash('No 3D tour available for this listing');
    }
    const downAmt = Math.round(homePrice * (down / 100));
    const principal = Math.max(0, homePrice - downAmt);
    const calcMonthly = mortgageMonthly(principal, rate, term);
    const totalMonthly = calcMonthly + taxMo + insMo + hoaMo;
    const breakdown: Array<[string, number, string]> = [
        ['Principal & interest', calcMonthly, navy],
        ['Property tax', taxMo, '#d97706'],
        ['Insurance', insMo, '#2563eb'],
        ['HOA', hoaMo, '#9ca3af'],
    ];

    const facts: string[] = [];
    if (l.beds != null) facts.push(`${l.beds} Beds`);
    if (l.baths) facts.push(`${l.baths} Baths`);
    if (l.parking) facts.push(`${l.parking} Parking`);
    if (l.sqft) facts.push(`${l.sqft} ft²`);
    if (l.lot) facts.push(l.lot);

    const listingDetails: Array<[string, string]> = [];
    if (l.property_type) listingDetails.push(['Property Type', l.property_type]);
    if (l.mls_number) listingDetails.push(['MLS®#', l.mls_number]);
    if (l.status_label) listingDetails.push(['Status', l.status_label]);

    const setRef = (key: string) => (el: HTMLDivElement | null) => { sectionRefs.current[key] = el; };
    // ps-detail-section is a stable hook for user custom CSS — keep it.
    const cardCls = 'ps-detail-section mt-4 scroll-mt-20 rounded-2xl bg-white p-5 sm:p-6 border border-gray-200';
    const h3 = { fontSize: 20, fontWeight: 700, color: navy } as React.CSSProperties;
    const h4 = { fontSize: 15, fontWeight: 700, color: navy } as React.CSSProperties;
    const moreBtn = { fontSize: 14, fontWeight: 700, color: blue } as React.CSSProperties;
    const inputCss: React.CSSProperties = { width: '100%', height: 40, border: '1px solid #d1d5db', borderRadius: 10, padding: '0 12px', fontSize: 14, color: '#111827' };

    const FactList = ({ rows }: { rows: Array<[string, string]> }) => (
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
            {rows.map(([k, v]) => (
                <li key={k} style={{ fontSize: 14, color: '#4b5563', lineHeight: '22px' }}>
                    {k}: <span style={{ fontWeight: 600, color: '#374151' }}>{v}</span>
                </li>
            ))}
        </ul>
    );

    const activeComps = comps[compTab];
    // Editorial photo grid needs the hero + four tiles; otherwise carousel.
    // Same gallery in modal and page mode (carousel always serves mobile).
    const useGrid = photos.filter(Boolean).length >= 5;

    const content = (
        <div className="w-full px-4 pb-16 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(#fff 0%, #fff 90px, #f1f5f9 720px)' }}>
            {/* Sticky tabs + actions */}
            <div className="sticky z-30 -mx-4 border-y border-gray-200 bg-white sm:-mx-6 lg:-mx-8" style={{ top: stickyTop }}>
                <div className="flex items-center px-4 sm:px-6 lg:px-8" style={{ height: 56 }}>
                    {!isModal && backHref && (
                        <a href={backHref} className="mr-3 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 transition-colors hover:bg-gray-50 sm:mr-4" title="Back to search" style={{ height: 38, fontSize: 13, fontWeight: 600, color: navy }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                            <span className="hidden sm:inline">Back</span>
                        </a>
                    )}
                    <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none', flex: '1 1 auto', minWidth: 0 }}>
                        {TABS.filter(([key]) => secOn(key)).map(([key]) => {
                            const label = secLabel(key);
                            const on = tab === key;
                            return (
                                <button key={key} type="button" onClick={() => gotoSection(key)} className="shrink-0 px-4 transition-colors"
                                    style={{ height: 54, fontSize: 14, fontWeight: on ? 700 : 500, color: on ? navy : '#374151', borderBottom: `2px solid ${on ? navy : 'transparent'}`, whiteSpace: 'nowrap', background: 'transparent' }}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2 sm:ml-4">
                        <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 transition-colors hover:bg-gray-50" title="Share listing" style={{ height: 38, fontSize: 13, fontWeight: 600, color: navy }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={navy}><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" /></svg>
                            <span className="hidden sm:inline">Share</span>
                        </button>
                        <button type="button" onClick={toggleSave} className="inline-flex items-center gap-1.5 rounded-lg border px-3 transition-colors hover:bg-pink-50" title="Save to favourites" style={{ height: 38, fontSize: 13, fontWeight: 600, color: isSaved ? '#db2777' : navy, backgroundColor: '#fff', borderColor: isSaved ? '#fbcfe8' : '#e5e7eb' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? '#db2777' : 'none'} stroke={isSaved ? '#db2777' : navy} strokeWidth={2}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                            <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                        {isModal ? (
                            <>
                                {/* Expand = open the full SEO listing-detail page. */}
                                <a href={l.href} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50" title="Open full listing page" aria-label="Open full listing page" style={{ height: 38, width: 38, color: navy }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                                </a>
                                <button type="button" onClick={() => onClose?.()} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50" title="Close" aria-label="Close" style={{ height: 38, width: 38, color: navy }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Gallery — page mode with 5+ photos gets the editorial grid
                (50% hero + two 25% columns, 2 rows); everything else keeps the
                carousel. The carousel always serves mobile. */}
            <div className="relative mt-4 ps-detail-gallery">
                {useGrid && (
                    <div className="relative hidden gap-2 overflow-hidden rounded-2xl lg:grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: 'repeat(2, 235px)' }}>
                        {photos.slice(0, 5).map((src, pi) => (
                            <button key={pi} type="button" onClick={() => { setIdx(pi); setGridOpen(true); }} aria-label={`Open photo ${pi + 1}`} className="relative block h-full w-full overflow-hidden bg-gray-100 p-0" style={pi === 0 ? { gridRow: 'span 2' } : undefined}>
                                <img src={src || PHOTO_PLACEHOLDER} onError={onImgError} alt={`Property photo ${pi + 1}`} className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]" loading={pi === 0 ? 'eager' : 'lazy'} />
                                {pi === 4 && photos.length > 5 && (
                                    <span className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(2,46,80,.45)', color: '#fff', fontSize: 15, fontWeight: 700 }}>+{photos.length - 5} photos</span>
                                )}
                            </button>
                        ))}
                        <div className="absolute bottom-3 left-3 z-10 flex gap-2">
                            <GalleryChip label={`All ${photos.length} photos`} onClick={() => setGridOpen(true)} navy={navy} icon="grid" />
                            <GalleryChip label="Map" onClick={openMap} navy={navy} icon="map" />
                            {hasTour && <GalleryChip label="3D Tour" onClick={tour} navy={navy} icon="play" />}
                        </div>
                    </div>
                )}
                <div className={useGrid ? 'lg:hidden' : ''}>
                <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100" style={{ height: 460 }}>
                    <div className="absolute inset-0 flex h-full w-full" style={{ transform: `translateX(-${idx * 100}%)`, transition: 'transform .4s' }}>
                        {photos.map((src, pi) => (
                            <div key={pi} className="h-full w-full" style={{ flex: '0 0 100%' }}>
                                <img src={src || PHOTO_PLACEHOLDER} onError={onImgError} alt={`Property photo ${pi + 1}`} className="h-full w-full object-cover" loading={pi === 0 ? 'eager' : 'lazy'} />
                            </div>
                        ))}
                    </div>
                    {photos.length > 1 && (
                        <>
                            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-all hover:scale-105" aria-label="Previous photo" style={{ backgroundColor: 'rgba(255,255,255,.95)', color: navy, boxShadow: '0 2px 10px rgba(0,0,0,.2)' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-all hover:scale-105" aria-label="Next photo" style={{ backgroundColor: 'rgba(255,255,255,.95)', color: navy, boxShadow: '0 2px 10px rgba(0,0,0,.2)' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                            <div className="absolute right-4 top-4 z-10 rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(2,46,80,.78)', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>{idx + 1} / {photos.length}</div>
                        </>
                    )}
                    <div className="absolute inset-x-0 bottom-0 z-10 flex items-end" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.55) 0%, rgba(0,0,0,.15) 55%, rgba(0,0,0,0) 100%)', paddingTop: 40 }}>
                        <div className="flex w-full gap-3 px-4 pb-4">
                            <ThumbBtn label="Photos" img={photos[0]} badge={String(photos.length)} onClick={() => setGridOpen(true)} />
                            <ThumbBtn label="Map" img={photos[0]} icon="map" onClick={openMap} navy={navy} />
                            {hasTour && <ThumbBtn label="3D Tour" img={photos[Math.min(1, photos.length - 1)]} icon="play" onClick={tour} />}
                        </div>
                    </div>
                </div>
                {photos.length > 1 && (
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                        {photos.slice(0, 12).map((_, di) => (
                            <button key={di} type="button" aria-label={`Go to photo ${di + 1}`} onClick={() => setIdx(di)} style={{ width: di === idx ? 20 : 7, height: 7, borderRadius: 999, backgroundColor: di === idx ? navy : '#cbd5e1', transition: '.2s' }} />
                        ))}
                    </div>
                )}
                </div>
            </div>

            {/* Owner blocks — full width, right under the gallery. */}
            <div className="mx-auto" style={{ maxWidth: 1250 }}>
                {blocksAt('after_gallery').map((b) => <CustomBlock key={b.id} block={b} accent={navy} onCta={handleBlockCta} />)}
            </div>

            {/* Body */}
            <div className="mx-auto mt-6" style={{ maxWidth: 1250 }}>
                <div className="flex flex-col lg:flex-row" style={{ gap: 20 }}>
                    <div className="flex w-full min-w-0 flex-1 flex-col">
                        {/* Title */}
                        <div className="rounded-2xl bg-white p-5 sm:p-6 ps-detail-title" data-sec="title" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <h1 style={{ fontSize: 20, lineHeight: '28px', fontWeight: 800, color: navy, letterSpacing: '-0.01em' }}>{l.address}</h1>
                                    {facts.length > 0 && (
                                        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2" style={{ fontSize: 14.5, color: '#1f2937', fontWeight: 700 }}>
                                            {facts.map((v, i) => (
                                                <span key={i} className="flex items-center gap-3">
                                                    {i > 0 && <span style={{ color: '#cbd5e1' }}>|</span>}
                                                    <span className="whitespace-nowrap">{v}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                                    {l.property_type && <span style={{ fontSize: 14, fontWeight: 800, color: navy }}>{l.property_type}</span>}
                                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                        <span className="inline-flex items-center rounded-lg px-2.5 py-1" style={{ fontSize: 12, fontWeight: 700, backgroundColor: statusColor(l.status_label), color: '#fff' }}>{l.status_label}</span>
                                        {l.badges.filter((b) => BADGE_LABELS[b]).map((b) => (
                                            <span key={b} className="inline-flex items-center rounded-lg px-2.5 py-1" style={{ fontSize: 12, fontWeight: 700, backgroundColor: BADGE_LABELS[b].bg, color: '#fff' }}>
                                                {BADGE_LABELS[b].label}
                                                {b === 'price_reduced' && l.price_drop_formatted ? ` · ${l.price_drop_formatted}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming open houses */}
                        {(l.open_houses?.length ?? 0) > 0 && (
                        <div className="mt-4 rounded-2xl p-5 sm:p-6" style={{ border: '1px solid #a7f3d0', background: '#ecfdf5', boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span className="inline-flex items-center gap-2" style={{ fontSize: 14, fontWeight: 800, color: '#047857' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    Open House
                                </span>
                                {l.open_houses!.map((oh, i) => (
                                    <span key={i} className="inline-flex items-center rounded-lg px-3 py-1.5" style={{ fontSize: 13, fontWeight: 700, background: '#fff', border: '1px solid #a7f3d0', color: '#065f46' }}>
                                        {oh.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        )}

                        {/* Description */}
                        {secOn('description') && (
                        <div className={cardCls} style={{ order: secOrder('description') }}>
                            <h3 style={h3}>{secLabel('description')}</h3>
                            <div className="relative mt-3" style={{ fontSize: 15, color: '#374151', lineHeight: '26px' }}>
                                <p style={descOpen ? undefined : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{description}</p>
                            </div>
                            <button type="button" onClick={() => setDescOpen((o) => !o)} className="mt-3 inline-flex items-center gap-1.5" style={moreBtn}>{descOpen ? 'Show less' : 'Show more'}</button>
                        </div>
                        )}

                        {blocksAt('after_description').map((b) => <div key={b.id} style={{ order: secOrder('description') + 5 }}><CustomBlock block={b} accent={navy} onCta={handleBlockCta} /></div>)}

                        {/* Floor plans — split out of the MLS media when the feed categorizes them. */}
                        {(l.floorplans?.length ?? 0) > 0 && (
                        <div className={cardCls} style={{ order: secOrder('description') + 6 }}>
                            <h3 style={h3}>Floor Plans</h3>
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {l.floorplans!.map((fp, i) => (
                                    <button key={i} type="button" onClick={() => window.open(fp, '_blank', 'noopener')} className="overflow-hidden rounded-xl" style={{ border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'zoom-in', aspectRatio: '4 / 3' }} aria-label={`Open floor plan ${i + 1}`}>
                                        <img src={fp} alt={`Floor plan ${i + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        )}

                        {/* Property Details */}
                        {secOn('details') && (
                        <div ref={setRef('details')} className={cardCls} style={{ order: secOrder('details') }}>
                            <h3 style={h3}>{secLabel('details')}</h3>
                            <p className="mt-1 text-sm text-gray-500">Essentials &amp; finishes</p>
                            <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-2">
                                <div className="min-w-0"><h4 style={h4}>Interior</h4><FactList rows={detail.interior} /></div>
                                <div className="min-w-0"><h4 style={h4}>Construction</h4><FactList rows={detail.construction} /></div>
                                {l.lot && <div className="min-w-0"><h4 style={h4}>Land Details</h4><FactList rows={[['Lot', l.lot]]} /></div>}
                                {listingDetails.length > 0 && <div className="min-w-0"><h4 style={h4}>Listing details</h4><FactList rows={listingDetails} /></div>}
                            </div>
                            {(l.mls_number || courtesyOffice || courtesy?.logo) && (
                                <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4 ps-detail-courtesy">
                                    {courtesy?.logo && <img src={courtesy.logo} alt={courtesy.mlsName || 'MLS'} style={{ height: 26, width: 'auto' }} loading="lazy" />}
                                    <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>
                                        {[
                                            courtesyOffice ? `Courtesy of ${courtesyOffice}` : null,
                                            courtesy?.mlsName || null,
                                            l.mls_number ? `MLS® #${l.mls_number}` : null,
                                        ].filter(Boolean).join(' · ')}
                                    </span>
                                </div>
                            )}
                        </div>
                        )}

                        {/* About the Building (condo listings, when data exists) */}
                        {secOn('building') && building && building.length > 0 && (
                            <div className={`${cardCls} ps-detail-building`} style={{ order: secOrder('building') }}>
                                <h3 style={h3}>{secLabel('building')}</h3>
                                <p className="mt-1 text-sm text-gray-500">Association &amp; building details</p>
                                <div className="mt-4"><FactList rows={building} /></div>
                            </div>
                        )}

                        {/* Rooms */}
                        {secOn('rooms') && (
                        <div className={cardCls} style={{ order: secOrder('rooms') }}>
                            <h3 style={h3}>{secLabel('rooms')}</h3>
                            <p className="mt-1 text-sm text-gray-500">Room sizes &amp; levels</p>
                            <div className="relative">
                                <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-2">
                                    {(roomsOpen ? detail.rooms : detail.rooms.slice(0, 4)).map((r, i) => (
                                        <div key={i} className="min-w-0">
                                            <h4 style={h4}>{r.name}</h4>
                                            <FactList rows={[['Level', r.level], ['Dimensions', /^[\d,.]+$/.test(r.dims.trim()) ? `${r.dims.trim()} sqft` : r.dims]]} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {detail.rooms.length > 4 && (
                                <button type="button" onClick={() => setRoomsOpen((o) => !o)} className="mt-5 inline-flex items-center gap-1.5" style={moreBtn}>{roomsOpen ? 'Show less' : 'Show more'}</button>
                            )}
                        </div>
                        )}

                        {/* Bathroom details */}
                        {secOn('bathrooms') && (
                        <div className={cardCls} style={{ order: secOrder('bathrooms') }}>
                            <h3 style={h3}>{secLabel('bathrooms')}</h3>
                            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-gray-50 text-left"><th className="px-4 py-3 font-medium text-gray-600">Level</th><th className="px-4 py-3 font-medium text-gray-600">Pieces</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {detail.bathrooms.map((b, i) => (
                                            <tr key={i} className={i % 2 ? 'bg-gray-50/50' : 'bg-white'}><td className="px-4 py-3 font-medium text-gray-900">{b.level}</td><td className="px-4 py-3 text-gray-600">{b.pieces}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        )}

                        {/* Amenities */}
                        {secOn('amenities') && (
                        <div className={cardCls} style={{ order: secOrder('amenities') }}>
                            <h3 style={h3}>{secLabel('amenities')}</h3>
                            <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-2 lg:grid-cols-2">
                                <ul className="list-disc space-y-1.5 pl-5">
                                    {detail.amenities.slice(0, 3).map((a) => <li key={a} style={{ fontSize: 14, color: '#4b5563', lineHeight: '22px' }}>{a}</li>)}
                                </ul>
                                <ul className="list-disc space-y-1.5 pl-5">
                                    {detail.amenities.slice(3).map((a) => <li key={a} style={{ fontSize: 14, color: '#4b5563', lineHeight: '22px' }}>{a}</li>)}
                                </ul>
                            </div>
                        </div>
                        )}

                        {/* Property History */}
                        {secOn('history') && (
                        <div ref={setRef('history')} className={cardCls} style={{ order: secOrder('history') }}>
                            <h3 style={h3}>{secLabel('history')}</h3>
                            <p className="mt-1 text-sm text-gray-500">Price, listing activity &amp; annual taxes</p>
                            <div className="mt-4 flex gap-6 border-b border-gray-200">
                                <SubTab on={histTab === 'sales'} onClick={() => setHistTab('sales')} navy={navy}>Sales History</SubTab>
                                <SubTab on={histTab === 'tax'} onClick={() => setHistTab('tax')} navy={navy}>Tax History</SubTab>
                            </div>
                            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-gray-50 text-left">
                                        <th className="px-4 py-3 font-medium text-gray-600">{histTab === 'sales' ? 'Date' : 'Year'}</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">{histTab === 'sales' ? 'Event' : 'Annual Tax'}</th>
                                        <th className="px-4 py-3 font-medium text-gray-600">{histTab === 'sales' ? 'Price' : ''}</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {histTab === 'sales'
                                            ? detail.salesHistory.map((s, i) => <tr key={i} className="bg-white"><td className="px-4 py-3 font-medium text-gray-900">{s.date}</td><td className="px-4 py-3 text-gray-600">{s.event}</td><td className="px-4 py-3 font-semibold text-gray-900">{s.price}</td></tr>)
                                            : detail.taxHistory.map((t, i) => <tr key={i} className="bg-white"><td className="px-4 py-3 font-medium text-gray-900">{t.year}</td><td className="px-4 py-3 font-semibold text-gray-900">{t.amount}</td><td /></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        )}

                        {/* Location map — the gallery's Map button scrolls here. */}
                        {secOn('location') && l.lat != null && l.lng != null && (
                            <div ref={setRef('location')} className={`${cardCls} ps-detail-location`} style={{ order: secOrder('location') }}>
                                <h3 style={h3}>{secLabel('location')}</h3>
                                <p className="mt-1 text-sm text-gray-500">{l.address}</p>
                                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200" style={{ height: 360 }}>
                                    <iframe
                                        title="Listing location map"
                                        src={`https://www.google.com/maps?q=${l.lat},${l.lng}&z=15&output=embed`}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Mortgage Calculator — active (for sale) listings only. */}
                        {secOn('calculator') && l.status_label === 'For Sale' && (
                        <div className={`${cardCls} ps-detail-calculator`} style={{ order: secOrder('calculator') }}>
                            <h3 style={h3}>{secLabel('calculator')}</h3>
                            <p className="mt-1 text-sm text-gray-500">Estimate your full monthly payment for this home</p>

                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Home price
                                    <input type="number" min={0} step={1000} value={homePrice} onChange={(e) => setHomePrice(Math.max(0, Number(e.target.value) || 0))} style={{ ...inputCss, marginTop: 6 }} />
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Down payment $
                                        <input type="number" min={0} step={1000} value={downAmt} onChange={(e) => { const v = Math.max(0, Number(e.target.value) || 0); setDown(homePrice > 0 ? Math.min(95, (v / homePrice) * 100) : 0); }} style={{ ...inputCss, marginTop: 6 }} />
                                    </label>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Down %
                                        <input type="number" min={0} max={95} step={1} value={Math.round(down * 10) / 10} onChange={(e) => setDown(Math.max(0, Math.min(95, Number(e.target.value) || 0)))} style={{ ...inputCss, marginTop: 6 }} />
                                    </label>
                                </div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Interest rate %
                                    <input type="number" step={0.05} min={0} max={20} value={rate} onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))} style={{ ...inputCss, marginTop: 6 }} />
                                </label>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Loan term
                                    <select value={term} onChange={(e) => setTerm(Number(e.target.value))} style={{ ...inputCss, marginTop: 6 }}>
                                        <option value={15}>15-year fixed</option>
                                        <option value={20}>20-year fixed</option>
                                        <option value={30}>30-year fixed</option>
                                    </select>
                                </label>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Property tax / mo
                                    <input type="number" min={0} value={taxMo} onChange={(e) => setTaxMo(Math.max(0, Number(e.target.value) || 0))} style={{ ...inputCss, marginTop: 6 }} />
                                </label>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Insurance / mo
                                    <input type="number" min={0} value={insMo} onChange={(e) => setInsMo(Math.max(0, Number(e.target.value) || 0))} style={{ ...inputCss, marginTop: 6 }} />
                                </label>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>HOA / mo
                                    <input type="number" min={0} value={hoaMo} onChange={(e) => setHoaMo(Math.max(0, Number(e.target.value) || 0))} style={{ ...inputCss, marginTop: 6 }} />
                                </label>
                            </div>

                            {/* Result: total + segmented breakdown */}
                            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>Est. total payment</div>
                                        <div style={{ fontSize: 26, fontWeight: 800, color: navy, lineHeight: 1.15 }}>{money(totalMonthly)}<span style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af' }}> / mo</span></div>
                                    </div>
                                    <div className="text-right" style={{ fontSize: 12, color: '#6b7280' }}>
                                        Loan amount <strong style={{ color: '#374151' }}>{money(principal)}</strong> · Down <strong style={{ color: '#374151' }}>{money(downAmt)}</strong>
                                    </div>
                                </div>
                                {totalMonthly > 0 && (
                                    <>
                                        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
                                            {breakdown.filter(([, v]) => v > 0).map(([k, v, color]) => (
                                                <div key={k} style={{ width: `${(v / totalMonthly) * 100}%`, backgroundColor: color }} />
                                            ))}
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
                                            {breakdown.map(([k, v, color]) => (
                                                <div key={k} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                                                    <span style={{ width: 9, height: 9, borderRadius: 9999, backgroundColor: color, flexShrink: 0 }} />
                                                    <span style={{ color: '#6b7280' }}>{k}</span>
                                                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#374151' }}>{money(v)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                                <p className="mt-3" style={{ fontSize: 10.5, color: '#9ca3af' }}>Estimates only — actual rates, taxes and insurance vary. Confirm figures with your lender.</p>
                            </div>
                        </div>
                        )}

                        {blocksAt('before_comparables').map((b) => <div key={b.id} style={{ order: secOrder('comparables') - 5 }}><CustomBlock block={b} accent={navy} onCta={handleBlockCta} /></div>)}

                        {/* Comparable Sales */}
                        {secOn('comparables') && (
                        <div ref={setRef('comparables')} className={`${cardCls} mb-4`} style={{ order: secOrder('comparables') }}>
                            <div className="flex items-center gap-6 border-b border-gray-200">
                                {!isRental && <SubTab on={compTab === 'sold'} onClick={() => setCompTab('sold')} navy={navy} big>Comparable Sales</SubTab>}
                                <SubTab on={compTab === 'forsale'} onClick={() => setCompTab('forsale')} navy={navy} big>{isRental ? 'Similar For Rent' : 'Similar For Sale'}</SubTab>
                            </div>
                            <p className="mt-3 text-sm text-gray-500">{compTab === 'sold' ? 'Recently sold nearby' : (isRental ? 'Rentals nearby' : 'Active listings nearby')}</p>
                            {compsBusy && activeComps === null ? (
                                <p className="mt-5 text-sm text-gray-400">Loading nearby listings…</p>
                            ) : !activeComps || activeComps.length === 0 ? (
                                <p className="mt-5 text-sm text-gray-400">
                                    {compTab === 'sold'
                                        ? 'No comparable sales are available for this area right now.'
                                        : (isRental ? 'No similar rentals nearby right now.' : 'No similar active listings nearby right now.')}
                                </p>
                            ) : (
                                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {activeComps.map((c) => (
                                        <a key={c.id} href={c.href} target="_blank" rel="noopener" className="group block cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-lg ps-comparable-card">
                                            <div className="overflow-hidden" style={{ height: 150 }}><img src={c.photos[0] || PHOTO_PLACEHOLDER} onError={onImgError} alt="" className="h-full w-full object-cover" loading="lazy" /></div>
                                            <div className="p-3.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span style={{ fontSize: 15, fontWeight: 700, color: navy }}>{c.price_formatted}</span>
                                                    <span className="rounded-lg" style={{ backgroundColor: statusColor(c.status_label), color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 10px' }}>{c.status_label}</span>
                                                </div>
                                                <div className="mt-1.5" style={{ fontSize: 13, color: '#6b7280' }}>
                                                    {[c.beds != null ? `${c.beds} bd` : null, c.baths ? `${c.baths} ba` : null, c.sqft ? `${c.sqft} sf` : null].filter(Boolean).join(' | ')}
                                                </div>
                                                {c.property_type && <div className="mt-1" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c.property_type}</div>}
                                                <div className="mt-1.5 truncate" style={{ fontSize: 13, color: '#9ca3af' }}>{c.address}</div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="w-full shrink-0 lg:w-[380px] ps-detail-sidebar">
                        <div className="sticky space-y-4" style={{ top: sideTop }}>
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="ps-detail-price" style={{ fontSize: 28, fontWeight: 700, color: navy }}>{l.price_formatted}</span>
                                    <span style={{ fontSize: 13, color: '#9ca3af' }}>{isRental ? '/month' : '/Asking Price'}</span>
                                </div>
                                {/* Mortgage estimate is meaningless on rentals. */}
                                {!isRental && <p className="mt-3" style={{ fontSize: 13, color: '#6b7280' }}>Est. {money(detail.estMonthly)} / mo</p>}

                                <div className="mt-4 overflow-hidden rounded-xl ps-detail-agent" style={{ backgroundColor: agent?.bg || '#1a1816' }}>
                                    <div className="flex items-start gap-3 p-4">
                                        {agentPhoto ? (
                                            <img src={agentPhoto} onError={onImgError} alt={agentName} className="h-14 w-14 shrink-0 rounded-full object-cover" style={{ border: '2px solid rgba(255,255,255,.25)' }} />
                                        ) : (
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 20, fontWeight: 800 }}>
                                                {agentName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{agentName}</div>
                                            <div style={{ fontSize: 12.5, color: '#cbd5e1', marginTop: 2 }}>{agent?.title || 'Real Estate Agent'}</div>
                                            {agent?.phone && (
                                                <a href={`tel:${agent.phone.replace(/[^0-9+]/g, '')}`} className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors hover:bg-white/10" style={{ borderColor: 'rgba(255,255,255,.25)', color: '#fff', fontSize: 12.5, fontWeight: 600 }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                                    {agent.phone}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button type="button" onClick={() => setShowOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl text-white transition-all hover:-translate-y-0.5" style={{ height: 50, backgroundColor: blue, fontSize: 14.5, fontWeight: 700, boxShadow: `0 8px 20px -6px ${blue}80` }}>
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                    Request a Showing
                                </button>
                                <button type="button" onClick={() => setContactOpen(true)} className="mt-2.5 flex w-full items-center justify-center gap-2.5 rounded-xl border-2 bg-white transition-all hover:-translate-y-0.5 hover:bg-blue-50" style={{ height: 50, borderColor: blue, color: blue, fontSize: 14.5, fontWeight: 700 }}>
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                                    Contact Agent
                                </button>
                            </div>

                            {/* Sentiment is a for-sale market gauge — For Sale listings only. */}
                            {sentiment && l.status_label === 'For Sale' && (
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ps-detail-sentiment">
                                <div className="flex items-center justify-between"><span style={{ fontSize: 13, fontWeight: 600, color: navy }}>Market Sentiment</span><span style={{ fontSize: 12, fontWeight: 700, color: blue }}>{sentiment.label}</span></div>
                                <div className="relative mt-3 h-2 rounded-full" style={{ background: 'linear-gradient(to right,#3b82f6 0%,#93c5fd 35%,#86efac 50%,#fca5a5 75%,#ef4444 100%)' }}>
                                    <div className="absolute -top-1.5" style={{ left: `calc(${sentiment.pct}% - 6px)` }}>
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill={navy}><path d="M6 9L1 3h10z" /></svg>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between" style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}><span>Buyer's</span><span>Balanced</span><span>Seller's</span></div>
                                <p className="mt-3" style={{ fontSize: 11, color: '#9ca3af' }}>{sentiment.note}</p>
                            </div>
                            )}

                        </div>
                    </div>
                </div>

                <div className="mb-16 mt-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 ps-detail-compliance">
                    {(courtesy?.logo || courtesy?.disclaimer || courtesyOffice) && (
                        <div className="mb-3 flex items-start gap-3 border-b border-gray-200 pb-3">
                            {courtesy?.logo && <img src={courtesy.logo} alt={courtesy.mlsName || 'MLS'} style={{ height: 32, maxWidth: 140, width: 'auto', objectFit: 'contain', flexShrink: 0 }} loading="lazy" />}
                            <div>
                                {courtesyOffice && <p className="text-xs font-semibold text-gray-700">Listing courtesy of {courtesyOffice}{courtesy?.mlsName ? ` — ${courtesy.mlsName}` : ''}</p>}
                                {courtesy?.disclaimer && <p className="mt-1 text-xs leading-relaxed text-gray-500">{courtesy.disclaimer}</p>}
                            </div>
                        </div>
                    )}
                    <p className="text-xs leading-relaxed text-gray-700"><span className="font-bold text-gray-800">NOTE:</span> Listing data is provided for consumers' personal, non-commercial use and may not reflect the most current market activity. Verify all details with the listing brokerage.</p>
                </div>
            </div>
        </div>
    );

    const extras = (
        <>
            <TourRequestModal
                open={showOpen}
                onClose={() => setShowOpen(false)}
                listing={l}
                endpoint={showingEndpoint}
                leadEndpoint={leadEndpoint}
                consentText={consentText}
                accent={navy}
            />
            <TourRequestModal
                open={contactOpen}
                onClose={() => setContactOpen(false)}
                listing={l}
                leadEndpoint={leadEndpoint}
                consentText={consentText}
                accent={navy}
                variant="contact"
            />
            {gridOpen && (
                <div className="fixed inset-0 z-[40000] flex flex-col bg-black/90">
                    <div className="flex items-center justify-between px-5 py-3">
                        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{photos.length} Photos</span>
                        <button type="button" onClick={() => setGridOpen(false)} className="rounded-lg px-3 py-1.5" style={{ color: '#fff', background: 'rgba(255,255,255,.15)', fontSize: 13, fontWeight: 600 }}>Close</button>
                    </div>
                    <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4" style={{ overscrollBehavior: 'contain' }}>
                        {photos.map((src, pi) => (
                            <button key={pi} type="button" onClick={() => setLightboxIdx(pi)} title="Click to expand" className="overflow-hidden rounded-xl transition-transform hover:scale-[1.02]" style={{ aspectRatio: '4 / 3' }}>
                                <img src={src || PHOTO_PLACEHOLDER} onError={onImgError} alt={`Photo ${pi + 1}`} className="h-full w-full object-cover" loading="lazy" />
                            </button>
                        ))}
                    </div>

                    {/* Lightbox — expanded single photo with prev/next. */}
                    {lightboxIdx !== null && (
                        <div className="fixed inset-0 z-[40010] flex items-center justify-center bg-black/95" onMouseDown={(e) => { if (e.target === e.currentTarget) setLightboxIdx(null); }}>
                            <button type="button" onClick={() => setLightboxIdx(null)} className="absolute right-4 top-4 rounded-lg px-3 py-1.5" style={{ color: '#fff', background: 'rgba(255,255,255,.15)', fontSize: 13, fontWeight: 600 }}>Close</button>
                            <span className="absolute left-1/2 top-4 -translate-x-1/2" style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{lightboxIdx + 1} / {photos.length}</span>
                            {photos.length > 1 && (
                                <>
                                    <button type="button" onClick={() => setLightboxIdx((c) => ((c ?? 0) - 1 + photos.length) % photos.length)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,.92)', color: '#111827' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                                    </button>
                                    <button type="button" onClick={() => setLightboxIdx((c) => ((c ?? 0) + 1) % photos.length)} aria-label="Next photo" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,.92)', color: '#111827' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                    </button>
                                </>
                            )}
                            <img src={photos[lightboxIdx] || PHOTO_PLACEHOLDER} onError={onImgError} alt={`Photo ${lightboxIdx + 1} expanded`} className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain" />
                        </div>
                    )}
                </div>
            )}
            {toast && (
                <div className="fixed bottom-6 left-1/2 z-[40050] -translate-x-1/2 rounded-full px-4 py-2.5 text-center" style={{ backgroundColor: 'rgba(17,24,39,.95)', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 6px 20px rgba(0,0,0,.3)' }}>{toast}</div>
            )}
        </>
    );

    if (isModal) {
        return (
            <div
                className={`fixed inset-0 z-[35000] flex items-stretch justify-center bg-black/60 p-0 ${expanded ? '' : 'sm:items-start sm:p-6'}`}
                onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            >
                <div className={`relative flex w-full flex-col overflow-hidden bg-white ${expanded ? '' : 'sm:max-w-[1280px] sm:rounded-2xl'}`} style={{ maxHeight: '100vh', height: '100vh' }}>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto">{content}</div>
                </div>
                {extras}
            </div>
        );
    }

    return (
        <div className="relative w-full">
            {content}
            {extras}
        </div>
    );
}

function GalleryChip({ label, onClick, navy, icon }: { label: string; onClick: () => void; navy: string; icon: 'grid' | 'map' | 'play' }) {
    return (
        <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg px-3 transition-transform hover:scale-105" style={{ height: 36, backgroundColor: 'rgba(255,255,255,.95)', color: navy, fontSize: 12.5, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}>
            {icon === 'grid' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>}
            {icon === 'map' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>}
            {icon === 'play' && <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
            {label}
        </button>
    );
}

function SubTab({ on, onClick, navy, big, children }: { on: boolean; onClick: () => void; navy: string; big?: boolean; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} className="-mb-px pb-2.5 transition-colors" style={{ fontSize: big ? 17 : 14, fontWeight: 700, color: on ? navy : '#9ca3af', borderBottom: `2px solid ${on ? navy : 'transparent'}` }}>{children}</button>
    );
}

function ThumbBtn({ label, img, badge, icon, onClick, navy }: { label: string; img: string; badge?: string; icon?: 'play' | 'map'; onClick: () => void; navy?: string }) {
    return (
        <button type="button" onClick={onClick} className="group flex shrink-0 flex-col items-center" title={label}>
            <div className="relative overflow-hidden rounded-2xl" style={{ width: 104, height: 74, boxShadow: '0 2px 8px rgba(0,0,0,.35)', backgroundColor: navy || '#374151' }}>
                {img ? <img src={img} alt={label} className="h-full w-full object-cover" loading="lazy" /> : null}
                {icon === 'play' && <span className="absolute bottom-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(0,0,0,.55)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></span>}
                {icon === 'map' && <span className="absolute inset-0 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></span>}
                {badge && <span className="absolute bottom-1.5 right-1.5 rounded-md px-1.5 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,.6)', fontSize: 11, fontWeight: 800, color: '#fff' }}>{badge}</span>}
            </div>
            <span className="mt-1.5" style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.5)' }}>{label}</span>
        </button>
    );
}
