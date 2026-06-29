// Data-driven "results" card used by the Featured Properties grid (and reused by
// the Property Search results grid). The whole card links to the listing detail;
// the heart button toggles a saved state without navigating. Generic over the
// shared `Listing` type — the third spec renders `listing.sqft` verbatim so the
// data module can carry either a square-footage string ("3,840 Sq Ft") or any
// other secondary metric.
import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import {
    AreaIcon,
    BathIcon,
    BedIcon,
    HeartIcon,
} from '@/components/site/icons';
import type { Listing } from '@/types/listing';

interface ListingCardCompactProps {
    listing: Listing;
    className?: string;
    /**
     * When provided the whole card becomes a button that calls this instead of
     * navigating — used by Property Search to open the detail modal in place.
     */
    onSelect?: () => void;
}

const SPEC_CLASS =
    'inline-flex items-center gap-1.5 text-[12px] font-light text-gray-600';
const SPEC_ICON = 'h-4 w-4 text-navy';

export function ListingCardCompact({
    listing,
    className,
    onSelect,
}: ListingCardCompactProps) {
    const [saved, setSaved] = useState(false);
    const isExternal = !listing.href.startsWith('/');

    const cardClass = cn(
        'group block cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-lg',
        className,
    );

    function toggleSaved(event: MouseEvent<HTMLButtonElement>) {
        // Keep the heart click from following the card link.
        event.preventDefault();
        event.stopPropagation();
        setSaved((value) => !value);
    }

    const inner = (
        <>
            <div className="relative overflow-hidden">
                <img
                    src={listing.image}
                    alt={listing.alt}
                    className="h-[200px] w-full object-cover"
                />
                <span className="absolute top-3 left-3 rounded-full bg-navy px-3 py-1.5 text-[11px] font-semibold tracking-widest text-white uppercase">
                    {listing.status}
                </span>
                <button
                    type="button"
                    onClick={toggleSaved}
                    aria-pressed={saved}
                    aria-label={
                        saved ? 'Remove from saved listings' : 'Save listing'
                    }
                    className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-navy transition-colors hover:bg-white"
                >
                    <HeartIcon className="h-4 w-4" filled={saved} />
                </button>
            </div>
            <div className="p-5">
                <p className="text-[20px] font-bold text-navy">
                    {listing.price}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                    <span className={SPEC_CLASS}>
                        <BedIcon className={SPEC_ICON} />
                        {listing.beds} Beds
                    </span>
                    <span className={SPEC_CLASS}>
                        <BathIcon className={SPEC_ICON} />
                        {listing.baths} Baths
                    </span>
                    <span className={SPEC_CLASS}>
                        <AreaIcon className={SPEC_ICON} />
                        {listing.sqft}
                    </span>
                </div>
                <p className="mt-4 text-[13px] font-light tracking-[0.04em] text-black uppercase">
                    {listing.address}
                </p>
            </div>
        </>
    );

    if (onSelect) {
        return (
            <button
                type="button"
                onClick={onSelect}
                className={cn(cardClass, 'w-full text-left')}
            >
                {inner}
            </button>
        );
    }

    if (isExternal) {
        return (
            <a
                href={listing.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
            >
                {inner}
            </a>
        );
    }

    return (
        <Link href={listing.href} className={cardClass}>
            {inner}
        </Link>
    );
}
