import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import type { Contact } from './types';

interface IdxConnection {
    id: number;
    provider: string;
    mls_slug: string;
    display_name: string;
    agent_id: string | null;
    office_id: string | null;
}

interface MlsResult {
    mls_id: string;
    mls_number: string;
    address?: { full?: string; city?: string; state_province?: string; postal_code?: string; street?: string };
    price?: number;
    price_formatted?: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    sqft?: number | null;
    status?: string;
    property_type?: string;
    photos?: string[];
}

interface Props {
    contact: Contact;
    idxConnections: IdxConnection[];
    onClose: () => void;
    /**
     * When provided, the Attach button becomes a "Use" button that calls this
     * callback with the picked MLS result instead of attaching it to the contact.
     * Useful for flows that want to capture the listing reference without
     * persisting a new Listing row (e.g. attaching an MLS address to an Offer).
     */
    onPick?: (result: MlsResult) => void;
}

const inputCls = 'w-full h-9 text-sm border border-[#E4E7EB] rounded-[4px] px-3 text-[#111315] bg-white focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]';
const selectCls = 'w-full h-9 py-0 leading-9 text-sm border border-[#E4E7EB] rounded-[4px] pl-3 pr-9 text-[#111315] bg-white focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] appearance-none bg-no-repeat bg-[right_0.5rem_center] truncate';
const selectStyle = { backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%238B9096'><path stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/></svg>\")", backgroundSize: '1rem 1rem' };

export default function MlsSearchPickerModal({ contact, idxConnections, onClose, onPick }: Props) {
    const [connectionId, setConnectionId] = useState<number>(idxConnections[0]?.id ?? 0);
    const [addressQuery, setAddressQuery] = useState('');
    const [mlsNumber, setMlsNumber] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [city, setCity] = useState(contact.city || '');
    const [propertyType, setPropertyType] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [minBeds, setMinBeds] = useState('');
    const [minBaths, setMinBaths] = useState('');
    const [results, setResults] = useState<MlsResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [attaching, setAttaching] = useState<string | null>(null);

    function csrf(): string {
        return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
    }

    async function runSearch(e?: React.FormEvent) {
        e?.preventDefault();
        if (!connectionId) return;
        setLoading(true);
        try {
            const res = await fetch(route('crm.listings.search-mls'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), 'Accept': 'application/json' },
                body: JSON.stringify({
                    connection_id: connectionId,
                    query: addressQuery || mlsNumber || null,
                    city: city || null,
                    property_type: propertyType || null,
                    min_price: minPrice ? Number(minPrice) : null,
                    max_price: maxPrice ? Number(maxPrice) : null,
                    min_beds: minBeds ? Number(minBeds) : null,
                    min_baths: minBaths ? Number(minBaths) : null,
                    page: 1,
                }),
            });
            const data = await res.json();
            setResults(data.listings || data.data || data || []);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (connectionId) runSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function attach(ml: MlsResult) {
        setAttaching(ml.mls_id);
        const addr = ml.address || {};
        router.post(route('crm.contacts.listings.attach', contact.uuid), {
            title: addr.full || ml.mls_number || 'MLS Listing',
            address: addr.street || addr.full || null,
            city: addr.city || null,
            state_province: addr.state_province || null,
            postal_code: addr.postal_code || null,
            price: ml.price ?? null,
            bedrooms: ml.bedrooms ?? null,
            bathrooms: ml.bathrooms ?? null,
            sqft: ml.sqft ?? null,
            mls_number: ml.mls_number || null,
            photos: ml.photos || [],
        } as any, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setAttaching(null),
        });
    }

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="relative pointer-events-auto bg-white border border-[#E4E7EB] shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[4px] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7EB] shrink-0">
                    <h2 className="text-sm font-semibold text-[#111315]">Search MLS</h2>
                    <button onClick={onClose} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#111315] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={runSearch} className="px-5 py-4 border-b border-[#E4E7EB] bg-[#FAFBFC] shrink-0 space-y-3">
                    {/* Default row: MLS / Address / MLS# */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-[11px] text-[#8B9096] mb-1 block">MLS</label>
                            <select value={connectionId} onChange={(e) => setConnectionId(Number(e.target.value))} className={selectCls} style={selectStyle}>
                                {idxConnections.map((c) => (
                                    <option key={c.id} value={c.id}>{c.display_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] text-[#8B9096] mb-1 block">Address</label>
                            <input type="text" value={addressQuery} onChange={(e) => setAddressQuery(e.target.value)} placeholder="e.g. 123 Main St" className={inputCls} />
                        </div>
                        <div>
                            <label className="text-[11px] text-[#8B9096] mb-1 block">MLS #</label>
                            <input type="text" value={mlsNumber} onChange={(e) => setMlsNumber(e.target.value)} placeholder="A11567890" className={inputCls} />
                        </div>
                    </div>

                    {/* Advanced toggle */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF] transition-colors"
                        >
                            <svg className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                            Advanced filters
                        </button>
                        <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-50 transition-colors">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                            {loading ? 'Searching…' : 'Search'}
                        </button>
                    </div>

                    {/* Advanced filters */}
                    {showAdvanced && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E4E7EB]">
                            <div>
                                <label className="text-[11px] text-[#8B9096] mb-1 block">City</label>
                                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Miami" className={inputCls} />
                            </div>
                            <div>
                                <label className="text-[11px] text-[#8B9096] mb-1 block">Property type</label>
                                <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={selectCls} style={selectStyle}>
                                    <option value="">Any</option>
                                    <option value="Residential">Residential</option>
                                    <option value="Condominium">Condominium</option>
                                    <option value="Townhouse">Townhouse</option>
                                    <option value="Land">Land</option>
                                    <option value="Commercial">Commercial</option>
                                    <option value="Multi-Family">Multi-Family</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] text-[#8B9096] mb-1 block">Min beds</label>
                                <input type="number" min={0} value={minBeds} onChange={(e) => setMinBeds(e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className="text-[11px] text-[#8B9096] mb-1 block">Min baths</label>
                                <input type="number" min={0} step="0.5" value={minBaths} onChange={(e) => setMinBaths(e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className="text-[11px] text-[#8B9096] mb-1 block">Min price</label>
                                <input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={inputCls} placeholder="$" />
                            </div>
                            <div>
                                <label className="text-[11px] text-[#8B9096] mb-1 block">Max price</label>
                                <input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={inputCls} placeholder="$" />
                            </div>
                        </div>
                    )}
                </form>

                <div className="flex-1 overflow-y-auto p-5 bg-[#F3F4F6]">
                    {loading && results.length === 0 && (
                        <p className="text-center text-xs text-[#8B9096] py-12">Searching the MLS…</p>
                    )}
                    {!loading && results.length === 0 && (
                        <p className="text-center text-xs text-[#8B9096] py-12">No listings found. Adjust the filters above.</p>
                    )}
                    {results.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {results.map((ml) => {
                                const cover = ml.photos?.[0];
                                const city = [ml.address?.city, ml.address?.state_province].filter(Boolean).join(', ');
                                const isAttaching = attaching === ml.mls_id;
                                return (
                                    <article key={ml.mls_id} className="flex gap-3 p-2 bg-white border border-[#E4E7EB] rounded-[4px] hover:border-[#1693C9] transition-colors">
                                        <div className="w-28 h-24 shrink-0 bg-[#F3F4F6] rounded-[4px] overflow-hidden">
                                            {cover ? (
                                                <img src={cover} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <svg className="h-6 w-6 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159M3.75 21h16.5" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-[#111315]">{ml.price_formatted || (ml.price ? `$${ml.price.toLocaleString()}` : '—')}</p>
                                                {ml.status && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#F3F4F6] text-[#5F656D] shrink-0">{ml.status}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#5F656D] line-clamp-1 mt-0.5">{ml.address?.full || ml.mls_number}</p>
                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#5F656D]">
                                                {ml.bedrooms != null && <span>{ml.bedrooms} bd</span>}
                                                {ml.bathrooms != null && <span>{ml.bathrooms} ba</span>}
                                                {ml.sqft != null && <span>{ml.sqft.toLocaleString()} sqft</span>}
                                                {ml.property_type && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#F3F4F6] text-[#5F656D]">{ml.property_type}</span>
                                                )}
                                            </div>
                                            <div className="flex items-end justify-between gap-2 mt-auto pt-1">
                                                {city ? <p className="text-[11px] text-[#8B9096] truncate">{city}</p> : <span />}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (onPick) {
                                                            onPick(ml);
                                                            onClose();
                                                        } else {
                                                            attach(ml);
                                                        }
                                                    }}
                                                    disabled={!!attaching}
                                                    className="h-7 px-3 text-[11px] font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-50 transition-colors shrink-0"
                                                >
                                                    {onPick ? 'Use' : (isAttaching ? 'Attaching…' : 'Attach')}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            </div>
        </>
    );
}
