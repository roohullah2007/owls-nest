import { useEffect, useRef, useState } from 'react';
import { Filters, PsListing, PsResponse } from '../types';
import ListingCard from './ListingCard';
import MarketingCard from './MarketingCard';
import { PsGridCard } from '../lib/merge';

interface Props {
    data: PsResponse | null;
    loading: boolean;
    /** Grid-only desktop view — the pane takes the full split width. */
    fullWidth: boolean;
    page: number;
    onPage: (p: number) => void;
    sort: string;
    onSort: (s: string) => void;
    /** Committed filters — the header feature pills toggle these directly. */
    filters: Filters;
    onFilters: (f: Filters) => void;
    isOwner: boolean;
    connectUrl: string;
    onHoverListing: (index: number, on: boolean) => void;
    onOpenListing: (listing: PsListing) => void;
    /** Visitor-account favorites (card hearts). */
    favoriteIds?: Set<string>;
    onFavorite?: (listing: PsListing) => void;
    /** Marketing CTA tiles mixed into the grid at their configured slots. */
    gridCards?: PsGridCard[];
}

const SORTS: Array<[string, string]> = [
    ['recommended', 'Recommended'],
    ['newest', 'Newest'],
    ['price_desc', 'Price (High to Low)'],
    ['price_asc', 'Price (Low to High)'],
    ['beds', 'Most Bedrooms'],
    ['sqft', 'Largest'],
];

/** Feature pills shown under the results header (instant-apply checkboxes). */
// No "Floor Plans" pill: neither connected feed supports filtering on it
// upstream (Bridge no-ops Media lambdas; Realtyna's Media resource is
// unlicensed) — floor plans still DISPLAY on cards/detail when present.
const FEATURE_PILLS: Array<{ key: 'hasVirtualTour' | 'hasFloorPlans' | 'hasOpenHouse'; label: string }> = [
    { key: 'hasVirtualTour', label: 'Virtual Tour' },
    { key: 'hasOpenHouse', label: 'Open House' },
];

