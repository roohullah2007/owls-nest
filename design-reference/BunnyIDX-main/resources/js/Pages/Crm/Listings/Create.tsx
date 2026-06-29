import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
    contacts: { id: number; first_name: string; last_name: string }[];
    deals: { id: number; title: string }[];
    tags: { id: number; name: string; color: string }[];
    listingTypes: string[];
    listingStatuses: string[];
    customFields: { key: string; label: string; type: 'text' | 'number' | 'date' | 'select' }[];
}

function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const AMENITIES = [
    'Pool', 'Garage', 'Fireplace', 'Central A/C', 'Washer/Dryer', 'Hardwood Floors',
    'Waterfront', 'Gated Community', 'HOA', 'Furnished', 'New Construction', 'Fenced Yard',
    'Basement', 'Solar Panels', 'Smart Home', 'Pet Friendly', 'EV Charging', 'Wheelchair Accessible',
];

const PROPERTY_SUBTYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Commercial', 'Other'];

const TAG_PRESET_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#1693C9', '#8B5CF6', '#EC4899'];

const inputClass = 'h-9 px-3 text-[13px] border border-[#ECEEF1] bg-white text-[#111315] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-0 w-full';
const selectClass = 'h-9 px-3 pr-9 text-[13px] border border-[#ECEEF1] bg-white text-[#111315] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-0 w-full appearance-none';
const labelClass = 'block text-[13px] font-medium text-[#5F656D] mb-1.5';
const sectionLabel = 'text-[11px] font-semibold text-[#5F656D] tracking-wider mb-4';

function SelectWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`relative ${className || ''}`}>
            {children}
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
        </div>
    );
}

