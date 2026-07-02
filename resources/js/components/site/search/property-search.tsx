// Property Search feature: owns all client-side state (filters, pagination,
// map/grid view, the open filter panel, and the detail modal) and lays out the
// filter bar + results map + results grid + detail modal. Listings are LIVE
// PrimeMLS results — the controller seeds page one, then this re-queries
// /api/primemls/search as filters/page change. No static data.
import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@/components/site/icons';
import { ListingCardSearch } from '@/components/site/cards/listing-card-search';
import type { Auth } from '@/types';
import type { SearchListing } from '@/types/search-listing';
import { FilterBar } from './filter-bar';
import { FilterPanels } from './filter-panels';
import type { PanelKey } from './filter-panels';
import { ResultsMap } from './results-map';
import { StatusBar } from './status-bar';
import {
    DEFAULT_FILTERS,
    PROPERTY_TYPE_OPTIONS,
    countActiveFilters,
} from './use-property-filters';
import type {
    FilterState,
    SortKey,
    StatusKey,
    TourKey,
} from './use-property-filters';

const PER_PAGE = 20;

// Map-marker colour per selected status (sold red, expired gray, price-changed
// blue, active/all green) — mirrors the reference map.
const STATUS_MARKER_COLOR: Record<StatusKey, string> = {
    all: '#16a34a',
    active: '#16a34a',
    sold: '#dc2626',
    expired: '#6b7280',
    changed: '#1e40af',
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'recommended', label: 'Recommended' },
    { key: 'price-asc', label: 'Price (Low to High)' },
    { key: 'price-desc', label: 'Price (High to Low)' },
    { key: 'beds', label: 'Most Bedrooms' },
    { key: 'year', label: 'Newest Built' },
];

const TOURS: { key: TourKey; label: string }[] = [
    { key: 'virtual', label: 'Virtual Tour' },
    { key: 'floor', label: 'Floor Plans' },
    { key: 'open', label: 'Open House' },
];

// Map the client FilterState + page into the snake_case query the PrimeMLS
// search endpoint (MlsQuery::fromArray) understands.
function buildSearchParams(f: FilterState, page: number): string {
    const p = new URLSearchParams();
    p.set('per_page', String(PER_PAGE));
    p.set('page', String(page));

    if (f.q) {
        p.set('query', f.q);
    }

    if (f.priceMin != null) {
        p.set('min_price', String(f.priceMin));
    }

    if (f.priceMax != null) {
        p.set('max_price', String(f.priceMax));
    }

    if (f.beds) {
        p.set('min_beds', String(f.beds));
    }

    if (f.baths) {
        p.set('min_baths', String(f.baths));
    }

    if (f.sqftMin != null) {
        p.set('min_sqft', String(f.sqftMin));
    }

    if (f.sqftMax != null) {
        p.set('max_sqft', String(f.sqftMax));
    }

    if (f.builtMin != null) {
        p.set('min_year_built', String(f.builtMin));
    }

    if (f.builtMax != null) {
        p.set('max_year_built', String(f.builtMax));
    }

    // Map each selected Type label to its real RESO value(s) — some are
    // PropertySubType, some (Multi-Family / Land) are top-level PropertyType.
    for (const label of f.types) {
        const opt = PROPERTY_TYPE_OPTIONS.find((o) => o.label === label);
        opt?.subtypes?.forEach((v) => p.append('property_subtypes[]', v));
        opt?.types?.forEach((v) => p.append('property_types[]', v));
    }

    if (f.status === 'active') {
        p.append('statuses[]', 'Active');
    } else if (f.status === 'sold') {
        p.append('statuses[]', 'Closed');
    } else if (f.status === 'expired') {
        p.append('statuses[]', 'Expired');
    }

    const sortMap: Record<SortKey, string> = {
        recommended: 'newest',
        'price-asc': 'price_asc',
        'price-desc': 'price_desc',
        beds: 'beds_desc',
        year: 'newest',
    };
    p.set('sort', sortMap[f.sort]);

    return p.toString();
}

