// Listing card whose white info panel slides up on hover (desktop). Used by the
// home "Featured Properties" slider in two sizes: a tall "big" feature and a
// shorter "small" thumbnail.
import { cn } from '@/lib/utils';
import type { Listing } from '@/types/listing';
import { AreaIcon, BathIcon, BedIcon } from '@/components/site/icons';

interface ListingCardSlideUpProps {
    listing: Listing;
    size?: 'big' | 'small';
    className?: string;
}

export function ListingCardSlideUp({
    listing,
    size = 'big',
    className,
}: ListingCardSlideUpProps) {
    const isBig = size === 'big';

    const chipClass = cn(
        'inline-flex items-center rounded-full bg-navy font-semibold tracking-widest text-white uppercase',
        isBig
            ? 'gap-2 px-4 py-2 text-[11px]'
            : 'gap-1.5 px-3 py-1.5 text-[10px]',
    );
    const chipIcon = 'h-3.5 w-3.5';

    return (
        <div
            className={cn(
                'group relative w-full overflow-hidden',
                isBig ? 'mb-6 h-[600px]' : 'h-[380px]',
                className,
            )}
        >
            <img
                src={listing.image}
                alt={listing.alt}
                className="h-full w-full object-cover"
            />
            <span className="absolute top-5 left-5 rounded-full bg-navy/85 px-4 py-2 text-[11px] font-semibold tracking-widest text-white uppercase">
                {listing.status}
            </span>
            <div
                className={cn(
                    'absolute bottom-0 left-0 w-fit translate-y-0 bg-white/95 backdrop-blur-sm transition-transform duration-500 ease-out',
                    isBig
                        ? 'max-w-[500px] p-6 md:translate-y-[calc(100%-90px)] md:group-hover:translate-y-0'
                        : 'max-w-[400px] p-5 md:translate-y-[calc(100%-70px)] md:group-hover:translate-y-0',
                )}
            >
                <p
                    className={cn(
                        'font-light text-navy',
                        isBig
                            ? 'mb-2 text-[28px] leading-[32px]'
                            : 'mb-1 text-[22px] leading-[26px]',
                    )}
                >
                    {listing.price}
                </p>
                <p
                    className={cn(
                        'font-semibold tracking-widest text-navy uppercase',
                        isBig ? 'mb-4 text-[12px]' : 'mb-3 text-[11px]',
                    )}
                >
                    {listing.address}
                </p>
                <div className="flex flex-wrap gap-2">
                    <span className={chipClass}>
                        {isBig && <BedIcon className={chipIcon} />}
                        {listing.beds} Beds
                    </span>
                    <span className={chipClass}>
                        {isBig && <BathIcon className={chipIcon} />}
                        {listing.baths} Baths
                    </span>
                    {isBig && (
                        <span className={chipClass}>
                            <AreaIcon className={chipIcon} />
                            {listing.sqft} Sq.Ft.
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
