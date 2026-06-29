// Community / neighborhood card: full-bleed image with a centered name overlay.
// Used by the home "Neighborhoods" rail and the communities pages.
import { cn } from '@/lib/utils';
import type { Neighborhood } from '@/data/neighborhoods';

interface CommunityCardOverlayProps {
    neighborhood: Neighborhood;
    className?: string;
}

export function CommunityCardOverlay({
    neighborhood,
    className,
}: CommunityCardOverlayProps) {
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
