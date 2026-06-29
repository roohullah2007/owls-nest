// Shared inner-page hero band (about / buyers / sellers / communities /
// neighborhoods). Background photo + centered navy caption card.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeroProps {
    eyebrow?: string;
    title: ReactNode;
    subtitle?: ReactNode;
    image: string;
    imageAlt?: string;
    className?: string;
}

export function PageHero({
    eyebrow,
    title,
    subtitle,
    image,
    imageAlt = "Owl's Nest Real Estate",
    className,
}: PageHeroProps) {
    return (
        <section
            className={cn(
                'relative h-[300px] w-full overflow-hidden sm:h-[360px] lg:h-[420px]',
                className,
            )}
        >
            <img
                src={image}
                alt={imageAlt}
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-navy/15" />
            <div className="relative z-10 flex h-full items-end justify-center">
                <div className="flex w-full max-w-[700px] flex-col items-center bg-navy/95 px-8 py-7 sm:px-10 sm:py-8">
                    {eyebrow && (
                        <p className="mb-2 text-center text-[12px] leading-[16px] font-normal tracking-[0.25em] text-white uppercase">
                            {eyebrow}
                        </p>
                    )}
                    <h1 className="text-center text-[clamp(22px,3.5vw,38px)] leading-[1.15] font-normal tracking-wide text-white uppercase">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-3 text-center text-[14px] leading-[20px] font-light text-white/90">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