function PropertyMap({ address, city, state }: { address: string; city: string; state: string }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [coords, setCoords] = useState<[number, number] | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        if (!document.querySelector('link[href*="leaflet"]')) {
            document.head.appendChild(link);
        }
    }, []);

    useEffect(() => {
        const query = [address, city, state].filter(Boolean).join(', ');
        if (!query || query.length < 5) {
            setCoords(null);
            return;
        }

        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                const data = await res.json();
                if (data.length > 0) {
                    setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                } else {
                    setCoords(null);
                }
            } catch {
                setCoords(null);
            }
        }, 800);

        return () => clearTimeout(timerRef.current);
    }, [address, city, state]);

    useEffect(() => {
        if (!coords || !mapRef.current) return;

        const initMap = async () => {
            const L = (await import('leaflet')).default;

            if (!mapInstanceRef.current) {
                mapInstanceRef.current = L.map(mapRef.current!, { zoomControl: false }).setView(coords, 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap',
                }).addTo(mapInstanceRef.current);
                L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
            } else {
                mapInstanceRef.current.setView(coords, 15);
            }

            if (markerRef.current) {
                markerRef.current.setLatLng(coords);
            } else {
                const icon = L.divIcon({
                    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1693C9" width="32" height="32"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742z" clip-rule="evenodd"/></svg>`,
                    className: '',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                });
                markerRef.current = L.marker(coords, { icon }).addTo(mapInstanceRef.current);
            }
        };

        initMap();
    }, [coords]);

    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }
        };
    }, []);

    if (!coords) {
        return (
            <div className="rounded-lg bg-[#F3F4F6] border border-[#E4E7EB] flex flex-col items-center justify-center" style={{ height: 220 }}>
                <svg className="h-8 w-8 text-[#8B9096] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <p className="text-xs text-[#8B9096]">Enter an address to see the map</p>
            </div>
        );
    }

    return <div ref={mapRef} className="rounded-lg overflow-hidden border border-[#E4E7EB]" style={{ height: 220 }} />;
}

export default function ListingCreate({ contacts, deals, tags: initialTags, listingTypes: initialListingTypes, listingStatuses: initialListingStatuses, customFields }: Props) {
    const [localListingTypes, setLocalListingTypes] = useState(initialListingTypes);
    const [localListingStatuses, setLocalListingStatuses] = useState(initialListingStatuses);
    const [localTags, setLocalTags] = useState(initialTags);

    const [addingType, setAddingType] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [addingStatus, setAddingStatus] = useState(false);
    const [newStatusName, setNewStatusName] = useState('');
    const [addingTag, setAddingTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_PRESET_COLORS[0]);

    const { data, setData, post, processing, errors } = useForm({
        listing_type: initialListingTypes[0] || 'residential',
        status: 'active',
        title: '',
        address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'US',
        mls_number: '',
        price: '',
        bedrooms: '',
        bathrooms: '',
        sqft: '',
        lot_size: '',
        year_built: '',
        description: '',
        contact_id: '',
        deal_id: '',
        listed_at: '',
        custom_fields: {} as Record<string, string>,
        tags: [] as number[],
        photos: [] as File[],
        features: {
            property_subtype: '',
            listing_category: 'for_sale',
            parking_spaces: '',
            stories: '',
            garage_spaces: '',
            hoa_fee: '',
            amenities: [] as string[],
        } as Record<string, any>,
    });

    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(route('crm.listings.store'));
    }

    function setCustomField(key: string, value: string) {
        setData('custom_fields', { ...data.custom_fields, [key]: value });
    }

    function setFeature(key: string, value: any) {
        setData('features', { ...data.features, [key]: value });
    }

    function toggleAmenity(amenity: string) {
        const current: string[] = data.features.amenities || [];
        const updated = current.includes(amenity) ? current.filter((a: string) => a !== amenity) : [...current, amenity];
        setFeature('amenities', updated);
    }

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;
        const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        const newPreviews = newFiles.map(f => URL.createObjectURL(f));
        setData('photos', [...data.photos, ...newFiles]);
        setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }, [data.photos]);

    function removePhoto(index: number) {
        URL.revokeObjectURL(photoPreviews[index]);
        setData('photos', data.photos.filter((_, i) => i !== index));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    }

    function handleDrag(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    }

    async function handleAddType() {
        const slug = newTypeName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!slug) return;
        try {
            const res = await axios.post(route('crm.listings.listing-types.store'), { type: slug }, { headers: { Accept: 'application/json' } });
            const types = res.data.types || [...localListingTypes, slug];
            setLocalListingTypes(types);
            setData('listing_type', slug);
            setNewTypeName('');
            setAddingType(false);
        } catch { /* validation error */ }
    }

    async function handleAddStatus() {
        const slug = newStatusName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!slug) return;
        try {
            const res = await axios.post(route('crm.listings.listing-statuses.store'), { status: slug }, { headers: { Accept: 'application/json' } });
            const statuses = res.data.statuses || [...localListingStatuses, slug];
            setLocalListingStatuses(statuses);
            setData('status', slug);
            setNewStatusName('');
            setAddingStatus(false);
        } catch { /* validation error */ }
    }

    async function handleAddTag() {
        const name = newTagName.trim();
        if (!name) return;
        try {
            const res = await axios.post(route('crm.tags.store'), { name, color: newTagColor }, { headers: { Accept: 'application/json' } });
            const tag = res.data.tag;
            setLocalTags(prev => [...prev, tag]);
            setData('tags', [...data.tags, tag.id]);
            setNewTagName('');
            setNewTagColor(TAG_PRESET_COLORS[0]);
            setAddingTag(false);
        } catch { /* validation error */ }
    }

    return (
        <CrmLayout>
            <Head title="New Property" />

            <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-[#F3F4F6]">
                {/* Toolbar */}
                <div className="shrink-0 flex items-center justify-between h-11 bg-white border-b border-[#E4E7EB] px-3 sm:px-6">
                    <div className="flex items-center">
                        <Link href={route('crm.listings.index')} className="text-[#8B9096] hover:text-[#111315] transition-colors mr-3">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </Link>
                        <h1 className="text-xs font-semibold text-[#111315] tracking-wider">New Property</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={route('crm.listings.index')} className="text-[13px] text-[#5F656D] hover:text-[#111315] transition-colors">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="h-8 px-4 text-[13px] font-semibold text-white bg-[#111315] rounded-lg hover:bg-[#1A1A1A] disabled:opacity-50 transition-colors"
                        >
                            {processing ? 'Saving...' : 'Create Property'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
                    <div className="flex gap-6 max-w-6xl mx-auto w-full">

                        {/* Left Column - Main Content */}
                        <div className="flex-1 min-w-0 space-y-4">

                            {/* Card 1: Property Information */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <p className={sectionLabel}>Property Information</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Title *</label>
                                        <input
                                            type="text"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="e.g. 3BR Ranch on Oak Street"
                                            className={inputClass}
                                        />
                                        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Price</label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span className="text-[13px] text-[#8B9096]">$</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={data.price}
                                                onChange={(e) => setData('price', e.target.value)}
                                                placeholder="0.00"
                                                className={inputClass + ' pl-7'}
                                            />
                                        </div>
                                        {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass}>MLS Number</label>
                                        <input
                                            type="text"
                                            value={data.mls_number}
                                            onChange={(e) => setData('mls_number', e.target.value)}
                                            placeholder="e.g. MLS-12345678"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Location */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <p className={sectionLabel}>Location</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Address</label>
                                        <input
                                            type="text"
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                            placeholder="Street address"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className={labelClass}>City</label>
                                            <input
                                                type="text"
                                                value={data.city}
                                                onChange={(e) => setData('city', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>State</label>
                                            <input
                                                type="text"
                                                value={data.state_province}
                                                onChange={(e) => setData('state_province', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Zip</label>
                                            <input
                                                type="text"
                                                value={data.postal_code}
                                                onChange={(e) => setData('postal_code', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-1/3">
                                        <label className={labelClass}>Country</label>
                                        <input
                                            type="text"
                                            value={data.country}
                                            onChange={(e) => setData('country', e.target.value)}
                                            maxLength={2}
                                            className={inputClass}
                                        />
                                    </div>
                                    <PropertyMap address={data.address} city={data.city} state={data.state_province} />
                                </div>
                            </div>

                            {/* Card 3: Property Details */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <p className={sectionLabel}>Property Details</p>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className={labelClass}>Beds</label>
                                            <input type="number" value={data.bedrooms} onChange={(e) => setData('bedrooms', e.target.value)} min="0" placeholder="0" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Baths</label>
                                            <input type="number" step="0.5" value={data.bathrooms} onChange={(e) => setData('bathrooms', e.target.value)} min="0" placeholder="0" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Sqft</label>
                                            <input type="number" value={data.sqft} onChange={(e) => setData('sqft', e.target.value)} min="0" placeholder="0" className={inputClass} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className={labelClass}>Lot Size (acres)</label>
                                            <input type="number" step="0.01" value={data.lot_size} onChange={(e) => setData('lot_size', e.target.value)} min="0" placeholder="0.00" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Year Built</label>
                                            <input type="number" value={data.year_built} onChange={(e) => setData('year_built', e.target.value)} min="1800" max="2100" placeholder="e.g. 2005" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Stories</label>
                                            <input type="number" value={data.features.stories || ''} onChange={(e) => setFeature('stories', e.target.value)} min="0" placeholder="0" className={inputClass} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className={labelClass}>Parking Spaces</label>
                                            <input type="number" value={data.features.parking_spaces || ''} onChange={(e) => setFeature('parking_spaces', e.target.value)} min="0" placeholder="0" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Garage Spaces</label>
                                            <input type="number" value={data.features.garage_spaces || ''} onChange={(e) => setFeature('garage_spaces', e.target.value)} min="0" placeholder="0" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>HOA Fee</label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <span className="text-[13px] text-[#8B9096]">$</span>
                                                </div>
                                                <input type="number" step="0.01" value={data.features.hoa_fee || ''} onChange={(e) => setFeature('hoa_fee', e.target.value)} min="0" placeholder="0.00" className={inputClass + ' pl-7'} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Description */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <p className={sectionLabel}>Description</p>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={6}
                                    placeholder="Describe the property features, neighborhood, and selling points..."
                                    className="px-3 py-2.5 text-[13px] border border-[#ECEEF1] bg-white text-[#111315] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-0 w-full resize-none"
                                />
                                <p className="mt-1.5 text-[11px] text-[#8B9096]">Describe the property features, neighborhood, and selling points</p>
                            </div>

                            {/* Card 5: Features & Amenities */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <p className={sectionLabel}>Features & Amenities</p>
                                <div className="flex flex-wrap gap-2">
                                    {AMENITIES.map((amenity) => {
                                        const selected = (data.features.amenities || []).includes(amenity);
                                        return (
                                            <button
                                                key={amenity}
                                                type="button"
                                                onClick={() => toggleAmenity(amenity)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                                    selected
                                                        ? 'bg-[#111315] text-white border-[#111315]'
                                                        : 'bg-[#F9FAFB] text-[#5F656D] border-[#E4E7EB] hover:border-[#8B9096]'
                                                }`}
                                            >
                                                {selected && (
                                                    <svg className="inline-block h-3 w-3 mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                    </svg>
                                                )}
                                                {amenity}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Card 6: Photos */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <p className={sectionLabel}>Photos</p>
                                <div
                                    onDragEnter={handleDrag}
                                    onDragOver={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                                        dragActive ? 'border-[#1693C9] bg-[#E6F0FF]' : 'border-[#E4E7EB] hover:border-[#8B9096]'
                                    }`}
                                >
                                    <svg className="mx-auto h-8 w-8 text-[#8B9096] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v13.5A1.5 1.5 0 0 0 3.75 21Z" />
                                    </svg>
                                    <p className="text-xs text-[#5F656D]">
                                        Drag & drop photos here, or <span className="text-[#1693C9] font-medium">browse</span>
                                    </p>
                                    <p className="text-[10px] text-[#8B9096] mt-1">JPG, PNG, WebP</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleFiles(e.target.files)}
                                        className="hidden"
                                    />
                                </div>
                                {photoPreviews.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 mt-3">
                                        {photoPreviews.map((url, i) => (
                                            <div key={i} className="relative group aspect-[4/3] rounded-lg overflow-hidden">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(i)}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Sidebar */}
                        <div className="w-80 shrink-0 space-y-4">

                            {/* Classification */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <p className={sectionLabel}>Classification</p>
                                <div className="space-y-4">
                                    {/* Transaction Type */}
                                    <div>
                                        <label className={labelClass}>Transaction Type</label>
                                        <div className="flex rounded-lg border border-[#E4E7EB] overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setFeature('listing_category', 'for_sale')}
                                                className={`flex-1 h-9 text-xs font-medium transition-colors ${
                                                    data.features.listing_category === 'for_sale'
                                                        ? 'bg-[#111315] text-white'
                                                        : 'bg-white text-[#5F656D] hover:bg-[#F3F4F6]'
                                                }`}
                                            >
                                                For Sale
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFeature('listing_category', 'for_rent')}
                                                className={`flex-1 h-9 text-xs font-medium border-l border-[#E4E7EB] transition-colors ${
                                                    data.features.listing_category === 'for_rent'
                                                        ? 'bg-[#111315] text-white'
                                                        : 'bg-white text-[#5F656D] hover:bg-[#F3F4F6]'
                                                }`}
                                            >
                                                For Rent
                                            </button>
                                        </div>
                                    </div>

                                    {/* Property Subtype */}
                                    <div>
                                        <label className={labelClass}>Property Subtype</label>
                                        <SelectWrapper>
                                            <select
                                                value={data.features.property_subtype || ''}
                                                onChange={(e) => setFeature('property_subtype', e.target.value)}
                                                className={selectClass}
                                            >
                                                <option value="">Select...</option>
                                                {PROPERTY_SUBTYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </SelectWrapper>
                                    </div>

                                    {/* Listing Type */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[13px] font-medium text-[#5F656D]">Listing Type *</label>
                                            <button type="button" onClick={() => setAddingType(true)} className="text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF]">+ Add</button>
                                        </div>
                                        {addingType ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newTypeName}
                                                    onChange={(e) => setNewTypeName(e.target.value)}
                                                    placeholder="e.g. commercial"
                                                    className={inputClass}
                                                    autoFocus
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddType(); } if (e.key === 'Escape') setAddingType(false); }}
                                                />
                                                <button type="button" onClick={handleAddType} className="shrink-0 h-9 px-3 text-xs font-medium text-white bg-[#111315] rounded-lg hover:bg-[#1A1A1A]">Add</button>
                                                <button type="button" onClick={() => setAddingType(false)} className="shrink-0 h-9 px-2 text-xs text-[#5F656D] hover:text-[#111315]">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <SelectWrapper>
                                                <select value={data.listing_type} onChange={(e) => setData('listing_type', e.target.value)} className={selectClass}>
                                                    {localListingTypes.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
                                                </select>
                                            </SelectWrapper>
                                        )}
                                        {errors.listing_type && <p className="mt-1 text-xs text-red-600">{errors.listing_type}</p>}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[13px] font-medium text-[#5F656D]">Status *</label>
                                            <button type="button" onClick={() => setAddingStatus(true)} className="text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF]">+ Add</button>
                                        </div>
                                        {addingStatus ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newStatusName}
                                                    onChange={(e) => setNewStatusName(e.target.value)}
                                                    placeholder="e.g. under_contract"
                                                    className={inputClass}
                                                    autoFocus
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStatus(); } if (e.key === 'Escape') setAddingStatus(false); }}
                                                />
                                                <button type="button" onClick={handleAddStatus} className="shrink-0 h-9 px-3 text-xs font-medium text-white bg-[#111315] rounded-lg hover:bg-[#1A1A1A]">Add</button>
                                                <button type="button" onClick={() => setAddingStatus(false)} className="shrink-0 h-9 px-2 text-xs text-[#5F656D] hover:text-[#111315]">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <SelectWrapper>
                                                <select value={data.status} onChange={(e) => setData('status', e.target.value)} className={selectClass}>
                                                    {localListingStatuses.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
                                                </select>
                                            </SelectWrapper>
                                        )}
                                        {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <p className={sectionLabel}>Dates</p>
                                <div>
                                    <label className={labelClass}>Listed Date</label>
                                    <input
                                        type="date"
                                        value={data.listed_at}
                                        onChange={(e) => setData('listed_at', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {/* Linked Records */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <p className={sectionLabel}>Linked Records</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Contact (Optional)</label>
                                        <SelectWrapper>
                                            <select value={data.contact_id} onChange={(e) => setData('contact_id', e.target.value)} className={selectClass}>
                                                <option value="">None</option>
                                                {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                                            </select>
                                        </SelectWrapper>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Deal (Optional)</label>
                                        <SelectWrapper>
                                            <select value={data.deal_id} onChange={(e) => setData('deal_id', e.target.value)} className={selectClass}>
                                                <option value="">None</option>
                                                {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                                            </select>
                                        </SelectWrapper>
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[11px] font-semibold text-[#5F656D] tracking-wider">Tags</p>
                                    <button type="button" onClick={() => setAddingTag(true)} className="text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF]">+ New Tag</button>
                                </div>
                                {addingTag && (
                                    <div className="mb-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E4E7EB]">
                                        <input
                                            type="text"
                                            value={newTagName}
                                            onChange={(e) => setNewTagName(e.target.value)}
                                            placeholder="Tag name"
                                            className={inputClass + ' mb-2'}
                                            autoFocus
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } if (e.key === 'Escape') setAddingTag(false); }}
                                        />
                                        <div className="flex items-center gap-1.5 mb-2">
                                            {TAG_PRESET_COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setNewTagColor(c)}
                                                    className={`w-6 h-6 rounded-full transition-all ${newTagColor === c ? 'ring-2 ring-offset-1 ring-[#111315]' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={handleAddTag} className="h-7 px-3 text-xs font-medium text-white bg-[#111315] rounded-md hover:bg-[#1A1A1A]">Create</button>
                                            <button type="button" onClick={() => setAddingTag(false)} className="h-7 px-3 text-xs text-[#5F656D] hover:text-[#111315]">Cancel</button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {localTags.map((tag) => {
                                        const selected = data.tags.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => setData('tags', selected ? data.tags.filter((id) => id !== tag.id) : [...data.tags, tag.id])}
                                                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${selected ? 'ring-2 ring-offset-1' : ''}`}
                                                style={selected
                                                    ? { backgroundColor: tag.color, color: '#fff', ['--tw-ring-color' as any]: tag.color }
                                                    : { backgroundColor: tag.color + '18', color: tag.color, border: `1px solid ${tag.color}40` }
                                                }
                                            >
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                    {localTags.length === 0 && !addingTag && (
                                        <p className="text-xs text-[#8B9096]">No tags yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Custom Fields */}
                            {customFields.length > 0 && (
                                <div className="border border-[#E4E7EB] bg-white rounded-xl p-5">
                                    <p className={sectionLabel}>Custom Fields</p>
                                    <div className="space-y-4">
                                        {customFields.map((cf) => (
                                            <div key={cf.key}>
                                                <label className={labelClass}>{cf.label}</label>
                                                <input
                                                    type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                                                    value={data.custom_fields[cf.key] || ''}
                                                    onChange={(e) => setCustomField(cf.key, e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </CrmLayout>
    );
}
