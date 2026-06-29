import { useEffect, useState, useCallback, useRef } from 'react';
import MlsCompliance from '@/Components/Mls/MlsCompliance';
import type { PreviewListing, WidgetAppearance } from '../Index';
import { defaultAppearance } from '../Index';

const shadowMap: Record<string, string> = {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
};

const hoverStyleMap: Record<string, React.CSSProperties> = {
    lift: { transform: 'translateY(-4px)' },
    shadow: { boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.15)' },
    scale: { transform: 'scale(1.02)' },
    none: {},
};

const aspectPadding: Record<string, string> = {
    '4:3': '75%', '16:9': '56.25%', '3:2': '66.67%', '1:1': '100%',
};

function formatPrice(n: number | null): string {
    if (n === null || n === undefined) return '$0';
    return '$' + n.toLocaleString('en-US');
}

function formatLotSize(sqft: number | null): string {
    if (!sqft) return '';
    if (sqft >= 43560) return `${(sqft / 43560).toFixed(2)} ac`;
    return `${sqft.toLocaleString()} sqft`;
}

interface Props {
    appearance: WidgetAppearance;
    widgetType: string;
    config: Record<string, any>;
    mlsSlug: string;
    idxSearchId?: number | null;
    customCss?: string | null;
    widgetFilters?: Record<string, any>;
}

