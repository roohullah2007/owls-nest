import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Filters, PsBounds, PsListing } from '../types';
import { makePinClass, pinTypeIcon, PinDelta } from '../lib/maps';
import { PHOTO_PLACEHOLDER } from '../lib/format';
import { shortPrice } from '../lib/format';
import StatusRow from './StatusRow';

interface Props {
    mapsReady: boolean;
    /** Grid-only desktop view — pane stays mounted so the map keeps its state. */
    hidden: boolean;
    listings: PsListing[];
    hover: { index: number; on: boolean } | null;
    onPolygon: (path: number[][] | null) => void;
    /** Optional mirror of the live draw state for external UI. */
    onDrawingChange?: (drawing: boolean) => void;
    /** Viewport ("search as I move the map") — null clears the bounds filter. */
    onViewport: (bounds: PsBounds | null) => void;
    accent: string;
    /** Applied filters + setter — drives the map-overlay status row. */
    filters: Filters;
    onApply: (next: Filters) => void;
    /** Whether a committed search polygon is active (App owns the geometry). */
    polygonActive: boolean;
    /** Taxonomy-driven: hide Sold when the MLS lacks the status. */
    hasSold?: boolean;
}

/**
 * POI layers the "Nearby" control toggles. Rendered as our own Places-API
 * markers (clearly visible, colored, clickable); when the key has no Places
 * access we fall back to un-hiding Google's built-in `featureType` icons.
 */
const POI_LAYERS: Array<{ key: keyof PoiState; label: string; featureType: string; placesType: string; color: string; letter: string }> = [
    { key: 'schools', label: 'Schools', featureType: 'poi.school', placesType: 'school', color: '#d97706', letter: 'S' },
    { key: 'hospitals', label: 'Hospitals', featureType: 'poi.medical', placesType: 'hospital', color: '#dc2626', letter: 'H' },
    { key: 'transit', label: 'Transit', featureType: 'transit.station', placesType: 'transit_station', color: '#2563eb', letter: 'T' },
    { key: 'parks', label: 'Parks', featureType: 'poi.park', placesType: 'park', color: '#16a34a', letter: 'P' },
];

