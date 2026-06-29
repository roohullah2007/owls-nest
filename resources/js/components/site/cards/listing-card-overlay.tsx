// Listing card with a full gradient overlay and price/specs at the bottom.
// Used by the home "Featured Listings" rail. Whole card is a link.
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import type { Listing } from '@/types/listing';

interface ListingCardOverlayProps {
    listing: Listing;
    className?: string;
}

export function ListingCardOverlay({
    listing,
    className,
}: ListingCardOverlayProps) {
    return (
        <Link
            href={listing.href}
            className={cn(
                'group relative block h-[460px] w-[400px] flex-shrink-0 overflow-hidden',
                className,
            )}
        >
            <img
                src={listing.image}
                alt={listing.alt}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute top-4 left-4 bg-navy px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white uppercase">
                {listing.status}
            </span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 via-navy/40 to-transparent px-6 pt-16 pb-6 text-white">
                <p className="text-[28px] leading-[32px] font-light [font-variation-settings:'opsz'_144,'wdth'_100]">
                    {listing.price}
                </p>
                <p className="mt-1 text-[14px] text-white/85">
                    {listing.beds} bd | {listing.baths} ba | {listing.sqft}{' '}
                    sq.ft.
                </p>
                <p className="text-[14px] text-white/85">{listing.address}</p>
            </div>
        </Link>
    );
}
