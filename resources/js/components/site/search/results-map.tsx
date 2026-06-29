// The right-hand results map. Renders one price-badge marker per filtered
// listing with a popup + a "View details" link, plus a Map / Satellite base
// layer toggle. Ported from the static page's Leaflet setup to react-leaflet.
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    ZoomControl,
    useMap,
} from 'react-leaflet';
import { cn } from '@/lib/utils';
import type { SearchListing } from '@/types/search-listing';

interface ResultsMapProps {
    listings: SearchListing[];
    onSelect: (listing: SearchListing) => void;
    /** True while the map column is visible — triggers a Leaflet size refresh. */
    active: boolean;
}

function priceIcon(label: string) {
    return L.divIcon({
        className: 'ps-price-pin',
        html: `<span>${label}</span>`,
        iconSize: undefined,
    });
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
            listings.map((p) => [p.lat, p.lng] as [number, number]),
        );

        try {
            map.fitBounds(bounds.pad(0.15));
        } catch {
            /* ignore empty/degenerate bounds */
        }
    }, [listings, map]);

    return null;
}

export function ResultsMap({ listings, onSelect, active }: ResultsMapProps) {
    const [base, setBase] = useState<'map' | 'sat'>('map');
    const icons = useMemo(
        () => listings.map((p) => priceIcon(p.shortPrice)),
        [listings],
    );

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
                {listings.map((p, i) => (
                    <Marker
                        key={p.id}
                        position={[p.lat, p.lng]}
                        icon={icons[i]}
                    >
                        <Popup>
                            <b>{p.price}</b>
                            <br />
                            {p.address}
                            <br />
                            <button
                                type="button"
                                onClick={() => onSelect(p)}
                                className="mt-1.5 font-semibold text-navy underline"
                            >
                                View details &rarr;
                            </button>
                        </Popup>
                    </Marker>
                ))}
                <MapController listings={listings} active={active} />
            </MapContainer>

            <div className="absolute bottom-4 left-6 z-[500] flex overflow-hidden rounded-md border border-gray-300 text-[13px] shadow-md lg:left-10">
                <button
                    type="button"
                    onClick={() => setBase('map')}
                    className={cn(
                        'px-4 py-1.5',
                        base === 'map'
                            ? 'bg-navy font-medium text-white'
                            : 'bg-white text-gray-700',
                    )}
                >
                    Map
                </button>
                <button
                    type="button"
                    onClick={() => setBase('sat')}
                    className={cn(
                        'px-4 py-1.5',
                        base === 'sat'
                            ? 'bg-navy font-medium text-white'
                            : 'bg-white text-gray-700',
                    )}
                >
                    Satellite
                </button>
            </div>
        </div>
    );
}
