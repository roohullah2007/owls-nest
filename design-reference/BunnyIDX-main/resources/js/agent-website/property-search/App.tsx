import { useEffect, useMemo, useRef, useState } from 'react';
import { PsConfig, PsListing } from './types';
import { useSearch } from './hooks/useSearch';
import { fetchFavoriteIds, toggleFavorite, trackListingView } from './lib/api';
import { loadGoogleMaps } from './lib/maps';
import FilterBar from './components/FilterBar';
import MapPanel, { MapPanelHandle } from './components/MapPanel';
import ResultsPanel from './components/ResultsPanel';
import StatusRow from './components/StatusRow';
import ListingModal from './components/ListingModal';
import SaveSearchModal from './components/SaveSearchModal';

interface Props {
    cfg: PsConfig;
    /** The .ps-app mount node — owns the mobile map/grid attribute the CSS reads. */
    container: HTMLElement;
}

/** Root of the shared (theme-agnostic) property-search experience. */
export default function App({ cfg, container }: Props) {
    const search = useSearch(cfg);
    const [mapsReady, setMapsReady] = useState(false);
    const [view, setView] = useState<'map' | 'grid'>('map');
    const [hover, setHover] = useState<{ index: number; on: boolean } | null>(null);
    const [saveOpen, setSaveOpen] = useState(false);
    const [activeListing, setActiveListing] = useState<PsListing | null>(null);

    // Polygon-draw state lives in MapPanel; the filter bar drives it via this
    // handle and mirrors the in-progress flag for its Draw/Cancel buttons.
    const mapHandle = useRef<MapPanelHandle>(null);
    const [drawing, setDrawing] = useState(false);

    // Theme accent — the host template's --accent surfaces as --ps-accent.
    const accent = getComputedStyle(container).getPropertyValue('--ps-accent').trim() || '#022E50';

    // ── Visitor account: favorites + activity tracking ──────────────────
    const [favIds, setFavIds] = useState<Set<string>>(new Set());
    const authed = !!(cfg.visitor && cfg.account);

    useEffect(() => {
        if (!authed || !cfg.account) return;
        const ctrl = new AbortController();
        fetchFavoriteIds(cfg.account.favoriteIds, ctrl.signal)
            .then((ids) => setFavIds(new Set(ids)))
            .catch(() => { /* guest-like fallback */ });
        return () => ctrl.abort();
    }, [authed, cfg.account]);

    // Guests get the header's Login/Register modal instead of a dead heart.
    const handleFavorite = (l: PsListing) => {
        if (!authed || !cfg.account) {
            window.dispatchEvent(new CustomEvent('ps:open-auth', { detail: 'register' }));
            return;
        }
        toggleFavorite(cfg.account.favorites, {
            mls_slug: l.mls_slug,
            listing_id: l.mls_id,
            snapshot: {
                address: l.address,
                price_formatted: l.price_formatted,
                photo: l.photos[0] || null,
                href: l.href,
                beds: l.beds,
                baths: l.baths,
                sqft: l.sqft,
            },
        }).then((favorited) => {
            if (favorited === null) return;
            setFavIds((prev) => {
                const next = new Set(prev);
                if (favorited) next.add(l.id); else next.delete(l.id);
                return next;
            });
        });
    };

    // Opening the detail modal = a listing view on the CRM timeline.
    useEffect(() => {
        if (!activeListing || !authed || !cfg.account) return;
        trackListingView(cfg.account.trackView, {
            mls_slug: activeListing.mls_slug,
            listing_id: activeListing.mls_id,
            address: activeListing.address,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeListing?.id]);

    // Class + sub-type options from the LIVE MLS taxonomy (union across the
    // owner's connected MLSes, served with each search response). All Filters
    // shows class → sub-type hierarchically, like the CRM MLS filters modal.
    const taxonomyTypes = search.data?.taxonomy?.property_types;
    const taxonomySubtypes = search.data?.taxonomy?.property_subtypes;
    // Hide the Sold toggle when the connected MLS(es) don't carry the status
    // at all. No taxonomy yet (first load / fallback) → show it.
    const taxStatuses = search.data?.taxonomy?.statuses;
    const hasSold = !taxStatuses?.length || taxStatuses.some((t) => /sold|closed/i.test(`${t.value} ${t.label}`));
    const classOptions = useMemo<Array<[string, string]> | undefined>(
        () => (taxonomyTypes?.length ? taxonomyTypes.map((t): [string, string] => [t.value, t.label]) : undefined),
        [taxonomyTypes],
    );

    useEffect(() => {
        if (!cfg.mapsKey) return;
        loadGoogleMaps(cfg.mapsKey).then(() => setMapsReady(true)).catch(() => { /* grid still works */ });
    }, [cfg.mapsKey]);

    // Mobile shows one pane at a time (CSS reads data-mobile-view off .ps-app),
    // and the theme footer hides while the map is on screen.
    useEffect(() => {
        container.dataset.mobileView = view;
        document.body.classList.toggle('ps-map-view', view === 'map');
        return () => document.body.classList.remove('ps-map-view');
    }, [view, container]);

    // Desktop split resizer.
    const splitRef = useRef<HTMLDivElement>(null);
    const mapWrapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const resizer = document.getElementById('ps-resizer');
        const split = splitRef.current;
        if (!resizer || !split) return;
        let dragging = false;
        const down = (e: MouseEvent) => { dragging = true; e.preventDefault(); document.body.style.userSelect = 'none'; };
        const move = (e: MouseEvent) => {
            if (!dragging) return;
            const rect = split.getBoundingClientRect();
            const pct = Math.min(75, Math.max(35, ((e.clientX - rect.left) / rect.width) * 100));
            document.getElementById('ps-map-wrap')?.style.setProperty('--map-w', pct + '%');
            (window as any).google?.maps?.event?.trigger?.((window as any).__psMap, 'resize');
        };
        const up = () => { dragging = false; document.body.style.userSelect = ''; };
        resizer.addEventListener('mousedown', down);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => { resizer.removeEventListener('mousedown', down); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, []);

    const gridOnly = view === 'grid';

    return (
        <>
            <FilterBar
                filters={search.filters}
                onApply={search.setFilters}
                searchText={search.searchText}
                onSearchText={search.setSearchText}
                view={view}
                onView={setView}
                onSaveSearch={() => setSaveOpen(true)}
                total={search.data?.total ?? 0}
                classOptions={classOptions}
                subtypeTerms={taxonomySubtypes}
                searchEndpoint={cfg.endpoint}
                locations={search.data?.taxonomy?.locations}
            />

            {/* Grid view hides the map (and its overlay status row), so the same
                controls render as an inline bar above the results instead. */}
            {gridOnly && (
                <StatusRow filters={search.filters} onApply={search.setFilters} showDraw={false} overlay={false} hasSold={hasSold} />
            )}

            <div ref={splitRef} className="ps-split flex min-h-0 min-w-0 flex-1" id="ps-split">
                <MapPanel
                    ref={mapHandle}
                    mapsReady={mapsReady}
                    hidden={gridOnly}
                    listings={search.data?.listings || []}
                    hover={hover}
                    onPolygon={search.setPolygon}
                    onDrawingChange={setDrawing}
                    onViewport={search.setBounds}
                    accent={accent}
                    filters={search.filters}
                    onApply={search.setFilters}
                    polygonActive={!!search.polygon}
                    hasSold={hasSold}
                />

                <div
                    id="ps-resizer"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize map"
                    className={`ps-resizer group relative z-20 shrink-0 cursor-col-resize items-center justify-center ${gridOnly ? 'hidden' : 'hidden lg:flex'}`}
                >
                    <div className="ps-resizer-grip" />
                </div>

                <ResultsPanel
                    data={search.data}
                    loading={search.loading}
                    fullWidth={gridOnly}
                    page={search.page}
                    onPage={search.setPage}
                    sort={search.sort}
                    onSort={search.setSort}
                    filters={search.filters}
                    onFilters={search.setFilters}
                    isOwner={cfg.isOwner}
                    connectUrl={cfg.connectUrl}
                    onHoverListing={(index, on) => setHover({ index, on })}
                    onOpenListing={setActiveListing}
                    favoriteIds={favIds}
                    onFavorite={handleFavorite}
                    gridCards={cfg.gridCards}
                />
            </div>

            <ListingModal
                listing={activeListing}
                onClose={() => setActiveListing(null)}
                accent={accent}
                leadEndpoint={cfg.leadEndpoint}
                searchEndpoint={cfg.endpoint}
                favorited={activeListing ? favIds.has(activeListing.id) : false}
                onToggleFavorite={handleFavorite}
                consentText={cfg.consentText}
                agent={cfg.agent}
                showingEndpoint={cfg.showingEndpoint}
                customBlocks={cfg.detailBlocks}
                detailSections={cfg.detailSections}
                courtesy={(() => {
                    // The opened listing's OWN MLS courtesy — with several MLSes
                    // merged, each listing must credit the feed it came from.
                    const blocks = search.data?.compliance || [];
                    const block = blocks.find((b) => b.slug && activeListing && b.slug === activeListing.mls_slug) || blocks[0];
                    return block ? { mlsName: block.name, logo: block.logo, disclaimer: block.disclaimer } : undefined;
                })()}
            />

            <SaveSearchModal
                open={saveOpen}
                onClose={() => setSaveOpen(false)}
                leadEndpoint={cfg.leadEndpoint}
                filtersSummary={search.filtersSummary}
                authed={authed}
                accountEndpoint={cfg.account?.savedSearches}
                filtersPayload={search.filters as unknown as Record<string, unknown>}
                searchText={search.searchText}
                consentText={cfg.consentText}
            />
        </>
    );
}