/** Round colored marker with a white letter — unmistakable at any zoom. */
function poiIcon(g: any, color: string, letter: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><circle cx="13" cy="13" r="11" fill="${color}" stroke="white" stroke-width="2.5"/><text x="13" y="17.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white">${letter}</text></svg>`;
    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new g.maps.Size(26, 26),
        anchor: new g.maps.Point(13, 13),
    };
}

interface PoiState { schools: boolean; hospitals: boolean; transit: boolean; parks: boolean; }

const NO_POI: PoiState = { schools: false, hospitals: false, transit: false, parks: false };

/** Debounce before a user pan/zoom commits a viewport search. */
const VIEWPORT_DEBOUNCE_MS = 400;

/** Imperative draw controls — driven by the filter bar's Draw / Cancel / Clear buttons. */
export interface MapPanelHandle {
    toggleDraw(): void;
    cancelDraw(): void;
    clearShape(): void;
}

/** In-progress draw state — preview geometry + the listeners that drive it. */
interface DrawState {
    points: any[];           // google.maps.LatLng[] placed so far
    line: any;               // solid polyline through placed points
    rubber: any;             // dashed segment from last point to the cursor
    fill: any;               // translucent live area preview
    markers: any[];          // white square vertex handles
    listeners: any[];        // map/marker listeners to tear down on finish
}

/**
 * Google map pane — price pins for the current page of results, a Redfin-style
 * polygon draw (live fill + vertex handles + zoom-to-area), and the
 * Map/Satellite toggle. All Maps SDK access is imperative behind refs; React
 * only drives it with props. The Draw/Cancel/Clear buttons live in the filter
 * bar and reach in through the {@link MapPanelHandle} ref.
 */
const MapPanel = forwardRef<MapPanelHandle, Props>(function MapPanel({ mapsReady, hidden, listings, hover, onPolygon, onDrawingChange, onViewport, accent, filters, onApply, polygonActive, hasSold = true }, handleRef) {
    const mapEl = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const pinsRef = useRef<any[]>([]);
    const pinClassRef = useRef<any>(null);
    const shapeRef = useRef<any>(null);     // committed search polygon
    const drawRef = useRef<DrawState | null>(null);
    const [drawing, setDrawing] = useState(false);
    const [nearFirst, setNearFirst] = useState(false); // hovering the first vertex
    const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

    // ── Viewport search ("search as I move the map") ────────────────────
    const [searchMove, setSearchMove] = useState(false); // opt-in, off by default
    const searchMoveRef = useRef(false);             // idle listener reads this (attached once)
    const programmaticRef = useRef(false);           // set around our own fitBounds — its idle is NOT a user move
    const interactedRef = useRef(false);             // a real user gesture happened since the last emit
    const viewportActiveRef = useRef(false);         // a bounds search is live → never re-fit to results
    const viewportTimerRef = useRef<number | undefined>(undefined);
    const onViewportRef = useRef(onViewport);
    useEffect(() => { onViewportRef.current = onViewport; }, [onViewport]);

    // ── POI layers (Nearby) ──────────────────────────────────────────────
    const [poi, setPoi] = useState<PoiState>(NO_POI);
    const [nearbyOpen, setNearbyOpen] = useState(false);
    const nearbyRef = useRef<HTMLDivElement>(null);
    const poiRef = useRef<PoiState>(NO_POI);                    // idle listener reads this
    const poiMarkersRef = useRef<Record<string, any[]>>({});    // live markers per layer
    const poiSvcRef = useRef<any>(null);                        // PlacesService (lazy)
    const poiInfoRef = useRef<any>(null);                       // shared InfoWindow
    const poiTimerRef = useRef<number | undefined>(undefined);
    useEffect(() => { poiRef.current = poi; }, [poi]);

    function clearPoiMarkers(key: string): void {
        (poiMarkersRef.current[key] || []).forEach((m) => m.setMap(null));
        poiMarkersRef.current[key] = [];
    }

    /** Drop Places markers for one enabled layer in the current viewport. */
    function refreshPoiLayer(key: keyof PoiState): boolean {
        const g: any = (window as any).google;
        const map = mapRef.current;
        const layer = POI_LAYERS.find((l) => l.key === key);
        if (!g?.maps?.places || !map || !layer || !map.getBounds()) return false;

        poiSvcRef.current = poiSvcRef.current || new g.maps.places.PlacesService(map);
        poiSvcRef.current.nearbySearch({ bounds: map.getBounds(), type: layer.placesType }, (results: any[], status: string) => {
            if (status !== g.maps.places.PlacesServiceStatus.OK || !results) return;
            clearPoiMarkers(key);
            if (!poiRef.current[key]) return; // toggled off while the request was in flight
            poiMarkersRef.current[key] = results.slice(0, 20).map((pl) => {
                const m = new g.maps.Marker({
                    map,
                    position: pl.geometry?.location,
                    icon: poiIcon(g, layer.color, layer.letter),
                    title: pl.name,
                    zIndex: 5,
                });
                m.addListener('click', () => {
                    poiInfoRef.current = poiInfoRef.current || new g.maps.InfoWindow();
                    const el = document.createElement('div');
                    el.style.cssText = 'font-size:13px;max-width:220px';
                    const strong = document.createElement('strong');
                    strong.textContent = pl.name || layer.label;
                    el.appendChild(strong);
                    if (pl.vicinity) {
                        const addr = document.createElement('div');
                        addr.style.cssText = 'color:#6b7280;margin-top:2px;font-size:12px';
                        addr.textContent = pl.vicinity;
                        el.appendChild(addr);
                    }
                    poiInfoRef.current.setContent(el);
                    poiInfoRef.current.open({ map, anchor: m });
                });
                return m;
            });
        });

        return true;
    }

    // Init map once the SDK is ready.
    useEffect(() => {
        if (!mapsReady || mapRef.current || !mapEl.current) return;
        const g: any = (window as any).google;
        const map = new g.maps.Map(mapEl.current, {
            center: { lat: 39.8, lng: -98.6 },
            zoom: 4,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            clickableIcons: false,
        });
        mapRef.current = map;
        pinClassRef.current = makePinClass(g);
        (window as any).__psMap = map; // the split resizer triggers map resize off this

        // Viewport search: only USER-initiated moves count. We mark real
        // gestures on the container (drag/wheel/touch + zoom-button clicks all
        // start with one of these), and flag our own fitBounds calls so their
        // trailing `idle` is ignored. The map's initial idle emits nothing.
        const markInteract = () => { interactedRef.current = true; };
        const el = mapEl.current;
        el.addEventListener('mousedown', markInteract);
        el.addEventListener('wheel', markInteract, { passive: true });
        el.addEventListener('touchstart', markInteract, { passive: true });
        map.addListener('idle', () => {
            if (programmaticRef.current) { programmaticRef.current = false; return; }
            if (!interactedRef.current || !searchMoveRef.current) return;
            if (drawRef.current || shapeRef.current) return; // drawn polygon wins over the viewport
            window.clearTimeout(viewportTimerRef.current);
            viewportTimerRef.current = window.setTimeout(() => {
                const b = mapRef.current?.getBounds();
                if (!b) return;
                const ne = b.getNorthEast();
                const sw = b.getSouthWest();
                interactedRef.current = false;
                viewportActiveRef.current = true;
                onViewportRef.current({ ne_lat: ne.lat(), ne_lng: ne.lng(), sw_lat: sw.lat(), sw_lng: sw.lng() });
            }, VIEWPORT_DEBOUNCE_MS);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapsReady]);

    // Re-pin on new results. While a search polygon OR a viewport (bounds)
    // search is active we keep the user's current framing instead of snapping
    // to the (filtered) pins.
    useEffect(() => {
        const map = mapRef.current;
        const Pin = pinClassRef.current;
        if (!map || !Pin) return;
        const g: any = (window as any).google;
        pinsRef.current.forEach((p) => p.setMap(null));
        pinsRef.current = [];
        const bounds = new g.maps.LatLngBounds();
        listings.forEach((l, i) => {
            if (l.lat == null || l.lng == null) return;
            const delta: PinDelta = l.badges.includes('price_increased') ? 'up'
                : l.badges.includes('price_reduced') ? 'down' : null;
            const sold = /sold|closed/i.test(l.status_label);
            const facts = [l.beds != null ? `${l.beds} bd` : null, l.baths ? `${l.baths} ba` : null, l.sqft ? `${l.sqft} ft²` : null].filter(Boolean).join(' · ');
            const pin = new Pin(new g.maps.LatLng(l.lat, l.lng), shortPrice(l.price), l.href, pinTypeIcon(l.property_type), delta, {
                sold,
                card: { photo: l.photos[0] || PHOTO_PLACEHOLDER, price: l.price_formatted, facts, address: l.address },
            });
            pin.setMap(map);
            pinsRef.current[i] = pin;
            bounds.extend({ lat: l.lat, lng: l.lng });
        });
        if (!bounds.isEmpty() && !shapeRef.current && !viewportActiveRef.current) {
            programmaticRef.current = true;
            map.fitBounds(bounds, 64);
        }
    }, [listings, mapsReady]);

    // Nearby (POI) layers — our own Places markers per enabled category, so
    // they're clearly visible at any zoom. Markers refresh when the user pans
    // (debounced idle listener below). If the Maps key has no Places access,
    // fall back to un-hiding Google's built-in icons via map styles.
    useEffect(() => {
        const map = mapRef.current;
        const g: any = (window as any).google;
        if (!map) return;

        const active = POI_LAYERS.filter(({ key }) => poi[key]);
        POI_LAYERS.forEach(({ key }) => { if (!poi[key]) clearPoiMarkers(key); });

        if (g?.maps?.places) {
            active.forEach(({ key }) => refreshPoiLayer(key));
            return;
        }

        // Fallback: styled-map visibility (small built-in icons, but better than nothing).
        if (!active.length) { map.setOptions({ styles: [] }); return; }
        map.setOptions({
            styles: [
                { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
                ...active.map(({ featureType }) => ({ featureType, stylers: [{ visibility: 'on' }] })),
            ],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poi, mapsReady]);

    // Refresh enabled POI layers after the user settles on a new viewport.
    useEffect(() => {
        const map = mapRef.current;
        const g: any = (window as any).google;
        if (!mapsReady || !map || !g?.maps?.places) return;
        const listener = map.addListener('idle', () => {
            window.clearTimeout(poiTimerRef.current);
            poiTimerRef.current = window.setTimeout(() => {
                POI_LAYERS.forEach(({ key }) => { if (poiRef.current[key]) refreshPoiLayer(key); });
            }, 600);
        });
        return () => listener.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapsReady]);

    // Outside-click close for the Nearby dropdown.
    useEffect(() => {
        if (!nearbyOpen) return;
        const onDoc = (e: MouseEvent) => {
            if (!nearbyRef.current?.contains(e.target as Node)) setNearbyOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [nearbyOpen]);

    /** Toggle "search as I move" — turning it OFF also clears a live bounds search. */
    function toggleSearchMove(): void {
        const next = !searchMoveRef.current;
        searchMoveRef.current = next;
        setSearchMove(next);
        if (!next) {
            window.clearTimeout(viewportTimerRef.current);
            if (viewportActiveRef.current) {
                viewportActiveRef.current = false;
                onViewportRef.current(null);
            }
        }
    }

    // Card hover → pin highlight.
    useEffect(() => {
        if (!hover) return;
        pinsRef.current[hover.index]?.setActive?.(hover.on);
    }, [hover]);

    // Map type toggle.
    useEffect(() => { mapRef.current?.setMapTypeId(mapType); }, [mapType]);

    // The filter bar renders the Draw/Cancel buttons — keep it informed.
    useEffect(() => { onDrawingChange?.(drawing); }, [drawing, onDrawingChange]);

    // Filter-bar buttons drive the draw lifecycle through this handle.
    useImperativeHandle(handleRef, () => ({ toggleDraw, cancelDraw, clearShape }));

    // Esc cancels an in-progress draw.
    useEffect(() => {
        if (!drawing) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelDraw(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drawing]);

    // ── Draw helpers ─────────────────────────────────────────────────────
    // DrawingManager was removed from the Maps JS API (v3.65), so the polygon
    // is built by hand: each map click drops a vertex, a dashed rubber-band
    // tracks the cursor, and a translucent fill previews the area. Closing on
    // the first vertex / double-click commits it as the search area.

    function vertexIcon(g: any, big: boolean): any {
        const s = big ? 7 : 5;
        return {
            path: `M -${s},-${s} ${s},-${s} ${s},${s} -${s},${s} z`,
            fillColor: '#fff', fillOpacity: 1,
            strokeColor: accent, strokeWeight: 2,
            scale: 1, anchor: new g.maps.Point(0, 0),
        };
    }

    function startDraw(): void {
        const g: any = (window as any).google;
        const map = mapRef.current;
        if (!map || drawRef.current) return;

        const dash = { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 };
        const d: DrawState = {
            points: [],
            line: new g.maps.Polyline({ map, path: [], strokeColor: accent, strokeWeight: 2.5, strokeOpacity: 0.95, clickable: false, zIndex: 3 }),
            rubber: new g.maps.Polyline({ map, path: [], strokeOpacity: 0, icons: [{ icon: dash, offset: '0', repeat: '11px' }], strokeColor: accent, clickable: false, zIndex: 2 }),
            fill: new g.maps.Polygon({ map, paths: [], fillColor: accent, fillOpacity: 0.12, strokeWeight: 0, clickable: false, zIndex: 1 }),
            markers: [],
            listeners: [],
        };
        d.listeners.push(map.addListener('click', (e: any) => addVertex(e.latLng)));
        d.listeners.push(map.addListener('mousemove', (e: any) => updateRubber(e.latLng)));
        d.listeners.push(map.addListener('rightclick', () => undoVertex()));
        d.listeners.push(map.addListener('dblclick', () => finishDraw()));
        drawRef.current = d;
        map.setOptions({ draggableCursor: 'crosshair', disableDoubleClickZoom: true });
        setDrawing(true);
    }

    function addVertex(latLng: any): void {
        const g: any = (window as any).google;
        const map = mapRef.current;
        const d = drawRef.current;
        if (!map || !d) return;
        d.points.push(latLng);
        const idx = d.points.length - 1;
        const marker = new g.maps.Marker({ map, position: latLng, icon: vertexIcon(g, idx === 0), zIndex: 4, cursor: idx === 0 ? 'pointer' : 'default' });
        if (idx === 0) {
            // Hovering the first handle previews "click to close".
            d.listeners.push(marker.addListener('mouseover', () => { setNearFirst(true); marker.setIcon(vertexIcon(g, true)); }));
            d.listeners.push(marker.addListener('mouseout', () => setNearFirst(false)));
            d.listeners.push(marker.addListener('click', () => { if (d.points.length >= 3) finishDraw(); }));
        }
        d.markers.push(marker);
        d.line.setPath(d.points);
        d.fill.setPaths(d.points);
    }

    function updateRubber(latLng: any): void {
        const d = drawRef.current;
        if (!d || !d.points.length) return;
        const last = d.points[d.points.length - 1];
        d.rubber.setPath([last, latLng]);
        if (d.points.length >= 2) d.fill.setPaths([...d.points, latLng]);
    }

    function undoVertex(): void {
        const d = drawRef.current;
        if (!d || !d.points.length) return;
        d.points.pop();
        d.markers.pop()?.setMap(null);
        d.line.setPath(d.points);
        d.fill.setPaths(d.points);
        if (!d.points.length) d.rubber.setPath([]);
    }

    function teardownDraw(): void {
        const g: any = (window as any).google;
        const map = mapRef.current;
        const d = drawRef.current;
        if (!d) return;
        d.listeners.forEach((l) => g.maps.event.removeListener(l));
        d.line.setMap(null);
        d.rubber.setMap(null);
        d.fill.setMap(null);
        d.markers.forEach((m) => m.setMap(null));
        drawRef.current = null;
        map?.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
        setDrawing(false);
        setNearFirst(false);
    }

    function cancelDraw(): void {
        teardownDraw();
    }

    function finishDraw(): void {
        const g: any = (window as any).google;
        const map = mapRef.current;
        const d = drawRef.current;
        if (!map || !d) return;
        const points = d.points.slice();
        teardownDraw();
        if (points.length < 3) return; // not a closed area — discard

        shapeRef.current?.setMap(null);
        shapeRef.current = new g.maps.Polygon({
            map, paths: points, clickable: false, zIndex: 1,
            fillColor: accent, fillOpacity: 0.1, strokeColor: accent, strokeWeight: 2.5, strokeOpacity: 1,
        });
        // Zoom/fit to the drawn area so the search frames exactly what was outlined.
        // Flagged programmatic so the trailing idle doesn't read as a user pan.
        const bounds = new g.maps.LatLngBounds();
        points.forEach((p: any) => bounds.extend(p));
        programmaticRef.current = true;
        map.fitBounds(bounds, 48);
        // [lng,lat] — the GeoJSON order the gateway expects.
        onPolygon(points.map((pt: any) => [pt.lng(), pt.lat()]));
    }

    function clearShape(): void {
        shapeRef.current?.setMap(null);
        shapeRef.current = null;
        onPolygon(null);
    }

    function toggleDraw(): void {
        if (drawing) finishDraw();
        else startDraw(); // redraw replaces the committed area on finish
    }

    return (
        <div className={`ps-map-wrap relative min-w-0 w-full lg:shrink-0 ${hidden ? 'ps-hidden' : ''}`} id="ps-map-wrap" style={{ '--map-w': '57%' } as React.CSSProperties}>
            <div ref={mapEl} className="ps-map h-full w-full" />

            {/* Status / quick-filter / draw controls — overlaid on the map. */}
            <StatusRow
                filters={filters}
                onApply={onApply}
                hasSold={hasSold}
                drawing={drawing}
                polygonActive={polygonActive}
                onToggleDraw={toggleDraw}
                onCancelDraw={cancelDraw}
                onClearShape={clearShape}
            />

            {/* Drawing instruction banner (Redfin-style). */}
            {drawing && (
                <div className="ps-draw-hint absolute left-1/2 top-3 z-[6] -translate-x-1/2">
                    {nearFirst
                        ? 'Click the first point to close this shape'
                        : drawRef.current && drawRef.current.points.length >= 3
                            ? 'Double-click or click the first point to finish'
                            : 'Click on the map to outline a search area'}
                </div>
            )}

            {/* Viewport-search toggle pill (opt-in, off by default). */}
            <label className="ps-move-pill z-[5]">
                <input type="checkbox" checked={searchMove} onChange={toggleSearchMove} />
                Load listings on map move
            </label>

            <div className="absolute bottom-4 left-4 z-[5] flex items-end gap-2">
                <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm" id="ps-maptype" style={{ height: 36 }}>
                    <button type="button" aria-pressed={mapType === 'roadmap'} className="px-4 text-xs font-semibold" onClick={() => setMapType('roadmap')}>Map</button>
                    <button type="button" aria-pressed={mapType === 'hybrid'} className="px-4 text-xs font-semibold" onClick={() => setMapType('hybrid')}>Satellite</button>
                </div>

                {/* Nearby — POI layer toggles (Schools / Hospitals / Transit / Parks). */}
                <div ref={nearbyRef} className="relative">
                    <button
                        type="button"
                        className="ps-nearby-btn"
                        aria-pressed={POI_LAYERS.some(({ key }) => poi[key])}
                        aria-expanded={nearbyOpen}
                        onClick={() => setNearbyOpen((o) => !o)}
                        title="Show nearby places on the map"
                    >
                        Nearby
                    </button>
                    {nearbyOpen && (
                        <div className="ps-nearby-menu">
                            {POI_LAYERS.map(({ key, label }) => (
                                <label key={key}>
                                    <input
                                        type="checkbox"
                                        checked={poi[key]}
                                        onChange={() => setPoi((p) => ({ ...p, [key]: !p[key] }))}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default MapPanel;
