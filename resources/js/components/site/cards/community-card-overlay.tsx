// Community / neighborhood card: full-bleed image with a centered name overlay.
// Used by the home "Neighborhoods" rail (`simple`) and the communities grid
// (`rich`, a linked card with subtitle + "Explore Listings" button).
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import type { Neighborhood } from '@/data/neighborhoods';

interface CommunityCardOverlayProps {
    neighborhood: Neighborhood;
    /** `'simple'` (default) is the home rail tile; `'rich'` is the linked grid card. */
    variant?: 'simple' | 'rich';
    className?: string;
}

export function CommunityCardOverlay({
    neighborhood,
    variant = 'simple',
    className,
}: CommunityCardOverlayProps) {
    if (variant === 'rich') {
        const inner = (
            <>
                <img
                    src={neighborhood.image}
                    alt={neighborhood.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-navy/45 transition-colors group-hover:bg-navy/55" />
                <div className="relative flex flex-col items-center px-4 text-center text-white">
                    <h3 className="font-display text-[clamp(22px,3vw,30px)] leading-[36px] font-semibold drop-shadow">
                        {neighborhood.name}
                    </h3>
                    <p className="mt-2 text-[13px] leading-[18px] font-normal tracking-[0.18em] text-white/85 uppercase">
                        Owl's Nest Real Estate
                    </p>
                    <span className="mt-5 inline-flex items-center justify-center rounded-full border border-white/70 px-6 py-2.5 text-[12px] font-semibold tracking-[0.1em] text-white uppercase transition hover:bg-white hover:text-navy">
                        Explore Listings
                    </span>
                </div>
            </>
        );

        const cardClass = cn(
            'group relative flex h-[320px] items-center justify-center overflow-hidden',
            className,
        );

        return neighborhood.href.startsWith('/') ? (
            <Link href={neighborhood.href} className={cardClass}>
                {inner}
            </Link>
        ) : (
            <a href={neighborhood.href} className={cardClass}>
                {inner}
            </a>
        );
    }

    return (
        <div
            className={cn(
                'relative h-[520px] w-[400px] flex-shrink-0 overflow-hidden',
                className,
            )}
        >
            <img
                src={neighborhood.image}
                alt={neighborhood.name}
                className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-navy/20">
                <h3 className="text-[26px] font-semibold tracking-wide text-white uppercase drop-shadow-lg [font-variation-settings:'opsz'_144,'wdth'_100]">
                    {neighborhood.name}
                </h3>
            </div>
        </div>
    );
}
