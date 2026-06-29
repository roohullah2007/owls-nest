// Property detail modal opened from a result card or a map popup. Ported from
// the static page's #pdModal: photo gallery + Map / Open-House media tiles, the
// Details / History / Market / Comparable-Sales tabs, a sticky price + agent
// rail, and the MLS disclaimer. Market data / mortgage / tax figures are derived
// client-side exactly as the original page computed them.
import { useEffect, useMemo, useRef, useState } from 'react';
import { SITE } from '@/data/site';
import { cn } from '@/lib/utils';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CloseIcon,
    HeartIcon,
} from '@/components/site/icons';
import type { SearchListing } from '@/types/search-listing';

const BRAND = '#227AD5';

const TABS = [
    { key: 'details', label: 'Property Details' },
    { key: 'history', label: 'Property History' },
    { key: 'market', label: 'Market Data' },
    { key: 'comps', label: 'Comparable Sales' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const TOWN_COORDS: Record<string, [number, number]> = {
    Thornton: [43.89, -71.68],
    Gilford: [43.55, -71.41],
    Plymouth: [43.755, -71.688],
    Wolfeboro: [43.585, -71.208],
};

function money(n: number) {
    return '$' + Math.round(n).toLocaleString('en-US');
}

function mortgage(priceNum: number) {
    const P = priceNum * 0.8;
    const r = 0.065 / 12;
    const n = 360;

    if (P <= 0) {
        return '—';
    }

    const m = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    return money(m);
}

function statusBadge(status: string) {
    const t = status || 'For Sale';
    const c = /coming/i.test(t)
        ? 'bg-amber-500'
        : /sold/i.test(t)
          ? 'bg-gray-500'
          : 'bg-green-600';

    return (
        <span
            className={cn(
                'rounded px-2.5 py-1 text-[12px] font-medium text-white',
                c,
            )}
        >
            {t}
        </span>
    );
}

interface PropertyDetailModalProps {
    listing: SearchListing | null;
    allListings: SearchListing[];
    onClose: () => void;
    onSelect: (listing: SearchListing) => void;
}

export function PropertyDetailModal({
    listing,
    allListings,
    onClose,
    onSelect,
}: PropertyDetailModalProps) {
    const [photoIndex, setPhotoIndex] = useState(0);
    const [media, setMedia] = useState<'photo' | 'map' | 'openhouse'>('photo');
    const [tab, setTab] = useState<TabKey>('details');
    const [histSub, setHistSub] = useState<'sales' | 'tax'>('sales');
    const [compSub, setCompSub] = useState<'comps' | 'similar'>('comps');
    const [descOpen, setDescOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [saved, setSaved] = useState(false);
    const [tracking, setTracking] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const sectionRefs = {
        details: useRef<HTMLDivElement>(null),
        history: useRef<HTMLDivElement>(null),
        market: useRef<HTMLDivElement>(null),
        comps: useRef<HTMLDivElement>(null),
    };

    // Transient view state is reset for free: the parent gives this component a
    // `key` of the listing id, so opening a different listing remounts it.

    // Body scroll-lock + keyboard controls while open.
    useEffect(() => {
        if (!listing) {
            return;
        }

        document.body.style.overflow = 'hidden';
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
            }

            if (media === 'photo' && e.key === 'ArrowLeft') {
                step(-1);
            }

            if (media === 'photo' && e.key === 'ArrowRight') {
                step(1);
            }
        }
        document.addEventListener('keydown', onKey);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listing, media]);

    const similar = useMemo(() => {
        if (!listing) {
            return [];
        }

        return allListings
            .filter(
                (q) => q.town === listing.town && q.address !== listing.address,
            )
            .slice(0, 6);
    }, [listing, allListings]);

    const townStats = useMemo(() => {
        if (!listing) {
            return { count: 0, avg: 0, min: 0, max: 0 };
        }

        const arr = allListings.filter((q) => q.town === listing.town);
        const prices = arr.map((q) => q.priceNum).filter(Boolean);
        const sum = prices.reduce((a, b) => a + b, 0);

        return {
            count: arr.length,
            avg: prices.length ? sum / prices.length : 0,
            min: prices.length ? Math.min(...prices) : 0,
            max: prices.length ? Math.max(...prices) : 0,
        };
    }, [listing, allListings]);

    if (!listing) {
        return null;
    }

    const photos = listing.photos.length ? listing.photos : [listing.image];

    function step(dir: number) {
        setPhotoIndex((i) => (i + dir + photos.length) % photos.length);
    }

    const sentimentPct = Math.max(8, Math.min(88, 90 - townStats.count * 4));
    const sentimentLabel =
        sentimentPct < 40
            ? "Buyer's Market"
            : sentimentPct > 62
              ? "Seller's Market"
              : 'Balanced Market';

    const taxRows = (() => {
        const base = Math.round(listing.priceNum * 0.012);
        const rows: { year: number; amount: number }[] = [];

        for (let k = 0; k < 3; k++) {
            rows.push({
                year: 2024 - k,
                amount: Math.round(base * (1 - 0.025 * k)),
            });
        }

        return rows;
    })();

    const coords = TOWN_COORDS[listing.town] ?? [43.65, -71.45];
    const d = 0.04;
    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${coords[1] - d}%2C${coords[0] - d}%2C${coords[1] + d}%2C${coords[0] + d}&layer=mapnik&marker=${coords[0]}%2C${coords[1]}`;

    function goToTab(key: TabKey) {
        setTab(key);
        sectionRefs[key].current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }

    const dotCount = Math.min(photos.length, 12);
    const activeDot =
        dotCount > 1 && photos.length > 1
            ? Math.round((photoIndex * (dotCount - 1)) / (photos.length - 1))
            : 0;

    const propType = listing.subType || listing.propType || 'Residential';

    function MiniCard({ q }: { q: SearchListing }) {
        return (
            <button
                type="button"
                onClick={() => onSelect(q)}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white text-left shadow-sm transition hover:shadow-md"
            >
                <img
                    src={q.image}
                    alt={q.address}
                    loading="lazy"
                    className="h-28 w-full object-cover"
                />
                <div className="p-3">
                    <div className="text-[15px] font-bold text-navy">
                        {q.price}
                    </div>
                    <div className="mt-0.5 text-[12px] text-gray-500">
                        {q.bedsLabel} · {q.bathsLabel}
                    </div>
                    <div className="mt-1 text-[12px] leading-snug text-gray-700">
                        {q.address}
                    </div>
                </div>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[1000]">
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
                aria-hidden
            />
            <div className="absolute inset-0 flex items-end justify-center px-3 pt-4 sm:px-6 sm:pt-8">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={listing.address}
                    className="flex max-h-[97vh] w-full max-w-[1340px] flex-col overflow-hidden rounded-t-2xl bg-gray-50 shadow-2xl"
                >
                    {/* Top bar: tabs + actions */}
                    <div className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
                        <nav className="flex items-center gap-4 overflow-x-auto text-[14px] sm:gap-6 [&::-webkit-scrollbar]:hidden">
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => goToTab(t.key)}
                                    className={cn(
                                        'border-b-2 pb-0.5 whitespace-nowrap',
                                        tab === t.key
                                            ? 'border-navy font-semibold text-navy'
                                            : 'border-transparent text-gray-500 hover:text-navy',
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </nav>
                        <div className="flex flex-shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSaved((v) => !v)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] hover:bg-gray-50',
                                    saved ? 'text-red-500' : 'text-gray-700',
                                )}
                            >
                                <HeartIcon className="h-4 w-4" filled={saved} />
                                <span>{saved ? 'Saved' : 'Save'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
                            >
                                <CloseIcon className="h-5 w-5 text-gray-700" />
                            </button>
                        </div>
                    </div>

                    <div
                        ref={scrollRef}
                        className="min-h-0 overflow-y-auto px-4 pt-4 pb-3 sm:px-6 sm:pt-6"
                    >
                        {/* Gallery */}
                        <div className="relative overflow-hidden rounded-2xl bg-gray-900">
                            {media === 'map' ? (
                                <iframe
                                    title="Map"
                                    src={mapSrc}
                                    className="h-[300px] w-full border-0 sm:h-[440px]"
                                />
                            ) : (
                                <img
                                    src={photos[photoIndex]}
                                    alt={listing.address}
                                    className="h-[300px] w-full object-cover sm:h-[440px]"
                                />
                            )}
                            {media === 'openhouse' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy/85 px-6 text-center text-white">
                                    <p className="text-[16px] font-semibold">
                                        No open house scheduled
                                    </p>
                                    <p className="mt-1 text-[13px] text-white/70">
                                        Contact Owl&rsquo;s Nest Real Estate to
                                        arrange a private showing.
                                    </p>
                                </div>
                            )}
                            {media === 'photo' && (
                                <>
                                    <span className="absolute top-3 right-3 rounded-full bg-navy px-2.5 py-1 text-[12px] font-medium text-white">
                                        {photoIndex + 1} / {photos.length}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Previous photo"
                                        onClick={() => step(-1)}
                                        className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:bg-white"
                                    >
                                        <ChevronLeftIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Next photo"
                                        onClick={() => step(1)}
                                        className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:bg-white"
                                    >
                                        <ChevronRightIcon className="h-5 w-5" />
                                    </button>
                                </>
                            )}
                            {/* Media tiles */}
                            <div className="absolute bottom-4 left-4 flex items-start gap-3">
                                <MediaTile
                                    active={media === 'photo'}
                                    label="Photos"
                                    onClick={() => setMedia('photo')}
                                >
                                    <span className="relative block h-[60px] w-[92px] overflow-hidden rounded-lg border-2 border-white shadow-md">
                                        <img
                                            src={photos[0]}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                        <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                                            {photos.length}
                                        </span>
                                    </span>
                                </MediaTile>
                                <MediaTile
                                    active={media === 'openhouse'}
                                    label="Open House"
                                    onClick={() => setMedia('openhouse')}
                                >
                                    <span className="flex h-[60px] w-[92px] items-center justify-center rounded-lg border-2 border-white bg-navy text-white shadow-md">
                                        <svg
                                            className="h-7 w-7"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={1.6}
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </span>
                                </MediaTile>
                                <MediaTile
                                    active={media === 'map'}
                                    label="Map"
                                    onClick={() => setMedia('map')}
                                >
                                    <span className="flex h-[60px] w-[92px] items-center justify-center rounded-lg border-2 border-white bg-[#e8eef0] shadow-md">
                                        <svg
                                            className="h-6 w-6"
                                            style={{ color: BRAND }}
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
                                        </svg>
                                    </span>
                                </MediaTile>
                            </div>
                        </div>

                        {/* Dots */}
                        {media === 'photo' && (
                            <div className="mt-3 flex items-center justify-center gap-1.5">
                                {Array.from({ length: dotCount }).map(
                                    (_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            aria-label={`Go to photo group ${i + 1}`}
                                            onClick={() =>
                                                setPhotoIndex(
                                                    dotCount > 1
                                                        ? Math.round(
                                                              (i *
                                                                  (photos.length -
                                                                      1)) /
                                                                  (dotCount -
                                                                      1),
                                                          )
                                                        : 0,
                                                )
                                            }
                                            className={cn(
                                                'h-2 rounded-full transition-all',
                                                i === activeDot
                                                    ? 'w-5'
                                                    : 'w-2 bg-gray-300',
                                            )}
                                            style={
                                                i === activeDot
                                                    ? { backgroundColor: BRAND }
                                                    : undefined
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        )}

                        {/* Body */}
                        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                            {/* LEFT */}
                            <div className="space-y-4 lg:col-span-2">
                                {/* Title + specs */}
                                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <h2 className="text-[22px] leading-snug font-bold text-navy sm:text-[24px]">
                                            {listing.address}
                                        </h2>
                                        <div className="text-right">
                                            <p className="text-[15px] leading-tight font-bold text-navy">
                                                {propType}
                                            </p>
                                            <div className="mt-1.5 flex justify-end">
                                                {statusBadge(listing.status)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-gray-700">
                                        <Spec>
                                            <b className="text-navy">
                                                {listing.beds}
                                            </b>
                                            &nbsp;Beds
                                        </Spec>
                                        <Divider />
                                        <Spec>
                                            <b className="text-navy">
                                                {listing.baths}
                                            </b>
                                            &nbsp;Baths
                                        </Spec>
                                        {listing.sqftNum > 0 && (
                                            <>
                                                <Divider />
                                                <Spec>
                                                    <b className="text-navy">
                                                        {listing.sqftNum.toLocaleString()}
                                                    </b>
                                                    &nbsp;ft²
                                                </Spec>
                                            </>
                                        )}
                                        {listing.year > 0 && (
                                            <>
                                                <Divider />
                                                <Spec>
                                                    Built{' '}
                                                    <b className="text-navy">
                                                        {listing.year}
                                                    </b>
                                                </Spec>
                                            </>
                                        )}
                                        <Divider />
                                        <Spec>
                                            <b className="text-navy">
                                                {listing.town}
                                            </b>
                                        </Spec>
                                    </div>
                                </div>

                                {/* DETAILS */}
                                <div
                                    ref={sectionRefs.details}
                                    className="scroll-mt-4 space-y-4"
                                >
                                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <h3 className="mb-2 text-[18px] font-bold text-navy">
                                            Property Description
                                        </h3>
                                        <p
                                            className={cn(
                                                'text-[14px] leading-[22px] text-gray-600',
                                                !descOpen && 'line-clamp-3',
                                            )}
                                        >
                                            {listing.desc}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDescOpen((v) => !v)
                                            }
                                            className="mt-2 text-[14px] font-semibold"
                                            style={{ color: BRAND }}
                                        >
                                            {descOpen
                                                ? 'Show less ▴'
                                                : 'Show more ▾'}
                                        </button>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <h3 className="text-[18px] font-bold text-navy">
                                            Property Details
                                        </h3>
                                        <p className="mb-3 text-[13px] text-gray-400">
                                            Essentials &amp; finishes
                                        </p>
                                        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                                            <ul className="list-disc pl-4 text-[14px] marker:text-gray-300">
                                                <DetailRow
                                                    label="Bedrooms"
                                                    value={listing.beds}
                                                />
                                                <DetailRow
                                                    label="Total Baths"
                                                    value={listing.baths}
                                                />
                                                {listing.fullBaths && (
                                                    <DetailRow
                                                        label="Full Baths"
                                                        value={
                                                            listing.fullBaths
                                                        }
                                                    />
                                                )}
                                                {listing.sqftNum > 0 && (
                                                    <DetailRow
                                                        label="SqFt"
                                                        value={listing.sqftNum.toLocaleString()}
                                                    />
                                                )}
                                            </ul>
                                            {detailsOpen && (
                                                <ul className="list-disc pl-4 text-[14px] marker:text-gray-300">
                                                    {(listing.subType ||
                                                        listing.propType) && (
                                                        <DetailRow
                                                            label="Property Type"
                                                            value={
                                                                listing.subType ||
                                                                listing.propType
                                                            }
                                                        />
                                                    )}
                                                    {listing.year > 0 && (
                                                        <DetailRow
                                                            label="Year Built"
                                                            value={listing.year}
                                                        />
                                                    )}
                                                    {listing.acres && (
                                                        <DetailRow
                                                            label="Lot Size"
                                                            value={`${listing.acres} acres`}
                                                        />
                                                    )}
                                                    {listing.ppsf && (
                                                        <DetailRow
                                                            label="Price / SqFt"
                                                            value={listing.ppsf}
                                                        />
                                                    )}
                                                    {listing.county && (
                                                        <DetailRow
                                                            label="County"
                                                            value={
                                                                listing.county
                                                            }
                                                        />
                                                    )}
                                                    <DetailRow
                                                        label="Town"
                                                        value={`${listing.town}, NH`}
                                                    />
                                                    <DetailRow
                                                        label="Status"
                                                        value={listing.status}
                                                    />
                                                </ul>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDetailsOpen((v) => !v)
                                            }
                                            className="mt-2 text-[14px] font-semibold"
                                            style={{ color: BRAND }}
                                        >
                                            {detailsOpen
                                                ? 'Show less ▴'
                                                : 'Show more ▾'}
                                        </button>
                                        <div className="mt-4 border-t border-gray-100 pt-3 text-[12px] text-gray-400">
                                            {listing.id
                                                ? `MLS®: PrimeMLS #${listing.id}; `
                                                : ''}
                                            Owl&rsquo;s Nest Real Estate
                                        </div>
                                    </div>
                                </div>

                                {/* HISTORY */}
                                <div
                                    ref={sectionRefs.history}
                                    className="scroll-mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                                >
                                    <h3 className="text-[18px] font-bold text-navy">
                                        Property History
                                    </h3>
                                    <p className="mb-3 text-[13px] text-gray-400">
                                        Price, listing activity &amp; annual
                                        taxes for this property
                                    </p>
                                    <div className="mb-3 flex items-center gap-5 border-b border-gray-100 text-[14px]">
                                        <SubTab
                                            active={histSub === 'sales'}
                                            onClick={() => setHistSub('sales')}
                                        >
                                            Sales History
                                        </SubTab>
                                        <SubTab
                                            active={histSub === 'tax'}
                                            onClick={() => setHistSub('tax')}
                                        >
                                            Tax History
                                        </SubTab>
                                    </div>
                                    {histSub === 'sales' ? (
                                        <p className="py-2 text-[14px] text-gray-500">
                                            No sales history available.
                                        </p>
                                    ) : (
                                        <>
                                            <table className="w-full text-[14px]">
                                                <thead>
                                                    <tr className="text-left text-[12px] text-gray-400 uppercase">
                                                        <th className="py-1.5 font-medium">
                                                            Year
                                                        </th>
                                                        <th className="py-1.5 text-right font-medium">
                                                            Assessed Tax
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {taxRows.map((r) => (
                                                        <tr
                                                            key={r.year}
                                                            className="border-b border-gray-100"
                                                        >
                                                            <td className="py-2 text-gray-600">
                                                                {r.year}
                                                            </td>
                                                            <td className="py-2 text-right font-semibold text-navy">
                                                                {money(
                                                                    r.amount,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <p className="mt-2 text-[12px] text-gray-400">
                                                Estimated from list price;
                                                verify with the town assessor.
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* MARKET */}
                                <div
                                    ref={sectionRefs.market}
                                    className="scroll-mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                                >
                                    <h3 className="mb-1 text-[18px] font-bold text-navy">
                                        Market Data
                                    </h3>
                                    <p className="mb-3 text-[13px] text-gray-400">
                                        Live snapshot computed from active
                                        listings in this town
                                    </p>
                                    <ul className="text-[14px]">
                                        <MarketRow
                                            label={`Active listings in ${listing.town}`}
                                            value={String(townStats.count)}
                                        />
                                        <MarketRow
                                            label="Average list price"
                                            value={money(townStats.avg)}
                                        />
                                        <MarketRow
                                            label="Price range"
                                            value={`${money(townStats.min)} – ${money(townStats.max)}`}
                                        />
                                        <MarketRow
                                            label="Market sentiment"
                                            value={sentimentLabel}
                                            last
                                        />
                                    </ul>
                                </div>

                                {/* COMPS */}
                                <div
                                    ref={sectionRefs.comps}
                                    className="scroll-mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                                >
                                    <div className="mb-4 flex items-center gap-5 border-b border-gray-100 text-[14px]">
                                        <SubTab
                                            active={compSub === 'comps'}
                                            onClick={() => setCompSub('comps')}
                                        >
                                            Comparable Sales
                                        </SubTab>
                                        <SubTab
                                            active={compSub === 'similar'}
                                            onClick={() =>
                                                setCompSub('similar')
                                            }
                                        >
                                            Similar For Sale
                                        </SubTab>
                                    </div>
                                    {compSub === 'comps' && (
                                        <p className="mb-3 text-[13px] text-gray-500">
                                            Recently sold data isn&rsquo;t
                                            published in this feed — here are
                                            active listings nearby for
                                            comparison.
                                        </p>
                                    )}
                                    {similar.length ? (
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            {similar.map((q) => (
                                                <MiniCard key={q.id} q={q} />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[14px] text-gray-500">
                                            No other active listings in{' '}
                                            {listing.town} right now.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT */}
                            <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
                                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[26px] font-bold text-navy">
                                            {listing.price}
                                        </span>
                                        <span className="text-[13px] text-gray-400">
                                            / Asking Price
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        {statusBadge(listing.status)}
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                                        <span className="text-[13px] text-gray-500">
                                            Est.{' '}
                                            <span className="font-semibold text-navy">
                                                {mortgage(listing.priceNum)}
                                            </span>{' '}
                                            / mo
                                        </span>
                                        <span className="text-[12px] text-gray-400">
                                            20% down · 30yr · 6.5%
                                        </span>
                                    </div>
                                </div>

                                {/* Agent card */}
                                <div className="rounded-2xl bg-navy p-5 text-white shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                                            <img
                                                src={SITE.logo}
                                                alt={SITE.name}
                                                className="h-8 w-auto [filter:brightness(0)_invert(1)]"
                                            />
                                        </div>
                                        <div>
                                            <p className="leading-tight font-semibold">
                                                Owl&rsquo;s Nest Real Estate
                                            </p>
                                            <p className="text-[13px] text-white/70">
                                                Sales Team · Questions?
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={SITE.phoneHref}
                                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-white/20"
                                    >
                                        {SITE.phoneDisplay}
                                    </a>
                                    <a
                                        href="/contact"
                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-white/90"
                                    >
                                        Request a Showing
                                    </a>
                                </div>

                                {/* Market sentiment */}
                                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-navy">
                                            Market Sentiment
                                        </h4>
                                        <span
                                            className="text-[13px] font-semibold"
                                            style={{ color: BRAND }}
                                        >
                                            {sentimentLabel}
                                        </span>
                                    </div>
                                    <div className="relative mt-4 h-2 rounded-full bg-gradient-to-r from-blue-500 via-gray-300 to-red-500">
                                        <div
                                            className="absolute -top-1 -ml-1.5 h-0 w-0 border-t-[9px] border-r-[6px] border-l-[6px] border-t-navy border-r-transparent border-l-transparent"
                                            style={{ left: `${sentimentPct}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                                        <span>Buyer&rsquo;s Market</span>
                                        <span>Balanced</span>
                                        <span>Seller&rsquo;s Market</span>
                                    </div>
                                    <p className="mt-3 text-[12px] text-gray-400">
                                        Based on {townStats.count} active · 0
                                        sold in {listing.town} (last 90 days)
                                    </p>
                                </div>

                                {/* Track this listing */}
                                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="font-bold text-navy">
                                                Track this listing
                                            </h4>
                                            <p className="mt-1 text-[13px] text-gray-500">
                                                Email me when the price or
                                                status changes, plus new
                                                listings in this neighbourhood.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={tracking}
                                            onClick={() =>
                                                setTracking((v) => !v)
                                            }
                                            className={cn(
                                                'relative mt-1 h-6 w-11 flex-shrink-0 rounded-full transition-colors',
                                                tracking
                                                    ? 'bg-navy'
                                                    : 'bg-gray-300',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                                                    tracking && 'translate-x-5',
                                                )}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Disclaimer */}
                        <div className="mt-5 rounded-2xl border border-navy/20 bg-navy/[0.04] p-5 shadow-sm">
                            <p className="text-[12.5px] leading-[20px] text-navy/80">
                                <b className="font-semibold text-navy">NOTE:</b>{' '}
                                This representation is based in whole or in part
                                on data generated by PrimeMLS / the New England
                                Real Estate Network, which assumes no
                                responsibility for its accuracy.
                            </p>
                        </div>
                    </div>

                    {/* Footer contact bar */}
                    <div className="z-10 shrink-0 bg-white px-4 py-3 shadow-[0_-6px_18px_rgba(0,0,0,0.10)]">
                        <a
                            href="/contact"
                            className="flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] py-3.5 font-semibold text-white transition-colors hover:bg-black"
                        >
                            Contact Agent
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Spec({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[14px] text-gray-700">
            {children}
        </span>
    );
}

function Divider() {
    return <span className="text-gray-300">|</span>;
}

function DetailRow({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <li className="flex py-1.5">
            <span className="mr-1.5 text-gray-500">{label}:</span>
            <span className="font-semibold text-navy">{value}</span>
        </li>
    );
}

function MarketRow({
    label,
    value,
    last = false,
}: {
    label: string;
    value: string;
    last?: boolean;
}) {
    return (
        <li
            className={cn(
                'flex justify-between py-2',
                !last && 'border-b border-gray-100',
            )}
        >
            <span className="text-gray-500">{label}</span>
            <span className="font-semibold text-navy">{value}</span>
        </li>
    );
}

function SubTab({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'border-b-2 pb-2',
                active
                    ? 'border-navy font-semibold text-navy'
                    : 'border-transparent text-gray-500',
            )}
        >
            {children}
        </button>
    );
}

function MediaTile({
    active,
    label,
    onClick,
    children,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button type="button" onClick={onClick} className="block text-center">
            <span
                className={cn(
                    'block rounded-lg',
                    active && 'ring-2 ring-[#227AD5]',
                )}
            >
                {children}
            </span>
            <span className="mt-1 block text-[12px] font-medium text-white drop-shadow">
                {label}
            </span>
        </button>
    );
}
