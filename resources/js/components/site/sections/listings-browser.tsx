// Client-side listings browser: address search + neighborhood filter over a
// `Listing[]`, rendered as paginated large alternating image/text rows
// (FeaturedListingRow). Ports the inline filter/pagination <script> from the
// original featured-properties.html to React state. The price/sq-ft sliders are
// presentational (as in the original markup) and the Clear control resets the
// active text/neighborhood filters.
import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { FeaturedListingRow } from '@/components/site/cards/featured-listing-row';
import {
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CloseIcon,
    SearchIcon,
} from '@/components/site/icons';
import type { Listing } from '@/types/listing';

interface ListingsBrowserProps {
    listings: Listing[];
    perPage?: number;
    className?: string;
}

const ALL_NEIGHBORHOODS = 'all';

/** Derive the town/neighborhood from a "Street, Town, NH 03xxx" address. */
function neighborhoodOf(address: string): string {
    const parts = address.split(',');

    return parts.length >= 2 ? parts[parts.length - 2].trim() : address.trim();
}

/** Decorative dual-handle slider rule used for the Sales Price / Sq. Ft. rows. */
function SliderRule({
    label,
    min,
    max,
}: {
    label: string;
    min: string;
    max: string;
}) {
    return (
        <div className="flex min-w-[300px] flex-1 items-center gap-4">
            <span className="text-[13px] font-normal tracking-wide text-black uppercase">
                {label}
            </span>
            <span className="text-[13px] font-light text-black">{min}</span>
            <div className="relative h-px flex-1 bg-black">
                <span className="absolute -top-1.5 -left-1 h-3 w-3 rounded-full bg-black" />
                <span className="absolute -top-1.5 -right-1 h-3 w-3 rounded-full bg-black" />
            </div>
            <span className="text-[13px] font-light text-black">{max}</span>
        </div>
    );
}

