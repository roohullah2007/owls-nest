// The right-hand results map. Listings are clustered into dark count circles
// that break apart into individual green price markers as you zoom in (custom
// pixel-grid clustering — no marker-cluster dependency). Map / Satellite toggle.
import { useEffect, useState } from 'react';
import L from 'leaflet';
import {
    MapContainer,
    Marker,
    TileLayer,
    ZoomControl,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import { cn } from '@/lib/utils';
import type { SearchListing } from '@/types/search-listing';

interface ResultsMapProps {
    listings: SearchListing[];
    onSelect: (listing: SearchListing) => void;
    /** True while the map column is visible — triggers a Leaflet size refresh. */
    active: boolean;
    /** Price-pin colour for the current status (sold=red, expired=gray, …). */
    markerColor?: string;
    /** Logged-out: render sold pins as red locks (gate behind login). */
    locked?: boolean;
}

const isSoldListing = (l: SearchListing) => /sold|closed/i.test(l.status);

function lockIcon() {
    return L.divIcon({
        className: 'ps-marker',
        html: `<div style="transform:translate(-50%,-100%);background:#dc2626;border-radius:8px;padding:6px 9px;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:1.5px solid rgba(255,255,255,0.85);display:inline-flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    });
}

/** Grid size (in screen px) used to group nearby markers into one cluster. */
const CELL = 68;

type Cluster = {
    key: string;
    lat: number;
    lng: number;
    items: SearchListing[];
};

const DOWN_ARROW =
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>';
const UP_ARROW =
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';

function priceIcon(listing: SearchListing, color: string) {
    const arrow =
        listing.priceChange === 'reduced'
            ? DOWN_ARROW
            : listing.priceChange === 'increased'
              ? UP_ARROW
              : '';
    const badge = arrow
        ? `<span style="position:absolute;top:-7px;right:-7px;width:17px;height:17px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">${arrow}</span>`
        : '';

    return L.divIcon({
        className: 'ps-marker',
        html: `<div style="position:relative;display:inline-block;transform:translate(-50%,-100%);">
            <div style="background:${color};color:#fff;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);line-height:1;border:1.5px solid rgba(255,255,255,0.85);">${listing.shortPrice || listing.price}</div>
            ${badge}
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    });
}

function clusterIcon(count: number) {
    const size = count >= 10 ? 42 : 36;

    return L.divIcon({
        className: 'ps-marker',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#1e293b;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;font-family:system-ui,-apple-system,sans-serif;">${count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

function buildClusters(map: L.Map, listings: SearchListing[]): Cluster[] {
    const zoom = map.getZoom();
    const cells = new Map<string, SearchListing[]>();

    for (const l of listings) {
        if (!l.lat || !l.lng) {
            continue;
        }

        let pt: L.Point;

        try {
            pt = map.project([l.lat, l.lng], zoom);
        } catch {
            continue;
        }

        const key = `${Math.floor(pt.x / CELL)}:${Math.floor(pt.y / CELL)}`;
        const bucket = cells.get(key);

        if (bucket) {
            bucket.push(l);
        } else {
            cells.set(key, [l]);
        }
    }

    return Array.from(cells.entries()).map(([key, items]) => ({
        key,
        lat: items.reduce((s, i) => s + i.lat, 0) / items.length,
        lng: items.reduce((s, i) => s + i.lng, 0) / items.length,
        items,
    }));
}

/** Recomputes clusters on every pan/zoom and renders the markers. */
function ClusteredMarkers({
    listings,
    onSelect,
    markerColor,
    locked,
}: {
    listings: SearchListing[];
    onSelect: (l: SearchListing) => void;
    markerColor: string;
    locked: boolean;
}) {
    const map = useMap();
    const [, setTick] = useState(0);

    useMapEvents({
        moveend: () => setTick((t) => t + 1),
        zoomend: () => setTick((t) => t + 1),
    });

    let clusters: Cluster[] = [];

    try {
        clusters = buildClusters(map, listings);
    } catch {
        clusters = [];
    }

    return (
        <>
            {clusters.map((c) => {
                if (c.items.length === 1) {
                    const l = c.items[0];
                    const isLocked = locked && isSoldListing(l);

                    return (
                        <Marker
                            key={l.id}
                            position={[l.lat, l.lng]}
                            icon={
                                isLocked
                                    ? lockIcon()
                                    : priceIcon(l, markerColor)
                            }
                            eventHandlers={{
                                click: () => {
                                    if (isLocked) {
                                        window.location.href = '/login';
                                    } else {
                                        onSelect(l);
                                    }
                                },
                            }}
                        />
                    );
                }

                return (
                    <Marker
                        key={`c:${c.key}`}
                        position={[c.lat, c.lng]}
                        icon={clusterIcon(c.items.length)}
                        eventHandlers={{
                            click: () => {
                                const bounds = L.latLngBounds(
                                    c.items.map(
                                        (i) =>
                                            [i.lat, i.lng] as [number, number],
                                    ),
                                );

                                if (
                                    bounds
                                        .getNorthEast()
                                        .equals(bounds.getSouthWest())
                                ) {
                                    map.setView(
                                        [c.lat, c.lng],
                                        Math.min(map.getZoom() + 2, 18),
                                    );
                                } else {
                                    map.flyToBounds(bounds.pad(0.3), {
                                        maxZoom: 16,
                                    });
                                }
                            },
                        }}
                    />
                );
            })}
        </>
    );
}

// Keeps Leaflet's internal size in sync (after show/hide) and frames the markers.
function MapController({
    listings,
    active,
}: {
    listings: SearchListing[];
    active: boolean;
}) {
    const map = useMap();

    useEffect(() => {
        if (!active) {
            return;
        }

        const t = setTimeout(() => map.invalidateSize(), 60);

        return () => clearTimeout(t);
    }, [active, map]);

    useEffect(() => {
        if (!listings.length) {
            return;
        }

        const bounds = L.latLngBounds(
            listings
                .filter((p) => p.lat && p.lng)
                .map((p) => [p.lat, p.lng] as [number, number]),
        );

        try {
            map.fitBounds(bounds.pad(0.15));
        } catch {
            /* ignore empty/degenerate bounds */
        }
    }, [listings, map]);

    return null;
}

export function ResultsMap({
    listings,
    onSelect,
    active,
    markerColor = '#16a34a',
    locked = false,
}: ResultsMapProps) {
    const [base, setBase] = useState<'map' | 'sat'>('map');

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={[43.7, -71.5]}
                zoom={10}
                scrollWheelZoom
                zoomControl={false}
                attributionControl={false}
                className="z-0 h-full w-full bg-gray-100"
            >
                {base === 'map' ? (
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        subdomains="abcd"
                        maxZoom={19}
                    />
                ) : (
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                    />
                )}
                <ZoomControl position="bottomright" />
                <ClusteredMarkers
                    listings={listings}
                    onSelect={onSelect}
                    markerColor={markerColor}
                    locked={locked}
                />
                <MapController listings={listings} active={active} />
            </MapContainer>

            <div className="absolute bottom-4 left-4 z-[500] flex h-9 overflow-hidden rounded-lg border border-gray-300 text-xs font-semibold shadow-sm">
                <button
                    type="button"
                    onClick={() => setBase('map')}
                    className={cn(
                        'px-4',
                        base === 'map'
                            ? 'bg-[#1e293b] text-white'
                            : 'bg-white text-gray-500',
                    )}
                >
                    Map
                </button>
                <button
                    type="button"
                    onClick={() => setBase('sat')}
                    className={cn(
                        'px-4',
                        base === 'sat'
                            ? 'bg-[#1e293b] text-white'
                            : 'bg-white text-gray-500',
                    )}
                >
                    Satellite
                </button>
            </div>
        </div>
    );
}
