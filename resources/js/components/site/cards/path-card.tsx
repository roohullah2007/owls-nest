// Square image teaser card with a title and an outline CTA. Used by the home
// "paths" band (Home Search / Home Valuation / Contact) on navy backgrounds
// (tone="light") and the buyers "Your Path" band on the sand background
// (tone="dark": navy title + outline-dark button + elevated, rounded image).
import { cn } from '@/lib/utils';
import { Button } from '@/components/site/button';
import type { PathCardItem } from '@/types/listing';

interface PathCardProps {
    card: PathCardItem;
    /** "light" = white title + outline-light button (navy/photo backgrounds).
     *  "dark" = navy title + outline-dark button + rounded, elevated image. */
    tone?: 'light' | 'dark';
    className?: string;
}

export function PathCard({ card, tone = 'light', className }: PathCardProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center',
                tone === 'dark' && 'group',
                className,
            )}
        >
            <div
                className={cn(
                    'aspect-square w-full overflow-hidden',
                    tone === 'dark' && 'rounded-xl shadow-lg',
                )}
            >
                <img
                    src={card.image}
                    alt={card.alt}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
            </div>
            <h3
                className={cn(
                    'text-center uppercase',
                    tone === 'dark'
                        ? 'mt-7 mb-5 text-[clamp(20px,3vw,26px)] leading-[1.15] font-semibold tracking-wide text-navy'
                        : "mt-8 mb-6 text-[clamp(24px,4vw,32px)] leading-[1.15] font-light tracking-wide text-white [font-variation-settings:'opsz'_144,'wdth'_100]",
                )}
            >
                {card.title}
            </h3>
            <Button
                variant={tone === 'dark' ? 'outline-dark' : 'outline-light'}
                href={card.href}
            >
                {card.cta}
            </Button>
        </div>
    );
}