export function ListingsBrowser({
    listings,
    perPage = 3,
    className,
}: ListingsBrowserProps) {
    const [query, setQuery] = useState('');
    const [neighborhood, setNeighborhood] = useState(ALL_NEIGHBORHOODS);
    const [menuOpen, setMenuOpen] = useState(false);
    const [page, setPage] = useState(1);
    const rootRef = useRef<HTMLDivElement>(null);

    const neighborhoods = useMemo(() => {
        const set = new Set(
            listings.map((listing) => neighborhoodOf(listing.address)),
        );

        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [listings]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return listings.filter((listing) => {
            const matchesQuery =
                needle === '' || listing.address.toLowerCase().includes(needle);
            const matchesArea =
                neighborhood === ALL_NEIGHBORHOODS ||
                neighborhoodOf(listing.address) === neighborhood;

            return matchesQuery && matchesArea;
        });
    }, [listings, query, neighborhood]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);

    const hasFilters =
        query.trim() !== '' || neighborhood !== ALL_NEIGHBORHOODS;

    function goToPage(next: number) {
        const clamped = Math.min(Math.max(1, next), totalPages);
        setPage(clamped);
        rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function resetFilters() {
        setQuery('');
        setNeighborhood(ALL_NEIGHBORHOODS);
        setPage(1);
    }

    function selectNeighborhood(value: string) {
        setNeighborhood(value);
        setMenuOpen(false);
        setPage(1);
    }

    // Pagination window: first, last, and ±2 around the current page.
    const pageNumbers: number[] = [];

    for (let i = 1; i <= totalPages; i += 1) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
            pageNumbers.push(i);
        }
    }

    return (
        <div ref={rootRef} className={cn('scroll-mt-6', className)}>
            {/* FILTER BAR */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Search by address */}
                <div className="flex items-center gap-3 rounded-full bg-gray-100 px-5 py-3">
                    <SearchIcon className="h-5 w-5 text-gray-500" />
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by address"
                        className="flex-1 bg-transparent text-[14px] font-light text-gray-700 outline-none placeholder:text-gray-500"
                    />
                </div>

                {/* Neighborhood dropdown */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-haspopup="listbox"
                        aria-expanded={menuOpen}
                        className="flex w-full items-center justify-between rounded-full bg-gray-100 px-5 py-3 text-[14px] font-light text-black"
                    >
                        <span>
                            {neighborhood === ALL_NEIGHBORHOODS
                                ? 'Select neighborhood'
                                : neighborhood}
                        </span>
                        <ChevronDownIcon className="h-4 w-4 text-gray-700" />
                    </button>
                    {menuOpen && (
                        <ul
                            role="listbox"
                            className="absolute top-full left-0 z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white py-2 shadow-lg"
                        >
                            <li>
                                <button
                                    type="button"
                                    onClick={() =>
                                        selectNeighborhood(ALL_NEIGHBORHOODS)
                                    }
                                    className="block w-full px-5 py-2 text-left text-[14px] font-light text-gray-700 hover:bg-gray-100"
                                >
                                    All neighborhoods
                                </button>
                            </li>
                            {neighborhoods.map((name) => (
                                <li key={name}>
                                    <button
                                        type="button"
                                        onClick={() => selectNeighborhood(name)}
                                        className={cn(
                                            'block w-full px-5 py-2 text-left text-[14px] font-light hover:bg-gray-100',
                                            name === neighborhood
                                                ? 'text-navy'
                                                : 'text-gray-700',
                                        )}
                                    >
                                        {name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Rental availability (disabled, as in the original) */}
                <button
                    type="button"
                    disabled
                    className="flex cursor-not-allowed items-center justify-between rounded-full bg-gray-100 px-5 py-3 text-[14px] font-light text-black opacity-60"
                >
                    <span>Rental availability</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-700" />
                </button>
            </div>

            {/* Sliders row */}
            <div className="mb-10 flex flex-wrap items-center gap-8 border-b border-gray-200 pb-6">
                <SliderRule label="Sales Price" min="<$1 M" max="$25 M+" />
                <div className="hidden h-8 w-px bg-gray-300 md:block" />
                <SliderRule label="Sq. Ft." min="<500" max="10 K+" />
                <button
                    type="button"
                    onClick={resetFilters}
                    disabled={!hasFilters}
                    className="flex items-center gap-2 text-[13px] font-normal tracking-widest text-black uppercase transition-opacity disabled:opacity-40"
                >
                    Clear
                    <CloseIcon className="h-4 w-4" />
                </button>
            </div>

            {/* RESULTS: large alternating image/text rows */}
            {pageItems.length > 0 ? (
                <div className="flex flex-col gap-16">
                    {pageItems.map((listing, index) => (
                        <FeaturedListingRow
                            key={listing.id}
                            listing={listing}
                            reverse={index % 2 === 1}
                        />
                    ))}
                </div>
            ) : (
                <p className="py-16 text-center text-[15px] font-light text-gray-500">
                    No properties match your search.
                </p>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-navy hover:text-navy disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:text-gray-600"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    {pageNumbers.map((number, index) => {
                        const previous = pageNumbers[index - 1];
                        const gap =
                            previous !== undefined && number - previous > 1;

                        return (
                            <span key={number} className="flex items-center">
                                {gap && (
                                    <span className="flex h-10 w-10 items-center justify-center text-gray-400 select-none">
                                        …
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => goToPage(number)}
                                    aria-current={
                                        number === currentPage
                                            ? 'page'
                                            : undefined
                                    }
                                    className={cn(
                                        'flex h-10 w-10 items-center justify-center rounded-full text-[14px] transition-colors',
                                        number === currentPage
                                            ? 'bg-navy font-semibold text-white'
                                            : 'text-gray-600 hover:bg-gray-100',
                                    )}
                                >
                                    {number}
                                </button>
                            </span>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-navy hover:text-navy disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:text-gray-600"
                    >
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
