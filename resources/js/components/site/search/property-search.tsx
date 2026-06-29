// Property Search feature: owns all client-side state (filters, pagination,
// map/grid view, the open filter panel, and the detail modal) and lays out the
// filter bar + results map + results grid + detail modal. Data comes from the
// typed fixtures module; nothing is hardcoded in JSX.
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@/components/site/icons';
import { ListingCardCompact } from '@/components/site/cards/listing-card-compact';
import { SEARCH_LISTINGS } from '@/data/search-listings';
import type { SearchListing } from '@/types/search-listing';
import { FilterBar } from './filter-bar';
import { FilterPanels } from './filter-panels';
import type { PanelKey } from './filter-panels';
import { ResultsMap } from './results-map';
import { PropertyDetailModal } from './property-detail-modal';
import {
    DEFAULT_FILTERS,
    countActiveFilters,
    filterListings,
} from './use-property-filters';
import type {
    FilterState,
    SortKey,
    StatusKey,
    TourKey,
} from './use-property-filters';

const PER_PAGE = 20;

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

export function PropertySearch() {
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
    const [lotRange, setLotRange] = useState<[number, number]>([0, 5]);
    const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
    const [anchor, setAnchor] = useState<DOMRect | null>(null);
    const [page, setPage] = useState(1);
    const [view, setView] = useState<'map' | 'grid'>('map');
    const [selected, setSelected] = useState<SearchListing | null>(null);
    const [sortOpen, setSortOpen] = useState(false);

    const results = useMemo(
        () => filterListings(SEARCH_LISTINGS, filters),
        [filters],
    );
    const filterCount = countActiveFilters(filters);

    // Every filter mutation flows through here so results always reset to the
    // first page (matches the original page's behaviour) without an effect.
    function applyFilters(
        update: FilterState | ((f: FilterState) => FilterState),
    ) {
        setFilters(update);
        setPage(1);
    }

    const totalPages = Math.max(1, Math.ceil(results.length / PER_PAGE));
    const start = (page - 1) * PER_PAGE;
    const pageItems = results.slice(start, start + PER_PAGE);
    const from = results.length ? start + 1 : 0;
    const to = Math.min(start + PER_PAGE, results.length);

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

    const statusPills: { key: StatusKey; label: string }[] = [
        { key: 'active', label: 'Active' },
        { key: 'all', label: 'All' },
        { key: 'sold', label: 'Sold' },
        { key: 'changed', label: 'Price Changed' },
    ];

    const gridClass =
        view === 'grid'
            ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

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
                resultCount={results.length}
                onClose={() => setOpenPanel(null)}
                onResetAll={clearAll}
                lotRange={lotRange}
                setLotRange={setLotRange}
            />

            <div className="flex flex-col bg-white lg:h-[calc(100vh-72px)] lg:flex-row lg:overflow-hidden">
                {/* MAP */}
                <div
                    className={cn(
                        'relative w-full lg:h-full lg:w-1/2',
                        view === 'grid' && 'hidden',
                    )}
                >
                    <div className="absolute top-3 left-6 z-[500] flex flex-wrap items-center gap-2 text-[13px] lg:left-10">
                        {statusPills.map((p) => {
                            const on = filters.status === p.key;

                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => setStatus(p.key)}
                                    className={cn(
                                        'inline-flex items-center justify-center rounded-full border px-4 py-1.5 font-medium shadow-sm',
                                        on
                                            ? 'border-navy bg-navy text-white'
                                            : 'border-gray-300 bg-white text-gray-600',
                                    )}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        className="absolute top-3 right-6 z-[500] flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 shadow-sm lg:right-10"
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
                            listings={results}
                            onSelect={setSelected}
                            active={view === 'map'}
                        />
                    </div>
                </div>

                {/* LISTINGS */}
                <div
                    className={cn(
                        'w-full bg-white px-5 py-6 lg:h-full lg:overflow-y-auto lg:px-8',
                        view === 'grid' ? 'lg:w-full' : 'lg:w-1/2',
                    )}
                >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-[24px] font-semibold text-navy">
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
                                <span className="font-medium text-navy">
                                    {results.length}
                                </span>{' '}
                                results
                            </span>
                        </div>
                    </div>

                    <div className="mb-6 flex flex-wrap gap-2 text-[13px]">
                        {TOURS.map((t) => (
                            <label
                                key={t.key}
                                className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-navy"
                            >
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-navy"
                                    checked={filters.tours.includes(t.key)}
                                    onChange={() => toggleTour(t.key)}
                                />
                                {t.label}
                            </label>
                        ))}
                    </div>

                    {pageItems.length ? (
                        <div className={gridClass}>
                            {pageItems.map((listing) => (
                                <ListingCardCompact
                                    key={listing.id}
                                    listing={listing}
                                    onSelect={() => setSelected(listing)}
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
                        Showing {from}–{to} of {results.length} listings
                    </p>

                    <div className="mt-10 border-t border-gray-200 pt-6">
                        <img
                            src="/assets/images/primemls-logo.png"
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

            <PropertyDetailModal
                key={selected?.id ?? 'none'}
                listing={selected}
                allListings={SEARCH_LISTINGS}
                onClose={() => setSelected(null)}
                onSelect={setSelected}
            />
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
