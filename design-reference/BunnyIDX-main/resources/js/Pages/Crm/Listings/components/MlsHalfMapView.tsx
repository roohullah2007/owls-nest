import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { MlsListing } from '../types';
import { formatPrice } from '../utils';
import StatusBadge from './StatusBadge';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const MARKERCLUSTER_CSS = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';

interface Props {
    listings: MlsListing[];
    /** Total matches reported by the API (≥ `listings.length` when more pages
     *  exist than we bulk-loaded). Used to surface the real "in drawn area"
     *  count, which is otherwise capped at the ~1000 we loaded. */
    totalInArea?: number;
    onOpenLightbox: (photos: string[], index: number) => void;
    onSelectListing: (listing: MlsListing) => void;
    /** Active polygon as [lat, lng] vertices. null when none. */
    polygon?: [number, number][] | null;
    /** Called when the user commits a new polygon or clears it. */
    onPolygonChange?: (polygon: [number, number][] | null) => void;
    /** Show a loading hint on the toolbar while a polygon search is in flight. */
    searching?: boolean;
    /** Optional pagination control, rendered sticky at the bottom of the cards column. */
    pagination?: ReactNode;
    /** When provided, "Search this area" appears after pan/zoom; calls with the current viewport bounds. */
    onSearchArea?: (bounds: { ne_lat: number; ne_lng: number; sw_lat: number; sw_lng: number }) => void;
    /** mls_slug → display_name so each card can show which MLS the listing came from. */
    mlsSlugToName?: Record<string, string>;
}

type LatLng = [number, number];

/** Ray-cast point-in-polygon test on [lat, lng] tuples. */
function isInsidePolygon(point: LatLng, polygon: LatLng[]): boolean {
    if (polygon.length < 3) return false;
    const [lat, lng] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [latI, lngI] = polygon[i];
        const [latJ, lngJ] = polygon[j];
        const intersects = ((lngI > lng) !== (lngJ > lng)) &&
            (lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI);
        if (intersects) inside = !inside;
    }
    return inside;
}

/**
 * Half-map view: Leaflet map on the left, scrollable cards on the right.
 *
 * Features:
 *  - Draw a freeform polygon to filter listings to that area
 *  - Hover a card → highlight matching pin and vice versa
 *  - Click pin or card → opens the detail drawer
 */
