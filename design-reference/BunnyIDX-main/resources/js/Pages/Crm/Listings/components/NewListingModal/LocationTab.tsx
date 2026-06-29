import { useEffect, useRef, useState } from 'react';
import { NewListingFormData } from '../NewListingModal';
import { Field, INPUT_CLASS } from './fields';

export type LocationState = Pick<
    NewListingFormData,
    'address' | 'unit' | 'city' | 'state_province' | 'postal_code' | 'country' | 'lat' | 'lng'
>;

interface Props {
    data: NewListingFormData;
    setData: (key: keyof NewListingFormData, value: any) => void;
    errors: Record<string, string>;
    googleMapsApiKey: string | null;
}

const GOOGLE_SCRIPT_ID = 'google-maps-places-script';

/**
 * Lazy-loads the Google Maps JS API once per page and waits for the actual
 * library classes (`Map`, `Marker`, `places.Autocomplete`) to be bootstrapped.
 *
 * Note: `loading=async` makes Google bootstrap the API as separate libraries
 * loaded on demand via `google.maps.importLibrary('…')`. The script's `load`
 * event fires before those classes are constructable, so we explicitly
 * `importLibrary` the ones we use to guarantee they're ready before render.
 */
function loadGoogleMaps(apiKey: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    const w = window as any;

    const importNeededLibraries = async () => {
        if (typeof w.google?.maps?.importLibrary === 'function') {
            await Promise.all([
                w.google.maps.importLibrary('maps'),
                w.google.maps.importLibrary('marker'),
                w.google.maps.importLibrary('places'),
            ]);
        }
    };

    if (w.google?.maps?.Map && w.google.maps.places?.Autocomplete) return Promise.resolve();

    const waitForScript = () => new Promise<void>((resolve, reject) => {
        const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
            if (w.google?.maps?.importLibrary) { resolve(); return; }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.id = GOOGLE_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(script);
    });

    return waitForScript().then(importNeededLibraries);
}

export default function LocationTab({ data, setData, errors, googleMapsApiKey }: Props) {
    const addressInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [mapsReady, setMapsReady] = useState(false);
    const [mapsError, setMapsError] = useState<string | null>(null);

    // Load Google Maps JS API
    useEffect(() => {
        if (!googleMapsApiKey) {
            setMapsError('Google Maps API key not configured');
            return;
        }
        loadGoogleMaps(googleMapsApiKey)
            .then(() => setMapsReady(true))
            .catch((e) => setMapsError(e.message || 'Failed to load Google Maps'));
    }, [googleMapsApiKey]);

    // Wire up Places Autocomplete on the address input
    useEffect(() => {
        if (!mapsReady || !addressInputRef.current) return;
        const w = window as any;
        if (!w.google?.maps?.places?.Autocomplete) return;

        const ac = new w.google.maps.places.Autocomplete(addressInputRef.current, {
            types: ['address'],
            fields: ['address_components', 'formatted_address', 'geometry'],
        });
        autocompleteRef.current = ac;

        const listener = ac.addListener('place_changed', () => {
            const place = ac.getPlace();
            if (!place || !place.address_components) return;
            applyPlace(place, setData);
        });

        return () => { if (listener && listener.remove) listener.remove(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapsReady]);

    // Init / sync interactive map with draggable marker
    useEffect(() => {
        if (!mapsReady || !mapRef.current) return;
        if (data.lat === null || data.lat === undefined || data.lng === null || data.lng === undefined) return;
        const w = window as any;
        const coords = { lat: Number(data.lat), lng: Number(data.lng) };

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = new w.google.maps.Map(mapRef.current, {
                center: coords,
                zoom: 16,
                disableDefaultUI: true,
                zoomControl: true,
                clickableIcons: false,
            });
        } else {
            mapInstanceRef.current.setCenter(coords);
        }

        if (markerRef.current) {
            markerRef.current.setPosition(coords);
        } else {
            markerRef.current = new w.google.maps.Marker({
                position: coords,
                map: mapInstanceRef.current,
                draggable: true,
            });
            markerRef.current.addListener('dragend', () => {
                const pos = markerRef.current.getPosition();
                if (pos) {
                    setData('lat', pos.lat());
                    setData('lng', pos.lng());
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapsReady, data.lat, data.lng]);

    const hasCoords = data.lat !== null && data.lat !== undefined && data.lng !== null && data.lng !== undefined;

    return (
        <div className="space-y-4">
            {mapsError && (
                <div className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">
                    {mapsError} — address autocomplete is unavailable. You can still type the address manually.
                </div>
            )}

            {/* Address (Google Places autocomplete) + Unit inline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Address" required error={errors.address} className="sm:col-span-2">
                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B9096] pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        <input
                            ref={addressInputRef}
                            type="text"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            placeholder={mapsReady ? 'Start typing an address…' : 'Loading address search…'}
                            className={`${INPUT_CLASS} pl-9`}
                            autoComplete="off"
                            disabled={!mapsReady && !mapsError}
                        />
                    </div>
                </Field>
                <Field label="Unit / Apt" error={errors.unit}>
                    <input
                        type="text"
                        value={data.unit}
                        onChange={(e) => setData('unit', e.target.value)}
                        placeholder="Apt 4B"
                        className={INPUT_CLASS}
                    />
                </Field>
            </div>

            {/* Interactive map with draggable pin */}
            {hasCoords ? (
                <div className="rounded-lg overflow-hidden border border-[#E4E7EB]">
                    <div ref={mapRef} className="w-full h-64 bg-[#F3F4F6]" />
                    <div className="px-3 py-2 bg-[#F9FAFB] border-t border-[#E4E7EB] text-[11px] text-[#5F656D]">
                        Drag the pin to refine the exact location.
                    </div>
                </div>
            ) : (
                <div className="rounded-lg bg-[#F9FAFB] border border-dashed border-[#E4E7EB] flex flex-col items-center justify-center h-40">
                    <svg className="h-8 w-8 text-[#8B9096] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    <p className="text-xs text-[#8B9096]">Pick an address above to see the map</p>
                </div>
            )}

            {/* Read-only summary of auto-filled city/state/zip — for transparency */}
            {(data.city || data.state_province || data.postal_code) && (
                <p className="text-xs text-[#8B9096]">
                    Detected: {[data.city, data.state_province, data.postal_code, data.country].filter(Boolean).join(', ')}
                </p>
            )}
        </div>
    );
}

/** Map a Google Places result into our form fields. */
function applyPlace(
    place: any,
    setData: (key: keyof NewListingFormData, value: any) => void,
) {
    const comps = place.address_components as Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;

    const find = (...types: string[]) =>
        comps.find((c) => types.some((t) => c.types.includes(t)));

    const streetNumber = find('street_number')?.long_name ?? '';
    const route = find('route')?.long_name ?? '';
    const subpremise = find('subpremise')?.long_name ?? '';
    const city =
        find('locality')?.long_name ??
        find('postal_town')?.long_name ??
        find('sublocality_level_1')?.long_name ??
        '';
    const state = find('administrative_area_level_1')?.short_name ?? '';
    const postal = find('postal_code')?.long_name ?? '';
    const country = find('country')?.short_name ?? 'US';

    setData('address', [streetNumber, route].filter(Boolean).join(' '));
    if (subpremise) setData('unit', subpremise);
    setData('city', city);
    setData('state_province', state);
    setData('postal_code', postal);
    setData('country', country);

    if (place.geometry?.location) {
        setData('lat', place.geometry.location.lat());
        setData('lng', place.geometry.location.lng());
    }
}