/** Right pane: header (sort + count), card grid, pagination, compliance footer. */
export default function ResultsPanel({ data, loading, fullWidth, page, onPage, sort, onSort, filters, onFilters, isOwner, connectUrl, onHoverListing, onOpenListing, favoriteIds, onFavorite, gridCards }: Props) {
    const [sortOpen, setSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sortOpen) return;
        const onDoc = (e: MouseEvent) => { if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [sortOpen]);

    // New results → back to the top of the list.
    useEffect(() => { if (!loading) scrollRef.current?.scrollTo(0, 0); }, [data, loading]);

    const total = data?.total || 0;
    const per = data?.per_page || 20;
    const pages = Math.max(1, Math.ceil(total / per));
    const from = (page - 1) * per + 1;
    const to = Math.min(page * per, total);

    // Card density tracks the panel's ACTUAL width (auto-fill), so dragging the
    // map splitter reflows 1 → 2 → 3+ columns instead of being viewport-locked.
    const gridCls = 'ps-card-grid';

    const pageButtons = (() => {
        const start = Math.max(1, Math.min(page - 1, pages - 2));
        const nums: number[] = [];
        for (let p = start; p <= Math.min(pages, start + 2); p++) nums.push(p);
        return nums;
    })();

    return (
        <div className={`ps-results min-h-0 min-w-0 flex-1 flex-col border-l border-gray-200 bg-white hidden lg:flex ${fullWidth ? 'ps-full' : ''}`} id="ps-results">
            {/* Header — no vertical padding on mobile (compact stacked layout). */}
            <div className="shrink-0 border-b border-gray-100 px-5 py-0 lg:pt-4 lg:pb-3">
                <div className="flex items-center justify-between">
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ps-accent)' }}>Listings</h2>
                    <div className="flex items-center gap-3">
                        <div ref={sortRef} className={`ps-pop relative ${sortOpen ? 'is-open' : ''}`}>
                            <button type="button" className="ps-pop-btn flex items-center gap-1.5" onClick={() => setSortOpen((o) => !o)}>
                                <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Sort:</span>
                                <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600 }}>
                                    {SORTS.find(([v]) => v === sort)?.[1] || 'Recommended'}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                </span>
                            </button>
                            <div className="ps-pop-panel ps-pop-panel--right">
                                <div className="ps-menu">
                                    {SORTS.map(([v, label]) => (
                                        <button key={v} type="button" aria-pressed={sort === v} onClick={() => { onSort(v); setSortOpen(false); }}>{label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                            {loading ? ' ' : total ? `${total.toLocaleString()} result${total === 1 ? '' : 's'}` : 'No results'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Feature pills — Virtual Tour / Open House (instant apply). Desktop only. */}
            <div className="shrink-0 hidden lg:flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
                {FEATURE_PILLS.map(({ key, label }) => {
                    const on = !!filters[key];
                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => onFilters({ ...filters, [key]: !on })}
                            className="flex items-center gap-2 rounded-full border bg-white"
                            style={{
                                padding: '7px 14px',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: on ? 'var(--ps-accent)' : '#374151',
                                borderColor: on ? 'var(--ps-accent)' : '#E5E7EB',
                            }}
                        >
                            <span
                                className="flex items-center justify-center rounded"
                                style={{
                                    width: 16,
                                    height: 16,
                                    border: on ? 'none' : '1.5px solid #D1D5DB',
                                    background: on ? 'var(--ps-accent)' : '#fff',
                                }}
                            >
                                {on && (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                )}
                            </span>
                            {label}
                        </button>
                    );
                })}
            </div>

            <div ref={scrollRef} className="ps-results-scroll flex-1 overflow-y-auto px-5 py-4">
                {loading && (
                    <div className={gridCls}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="ps-skeleton overflow-hidden rounded-2xl border border-gray-200 bg-white">
                                <div className="ps-skeleton-img" />
                                <div className="p-3.5"><div className="ps-skeleton-line" style={{ width: '55%' }} /><div className="ps-skeleton-line" style={{ width: '80%' }} /><div className="ps-skeleton-line" style={{ width: '40%' }} /></div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && data && !data.integrated && (
                    <div className="ps-state">
                        <p className="ps-state-title">Listings coming soon</p>
                        <p className="ps-state-sub">This site isn&rsquo;t connected to an MLS feed yet.</p>
                        {isOwner && <a href={connectUrl} className="ps-state-cta">Connect your MLS</a>}
                    </div>
                )}

                {!loading && data && data.integrated && data.listings.length === 0 && (
                    <div className="ps-state">
                        <p className="ps-state-title">No listings match your search</p>
                        <p className="ps-state-sub">Try widening your filters or panning the map.</p>
                    </div>
                )}

                {!loading && data && data.listings.length > 0 && (
                    <>
                        <div className={gridCls}>
                            {(() => {
                                // Splice enabled marketing CTA tiles into the grid at
                                // their 1-based slots (page 1 only — they'd repeat
                                // confusingly on every page otherwise).
                                const cells: React.ReactNode[] = data.listings.map((l, i) => (
                                    <ListingCard key={l.id} listing={l} onHover={(on) => onHoverListing(i, on)} onOpen={onOpenListing} favorited={favoriteIds?.has(l.id)} onFavorite={onFavorite} />
                                ));
                                if (page === 1 && gridCards?.length) {
                                    [...gridCards]
                                        .filter((c) => c.enabled !== false && (c.title || c.body))
                                        .sort((a, b) => (a.slot ?? 3) - (b.slot ?? 3))
                                        .forEach((c) => {
                                            const at = Math.max(0, Math.min(cells.length, (c.slot ?? 3) - 1));
                                            cells.splice(at, 0, <MarketingCard key={`mc-${c.id}`} card={c} />);
                                        });
                                }
                                return cells;
                            })()}
                        </div>

                        {pages > 1 && (
                            <div className="mt-6 flex items-center justify-center gap-1 pb-2" id="ps-pagination">
                                <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
                                {pageButtons.map((p) => (
                                    <button key={p} type="button" className={p === page ? 'is-active' : ''} onClick={() => onPage(p)}>{p}</button>
                                ))}
                                <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
                            </div>
                        )}
                        <div className="pb-4 text-center" style={{ fontSize: 12, color: '#9CA3AF' }}>
                            {pages > 1
                                ? `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} listings`
                                : `Showing ${total} listing${total === 1 ? '' : 's'}`}
                        </div>

                        {data.compliance.length > 0 && (
                            <div className="ps-compliance">
                                {data.compliance.map((b, i) => (
                                    <div key={i} style={i > 0 ? { marginTop: 10 } : undefined}>
                                        <div className="ps-compliance-head">
                                            {b.logo ? <img src={b.logo} alt={b.name || 'MLS'} /> : <strong>{b.name || 'MLS'}</strong>}
                                        </div>
                                        <p>{b.disclaimer}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