export default function MlsHalfMapView({
    listings,
    totalInArea,
    onOpenLightbox,
    onSelectListing,
    polygon: polygonProp = null,
    onPolygonChange,
    searching = false,
    pagination,
    onSearchArea,
    mlsSlugToName = {},
}: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const clusterGroupRef = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());
    const drawingLayersRef = useRef<{ inProgressLine: any; inProgressMarkers: any[]; polygon: any }>({
        inProgressLine: null,
        inProgressMarkers: [],
        polygon: null,
    });
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    // Flips to true once the async map init finishes. Effects that need the
    // Leaflet instance (polygon rendering, fit-to-bounds) depend on this so
    // they re-run after the map exists instead of bailing on first mount.
    const [mapReady, setMapReady] = useState(false);

    const [drawMode, setDrawMode] = useState(false);
    const [drawPoints, setDrawPoints] = useState<LatLng[]>([]);
    // Polygon is parent-controlled when onPolygonChange is provided so the
    // backend can do the actual spatial filtering; we keep local fallback state
    // for the legacy uncontrolled usage.
    const [localPolygon, setLocalPolygon] = useState<LatLng[] | null>(null);
    const polygon = onPolygonChange ? polygonProp : localPolygon;
    const commitPolygon = (next: LatLng[] | null) => {
        if (onPolygonChange) onPolygonChange(next);
        else setLocalPolygon(next);
    };

    // Viewport bounds — updated on map pan/zoom. Used to filter the right-side
    // card list to only listings currently visible on the map.
    const [viewport, setViewport] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
    // Set TRUE for one tick around any programmatic camera move (initial setView,
    // fitBounds, etc.) so the moveend handler can ignore it instead of treating
    // it as a user gesture and kicking off an auto-refetch loop.
    const programmaticMoveRef = useRef(false);
    // Tracks whether we've already auto-fitted the camera to the loaded results.
    // We only do this once per fresh load — otherwise every refetch would
    // re-fit and yank the user's view away.
    const hasInitialFitRef = useRef(false);
    // Debounce handle for auto "search this area" on pan/zoom.
    const autoSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current);
    }, []);
    // Refs mirror the latest props so the moveend listener (attached once at
    // map init) always reads fresh values instead of capturing them at mount.
    const onSearchAreaRef = useRef(onSearchArea);
    const polygonRef = useRef(polygon);
    const searchingRef = useRef(searching);
    const onSelectListingRef = useRef(onSelectListing);
    // Identity-tracks the polygon we've already fit the camera to. Lets us
    // re-fit when polygon changes (e.g. applying a hotsheet over an open map)
    // without re-fitting on every unrelated re-render.
    const lastFittedPolygonRef = useRef<LatLng[] | null | undefined>(undefined);
    useEffect(() => { onSearchAreaRef.current = onSearchArea; }, [onSearchArea]);
    useEffect(() => { polygonRef.current = polygon; }, [polygon]);
    useEffect(() => { searchingRef.current = searching; }, [searching]);
    useEffect(() => { onSelectListingRef.current = onSelectListing; }, [onSelectListing]);

    // Reduce to a boolean so the memo below doesn't invalidate on every parent
    // render (the parent's `onPolygonChange` arrow is a fresh ref every time).
    const externallyControlled = !!onPolygonChange;

    // When the parent is doing the spatial filtering server-side, skip the
    // client-side polygon filter — the listings array already matches.
    const filtered = useMemo(() => {
        if (externallyControlled) return listings;
        if (!polygon || polygon.length < 3) return listings;
        return listings.filter((ml) => ml.lat != null && ml.lng != null && isInsidePolygon([ml.lat, ml.lng], polygon));
    }, [listings, polygon, externallyControlled]);

    // Cards on the right are scoped to whatever's currently in the map viewport.
    // Pins remain unrestricted because Leaflet already clips them visually.
    const visibleInViewport = useMemo(() => {
        if (!viewport) return filtered;
        return filtered.filter((ml) => {
            if (ml.lat == null || ml.lng == null) return false;
            return ml.lat <= viewport.north
                && ml.lat >= viewport.south
                && ml.lng <= viewport.east
                && ml.lng >= viewport.west;
        });
    }, [filtered, viewport]);

    // Inject Leaflet + cluster CSS once.
    useEffect(() => {
        const inject = (href: string, marker: string) => {
            if (!document.querySelector(`link[href*="${marker}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                document.head.appendChild(link);
            }
        };
        inject(LEAFLET_CSS, 'leaflet.css');
        inject(MARKERCLUSTER_CSS, 'MarkerCluster.css');
        // Strip the plugin's default skin and let our `iconCreateFunction` paint
        // the cluster bubble (green circle + white ring).
        const id = 'mls-cluster-css-overrides';
        if (!document.getElementById(id)) {
            const style = document.createElement('style');
            style.id = id;
            style.textContent = `.marker-cluster, .marker-cluster div { background: transparent !important; border: 0 !important; }
.marker-cluster { background-clip: padding-box; }`;
            document.head.appendChild(style);
        }
    }, []);

    // Init / sync markers (with clustering).
    useEffect(() => {
        if (!mapRef.current) return;
        let aborted = false;

        (async () => {
            const L = (await import('leaflet')).default;
            await import('leaflet.markercluster');
            if (aborted) return;

            if (!mapInstanceRef.current) {
                // The initial setView is programmatic — flag it so the moveend
                // it triggers doesn't kick off an auto-refetch.
                programmaticMoveRef.current = true;
                mapInstanceRef.current = L.map(mapRef.current!, { zoomControl: false, doubleClickZoom: false })
                    .setView([39.5, -98.35], 4);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap',
                }).addTo(mapInstanceRef.current);
                L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);

                // Track viewport for card filtering + auto "search this area".
                const syncViewport = () => {
                    const b = mapInstanceRef.current.getBounds();
                    setViewport({
                        north: b.getNorth(),
                        south: b.getSouth(),
                        east: b.getEast(),
                        west: b.getWest(),
                    });
                };
                syncViewport();
                mapInstanceRef.current.on('moveend', () => {
                    syncViewport();
                    // Programmatic move (setView / fitBounds): consume the flag
                    // and bail — this isn't a user pan/zoom.
                    if (programmaticMoveRef.current) {
                        programmaticMoveRef.current = false;
                        return;
                    }
                    // Don't auto-refetch when polygon is the intentional area
                    // filter, when no handler is wired, or while a fetch is
                    // already in flight (would just collide with itself).
                    if (!onSearchAreaRef.current || polygonRef.current || searchingRef.current) return;
                    if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current);
                    autoSearchTimerRef.current = setTimeout(() => {
                        const b = mapInstanceRef.current.getBounds();
                        onSearchAreaRef.current!({
                            ne_lat: b.getNorth(),
                            ne_lng: b.getEast(),
                            sw_lat: b.getSouth(),
                            sw_lng: b.getWest(),
                        });
                    }, 700);
                });
                setMapReady(true);
            }

            // Cluster group — green circle with white border, count in white text.
            if (!clusterGroupRef.current) {
                clusterGroupRef.current = (L as any).markerClusterGroup({
                    showCoverageOnHover: false,
                    spiderfyOnMaxZoom: true,
                    zoomToBoundsOnClick: true,
                    // Smaller radius at low zoom = more distinct clusters spread
                    // across country/state view; larger at mid-zoom for clean
                    // city view; disabled past street level so individual pins
                    // always show when you're zoomed in.
                    maxClusterRadius: (zoom: number) => {
                        if (zoom <= 5) return 30;   // country
                        if (zoom <= 8) return 45;   // state
                        if (zoom <= 11) return 60;  // metro / city
                        return 80;                  // neighborhood
                    },
                    disableClusteringAtZoom: 16,
                    chunkedLoading: true,
                    chunkInterval: 100,
                    chunkDelay: 25,
                    iconCreateFunction: (cluster: any) => {
                        const n = cluster.getChildCount();
                        const size = n < 10 ? 32 : n < 100 ? 38 : 46;
                        const html = `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#059669;color:#fff;border:3px solid #fff;border-radius:9999px;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${n.toLocaleString()}</div>`;
                        return L.divIcon({ html, className: 'mls-cluster', iconSize: [size, size] as any });
                    },
                });
                mapInstanceRef.current.addLayer(clusterGroupRef.current);
            }

            const seen = new Set<string>();
            const coordsList: LatLng[] = [];

            filtered.forEach((ml) => {
                if (ml.lat == null || ml.lng == null) return;
                seen.add(ml.mls_id);
                coordsList.push([ml.lat, ml.lng]);

                const existing = markersRef.current.get(ml.mls_id);
                if (existing) {
                    // Position can shift between fetches even when mls_id stays
                    // the same (price-changed bubble text differs too).
                    existing.setLatLng([ml.lat, ml.lng]);
                    existing.setIcon(buildPriceIcon(L, ml, false));
                } else {
                    const marker = L.marker([ml.lat, ml.lng], {
                        icon: buildPriceIcon(L, ml, false),
                    });
                    // Read the latest onSelectListing via ref so we don't
                    // bind a stale closure on the marker.
                    marker.on('click', () => onSelectListingRef.current(ml));
                    clusterGroupRef.current.addLayer(marker);
                    markersRef.current.set(ml.mls_id, marker);
                }
            });

            // Remove markers no longer in the filtered list.
            markersRef.current.forEach((marker, id) => {
                if (!seen.has(id)) {
                    clusterGroupRef.current.removeLayer(marker);
                    markersRef.current.delete(id);
                }
            });

            // One-shot camera fit: only on the very first populated render so
            // every subsequent refetch (especially viewport-driven ones) keeps
            // the user's current view. The programmatic flag suppresses the
            // moveend handler from firing an auto-refetch loop.
            // Skip when polygon is set — the polygon effect owns fit-to-bounds
            // for that case and will zoom to the drawn area instead.
            if (!hasInitialFitRef.current && coordsList.length > 0 && !polygon) {
                hasInitialFitRef.current = true;
                programmaticMoveRef.current = true;
                const bounds = L.latLngBounds(coordsList as any);
                mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
            }
        })();

        return () => { aborted = true; };
        // We intentionally exclude hoveredId from this effect — the dedicated
        // hover effect below only touches the two markers that change.
    }, [filtered, polygon]);

    // Hover highlight — only touch the previously-hovered and currently-hovered
    // markers. O(1) per hover change vs. O(n) for the data-sync effect above.
    const prevHoveredIdRef = useRef<string | null>(null);
    useEffect(() => {
        let aborted = false;
        (async () => {
            const L = (await import('leaflet')).default;
            if (aborted) return;
            const lookupAndUpdate = (id: string | null, isHover: boolean) => {
                if (!id) return;
                const marker = markersRef.current.get(id);
                const listing = filtered.find((ml) => ml.mls_id === id);
                if (!marker || !listing) return;
                marker.setIcon(buildPriceIcon(L, listing, isHover));
                marker.setZIndexOffset(isHover ? 1000 : 0);
            };
            // Reset the previously-hovered marker.
            if (prevHoveredIdRef.current && prevHoveredIdRef.current !== hoveredId) {
                lookupAndUpdate(prevHoveredIdRef.current, false);
            }
            // Highlight the new one.
            lookupAndUpdate(hoveredId, true);
            prevHoveredIdRef.current = hoveredId;
        })();
        return () => { aborted = true; };
    }, [hoveredId, filtered]);

    // Render the polygon (committed) + in-progress polyline + vertex dots.
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        let aborted = false;
        (async () => {
            const L = (await import('leaflet')).default;
            if (aborted) return;

            const layers = drawingLayersRef.current;
            // Clear previous drawing layers.
            if (layers.inProgressLine) { layers.inProgressLine.remove(); layers.inProgressLine = null; }
            layers.inProgressMarkers.forEach((m) => m.remove());
            layers.inProgressMarkers = [];
            if (layers.polygon) { layers.polygon.remove(); layers.polygon = null; }

            // Committed polygon — translucent teal fill.
            if (polygon && polygon.length >= 3) {
                layers.polygon = L.polygon(polygon as any, {
                    color: '#1693C9',
                    weight: 2,
                    fillColor: '#1693C9',
                    fillOpacity: 0.12,
                }).addTo(map);
                // Re-fit when this is a polygon we haven't fit to yet —
                // covers both the open-from-hotsheet flow and freshly drawn
                // polygons while the map was already mounted.
                if (lastFittedPolygonRef.current !== polygon) {
                    lastFittedPolygonRef.current = polygon;
                    hasInitialFitRef.current = true;
                    programmaticMoveRef.current = true;
                    map.fitBounds(L.latLngBounds(polygon as any), { padding: [40, 40], maxZoom: 15 });
                }
            } else {
                lastFittedPolygonRef.current = null;
            }

            // In-progress points — show a dashed polyline + small vertex markers.
            if (drawMode && drawPoints.length > 0) {
                layers.inProgressLine = L.polyline(drawPoints as any, {
                    color: '#1693C9',
                    weight: 2,
                    dashArray: '6 4',
                }).addTo(map);
                drawPoints.forEach((pt) => {
                    const dot = L.circleMarker(pt as any, {
                        radius: 4,
                        color: '#1693C9',
                        fillColor: '#ffffff',
                        fillOpacity: 1,
                        weight: 2,
                    }).addTo(map);
                    layers.inProgressMarkers.push(dot);
                });
            }
        })();
        return () => { aborted = true; };
        // `mapReady` is in the deps so this effect re-runs after the async
        // map init finishes — otherwise the first run would bail with no map
        // and a polygon arriving via prop (e.g. opening a saved hotsheet)
        // would never render.
    }, [polygon, drawMode, drawPoints, mapReady]);

    // Wire map click/dblclick while in draw mode.
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !drawMode) return;

        const container = map.getContainer() as HTMLElement;
        container.style.cursor = 'crosshair';

        const onClick = (e: any) => setDrawPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
        const onDblClick = () => {
            setDrawPoints((prev) => {
                if (prev.length >= 3) {
                    commitPolygon(prev);
                    setDrawMode(false);
                    return [];
                }
                return prev;
            });
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setDrawMode(false);
                setDrawPoints([]);
            }
            if (e.key === 'Enter' && drawPoints.length >= 3) {
                commitPolygon(drawPoints);
                setDrawMode(false);
                setDrawPoints([]);
            }
        };

        map.on('click', onClick);
        map.on('dblclick', onDblClick);
        document.addEventListener('keydown', onKey);

        return () => {
            container.style.cursor = '';
            map.off('click', onClick);
            map.off('dblclick', onDblClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [drawMode, drawPoints]);

    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markersRef.current.clear();
            }
        };
    }, []);

    function startDraw() {
        commitPolygon(null);
        setDrawPoints([]);
        setDrawMode(true);
    }
    function finishDraw() {
        if (drawPoints.length >= 3) {
            commitPolygon(drawPoints);
            setDrawMode(false);
            setDrawPoints([]);
        }
    }
    function cancelDraw() {
        setDrawMode(false);
        setDrawPoints([]);
    }
    function clearPolygon() {
        commitPolygon(null);
        setDrawPoints([]);
        setDrawMode(false);
    }

    const mappedCount = filtered.filter((l) => l.lat != null && l.lng != null).length;
    const totalCount = listings.length;
    const polygonActive = !!polygon;

    return (
        // `isolate` creates a stacking context so Leaflet's internal z-indices
        // (panes 200–700, controls 800–1000) can't escape and overlap the page
        // header / search autocomplete / MLS selector dropdown above the map.
        <div
            className="flex flex-col lg:flex-row gap-0 bg-white border border-[#E4E7EB] rounded-[4px] overflow-hidden isolate"
            style={{ height: 'calc(100vh - 240px)', minHeight: 500 }}
        >
            <div className="lg:w-1/2 relative" style={{ minHeight: 320 }}>
                <div ref={mapRef} className="w-full h-full" />

                {/* Draw toolbar */}
                <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5">
                    {!drawMode && !polygonActive && (
                        <button
                            type="button"
                            onClick={startDraw}
                            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium bg-white text-[#111315] border border-[#C8CCD1] rounded-[4px] shadow-sm hover:bg-[#F9FAFB] transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                            </svg>
                            Draw area
                        </button>
                    )}
                    {drawMode && (
                        <>
                            <span className="inline-flex items-center h-9 px-3 text-xs font-medium bg-[#1693C9] text-white rounded-[4px] shadow-sm">
                                Click to add points · Enter / double-click to finish
                            </span>
                            <button
                                type="button"
                                onClick={finishDraw}
                                disabled={drawPoints.length < 3}
                                className="inline-flex items-center h-9 px-3 text-xs font-medium bg-white text-[#111315] border border-[#C8CCD1] rounded-[4px] shadow-sm hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Finish ({drawPoints.length})
                            </button>
                            <button
                                type="button"
                                onClick={cancelDraw}
                                className="inline-flex items-center h-9 px-3 text-xs font-medium bg-white text-[#5F656D] border border-[#C8CCD1] rounded-[4px] shadow-sm hover:bg-[#F9FAFB] transition-colors"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                    {polygonActive && !drawMode && (
                        <>
                            <span className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium bg-[#EBF5FF] text-[#0E6E9C] border border-[#1693C9]/30 rounded-[4px] shadow-sm">
                                {searching ? (
                                    <>
                                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                                            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        Searching area…
                                    </>
                                ) : (
                                    <>{(totalInArea ?? mappedCount).toLocaleString()} in area</>
                                )}
                            </span>
                            {onPolygonChange && (
                                <button
                                    type="button"
                                    onClick={() => polygon && onPolygonChange(polygon)}
                                    disabled={searching}
                                    title="Reload listings in the drawn area"
                                    className="inline-flex items-center h-9 px-3 text-xs font-medium bg-white text-[#111315] border border-[#C8CCD1] rounded-[4px] shadow-sm hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={startDraw}
                                className="inline-flex items-center h-9 px-3 text-xs font-medium bg-white text-[#111315] border border-[#C8CCD1] rounded-[4px] shadow-sm hover:bg-[#F9FAFB] transition-colors"
                            >
                                Redraw
                            </button>
                            <button
                                type="button"
                                onClick={clearPolygon}
                                className="inline-flex items-center h-9 px-3 text-xs font-medium bg-white text-[#DC2626] border border-[#C8CCD1] rounded-[4px] shadow-sm hover:bg-[#FEF2F2] transition-colors"
                            >
                                Clear
                            </button>
                        </>
                    )}
                </div>

                {mappedCount === 0 && filtered.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none">
                        <p className="text-sm text-[#5F656D]">No coordinates available for these listings.</p>
                    </div>
                )}
                {polygonActive && mappedCount === 0 && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-white text-[#5F656D] border border-[#C8CCD1] rounded-[4px] shadow-sm">
                            No listings in the drawn area
                        </span>
                    </div>
                )}

                {/* Auto-search status — appears while a viewport-driven refetch
                    is in flight. Pan/zoom triggers a debounced refetch (~600ms);
                    no manual button needed. Hidden when polygon is active. */}
                {onSearchArea && searching && !polygonActive && (
                    <div className="absolute inset-x-0 bottom-3 z-[450] flex justify-center pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white text-[#111315] border border-[#C8CCD1] rounded-full shadow-lg">
                            <svg className="h-3.5 w-3.5 animate-spin text-[#1693C9]" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Updating area…
                        </span>
                    </div>
                )}
            </div>
            <div className="lg:w-1/2 flex flex-col border-t lg:border-t-0 lg:border-l border-[#E4E7EB]">
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {polygonActive && (
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1 text-xs text-[#5F656D]">
                        <span>
                            <span className="font-medium text-[#111315]">{(totalInArea ?? filtered.length).toLocaleString()}</span> in drawn area
                            {totalInArea != null && totalInArea > filtered.length && (
                                <> · {filtered.length.toLocaleString()} loaded</>
                            )}
                        </span>
                        <button type="button" onClick={clearPolygon} className="text-[#1693C9] hover:underline font-medium">Clear area</button>
                    </div>
                )}
                {viewport && filtered.length > 0 && (
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1 text-[11px] text-[#5F656D]">
                        <span>
                            <span className="font-medium text-[#111315]">{visibleInViewport.length.toLocaleString()}</span> in current view{filtered.length !== visibleInViewport.length ? <> · {filtered.length.toLocaleString()} loaded</> : null}
                        </span>
                    </div>
                )}
                {visibleInViewport.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <p className="text-sm text-[#5F656D]">
                            {filtered.length === 0
                                ? (polygonActive ? 'No listings in the drawn area' : 'No listings to display')
                                : 'No listings in the current map view — pan or zoom out.'}
                        </p>
                    </div>
                ) : (
                    visibleInViewport.map((ml) => (
                        <MlsMapCard
                            key={ml.mls_id}
                            listing={ml}
                            isHover={hoveredId === ml.mls_id}
                            onHover={setHoveredId}
                            onOpenLightbox={onOpenLightbox}
                            onSelect={() => onSelectListing(ml)}
                            mlsName={mlsSlugToName[ml.mls_slug] || ml.mls_slug}
                        />
                    ))
                )}
              </div>
              {pagination && (
                  <div className="shrink-0 border-t border-[#E4E7EB] bg-white px-3 py-2">
                      {pagination}
                  </div>
              )}
            </div>
        </div>
    );
}

/**
 * Build a Leaflet divIcon for a price-bubble marker. Pulled out so both the
 * data-sync effect (default state) and the hover-highlight effect (active
 * state) share the same HTML shape.
 */
function buildPriceIcon(L: any, ml: MlsListing, isHover: boolean) {
    const priceLabel = ml.price_formatted || (ml.price ? formatPrice(ml.price) : 'View');
    const bg = isHover ? '#1693C9' : '#FFFFFF';
    const fg = isHover ? '#FFFFFF' : '#111315';
    const border = isHover ? '#1693C9' : '#D1D5DB';
    const html = `<div style="display:inline-block;background:${bg};color:${fg};border:1px solid ${border};padding:3px 8px;border-radius:9999px;font-size:11px;font-weight:600;line-height:16px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.18);transform:translate(-50%, -100%);">${priceLabel}</div>`;
    return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [0, 0] });
}

interface CardProps {
    listing: MlsListing;
    isHover: boolean;
    onHover: (id: string | null) => void;
    onOpenLightbox: (photos: string[], index: number) => void;
    onSelect: () => void;
    mlsName: string;
}

function MlsMapCard({ listing: ml, isHover, onHover, onOpenLightbox, onSelect, mlsName }: CardProps) {
    return (
        <div
            onMouseEnter={() => onHover(ml.mls_id)}
            onMouseLeave={() => onHover(null)}
            onClick={onSelect}
            className={`flex gap-3 p-2 border rounded-[4px] transition-all cursor-pointer ${
                isHover ? 'border-[#1693C9] bg-[#EBF5FF]' : 'border-[#E4E7EB] hover:border-[#C8CCD1]'
            }`}
        >
            <div className="w-24 h-20 shrink-0 bg-[#F3F4F6] rounded overflow-hidden">
                {ml.photos?.[0] ? (
                    <img
                        src={ml.photos[0]}
                        alt=""
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onOpenLightbox(ml.photos, 0); }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="h-5 w-5 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159M3.75 21h16.5" />
                        </svg>
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#111315]">{ml.price_formatted || formatPrice(ml.price)}</p>
                    <StatusBadge value={ml.status || '—'} size="xs" />
                </div>
                <p className="text-xs text-[#5F656D] line-clamp-1 mt-0.5">{ml.address?.full || ml.mls_number}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#5F656D]">
                    {ml.bedrooms != null && <span>{ml.bedrooms} bd</span>}
                    {ml.bathrooms != null && <span>{ml.bathrooms} ba</span>}
                    {ml.sqft && <span>{ml.sqft.toLocaleString()} sqft</span>}
                    <StatusBadge value={ml.property_subtype || ml.property_type || '—'} variant="type" size="xs" className="rounded" />
                </div>
                {(ml.address?.city || ml.address?.state_province) && (
                    <p className="text-[11px] text-[#5F656D] mt-0.5 line-clamp-1">
                        {[ml.address?.city, ml.address?.state_province].filter(Boolean).join(', ')}
                    </p>
                )}
                <p className="mt-0.5 text-[10px] font-medium text-[#8B9096] uppercase tracking-wider line-clamp-1">
                    {mlsName}
                    {ml.mls_number && <span className="text-[#C8CCD1] normal-case tracking-normal"> · #{ml.mls_number}</span>}
                </p>
            </div>
        </div>
    );
}
