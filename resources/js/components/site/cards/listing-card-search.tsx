// Property Search result card — matches the BunnyIDX-style layout: a crossfade
// photo carousel (hover prev/next + dot indicators), a top-left status badge
// (days-on-market / price-reduced / price-increased), bottom corner badges
// (virtual tour / open house), then price + status pill, a bd·ba·parking·sqft
// row, the sub-type, address, and the MLS® attribution line.
import { useState } from 'react';
import { HeartIcon } from '@/components/site/icons';
import { cn } from '@/lib/utils';
import type { SearchListing } from '@/types/search-listing';

function statusColor(label: string): string {
    const l = label.toLowerCase();

    if (l.includes('pending') || l.includes('contract')) {
        return '#d97706';
    }

    if (l.includes('sold') || l.includes('closed')) {
        return '#dc2626';
    }

    return '#16a34a';
}

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline
            points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'}
        />
    </svg>
);

const TrendIcon = ({ dir }: { dir: 'down' | 'up' }) => (
    <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {dir === 'down' ? (
            <>
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
            </>
        ) : (
            <>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
            </>
        )}
    </svg>
);

export function ListingCardSearch({
    listing,
    onSelect,
    locked = false,
}: {
    listing: SearchListing;
    onSelect?: () => void;
    /** Gate sold listings behind login: blur + "Login to view info" overlay. */
    locked?: boolean;
}) {
    const photos =
        listing.photos && listing.photos.length
            ? listing.photos
            : [listing.image];
    const [index, setIndex] = useState(0);
    const [saved, setSaved] = useState(false);

    const go = (e: React.MouseEvent, delta: number) => {
        e.preventDefault();
        e.stopPropagation();
        setIndex((i) => (i + delta + photos.length) % photos.length);
    };

    const facts: string[] = [];

    if (listing.beds) {
        facts.push(`${listing.beds} bd`);
    }

    if (listing.baths) {
        facts.push(`${listing.bathsLabel || `${listing.baths} ba`}`);
    }

    if (listing.parking) {
        facts.push(`${listing.parking} parking`);
    }

    if (listing.sqftNum) {
        facts.push(`${listing.sqftNum.toLocaleString()} ft²`);
    }

    if (!facts.length && listing.acres) {
        facts.push(listing.acres);
    }

    // Logged-out users get a blurred, masked card for sold listings, gated
    // behind login (matches the reference "Tap to view" lock).
    if (locked) {
        return (
            <a
                href="/login"
                className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
            >
                <div
                    className="relative overflow-hidden max-sm:!h-60"
                    style={{ height: 180 }}
                >
                    <img
                        src={photos[0]}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        style={{ filter: 'blur(8px)' }}
                    />
                    {listing.virtualTour && (
                        <div className="absolute bottom-3 left-3 flex gap-1.5">
                            <span
                                className="rounded-lg px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.02em] text-white"
                                style={{ backgroundColor: '#174bf0' }}
                            >
                                Virtual Tour
                            </span>
                        </div>
                    )}
                </div>
                <div className="relative p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold text-gray-400">
                            Login to view info
                        </span>
                        <span
                            className="rounded-lg px-2.5 py-0.5 text-[12px] font-bold text-white"
                            style={{
                                backgroundColor: statusColor(listing.status),
                            }}
                        >
                            {listing.status}
                        </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-gray-400">
                        <span>N/A bd</span>
                        <span className="text-gray-300">|</span>
                        <span>N/A ba</span>
                        <span className="text-gray-300">|</span>
                        <span>N/A sf</span>
                    </div>
                    {listing.subType && (
                        <div className="mt-1 text-[13px] font-semibold text-gray-700">
                            {listing.subType}
                        </div>
                    )}
                    <div className="mt-1.5 truncate text-[13px] text-gray-400">
                        Login to view info
                    </div>
                    <p className="mt-1.5 truncate text-[11px] text-gray-400">
                        Login to view info
                    </p>
                </div>
                <div
                    className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center"
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.55)',
                        backdropFilter: 'blur(2px)',
                    }}
                >
                    <div
                        className="flex flex-col items-center rounded-xl px-5 py-4"
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        }}
                    >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#022E50"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mb-2"
                        >
                            <rect
                                x="3"
                                y="11"
                                width="18"
                                height="11"
                                rx="2"
                                ry="2"
                            />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <p className="text-[13px] font-bold tracking-[0.02em] text-navy">
                            Tap to view
                        </p>
                    </div>
                </div>
            </a>
        );
    }

    return (
        <a
            href={listing.href}
            onClick={(e) => {
                if (onSelect) {
                    e.preventDefault();
                    onSelect();
                }
            }}
            className="group block cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
        >
            {/* MEDIA */}
            <div
                className="group relative overflow-hidden max-sm:!h-60"
                style={{ height: 180 }}
            >
                {photos.map((src, i) => (
                    <img
                        key={i}
                        src={src}
                        alt={listing.alt}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
                        style={{ opacity: i === index ? 1 : 0 }}
                    />
                ))}

                {photos.length > 1 && (
                    <>
                        <button
                            type="button"
                            aria-label="Previous photo"
                            onClick={(e) => go(e, -1)}
                            className="absolute top-1/2 left-2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
                        >
                            <Chevron dir="left" />
                        </button>
                        <button
                            type="button"
                            aria-label="Next photo"
                            onClick={(e) => go(e, 1)}
                            className="absolute top-1/2 right-2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-white"
                        >
                            <Chevron dir="right" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
                            {photos.slice(0, 8).map((_, i) => (
                                <span
                                    key={i}
                                    className="rounded-full transition-all"
                                    style={{
                                        width: i === index ? 7 : 5,
                                        height: i === index ? 7 : 5,
                                        backgroundColor:
                                            i === index
                                                ? '#fff'
                                                : 'rgba(255,255,255,0.6)',
                                        boxShadow: '0 0 2px rgba(0,0,0,0.4)',
                                    }}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* TOP-LEFT badge: price change > days on market */}
                {listing.priceChange === 'reduced' ? (
                    <div
                        className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-white"
                        style={{ backgroundColor: '#1e40af' }}
                    >
                        <TrendIcon dir="down" />
                        PRICE REDUCED
                    </div>
                ) : listing.priceChange === 'increased' ? (
                    <div
                        className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-white"
                        style={{ backgroundColor: '#d97706' }}
                    >
                        <TrendIcon dir="up" />
                        PRICE INCREASED
                    </div>
                ) : listing.daysOnMarket != null ? (
                    <div
                        className="absolute top-3 left-3 rounded-lg px-3 py-1 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    >
                        {listing.daysOnMarket} days on market
                    </div>
                ) : null}

                {/* TOP-RIGHT favorite */}
                <button
                    type="button"
                    aria-label={
                        saved ? 'Remove from favorites' : 'Save listing'
                    }
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSaved((v) => !v);
                    }}
                    className={cn(
                        'absolute top-3 right-3 flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-white shadow-md transition-colors hover:bg-gray-50',
                        saved ? 'text-rose-500' : 'text-gray-700',
                    )}
                >
                    <HeartIcon className="h-[18px] w-[18px]" filled={saved} />
                </button>

                {/* BOTTOM-LEFT virtual tour */}
                {listing.virtualTour && (
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                        <span
                            className="rounded-lg px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.02em] text-white"
                            style={{ backgroundColor: '#174bf0' }}
                        >
                            Virtual Tour
                        </span>
                    </div>
                )}
            </div>

            {/* BODY */}
            <div className="relative p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className="text-[20px] font-bold"
                        style={{ color: 'rgb(2,46,80)' }}
                    >
                        {listing.price}
                    </span>
                    <span
                        className="rounded-lg px-2.5 py-0.5 text-[12px] font-bold text-white"
                        style={{ backgroundColor: statusColor(listing.status) }}
                    >
                        {listing.status}
                    </span>
                </div>

                {facts.length > 0 && (
                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-gray-500">
                        {facts.map((f, i) => (
                            <span
                                key={i}
                                className="flex shrink-0 items-center gap-1.5"
                            >
                                <span className="font-semibold whitespace-nowrap text-gray-700">
                                    {f}
                                </span>
                                {i < facts.length - 1 && (
                                    <span className="text-gray-300">|</span>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                {listing.subType && (
                    <div className="mt-1 text-[13px] font-semibold text-gray-700">
                        {listing.subType}
                    </div>
                )}

                <div className="mt-1.5 truncate text-[13px] text-gray-500">
                    {listing.address}
                </div>

                {(listing.mlsNumber || listing.office) && (
                    <p className="mt-1.5 text-[11px] break-words text-gray-400">
                        {listing.mlsNumber
                            ? `MLS®: ${listing.mlsNumber}${listing.office ? `; ${listing.office}` : ''}`
                            : listing.office}
                    </p>
                )}
            </div>
        </a>
    );
}