export default function WidgetPreview({ appearance, widgetType, config, mlsSlug, idxSearchId, customCss, widgetFilters }: Props) {
    const a = {
        card: { ...defaultAppearance.card, ...(appearance?.card || {}) },
        typography: { ...defaultAppearance.typography, ...(appearance?.typography || {}) },
        colors: { ...defaultAppearance.colors, ...(appearance?.colors || {}) },
        fields: { ...defaultAppearance.fields, ...(appearance?.fields || {}) },
        searchForm: { ...defaultAppearance.searchForm, ...(appearance?.searchForm || {}) },
    };

    const [listings, setListings] = useState<PreviewListing[]>([]);
    const [compliance, setCompliance] = useState<import('@/Components/Mls/MlsCompliance').MlsComplianceBlock | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
    const [filteredListings, setFilteredListings] = useState<PreviewListing[]>([]);

    const cols = config?.cols || 3;
    const count = config?.count || (widgetType === 'grid' ? 6 : widgetType === 'map' ? 50 : 4);
    const visibleSlides = config?.visibleSlides || 3;

    const fetchListings = useCallback(() => {
        if (!mlsSlug) return;

        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set('mls_slug', mlsSlug);
        params.set('count', String(Math.min(count, 50)));
        if (idxSearchId) params.set('idx_search_id', String(idxSearchId));
        if (widgetFilters && Object.keys(widgetFilters).length > 0) {
            params.set('filters', JSON.stringify(widgetFilters));
        }

        fetch(`${route('crm.idx.widgets.preview')}?${params.toString()}`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    setError(data.error);
                    setListings([]);
                    setCompliance(null);
                } else {
                    setListings(data.listings || []);
                    setCompliance(data.compliance || null);
                    setError(null);
                }
            })
            .catch((e) => {
                setError('Unable to load listings. Check your MLS connection.');
                setListings([]);
                setCompliance(null);
            })
            .finally(() => setLoading(false));
    }, [mlsSlug, idxSearchId, count, widgetFilters]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchListings(), 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [fetchListings]);

    // Reset carousel index when type changes
    useEffect(() => {
        setCarouselIndex(0);
    }, [widgetType]);

    // Apply search filters to listings
    useEffect(() => {
        let result = [...listings];
        const f = searchFilters;

        if (f.city) {
            const city = f.city.toLowerCase();
            result = result.filter((l) => l.address?.city?.toLowerCase().includes(city));
        }
        if (f.min_price) {
            const min = parseInt(f.min_price);
            result = result.filter((l) => (l.price ?? 0) >= min);
        }
        if (f.max_price) {
            const max = parseInt(f.max_price);
            result = result.filter((l) => (l.price ?? 0) <= max);
        }
        if (f.min_beds) {
            const min = parseInt(f.min_beds);
            result = result.filter((l) => (l.bedrooms ?? 0) >= min);
        }
        if (f.min_baths) {
            const min = parseFloat(f.min_baths);
            result = result.filter((l) => (l.bathrooms ?? 0) >= min);
        }
        if (f.property_type) {
            const pt = f.property_type.toLowerCase();
            result = result.filter((l) => l.property_type?.toLowerCase().includes(pt));
        }
        if (f.status) {
            const st = f.status.toLowerCase();
            result = result.filter((l) => l.status?.toLowerCase() === st);
        }
        if (f.postal_code) {
            const zip = f.postal_code.toLowerCase();
            result = result.filter((l) => l.address?.postal_code?.toLowerCase().includes(zip));
        }
        if (f.min_sqft) {
            const min = parseInt(f.min_sqft);
            result = result.filter((l) => (l.sqft ?? 0) >= min);
        }
        if (f.max_sqft) {
            const max = parseInt(f.max_sqft);
            result = result.filter((l) => (l.sqft ?? 0) <= max);
        }

        setFilteredListings(result);
    }, [listings, searchFilters]);

    const previewId = `widget-preview-${Math.random().toString(36).slice(2, 8)}`;

    function renderPhoto(listing: PreviewListing) {
        const photoUrl = listing.photos?.[0];
        const aspect = aspectPadding[a.card.imageAspectRatio] || '56.25%';

        return (
            <div style={{ paddingTop: aspect, position: 'relative', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={listing.address?.street || 'Property'}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) parent.style.background = 'linear-gradient(135deg, #e4e7eb 0%, #d1d5db 100%)';
                        }}
                    />
                ) : (
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #e4e7eb 0%, #d1d5db 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1}>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                        </svg>
                    </div>
                )}
                {a.fields.statusBadge && listing.status && (
                    <span style={{ position: 'absolute', top: 8, left: 8, backgroundColor: a.colors.statusBadge, color: a.colors.statusBadgeText, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>
                        {listing.status.toLowerCase()}
                    </span>
                )}
                {a.fields.photoCount && listing.photo_count > 0 && (
                    <span style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                        {listing.photo_count}
                    </span>
                )}
            </div>
        );
    }

    function renderCard(listing: PreviewListing, index: number) {
        const hoverEffect = hoverStyleMap[a.card.hoverEffect] || {};

        return (
            <div
                key={listing.mls_id || index}
                className="widget-preview-card"
                style={{
                    backgroundColor: a.colors.cardBackground,
                    borderRadius: a.card.borderRadius,
                    boxShadow: shadowMap[a.card.shadow] || 'none',
                    overflow: 'hidden',
                    fontFamily: a.typography.fontFamily,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                    Object.assign((e.currentTarget as HTMLDivElement).style, hoverEffect);
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = shadowMap[a.card.shadow] || 'none';
                }}
            >
                {a.fields.photo && renderPhoto(listing)}
                <div style={{ padding: a.card.padding }}>
                    {a.fields.price && (
                        <div style={{ display: 'inline-block', backgroundColor: a.colors.priceBadge, color: a.colors.priceBadgeText, fontSize: a.typography.priceSize, fontWeight: 700, padding: '2px 8px', borderRadius: 4, marginBottom: 6 }}>
                            {listing.price_formatted || formatPrice(listing.price)}
                        </div>
                    )}
                    {a.fields.address && (
                        <div style={{ color: a.colors.text, fontSize: a.typography.addressSize, fontWeight: 600, lineHeight: 1.3, marginBottom: 2 }}>
                            {listing.address?.street || listing.address?.full || 'Address unavailable'}
                        </div>
                    )}
                    {a.fields.cityStateZip && (
                        <div style={{ color: a.colors.textSecondary, fontSize: a.typography.detailsSize, marginBottom: 8 }}>
                            {[listing.address?.city, listing.address?.state_province, listing.address?.postal_code].filter(Boolean).join(', ')}
                        </div>
                    )}
                    {(a.fields.beds || a.fields.baths || a.fields.sqft) && (
                        <div style={{ display: 'flex', gap: 12, fontSize: a.typography.detailsSize, color: a.colors.textSecondary }}>
                            {a.fields.beds && listing.bedrooms !== null && <span>{listing.bedrooms} bd</span>}
                            {a.fields.baths && listing.bathrooms !== null && <span>{listing.bathrooms} ba</span>}
                            {a.fields.sqft && listing.sqft !== null && <span>{listing.sqft.toLocaleString()} sqft</span>}
                        </div>
                    )}
                    {(a.fields.lotSize || a.fields.yearBuilt || a.fields.mlsNumber || a.fields.daysOnMarket) && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6, fontSize: (a.typography.detailsSize - 1), color: a.colors.textSecondary }}>
                            {a.fields.lotSize && listing.lot_sqft !== null && <span>Lot: {formatLotSize(listing.lot_sqft)}</span>}
                            {a.fields.yearBuilt && listing.year_built !== null && <span>Built: {listing.year_built}</span>}
                            {a.fields.mlsNumber && listing.mls_number && <span>MLS: {listing.mls_number}</span>}
                            {a.fields.daysOnMarket && listing.days_on_market !== null && <span>{listing.days_on_market} DOM</span>}
                        </div>
                    )}
                    {(a.fields.agent || a.fields.office) && (
                        <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${a.colors.textSecondary}22`, fontSize: (a.typography.detailsSize - 1), color: a.colors.textSecondary }}>
                            {a.fields.agent && listing.list_agent_name && <span>{listing.list_agent_name}</span>}
                            {a.fields.agent && listing.list_agent_name && a.fields.office && listing.list_office_name && <span> &middot; </span>}
                            {a.fields.office && listing.list_office_name && <span>{listing.list_office_name}</span>}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function renderSkeletonCard() {
        return (
            <div style={{ backgroundColor: a.colors.cardBackground, borderRadius: a.card.borderRadius, overflow: 'hidden', boxShadow: shadowMap[a.card.shadow] || 'none' }}>
                <div style={{ paddingTop: aspectPadding[a.card.imageAspectRatio] || '56.25%', background: '#f3f4f6', position: 'relative' }}>
                    <div className="animate-pulse" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)', backgroundSize: '200% 100%' }} />
                </div>
                <div style={{ padding: a.card.padding }}>
                    <div className="animate-pulse" style={{ height: 20, width: '60%', backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} />
                    <div className="animate-pulse" style={{ height: 14, width: '80%', backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 6 }} />
                    <div className="animate-pulse" style={{ height: 12, width: '40%', backgroundColor: '#e5e7eb', borderRadius: 4 }} />
                </div>
            </div>
        );
    }

    const propertyTypeOptions = ['Residential', 'Condominium', 'Commercial', 'Land', 'Multi-Family', 'Rental'];
    const statusOptions = ['Active', 'Pending', 'Sold', 'Expired', 'Withdrawn'];

    function renderSearchForm() {
        const sf = a.searchForm;
        const fields = sf.visibleFields || [];
        const labels: Record<string, string> = { city: 'City', min_price: 'Min Price', max_price: 'Max Price', min_beds: 'Beds', min_baths: 'Baths', property_type: 'Property Type', status: 'Status', postal_code: 'Zip Code', min_sqft: 'Min Sqft', max_sqft: 'Max Sqft' };
        const placeholders: Record<string, string> = { city: 'Any city', min_price: '0', max_price: 'No max', min_beds: 'Any', min_baths: 'Any', postal_code: 'Any zip', min_sqft: '0', max_sqft: 'No max' };
        const isH = sf.layout === 'horizontal';
        const isG = sf.layout === 'grid';

        const displayListings = widgetType === 'search_form' ? filteredListings : listings;
        const resultCount = displayListings.length;

        function updateFilter(key: string, value: string) {
            setSearchFilters((prev) => ({ ...prev, [key]: value }));
        }

        function clearFilters() {
            setSearchFilters({});
        }

        const inputStyle: React.CSSProperties = {
            height: 36,
            borderRadius: 4,
            border: `1px solid ${a.colors.textSecondary}33`,
            backgroundColor: a.colors.background,
            padding: '0 10px',
            fontSize: 12,
            color: a.colors.text,
            fontFamily: a.typography.fontFamily,
            width: '100%',
            outline: 'none',
        };

        const selectStyle: React.CSSProperties = {
            ...inputStyle,
            appearance: 'none',
            paddingRight: 24,
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 6px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '16px 16px',
        };

        return (
            <div style={{ backgroundColor: a.colors.background, padding: 16 }}>
                <div style={{ backgroundColor: a.colors.cardBackground, borderRadius: sf.borderRadius, padding: 16, boxShadow: shadowMap[a.card.shadow] || shadowMap.sm, fontFamily: a.typography.fontFamily }}>
                    <div style={{ display: isH ? 'flex' : isG ? 'grid' : 'flex', flexDirection: isH ? 'row' : 'column', gridTemplateColumns: isG ? 'repeat(3, 1fr)' : undefined, gap: 8, alignItems: isH ? 'flex-end' : undefined, flexWrap: isH ? 'wrap' : undefined }}>
                        {fields.map((f) => (
                            <div key={f} style={{ flex: isH ? '1 1 auto' : undefined, minWidth: isH ? 120 : undefined }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: a.colors.textSecondary, marginBottom: 4 }}>{labels[f] || f}</label>
                                {f === 'property_type' ? (
                                    <select value={searchFilters[f] || ''} onChange={(e) => updateFilter(f, e.target.value)} style={selectStyle}>
                                        <option value="">All Types</option>
                                        {propertyTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : f === 'status' ? (
                                    <select value={searchFilters[f] || ''} onChange={(e) => updateFilter(f, e.target.value)} style={selectStyle}>
                                        <option value="">Any Status</option>
                                        {statusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type={f.includes('price') || f.includes('beds') || f.includes('baths') || f.includes('sqft') ? 'number' : 'text'}
                                        value={searchFilters[f] || ''}
                                        onChange={(e) => updateFilter(f, e.target.value)}
                                        placeholder={placeholders[f] || ''}
                                        style={inputStyle}
                                        min={0}
                                    />
                                )}
                            </div>
                        ))}
                        <div style={{ flex: isH ? '0 0 auto' : undefined, display: 'flex', gap: 8 }}>
                            {isH && <div style={{ height: 15 }} />}
                            <button
                                onClick={clearFilters}
                                style={{ height: 36, padding: '0 16px', backgroundColor: 'transparent', color: a.colors.textSecondary, border: `1px solid ${a.colors.textSecondary}33`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: a.typography.fontFamily }}
                            >
                                Clear
                            </button>
                            <div style={{ height: 36, padding: '0 20px', backgroundColor: sf.buttonColor, color: sf.buttonTextColor, borderRadius: 4, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', fontFamily: a.typography.fontFamily }}>
                                {sf.buttonText}
                            </div>
                        </div>
                    </div>
                </div>

                {(config?.showResultCount !== false) && (
                    <div style={{ marginTop: 12, fontSize: 12, color: a.colors.textSecondary, fontFamily: a.typography.fontFamily }}>
                        {loading ? 'Loading...' : `${resultCount} result${resultCount !== 1 ? 's' : ''} found`}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: a.card.margin, marginTop: 12 }}>
                    {loading ? [0, 1, 2].map((i) => <div key={i}>{renderSkeletonCard()}</div>) :
                     displayListings.slice(0, 9).map((l, i) => renderCard(l, i))}
                </div>
            </div>
        );
    }

    function renderMap() {
        const mapListings = listings.slice(0, 8);
        const panelListings = listings.slice(0, 4);

        // Normalize lat/lng to 0-100% range for CSS positioning
        const lats = mapListings.map((l) => l.lat).filter((v): v is number => v !== null);
        const lngs = mapListings.map((l) => l.lng).filter((v): v is number => v !== null);
        const minLat = lats.length ? Math.min(...lats) : 0;
        const maxLat = lats.length ? Math.max(...lats) : 1;
        const minLng = lngs.length ? Math.min(...lngs) : 0;
        const maxLng = lngs.length ? Math.max(...lngs) : 1;

        const latRange = maxLat - minLat || 1;
        const lngRange = maxLng - minLng || 1;

        return (
            <div style={{ backgroundColor: a.colors.background, padding: 16 }}>
                <div style={{ display: 'flex', gap: 16, height: 420, fontFamily: a.typography.fontFamily }}>
                    <div style={{ flex: 1, borderRadius: a.card.borderRadius, background: 'linear-gradient(135deg, #e8f4f8 0%, #d1ecf1 50%, #c3e6cb 100%)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.12 }}>
                            {[...Array(8)].map((_, i) => <div key={`h${i}`} style={{ position: 'absolute', top: `${(i + 1) * 12}%`, left: 0, right: 0, height: 1, backgroundColor: '#666' }} />)}
                            {[...Array(8)].map((_, i) => <div key={`v${i}`} style={{ position: 'absolute', left: `${(i + 1) * 12}%`, top: 0, bottom: 0, width: 1, backgroundColor: '#666' }} />)}
                        </div>
                        {loading ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="animate-pulse" style={{ width: 80, height: 80, borderRadius: '50%', background: '#d1d5db' }} />
                            </div>
                        ) : mapListings.map((listing, i) => {
                            if (listing.lat === null || listing.lng === null) return null;
                            const top = 10 + ((maxLat - listing.lat) / latRange) * 80;
                            const left = 10 + ((listing.lng - minLng) / lngRange) * 80;
                            return (
                                <div key={listing.mls_id || i} style={{ position: 'absolute', top: `${top}%`, left: `${left}%`, width: 24, height: 24, borderRadius: '50% 50% 50% 0', backgroundColor: a.colors.accent, transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff', transform: 'rotate(45deg)' }} />
                                </div>
                            );
                        })}
                        <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: '#666', backgroundColor: 'rgba(255,255,255,0.85)', padding: '2px 8px', borderRadius: 4 }}>
                            {loading ? 'Loading...' : `${listings.length} listings`}
                        </div>
                    </div>
                    {config?.showListPanel !== false && (
                        <div style={{ width: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {loading ? [0, 1, 2].map((i) => <div key={i}>{renderSkeletonCard()}</div>) :
                             panelListings.map((l, i) => renderCard(l, i))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function renderCarousel() {
        const maxIndex = Math.max(0, listings.length - visibleSlides);
        const actualIndex = Math.min(carouselIndex, maxIndex);

        function scrollCarousel(dir: number) {
            const next = Math.max(0, Math.min(maxIndex, actualIndex + dir));
            setCarouselIndex(next);
            const el = carouselRef.current;
            if (el && listings.length > 0) {
                const slideWidth = el.scrollWidth / listings.length;
                el.scrollTo({ left: next * slideWidth, behavior: 'smooth' });
            }
        }

        return (
            <div style={{ backgroundColor: a.colors.background, padding: 16 }}>
                <div style={{ position: 'relative' }}>
                    <div
                        ref={carouselRef}
                        style={{ display: 'flex', gap: a.card.margin, overflowX: 'auto', scrollBehavior: 'smooth', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
                    >
                        {listings.map((l, i) => (
                            <div
                                key={l.mls_id || i}
                                style={{
                                    flex: `0 0 calc((100% - ${(visibleSlides - 1) * a.card.margin}px) / ${visibleSlides})`,
                                    scrollSnapAlign: 'start',
                                    minWidth: 200,
                                }}
                            >
                                {renderCard(l, i)}
                            </div>
                        ))}
                    </div>
                    {listings.length > visibleSlides && (
                        <>
                            <button
                                onClick={() => scrollCarousel(-1)}
                                disabled={actualIndex === 0}
                                style={{ position: 'absolute', top: '40%', left: -14, width: 28, height: 28, borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: actualIndex === 0 ? 'not-allowed' : 'pointer', opacity: actualIndex === 0 ? 0.4 : 1, zIndex: 2 }}
                            >
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={a.colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                            <button
                                onClick={() => scrollCarousel(1)}
                                disabled={actualIndex >= maxIndex}
                                style={{ position: 'absolute', top: '40%', right: -14, width: 28, height: 28, borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: actualIndex >= maxIndex ? 'not-allowed' : 'pointer', opacity: actualIndex >= maxIndex ? 0.4 : 1, zIndex: 2 }}
                            >
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={a.colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                        </>
                    )}
                    {listings.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                            {Array.from({ length: Math.min(listings.length, 6) }).map((_, i) => (
                                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: i === actualIndex ? a.colors.accent : `${a.colors.textSecondary}44` }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function renderGrid() {
        if (loading) {
            return (
                <div style={{ backgroundColor: a.colors.background, padding: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: a.card.margin }}>
                        {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
                            <div key={i}>{renderSkeletonCard()}</div>
                        ))}
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div style={{ backgroundColor: a.colors.background, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: a.typography.fontFamily }}>
                    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1}>
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                    </svg>
                    <p style={{ marginTop: 12, fontSize: 13, color: a.colors.textSecondary, textAlign: 'center' }}>{error}</p>
                    <button onClick={fetchListings} style={{ marginTop: 12, padding: '6px 16px', fontSize: 12, fontWeight: 500, color: a.colors.primary, background: 'transparent', border: `1px solid ${a.colors.primary}`, borderRadius: 4, cursor: 'pointer' }}>Retry</button>
                </div>
            );
        }

        if (listings.length === 0) {
            return (
                <div style={{ backgroundColor: a.colors.background, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: a.typography.fontFamily }}>
                    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1}>
                        <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: a.colors.text }}>No listings found</p>
                    <p style={{ marginTop: 4, fontSize: 12, color: a.colors.textSecondary, textAlign: 'center' }}>Connect your MLS or adjust your search filters.</p>
                </div>
            );
        }

        return (
            <div style={{ backgroundColor: a.colors.background, padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: a.card.margin }}>
                    {listings.map((l, i) => renderCard(l, i))}
                </div>
            </div>
        );
    }

    return (
        <div id={previewId} className={previewId}>
            {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
            {widgetType === 'search_form' && renderSearchForm()}
            {widgetType === 'map' && renderMap()}
            {widgetType === 'carousel' && renderCarousel()}
            {widgetType !== 'search_form' && widgetType !== 'map' && widgetType !== 'carousel' && renderGrid()}

            {/* MLS compliance footer — disclaimers, attribution, logo. Required
                by each MLS's terms. Admin configures the content in
                /admin/mls-providers; this component renders it consistently. */}
            {compliance && listings.length > 0 && (
                <div style={{ padding: '12px 16px', backgroundColor: a.colors.background }}>
                    <MlsCompliance compliance={compliance} variant="compact" />
                </div>
            )}
        </div>
    );
}