// Sold/closed listings are gated behind login for logged-out visitors.
const isSold = (l: SearchListing) => /sold|closed/i.test(l.status);

// Compressed pager: first, last, and current ±2 with ellipsis gaps.
function pageWindow(current: number, total: number): number[] {
    const nums: number[] = [];

    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
            nums.push(i);
        }
    }

    return nums;
}

// Seed the free-text filter from the landing URL (?q= from the home hero
// search, ?query= from the detail page's SEO links) so those searches actually
// filter the results instead of being dropped.
function initialFilters(): FilterState {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') ?? params.get('query') ?? '';

    return q ? { ...DEFAULT_FILTERS, q } : DEFAULT_FILTERS;
}

export function PropertySearch({
    listings = [],
}: {
    listings?: SearchListing[];
}) {
    const [filters, setFilters] = useState<FilterState>(initialFilters);
    const [lotRange, setLotRange] = useState<[number, number]>([0, 5]);
    const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
    const [anchor, setAnchor] = useState<DOMRect | null>(null);
    const [page, setPage] = useState(1);
    const [view, setView] = useState<'map' | 'grid'>('map');
    const [sortOpen, setSortOpen] = useState(false);
    const { auth } = usePage<{ auth: Auth }>().props;
    const loggedOut = !auth.user;
    // Live PrimeMLS results for the current page, seeded by the controller.
    const [results, setResults] = useState<SearchListing[]>(listings);
    const [total, setTotal] = useState(listings.length);
    const [loading, setLoading] = useState(false);

    const filterCount = countActiveFilters(filters);

    // Every filter mutation flows through here so results always reset to page 1.
    function applyFilters(
        update: FilterState | ((f: FilterState) => FilterState),
    ) {
        setFilters(update);
        setPage(1);
    }

    // Re-query the live MLS endpoint whenever filters or the page change
    // (debounced so typing in the search box doesn't spam the API).
    useEffect(() => {
        const controller = new AbortController();
        const handle = setTimeout(() => {
            setLoading(true);
            fetch(`/api/primemls/search?${buildSearchParams(filters, page)}`, {
                signal: controller.signal,
                headers: { Accept: 'application/json' },
            })
                .then((r) => r.json())
                .then((data) => {
                    setResults(data.listings ?? []);
                    setTotal(data.total ?? 0);
                })
                .catch(() => {
                    /* aborted / network error — keep previous results */
                })
                .finally(() => setLoading(false));
        }, 300);

        return () => {
            clearTimeout(handle);
            controller.abort();
        };
    }, [filters, page]);

    // "Price Changed" can't be filtered by PrimeMLS server-side (the feed's
    // PriceChangeTimestamp isn't filterable), so refine the fetched page to
    // listings that actually moved in price.
    const priceChangedOnly = filters.status === 'changed';
    const viewItems = priceChangedOnly
        ? results.filter((r) => r.priceChange)
        : results;
    const displayTotal = priceChangedOnly ? viewItems.length : total;
    const totalPages = priceChangedOnly
        ? 1
        : Math.max(1, Math.ceil(total / PER_PAGE));
    const start = (page - 1) * PER_PAGE;
    const pageItems = viewItems;
    const from = displayTotal ? (priceChangedOnly ? 1 : start + 1) : 0;
    const to = priceChangedOnly
        ? viewItems.length
        : Math.min(start + results.length, total);

    // Close any open panel on outside click / scroll / resize.
    useEffect(() => {
        function close() {
            setOpenPanel(null);
            setSortOpen(false);
        }
        function onScroll(e: Event) {
            const t = e.target as HTMLElement | null;

            if (t && t.closest && t.closest('[role="dialog"]')) {
                return;
            }

            close();
        }
        document.addEventListener('click', close);
        window.addEventListener('resize', close);
        document.addEventListener('scroll', onScroll, true);

        return () => {
            document.removeEventListener('click', close);
            window.removeEventListener('resize', close);
            document.removeEventListener('scroll', onScroll, true);
        };
    }, []);

    function openPanelAt(key: PanelKey, rect: DOMRect) {
        if (openPanel === key) {
            setOpenPanel(null);

            return;
        }

        setAnchor(rect);
        setOpenPanel(key);
    }

    function clearAll() {
        applyFilters(DEFAULT_FILTERS);
        setLotRange([0, 5]);
        setOpenPanel(null);
    }

    function setStatus(status: StatusKey) {
        applyFilters((f) => ({ ...f, status }));
    }

    function toggleTour(tour: TourKey) {
        applyFilters((f) => ({
            ...f,
            tours: f.tours.includes(tour)
                ? f.tours.filter((t) => t !== tour)
                : [...f.tours, tour],
        }));
    }

    const sortLabel =
        SORT_OPTIONS.find((o) => o.key === filters.sort)?.label ??
        'Recommended';

    return (
        <>
            <FilterBar
                filters={filters}
                onSearch={(q) => applyFilters((f) => ({ ...f, q }))}
                openPanel={openPanel}
                onOpenPanel={openPanelAt}
                filterCount={filterCount}
                onClearAll={clearAll}
                view={view}
                onViewChange={setView}
            />

            <FilterPanels
                openPanel={openPanel}
                anchor={anchor}
                filters={filters}
                setFilters={applyFilters}
                resultCount={total}
                onClose={() => setOpenPanel(null)}
                onResetAll={clearAll}
                lotRange={lotRange}
                setLotRange={setLotRange}
            />

            <div className="flex min-h-0 flex-1 flex-col bg-white lg:flex-row lg:overflow-hidden">
                {/* MAP */}
                <div
                    className={cn(
                        'relative w-full lg:h-full lg:w-[57%]',
                        view === 'grid' && 'hidden',
                    )}
                >
                    <div className="absolute top-3 left-4 z-[500] lg:top-4">
                        <StatusBar
                            value={filters.status}
                            onChange={setStatus}
                        />
                    </div>
                    {/* Draw-on-map search is not implemented yet — the control
                        stays visible per the design but is disabled with a
                        reason instead of silently doing nothing. */}
                    <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Draw-on-map search is coming soon"
                        className="absolute top-3 right-4 z-[500] flex h-9 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed lg:top-4"
                    >
                        <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                        </svg>
                        Draw
                    </button>
                    <div className="h-[55vh] w-full lg:h-full">
                        <ResultsMap
                            listings={viewItems}
                            onSelect={(l) => router.visit(l.href)}
                            active={view === 'map'}
                            markerColor={STATUS_MARKER_COLOR[filters.status]}
                            locked={loggedOut}
                        />
                    </div>
                </div>

                {/* LISTINGS */}
                <div
                    className={cn(
                        'w-full border-l border-gray-200 bg-white px-5 py-6 lg:h-full lg:overflow-y-auto',
                        view === 'grid' ? 'lg:w-full' : 'lg:w-[43%]',
                    )}
                >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-[20px] font-bold text-navy">
                            All Listings
                        </h2>
                        <div className="flex items-center gap-2 text-[14px] text-gray-500">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSortOpen((v) => !v);
                                    }}
                                    className="flex items-center gap-1"
                                >
                                    Sort:{' '}
                                    <span className="font-medium text-navy">
                                        {sortLabel}
                                    </span>
                                    <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                                {sortOpen && (
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-full right-0 z-[700] mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 text-[14px] text-gray-700 shadow-lg"
                                    >
                                        {SORT_OPTIONS.map((o) => (
                                            <button
                                                key={o.key}
                                                type="button"
                                                onClick={() => {
                                                    applyFilters((f) => ({
                                                        ...f,
                                                        sort: o.key,
                                                    }));
                                                    setSortOpen(false);
                                                }}
                                                className="block w-full px-4 py-2 text-left hover:bg-gray-50"
                                            >
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="text-gray-300">|</span>
                            <span>
                                {loading ? (
                                    'Searching…'
                                ) : (
                                    <>
                                        <span className="font-medium text-navy">
                                            {displayTotal.toLocaleString()}
                                        </span>{' '}
                                        results
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="mb-6 flex flex-wrap gap-2">
                        {TOURS.map((t) => {
                            const on = filters.tours.includes(t.key);

                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggleTour(t.key)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-50"
                                >
                                    <span
                                        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-white"
                                        style={
                                            on
                                                ? {
                                                      border: '1.5px solid #04345c',
                                                      backgroundColor:
                                                          '#04345c',
                                                  }
                                                : {
                                                      border: '1.5px solid #9ca3af',
                                                      backgroundColor:
                                                          'transparent',
                                                  }
                                        }
                                    >
                                        {on && (
                                            <svg
                                                className="h-2.5 w-2.5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </span>
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {pageItems.length ? (
                        <div className="listings-grid">
                            {pageItems.map((listing) => (
                                <ListingCardSearch
                                    key={listing.id}
                                    listing={listing}
                                    locked={loggedOut && isSold(listing)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="py-16 text-center text-[14px] text-gray-500">
                            No listings match your filters.
                        </p>
                    )}

                    {totalPages > 1 && (
                        <Pager
                            page={page}
                            totalPages={totalPages}
                            onChange={setPage}
                        />
                    )}

                    <p className="mt-3 text-center text-[13px] text-gray-500">
                        Showing {from}–{to} of {displayTotal.toLocaleString()}{' '}
                        listings
                    </p>

                    <div className="mt-10 border-t border-gray-200 pt-6">
                        <img
                            src="/images/primemls-logo.webp"
                            alt="PrimeMLS"
                            className="mb-4 h-9 w-auto"
                        />
                        <p className="text-[13px] leading-[20px] text-gray-500">
                            <span className="font-semibold text-gray-700">
                                NOTE:
                            </span>{' '}
                            This representation is based in whole or in part on
                            data generated by PrimeMLS, Inc., which assumes no
                            responsibility for its accuracy. The data relating
                            to real estate displayed on this site comes in part
                            from the IDX Program of PrimeMLS.
                        </p>
                        <p className="mt-3 text-[13px] leading-[20px] text-gray-500">
                            This listing data is intended for consumers&rsquo;
                            personal, non-commercial use and may not be used for
                            any purpose other than to identify prospective
                            properties consumers may be interested in
                            purchasing.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

function Pager({
    page,
    totalPages,
    onChange,
}: {
    page: number;
    totalPages: number;
    onChange: (p: number) => void;
}) {
    const nums = pageWindow(page, totalPages);
    const cells: React.ReactNode[] = [];
    let prev = 0;

    for (const n of nums) {
        if (n - prev > 1) {
            cells.push(
                <span
                    key={`gap-${n}`}
                    className="flex h-9 w-9 items-center justify-center text-gray-400 select-none"
                >
                    …
                </span>,
            );
        }

        cells.push(
            <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md text-[14px] transition-colors',
                    n === page
                        ? 'bg-navy font-semibold text-white'
                        : 'text-gray-600 hover:bg-gray-100',
                )}
            >
                {n}
            </button>,
        );
        prev = n;
    }

    return (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
            <button
                type="button"
                disabled={page === 1}
                onClick={() => onChange(page - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
                aria-label="Previous page"
            >
                <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                    />
                </svg>
            </button>
            {cells}
            <button
                type="button"
                disabled={page === totalPages}
                onClick={() => onChange(page + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
                aria-label="Next page"
            >
                <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            </button>
        </div>
    );
}
