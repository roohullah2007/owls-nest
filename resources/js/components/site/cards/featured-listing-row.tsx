// Large alternating image/text row used by the Featured Properties page.
// Ports the original featured-properties.html `listingHTML()` <article> markup:
// a full-height photo on one side, the address / big price / three pill specs /
// a clamped "Property Description" / a "Property Details" CTA on the other. The
// `reverse` prop swaps the sides (image right) — the page alternates it by row
// index to reproduce the original odd/even layout. Per the design tokens the
// original `bg-black` maps to `bg-navy`.
import { Button } from '@/components/site/button';
import { AreaIcon, BathIcon, BedIcon } from '@/components/site/icons';
import { cn } from '@/lib/utils';
import type { Listing } from '@/types/listing';

interface FeaturedListingRowProps {
    listing: Listing;
    /** When true the photo renders on the right (even rows in the original). */
    reverse?: boolean;
    className?: string;
}

const PILL_CLASS =
    'inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-[11px] font-semibold tracking-widest text-white uppercase';
const PILL_ICON = 'h-3.5 w-3.5';

export function FeaturedListingRow({
    listing,
    reverse = false,
    className,
}: FeaturedListingRowProps) {
    const image = (
        <div
            className={cn(
                'relative h-[420px] w-full overflow-hidden',
                reverse && 'order-1 md:order-2',
            )}
        >
            <img
                src={listing.image}
                alt={listing.alt}
                className="h-full w-full object-cover"
            />
            <span className="absolute top-5 left-5 rounded-full bg-navy px-4 py-2 text-[14px] leading-[20px] font-light tracking-widest text-white uppercase">
                {listing.status}
            </span>
        </div>
    );

    const text = (
        <div className={cn('pt-2', reverse && 'order-2 md:order-1')}>
            <p className="mb-4 text-[14px] leading-[20px] font-light tracking-[0.04em] text-black uppercase">
                {listing.address}
            </p>
            <p className="mb-6 text-[36px] leading-[40px] font-light text-black">
                {listing.price}
            </p>
            <div className="mb-8 flex flex-wrap gap-3">
                <span className={PILL_CLASS}>
                    <BedIcon className={PILL_ICON} />
                    {listing.beds} Beds
                </span>
                <span className={PILL_CLASS}>
                    <BathIcon className={PILL_ICON} />
                    {listing.baths} Baths
                </span>
                <span className={PILL_CLASS}>
                    <AreaIcon className={PILL_ICON} />
                    {listing.sqft}
                </span>
            </div>
            <div className="border-t border-gray-200 pt-6">
                <p className="mb-4 text-[12px] leading-[16px] font-normal tracking-[0.18em] text-[rgb(120,120,120)] uppercase">
                    Property Description
                </p>
                {listing.description && (
                    <p className="mb-8 line-clamp-4 text-[14px] leading-[26px] font-light text-black">
                        {listing.description}
                    </p>
                )}
                <Button
                    href={listing.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline-dark"
                    className="text-[16px] leading-[22px] font-light"
                >
                    Property Details
                </Button>
            </div>
        </div>
    );

    return (
        <article
            className={cn(
                'grid grid-cols-1 items-start gap-10 md:grid-cols-2',
                className,
            )}
        >
            {reverse ? (
                <>
                    {text}
                    {image}
                </>
            ) : (
                <>
                    {image}
                    {text}
                </>
            )}
        </article>
    );
}
