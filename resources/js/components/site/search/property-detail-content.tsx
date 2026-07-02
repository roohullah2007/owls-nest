// Standalone public property-detail page body (`/property/{mls}`), redesigned to
// an EcoListing-style layout: a sticky section-tab bar, a translate-based photo
// slider with a Photos mosaic + lightbox and a Google Map modal, a title/stats
// card, grouped Property Details, tax history, a town market snapshot, a sticky
// price/agent rail, and nearby "Similar For Sale" comps. Everything is driven by
// the PrimeMLS `listing`/`similar` props — the mortgage estimate and town market
// snapshot are the only derived figures; nothing is fabricated. Rendered inside
// SiteLayout (header + footer are provided by the layout).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { SITE } from '@/data/site';
import { cn } from '@/lib/utils';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    FacebookIcon,
    HeartIcon,
    XIcon,
} from '@/components/site/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ListingCardSearch } from '@/components/site/cards/listing-card-search';
import type { SearchListing } from '@/types/search-listing';
import type { Auth } from '@/types';

const TOWN_COORDS: Record<string, [number, number]> = {
    Thornton: [43.89, -71.68],
    Gilford: [43.55, -71.41],
    Plymouth: [43.755, -71.688],
    Wolfeboro: [43.585, -71.208],
};

function money(n: number) {
    return '$' + Math.round(n).toLocaleString('en-US');
}

function parseMoney(s?: string) {
    return Number((s ?? '').replace(/[^0-9.]/g, '')) || 0;
}

function mortgage(priceNum: number) {
    const principal = priceNum * 0.8;
    const r = 0.065 / 12;
    const n = 360;

    if (principal <= 0) {
        return '—';
    }

    const m = (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);

    return money(m);
}

// Status colors are a design constant (green For Sale, red Sold, amber Pending)
// and stay as-is per the brief.
function statusColor(status: string) {
    const s = (status || '').toLowerCase();

    if (/sold|closed/.test(s)) {
        return '#dc2626';
    }

    if (/pending|contract|coming/.test(s)) {
        return '#d97706';
    }

    return '#16a34a';
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className="inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold text-white"
            style={{ backgroundColor: statusColor(status || 'For Sale') }}
        >
            {status || 'For Sale'}
        </span>
    );
}

