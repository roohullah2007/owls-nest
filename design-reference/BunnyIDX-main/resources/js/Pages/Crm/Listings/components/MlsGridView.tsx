import type { MlsListing } from '../types';
import { formatPrice } from '../utils';
import StatusBadge from './StatusBadge';

interface Props {
    listings: MlsListing[];
    onOpenLightbox: (photos: string[], index: number) => void;
    onSelectListing: (listing: MlsListing) => void;
    /** mls_slug → display_name lookup so each card can label which MLS it came from. */
    mlsSlugToName?: Record<string, string>;
}

export default function MlsGridView({ listings, onOpenLightbox, onSelectListing, mlsSlugToName = {} }: Props) {
    if (listings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E4E7EB] rounded-xl">
                <svg className="h-10 w-10 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
                </svg>
                <p className="mt-3 text-sm text-[#8B9096]">No listings found</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {listings.map((ml) => (
                <article
                    key={ml.mls_id}
                    onClick={() => onSelectListing(ml)}
                    className="group bg-white border border-[#E4E7EB] rounded-xl overflow-hidden hover:border-[#7C36EE] hover:shadow-md transition-all cursor-pointer"
                >
                    <div
                        className="aspect-[4/3] bg-[#F3F4F6] relative overflow-hidden"
                        onClick={(e) => { e.stopPropagation(); ml.photos?.[0] && onOpenLightbox(ml.photos, 0); }}
                    >
                        {ml.photos?.[0] ? (
                            <img
                                src={ml.photos[0]}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <svg className="h-10 w-10 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159M3.75 21h16.5" />
                                </svg>
                            </div>
                        )}
                        <div className="absolute top-2 left-2"><StatusBadge value={ml.status || '—'} size="xs" /></div>
                        {ml.photo_count > 1 && (
                            <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-black/60 text-white rounded-full">
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159M3.75 21h16.5" />
                                </svg>
                                {ml.photo_count}
                            </span>
                        )}
                    </div>
                    <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-[#111315] line-clamp-1">{ml.price_formatted || formatPrice(ml.price)}</p>
                            <StatusBadge value={ml.property_type || '—'} variant="type" size="xs" className="rounded" />
                        </div>
                        <p className="mt-1 text-xs text-[#5F656D] line-clamp-1">{ml.address?.full || ml.mls_number}</p>
                        <div className="flex items-center gap-2.5 mt-2 text-[11px] text-[#5F656D]">
                            {ml.bedrooms != null && <span><strong>{ml.bedrooms}</strong> bd</span>}
                            {ml.bathrooms != null && <span><strong>{ml.bathrooms}</strong> ba</span>}
                            {ml.sqft && <span><strong>{ml.sqft.toLocaleString()}</strong> sqft</span>}
                        </div>
                        {(ml.address?.city || ml.address?.state_province) && (
                            <p className="mt-1.5 text-[11px] text-[#8B9096] line-clamp-1">
                                {[ml.address?.city, ml.address?.state_province].filter(Boolean).join(', ')}
                            </p>
                        )}
                        <p className="mt-1.5 text-[10px] font-medium text-[#8B9096] uppercase tracking-wider line-clamp-1">
                            {mlsSlugToName[ml.mls_slug] || ml.mls_slug}
                            {ml.mls_number && <span className="text-[#C8CCD1] normal-case tracking-normal"> · #{ml.mls_number}</span>}
                        </p>
                    </div>
                </article>
            ))}
        </div>
    );
}
