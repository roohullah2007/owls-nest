import { Link } from '@inertiajs/react';
import type { Column, Listing } from '../types';
import { capitalize, formatDate, formatPrice, formatStatusLabel, getStatusColors, getTypeColors } from '../utils';
import TintBadge from './TintBadge';

interface Props {
    listing: Listing;
    col: Column;
    /** Current user id — controls whether the Edit action shows. */
    authUserId: number;
    onOpenDetail: (id: number) => void;
}

/** Renders one cell of the CRM (manual) listings table. */
export default function ListingCell({ listing, col, authUserId, onOpenDetail }: Props) {
    if (col.isCustom) {
        const cfKey = col.key.replace('cf_', '');
        const val = listing.custom_fields?.[cfKey];
        return <span className="text-xs text-[#5F656D] truncate">{val || '—'}</span>;
    }

    switch (col.key) {
        case 'photo':
            return listing.photos?.[0] ? (
                <img src={listing.photos[0]} alt="" className="h-10 w-14 rounded object-cover" />
            ) : (
                <div className="h-10 w-14 rounded bg-[#F3F4F6] flex items-center justify-center">
                    <svg className="h-4 w-4 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                </div>
            );

        case 'title':
            return (
                <button
                    onClick={() => onOpenDetail(listing.id)}
                    className="text-[13px] font-medium text-[#111315] hover:underline truncate text-left"
                >
                    {listing.title}
                </button>
            );

        case 'listing_type':
            return listing.listing_type
                ? <TintBadge label={capitalize(listing.listing_type)} color={getTypeColors(listing.listing_type).bg} />
                : <span className="text-xs text-[#8B9096]">—</span>;

        case 'status':
            return listing.status
                ? <TintBadge label={formatStatusLabel(listing.status)} color={getStatusColors(listing.status).bg} />
                : <span className="text-xs text-[#8B9096]">—</span>;

        case 'price':
            return <span className="text-[13px] text-[#5F656D] font-medium">{formatPrice(listing.price)}</span>;
        case 'beds_baths':
            return <span className="text-xs text-[#5F656D]">{listing.bedrooms ?? '—'} / {listing.bathrooms ?? '—'}</span>;
        case 'sqft':
            return <span className="text-xs text-[#5F656D]">{listing.sqft ? listing.sqft.toLocaleString() : '—'}</span>;
        case 'mls_number':
            return <span className="text-xs text-[#5F656D] truncate">{listing.mls_number || '—'}</span>;
        case 'city':
            return <span className="text-xs text-[#5F656D] truncate">{[listing.city, listing.state_province].filter(Boolean).join(', ') || '—'}</span>;
        case 'listed_at':
            return <span className="text-xs text-[#5F656D]">{formatDate(listing.listed_at)}</span>;
        case 'created_at':
            return <span className="text-xs text-[#5F656D]">{formatDate(listing.created_at)}</span>;

        case 'tags':
            return (
                <div className="flex gap-1 overflow-hidden">
                    {listing.tags.map((tag) => (
                        <span key={tag.id} className="inline-flex shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded" style={{ backgroundColor: tag.color + '15', color: tag.color }}>
                            {tag.name}
                        </span>
                    ))}
                </div>
            );

        case 'added_by':
            return listing.user ? (
                <div className="flex items-center gap-1.5">
                    <span className="shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-[#1693C9] text-[9px] font-bold text-white">
                        {listing.user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs text-[#5F656D] truncate">{listing.user.name}</span>
                </div>
            ) : <span className="text-xs text-[#D1D5DB]">—</span>;

        case 'actions':
            return listing.user_id === authUserId ? (
                <Link href={route('crm.listings.edit', listing.id)} className="text-[#8B9096] hover:text-[#1693C9] transition-colors" title="Edit">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                </Link>
            ) : null;

        default:
            return null;
    }
}