// Web-mercator tile math → a real CARTO basemap thumbnail for the "Map" tile.
function cartoTile(lat: number, lng: number, z = 13) {
    const x = Math.floor(((lng + 180) / 360) * 2 ** z);
    const rad = (lat * Math.PI) / 180;
    const y = Math.floor(
        ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
            2 ** z,
    );

    return `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
}

type SectionKey =
    | 'overview'
    | 'property-details'
    | 'property-history'
    | 'market-info'
    | 'comparables';

interface PropertyDetailContentProps {
    listing: SearchListing;
    similar: SearchListing[];
}

export function PropertyDetailContent({
    listing,
    similar,
}: PropertyDetailContentProps) {
    const { auth } = usePage<{ auth?: Auth }>().props;
    const user = auth?.user;

    const [slide, setSlide] = useState(0);
    const [saved, setSaved] = useState(false);
    const [descOpen, setDescOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [histSub, setHistSub] = useState<'sales' | 'tax'>('tax');
    const [photosOpen, setPhotosOpen] = useState(false);
    const [mapOpen, setMapOpen] = useState(false);
    const [lightbox, setLightbox] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<SectionKey>('overview');

    const photos = listing.photos.length ? listing.photos : [listing.image];

    const coords: [number, number] =
        listing.lat && listing.lng
            ? [listing.lat, listing.lng]
            : (TOWN_COORDS[listing.town] ?? [43.65, -71.45]);
    const mapEmbed = `https://maps.google.com/maps?q=${coords[0]},${coords[1]}&z=16&output=embed`;

    const comps = useMemo(
        () =>
            similar
                .filter((q) => q.mlsNumber !== listing.mlsNumber)
                .slice(0, 8),
        [similar, listing],
    );

    const townStats = useMemo(() => {
        const arr = similar.filter((q) => q.town === listing.town);
        const prices = [listing, ...arr].map((q) => q.priceNum).filter(Boolean);
        const sum = prices.reduce((a, b) => a + b, 0);

        return {
            count: arr.length + 1,
            avg: prices.length ? sum / prices.length : 0,
            min: prices.length ? Math.min(...prices) : 0,
            max: prices.length ? Math.max(...prices) : 0,
        };
    }, [similar, listing]);

    // Sentiment score 0..1 across the bar (0 = buyer's/left, 1 = seller's/right):
    // fewer active listings ⇒ tighter supply ⇒ pushes toward a seller's market.
    const sentiment = Math.max(
        0.12,
        Math.min(0.88, 0.9 - townStats.count * 0.05),
    );
    const sentimentLabel =
        sentiment < 0.4
            ? "Buyer's Market"
            : sentiment > 0.62
              ? "Seller's Market"
              : 'Balanced Market';

    const hasHistory = Boolean(listing.taxAnnual);
    const hasComps = comps.length > 0;
    const hasDesc = Boolean(listing.desc && listing.desc.trim());

    const tabs = useMemo(
        () =>
            [
                { key: 'overview', label: 'Property Description' },
                { key: 'property-details', label: 'Property Details' },
                ...(hasHistory
                    ? [{ key: 'property-history', label: 'Property History' }]
                    : []),
                { key: 'market-info', label: 'Market Data' },
                ...(hasComps
                    ? [{ key: 'comparables', label: 'Similar For Sale' }]
                    : []),
            ] as { key: SectionKey; label: string }[],
        [hasHistory, hasComps],
    );

    // Scroll-spy: highlight the tab whose section is near the top of the viewport.
    useEffect(() => {
        const els = tabs
            .map((t) => document.getElementById(t.key))
            .filter((el): el is HTMLElement => Boolean(el));

        const obs = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    );

                const key = visible[0]?.target.id;

                if (key) {
                    setActiveTab(key as SectionKey);
                }
            },
            { rootMargin: '-140px 0px -55% 0px', threshold: 0 },
        );

        els.forEach((el) => obs.observe(el));

        return () => obs.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasHistory, hasComps]);

    // Lightbox keyboard navigation.
    useEffect(() => {
        if (lightbox === null) {
            return;
        }

        function onKey(e: KeyboardEvent) {
            if (e.key === 'ArrowLeft') {
                setLightbox((i) =>
                    i === null ? i : (i - 1 + photos.length) % photos.length,
                );
            }

            if (e.key === 'ArrowRight') {
                setLightbox((i) => (i === null ? i : (i + 1) % photos.length));
            }
        }

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [lightbox, photos.length]);

    function scrollToSection(key: SectionKey) {
        setActiveTab(key);
        document.getElementById(key)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }

    function step(dir: number) {
        setSlide((i) => (i + dir + photos.length) % photos.length);
    }

    const dotCount = Math.min(photos.length, 12);
    const activeDot =
        dotCount > 1 && photos.length > 1
            ? Math.round((slide * (dotCount - 1)) / (photos.length - 1))
            : 0;

    const propType = listing.subType || listing.propType || 'Residential';
    const priceDelta =
        listing.priceOriginal && listing.priceOriginal !== listing.priceNum
            ? listing.priceNum - listing.priceOriginal
            : 0;
    const taxAnnualNum = parseMoney(listing.taxAnnual);

    // Grouped Property Details — each group only lists fields we actually have.
    const detailGroups = useMemo(() => {
        const groups: { title: string; rows: [string, ReactNode][] }[] = [];

        const interior: [string, ReactNode][] = [];
        interior.push(['Bedrooms', listing.beds]);
        interior.push(['Total Baths', listing.baths]);

        if (listing.fullBaths) {
            interior.push(['Full Baths', listing.fullBaths]);
        }

        if (listing.sqftNum > 0) {
            interior.push(['SqFt', listing.sqftNum.toLocaleString()]);
        }

        if (listing.ppsf) {
            interior.push(['Price / SqFt', listing.ppsf]);
        }

        groups.push({ title: 'Interior', rows: interior });

        const exterior: [string, ReactNode][] = [];

        if (listing.acres) {
            exterior.push(['Lot Size', listing.acres]);
        }

        if (listing.year > 0) {
            exterior.push(['Year Built', listing.year]);
        }

        if (listing.waterfront) {
            exterior.push(['Waterfront', 'Yes']);
        }

        if (listing.view) {
            exterior.push(['View', listing.view]);
        }

        if (listing.subdivision) {
            exterior.push(['Subdivision', listing.subdivision]);
        }

        if (listing.parking) {
            exterior.push(['Garage / Parking', listing.parking]);
        }

        if (exterior.length) {
            groups.push({ title: 'Exterior & Lot', rows: exterior });
        }

        const financial: [string, ReactNode][] = [];

        if (listing.hoa) {
            financial.push(['HOA', listing.hoa]);
        }

        if (listing.taxAnnual) {
            financial.push(['Annual Tax', listing.taxAnnual]);
        }

        if (financial.length) {
            groups.push({ title: 'Financial', rows: financial });
        }

        const listingGroup: [string, ReactNode][] = [];
        listingGroup.push(['Status', listing.status]);

        if (listing.county) {
            listingGroup.push(['County', listing.county]);
        }

        listingGroup.push([
            'Town',
            `${listing.town}${listing.state ? `, ${listing.state}` : ''}`,
        ]);

        if (listing.agent) {
            listingGroup.push(['Listing Agent', listing.agent]);
        }

        if (listing.office) {
            listingGroup.push(['Listing Office', listing.office]);
        }

        groups.push({ title: 'Listing', rows: listingGroup });

        return groups;
    }, [listing]);

    const shownGroups = detailsOpen ? detailGroups : detailGroups.slice(0, 2);

    const stats: { icon: ReactNode; node: ReactNode }[] = [];

    if (listing.beds) {
        stats.push({
            icon: (
                <StatIcon d="M3 12h18M3 12v6a2 2 0 002 2h14a2 2 0 002-2v-6M3 12V6a2 2 0 012-2h14a2 2 0 012 2v6" />
            ),
            node: (
                <>
                    <b className="text-navy">{listing.beds}</b> Beds
                </>
            ),
        });
    }

    if (listing.baths) {
        stats.push({
            icon: (
                <StatIcon d="M4 10V6a2 2 0 012-2h2v6M4 10h16M4 10v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            ),
            node: (
                <>
                    <b className="text-navy">{listing.baths}</b> Baths
                </>
            ),
        });
    }

    if (listing.sqftNum > 0) {
        stats.push({
            icon: (
                <StatIcon d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
            ),
            node: (
                <>
                    <b className="text-navy">
                        {listing.sqftNum.toLocaleString()}
                    </b>{' '}
                    ft²
                </>
            ),
        });
    }

    if (listing.year > 0) {
        stats.push({
            icon: (
                <StatIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            ),
            node: (
                <>
                    Built <b className="text-navy">{listing.year}</b>
                </>
            ),
        });
    }

    if (listing.acres) {
        stats.push({
            icon: <StatIcon d="M3 20l6-4 6 4 6-4V4l-6 4-6-4-6 4z" />,
            node: <b className="text-navy">{listing.acres}</b>,
        });
    }

    return (
        <div
            style={{
                background:
                    'linear-gradient(180deg,#fff 0%,#fff 90px,#f1f5f9 720px)',
            }}
        >
            <style>{`
                .pd-frame { aspect-ratio: 16 / 10; }
                @media (min-width: 1024px) { .pd-frame { aspect-ratio: auto; height: 460px; } }
            `}</style>

            <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6">
                {/* Breadcrumb / back */}
                <div className="hidden items-center gap-2 pt-5 text-[13px] text-gray-500 sm:flex">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-1 font-medium text-navy hover:text-gold"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Back
                    </button>
                    <span className="text-gray-300">|</span>
                    <Link href="/" className="hover:text-navy">
                        Home
                    </Link>
                    <span className="text-gray-300">›</span>
                    <Link href="/property-search" className="hover:text-navy">
                        Listings
                    </Link>
                </div>
            </div>

            {/* Sticky section-tab bar */}
            <div className="sticky top-0 z-30 mt-4 border-y border-gray-200 bg-white">
                <div className="mx-auto flex min-h-[56px] max-w-[1440px] flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-0">
                    <nav className="-mb-px flex items-center gap-5 overflow-x-auto text-[14px] [&::-webkit-scrollbar]:hidden">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => scrollToSection(t.key)}
                                className={cn(
                                    'border-b-2 py-4 whitespace-nowrap transition-colors',
                                    activeTab === t.key
                                        ? 'border-navy font-bold text-navy'
                                        : 'border-transparent font-medium text-gray-500 hover:text-navy',
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </nav>
                    <div className="flex flex-shrink-0 items-center gap-2 pb-2 sm:pb-0">
                        <ShareMenu title={listing.address} />
                        <button
                            type="button"
                            onClick={() => setSaved((v) => !v)}
                            className={cn(
                                'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors',
                                saved
                                    ? 'border-rose-200 bg-rose-50 text-rose-500'
                                    : 'border-gray-300 text-navy hover:bg-gray-50',
                            )}
                        >
                            <HeartIcon className="h-4 w-4" filled={saved} />
                            {saved ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto w-full max-w-[1440px] px-4 pt-5 pb-10 sm:px-6">
                {/* Gallery */}
                <div className="pd-frame relative overflow-hidden rounded-2xl bg-gray-900">
                    <div
                        className="flex h-full transition-transform duration-[400ms] ease-out"
                        style={{ transform: `translateX(-${slide * 100}%)` }}
                    >
                        {photos.map((src, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setPhotosOpen(true)}
                                aria-label="Open photo gallery"
                                className="h-full w-full flex-shrink-0"
                            >
                                <img
                                    src={src}
                                    alt={`${listing.address} — photo ${i + 1}`}
                                    className="h-full w-full object-cover"
                                />
                            </button>
                        ))}
                    </div>

                    <span
                        className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-[12px] font-medium text-white"
                        style={{ backgroundColor: 'rgba(4,52,92,0.78)' }}
                    >
                        {slide + 1} / {photos.length}
                    </span>

                    {photos.length > 1 && (
                        <>
                            <button
                                type="button"
                                aria-label="Previous photo"
                                onClick={() => step(-1)}
                                className="absolute top-1/2 left-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:bg-white sm:flex"
                            >
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                aria-label="Next photo"
                                onClick={() => step(1)}
                                className="absolute top-1/2 right-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:bg-white sm:flex"
                            >
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </>
                    )}

                    {/* Showcase row */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <button
                            type="button"
                            onClick={() => setPhotosOpen(true)}
                            className="pointer-events-auto block text-center"
                        >
                            <span className="relative block h-[58px] w-[88px] overflow-hidden rounded-lg border-2 border-white shadow-md">
                                <img
                                    src={photos[0]}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                                <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                    {photos.length}
                                </span>
                            </span>
                            <span className="mt-1 block text-[12px] font-medium text-white drop-shadow">
                                Photos
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMapOpen(true)}
                            className="pointer-events-auto block text-center"
                        >
                            <span className="relative block h-[58px] w-[88px] overflow-hidden rounded-lg border-2 border-white bg-[#e8eef0] shadow-md">
                                <img
                                    src={cartoTile(coords[0], coords[1])}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <svg
                                        className="h-6 w-6 text-gold drop-shadow"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
                                    </svg>
                                </span>
                            </span>
                            <span className="mt-1 block text-[12px] font-medium text-white drop-shadow">
                                Map
                            </span>
                        </button>
                    </div>
                </div>

                {/* Dots */}
                {photos.length > 1 && (
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                        {Array.from({ length: dotCount }).map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`Go to photo ${i + 1}`}
                                onClick={() =>
                                    setSlide(
                                        dotCount > 1
                                            ? Math.round(
                                                  (i * (photos.length - 1)) /
                                                      (dotCount - 1),
                                              )
                                            : 0,
                                    )
                                }
                                className={cn(
                                    'h-2 rounded-full transition-all',
                                    i === activeDot
                                        ? 'w-5 bg-gold'
                                        : 'w-2 bg-gray-300',
                                )}
                            />
                        ))}
                    </div>
                )}

                {/* Body: content + sidebar */}
                <div className="mt-5 flex flex-col gap-5 lg:flex-row">
                    {/* LEFT */}
                    <div className="min-w-0 flex-1 space-y-4">
                        {/* Title + stats */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <h1 className="text-[20px] leading-snug font-extrabold text-navy">
                                    <button
                                        type="button"
                                        onClick={() => setMapOpen(true)}
                                        className="text-left hover:underline"
                                    >
                                        {listing.address}
                                    </button>
                                </h1>
                                <div className="flex flex-col items-end gap-1.5">
                                    <p className="text-[14px] font-bold text-navy">
                                        {propType}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={listing.status} />
                                        {user &&
                                            listing.daysOnMarket != null && (
                                                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-[12px] font-medium text-gray-600">
                                                    {listing.daysOnMarket} days
                                                    on market
                                                </span>
                                            )}
                                    </div>
                                </div>
                            </div>
                            {stats.length > 0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-gray-700">
                                    {stats.map((s, i) => (
                                        <span
                                            key={i}
                                            className="flex items-center gap-2"
                                        >
                                            {i > 0 && (
                                                <span className="text-gray-300">
                                                    |
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="text-gray-400">
                                                    {s.icon}
                                                </span>
                                                {s.node}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Property Description */}
                        <section
                            id="overview"
                            className="scroll-mt-32 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
                        >
                            <h2 className="mb-2 text-[20px] font-bold text-navy">
                                Property Description
                            </h2>
                            {hasDesc ? (
                                <>
                                    <div className="relative">
                                        <p
                                            className="text-[14px] leading-[22px] text-gray-600"
                                            style={
                                                descOpen
                                                    ? undefined
                                                    : {
                                                          display:
                                                              '-webkit-box',
                                                          WebkitLineClamp: 2,
                                                          WebkitBoxOrient:
                                                              'vertical',
                                                          overflow: 'hidden',
                                                      }
                                            }
                                        >
                                            {listing.desc}
                                        </p>
                                        {!descOpen && (
                                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent" />
                                        )}
                                    </div>
                                    <ShowMore
                                        open={descOpen}
                                        onToggle={() => setDescOpen((v) => !v)}
                                    />
                                </>
                            ) : (
                                <p className="text-[14px] text-gray-500">
                                    No description was provided for this
                                    listing.
                                </p>
                            )}
                        </section>

                        {/* Property Details */}
                        <section
                            id="property-details"
                            className="scroll-mt-32 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
                        >
                            <h2 className="text-[20px] font-bold text-navy">
                                Property Details
                            </h2>
                            <p className="mb-4 text-[13px] text-gray-400">
                                Essentials &amp; finishes
                            </p>
                            <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
                                {shownGroups.map((g) => (
                                    <div key={g.title}>
                                        <h3 className="mb-1.5 text-[13px] font-bold tracking-wide text-navy uppercase">
                                            {g.title}
                                        </h3>
                                        <ul className="list-disc pl-4 text-[14px] marker:text-gray-300">
                                            {g.rows.map(([label, value]) => (
                                                <li
                                                    key={label}
                                                    className="flex py-1.5"
                                                >
                                                    <span className="mr-1.5 text-gray-500">
                                                        {label}:
                                                    </span>
                                                    <span className="font-semibold text-navy">
                                                        {value}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                            {detailGroups.length > 2 && (
                                <ShowMore
                                    open={detailsOpen}
                                    onToggle={() => setDetailsOpen((v) => !v)}
                                />
                            )}
                            <div className="mt-4 border-t border-gray-100 pt-3 text-[12px] text-gray-400">
                                MLS®:{' '}
                                {listing.mlsNumber
                                    ? `PrimeMLS #${listing.mlsNumber}; `
                                    : ''}
                                {listing.office || "Owl's Nest Real Estate"}
                            </div>
                        </section>

                        {/* Property History */}
                        {hasHistory && (
                            <section
                                id="property-history"
                                className="scroll-mt-32 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
                            >
                                <h2 className="text-[20px] font-bold text-navy">
                                    Property History
                                </h2>
                                <p className="mb-3 text-[13px] text-gray-400">
                                    Listing activity &amp; annual taxes
                                </p>
                                <div className="mb-3 flex items-center gap-5 border-b border-gray-100 text-[14px]">
                                    <UnderlineTab
                                        active={histSub === 'sales'}
                                        onClick={() => setHistSub('sales')}
                                    >
                                        Sales History
                                    </UnderlineTab>
                                    <UnderlineTab
                                        active={histSub === 'tax'}
                                        onClick={() => setHistSub('tax')}
                                    >
                                        Tax History
                                    </UnderlineTab>
                                </div>
                                {histSub === 'sales' ? (
                                    <p className="py-2 text-[14px] text-gray-500">
                                        No sales history available.
                                    </p>
                                ) : (
                                    <table className="w-full text-[14px]">
                                        <thead>
                                            <tr className="text-left text-[12px] text-gray-400 uppercase">
                                                <th className="py-1.5 font-medium">
                                                    Year
                                                </th>
                                                <th className="py-1.5 text-right font-medium">
                                                    Annual Taxes
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-2 text-gray-600">
                                                    {listing.taxYear ||
                                                        new Date().getFullYear()}
                                                </td>
                                                <td className="py-2 text-right font-semibold text-navy">
                                                    {listing.taxAnnual}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                )}
                            </section>
                        )}

                        {/* Market Data */}
                        <section
                            id="market-info"
                            className="scroll-mt-32 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
                        >
                            <h2 className="text-[20px] font-bold text-navy">
                                Market Data
                            </h2>
                            <p className="mb-3 text-[13px] text-gray-400">
                                Snapshot from active listings currently loaded
                                for this town
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
                            <Link
                                href="/property-search"
                                className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-gold hover:text-golddk"
                            >
                                View {listing.town} market trends
                                <ChevronRightIcon className="h-4 w-4" />
                            </Link>
                        </section>

                        {/* Comparables */}
                        {hasComps && (
                            <section
                                id="comparables"
                                className="scroll-mt-32 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
                            >
                                <div className="mb-1 flex items-center gap-5 border-b border-gray-100 text-[14px]">
                                    <UnderlineTab
                                        active
                                        onClick={() =>
                                            scrollToSection('comparables')
                                        }
                                    >
                                        Similar For Sale
                                    </UnderlineTab>
                                </div>
                                <p className="mt-3 mb-4 text-[13px] text-gray-500">
                                    Active listings for sale nearby
                                </p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {comps.map((q) => (
                                        <ListingCardSearch
                                            key={q.id}
                                            listing={q}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* RIGHT sidebar */}
                    <aside className="space-y-4 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:w-[380px] lg:flex-shrink-0 lg:self-start lg:overflow-y-auto">
                        {/* Price card */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex items-baseline gap-2">
                                <span className="text-[28px] font-extrabold text-navy">
                                    {listing.price}
                                </span>
                                <span className="text-[13px] text-gray-400">
                                    / Asking Price
                                </span>
                            </div>
                            {listing.priceChange && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-bold text-white',
                                            listing.priceChange === 'increased'
                                                ? 'bg-amber-600'
                                                : 'bg-navy',
                                        )}
                                    >
                                        {listing.priceChange === 'increased'
                                            ? 'Price Increased'
                                            : 'Price Reduced'}
                                    </span>
                                    {user &&
                                        listing.priceOriginal &&
                                        priceDelta !== 0 && (
                                            <span className="text-[12px] font-semibold text-gray-500">
                                                Original:{' '}
                                                {money(listing.priceOriginal)} (
                                                {priceDelta < 0 ? '−' : '+'}
                                                {money(Math.abs(priceDelta))})
                                            </span>
                                        )}
                                </div>
                            )}
                            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between text-[13px] text-gray-500">
                                    <span>
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
                                {taxAnnualNum > 0 && (
                                    <div className="flex items-center justify-between text-[13px] text-gray-500">
                                        <span>Property Tax</span>
                                        <span className="font-semibold text-navy">
                                            {money(taxAnnualNum / 12)} / mo
                                        </span>
                                    </div>
                                )}
                                <Link
                                    href="/contact"
                                    className="mt-1 flex w-full items-center justify-center rounded-lg border border-navy px-4 py-2 text-[13px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
                                >
                                    Mortgage Calculator
                                </Link>
                            </div>

                            {/* Agent dark card */}
                            <div className="mt-4 rounded-xl bg-[#1A1816] p-4 text-white">
                                <p className="text-[15px] font-semibold">
                                    {listing.agent || "Owl's Nest Real Estate"}
                                </p>
                                <p className="text-[12px] text-white/60">
                                    {listing.office || 'Sales Team'}
                                </p>
                                <p className="mt-3 text-[13px] text-white/80">
                                    Questions?
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <a
                                        href={SITE.phoneHref}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-white/20"
                                    >
                                        <PhoneIcon className="h-4 w-4" />
                                        {SITE.phoneDisplay}
                                    </a>
                                    <a
                                        href={SITE.phoneHref.replace(
                                            'tel:',
                                            'sms:',
                                        )}
                                        aria-label="Text the agent"
                                        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                                    >
                                        <MessageIcon className="h-5 w-5" />
                                    </a>
                                </div>
                            </div>

                            <Link
                                href="/contact"
                                className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-gold text-[15px] font-semibold text-white transition-colors hover:bg-golddk"
                            >
                                Request a Showing
                            </Link>
                        </div>

                        {/* Market Sentiment */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-navy">
                                    Market Sentiment
                                </h3>
                                <span className="text-[13px] font-semibold text-gold">
                                    {sentimentLabel}
                                </span>
                            </div>
                            <div className="relative mt-4 h-2 rounded-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500">
                                <div
                                    className="absolute -top-1 -ml-1.5 h-0 w-0 border-t-[9px] border-r-[6px] border-l-[6px] border-t-navy border-r-transparent border-l-transparent"
                                    style={{ left: `${sentiment * 100}%` }}
                                />
                            </div>
                            <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                                <span>Buyer&rsquo;s</span>
                                <span>Balanced</span>
                                <span>Seller&rsquo;s</span>
                            </div>
                            <p className="mt-3 text-[12px] text-gray-400">
                                Based on {townStats.count} active listing
                                {townStats.count === 1 ? '' : 's'} in{' '}
                                {listing.town} (last 90 days)
                            </p>
                        </div>

                        {/* Track this listing */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-navy">
                                        Track this listing
                                    </h3>
                                    <p className="mt-1 text-[13px] text-gray-500">
                                        Get notified when the price or status
                                        changes.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={saved}
                                    aria-label="Track this listing"
                                    onClick={() => setSaved((v) => !v)}
                                    className={cn(
                                        'relative mt-1 h-6 w-11 flex-shrink-0 rounded-full transition-colors',
                                        saved ? 'bg-navy' : 'bg-gray-300',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                                            saved && 'translate-x-5',
                                        )}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Neighbourhood stats */}
                        <Link
                            href="/property-search"
                            className="flex w-full items-center justify-center rounded-2xl border border-navy px-4 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
                        >
                            Neighbourhood Market Statistics
                        </Link>
                    </aside>
                </div>

                {/* SEO internal-links */}
                <SeoLinks listing={listing} />

                {/* Disclaimer */}
                <div className="mt-5 rounded-2xl border border-navy/20 bg-navy/[0.04] p-5 shadow-sm">
                    <p className="text-[12.5px] leading-[20px] text-navy/80">
                        <b className="font-semibold text-navy">NOTE:</b> This
                        representation is based in whole or in part on data
                        generated by PrimeMLS / the New England Real Estate
                        Network, which assumes no responsibility for its
                        accuracy.
                    </p>
                </div>

                <div className="h-20 lg:h-4" />
            </div>

            {/* Mobile contact bar */}
            <div className="fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden">
                <a
                    href={SITE.phoneHref}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#1A1816] py-3.5 font-semibold text-white shadow-lg transition-colors hover:bg-black"
                >
                    <PhoneIcon className="h-4 w-4" />
                    Contact Agent
                </a>
            </div>

            {/* Photos modal */}
            <Dialog open={photosOpen} onOpenChange={setPhotosOpen}>
                <DialogContent className="h-[90vh] w-[calc(100%-1.5rem)] max-w-[1000px] overflow-y-auto p-0 sm:max-w-[1000px]">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur">
                        <p className="text-[15px] font-bold text-navy">
                            {listing.address}
                        </p>
                        <span className="text-[13px] text-gray-400">
                            {photos.length} photos
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-4">
                        {photos.map((src, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setLightbox(i)}
                                className={cn(
                                    'group overflow-hidden rounded-lg bg-gray-100',
                                    i % 5 === 0
                                        ? 'col-span-2 aspect-[16/10]'
                                        : 'aspect-square',
                                )}
                            >
                                <img
                                    src={src}
                                    alt={`${listing.address} — photo ${i + 1}`}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox */}
            <Dialog
                open={lightbox !== null}
                onOpenChange={(o) => !o && setLightbox(null)}
            >
                <DialogContent className="h-[92vh] w-[96vw] max-w-[96vw] border-0 bg-black/95 p-0 text-white shadow-none sm:max-w-[96vw]">
                    {lightbox !== null && (
                        <LightboxView
                            src={photos[lightbox]}
                            index={lightbox}
                            total={photos.length}
                            onPrev={() =>
                                setLightbox((i) =>
                                    i === null
                                        ? i
                                        : (i - 1 + photos.length) %
                                          photos.length,
                                )
                            }
                            onNext={() =>
                                setLightbox((i) =>
                                    i === null ? i : (i + 1) % photos.length,
                                )
                            }
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Map modal */}
            <Dialog open={mapOpen} onOpenChange={setMapOpen}>
                <DialogContent className="h-[80vh] w-[calc(100%-1.5rem)] max-w-[900px] overflow-hidden p-0 sm:max-w-[900px]">
                    <iframe
                        title={`Map of ${listing.address}`}
                        src={mapEmbed}
                        className="h-full w-full border-0"
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatIcon({ d }: { d: string }) {
    return (
        <svg
            className="h-[15px] w-[15px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );
}

function ShowMore({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-gold hover:text-golddk"
        >
            {open ? 'Show less' : 'Show more'}
            <svg
                className={cn(
                    'h-4 w-4 transition-transform',
                    open && 'rotate-180',
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                />
            </svg>
        </button>
    );
}

function UnderlineTab({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'border-b-2 pb-2 text-[14px]',
                active
                    ? 'border-navy font-semibold text-navy'
                    : 'border-transparent text-gray-500 hover:text-navy',
            )}
        >
            {children}
        </button>
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

// SEO internal-links block — every column/link is built from the listing's real
// data (or our own Lakes Region market), pointing back into Property Search.
function SeoLinks({ listing }: { listing: SearchListing }) {
    const town = listing.town;
    const search = (q?: string) =>
        q
            ? `/property-search?query=${encodeURIComponent(q)}`
            : '/property-search';

    const columns: {
        heading: string;
        links: { label: string; href: string }[];
    }[] = [];

    if (town) {
        const townLinks: { label: string; href: string }[] = [];

        if (listing.beds) {
            townLinks.push({
                label: `${listing.beds} bedroom homes for sale in ${town}`,
                href: search(town),
            });
        }

        if (listing.subType) {
            townLinks.push({
                label: `${listing.subType} for sale in ${town}`,
                href: search(town),
            });
        }

        townLinks.push({
            label: `Homes for sale in ${town}`,
            href: search(town),
        });
        columns.push({
            heading: `Explore the ${town} Market`,
            links: townLinks,
        });
    }

    if (listing.county) {
        const countyName = listing.county.replace(/^[A-Z]{2}-/, '');

        columns.push({
            heading: `Nearby in ${countyName} County`,
            links: [
                {
                    label: `Homes for sale in ${countyName} County`,
                    href: search(countyName),
                },
            ],
        });
    }

    columns.push({
        heading: 'Popular Searches',
        links: [
            {
                label: 'Waterfront homes in New Hampshire',
                href: search('Waterfront'),
            },
            {
                label: 'Lakes Region homes for sale',
                href: search('Lakes Region'),
            },
            {
                label: 'Waterville Valley homes',
                href: search('Waterville Valley'),
            },
            { label: 'New Hampshire homes for sale', href: search() },
        ],
    });

    const visible = columns.filter((c) => c.links.length > 0);

    if (!visible.length) {
        return null;
    }

    return (
        <section className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-5 shadow-sm sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {visible.map((c) => (
                    <div key={c.heading}>
                        <h3 className="mb-2 text-[15px] font-bold text-navy">
                            {c.heading}
                        </h3>
                        <ul className="space-y-1.5">
                            {c.links.map((l) => (
                                <li key={l.label}>
                                    <Link
                                        href={l.href}
                                        className="text-[14px] text-gold transition-colors hover:text-navy hover:underline"
                                    >
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}

function ShareMenu({ title }: { title: string }) {
    function shareUrl() {
        return typeof window !== 'undefined' ? window.location.href : '';
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-[13px] font-semibold text-navy transition-colors hover:bg-gray-50"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
                    </svg>
                    Share
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                    onSelect={() =>
                        void navigator.clipboard?.writeText(shareUrl())
                    }
                >
                    <CopyIcon className="h-4 w-4" />
                    Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() => {
                        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareUrl())}`;
                    }}
                >
                    <MailIcon className="h-4 w-4" />
                    Email
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() =>
                        window.open(
                            `https://wa.me/?text=${encodeURIComponent(shareUrl())}`,
                            '_blank',
                        )
                    }
                >
                    <WhatsappIcon className="h-4 w-4" />
                    WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() =>
                        window.open(
                            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`,
                            '_blank',
                        )
                    }
                >
                    <FacebookIcon className="h-4 w-4" />
                    Facebook
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() =>
                        window.open(
                            `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl())}`,
                            '_blank',
                        )
                    }
                >
                    <XIcon className="h-4 w-4" />X
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function LightboxView({
    src,
    index,
    total,
    onPrev,
    onNext,
}: {
    src: string;
    index: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    const touchX = useRef<number | null>(null);

    return (
        <div
            className="relative flex h-full w-full items-center justify-center"
            onTouchStart={(e) => {
                touchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
                if (touchX.current === null) {
                    return;
                }

                const dx = e.changedTouches[0].clientX - touchX.current;

                if (dx > 50) {
                    onPrev();
                } else if (dx < -50) {
                    onNext();
                }

                touchX.current = null;
            }}
        >
            <img
                src={src}
                alt={`Photo ${index + 1} of ${total}`}
                className="max-h-full max-w-full object-contain"
            />
            {total > 1 && (
                <>
                    <button
                        type="button"
                        aria-label="Previous photo"
                        onClick={onPrev}
                        className="absolute top-1/2 left-4 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                    >
                        <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next photo"
                        onClick={onNext}
                        className="absolute top-1/2 right-4 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                    >
                        <ChevronRightIcon className="h-6 w-6" />
                    </button>
                </>
            )}
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[13px] font-medium text-white">
                {index + 1} / {total}
            </span>
        </div>
    );
}

function PhoneIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
        </svg>
    );
}

function MessageIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h8M8 14h5m-9 6l3-3h8a3 3 0 003-3V7a3 3 0 00-3-3H7a3 3 0 00-3 3v13z"
            />
        </svg>
    );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 8V6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-2M6 8h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2z"
            />
        </svg>
    );
}

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
            />
        </svg>
    );
}

function WhatsappIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.2 8.2 0 012.42 5.82c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 01-1.26-4.37c0-4.54 3.7-8.24 8.24-8.24zm4.52 10.34c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
        </svg>
    );
}
