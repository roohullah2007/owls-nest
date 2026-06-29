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
    /**
     * When set, render the round outline scroll-down chevron at the bottom of
     * the caption card, linking to `#${scrollTarget}`. Omit for no chevron.
     */
    scrollTarget?: string;
    /**
     * `'short'` (default) is the compact about/buyers/sellers hero. `'tall'` is
     * the full-height neighborhoods/communities hero with a larger caption card.
     */
    size?: 'short' | 'tall';
    className?: string;
}

export function PageHero({
    eyebrow,
    title,
    subtitle,
    image,
    imageAlt = "Owl's Nest Real Estate",
    scrollTarget,
    size = 'short',
    className,
}: PageHeroProps) {
    const tall = size === 'tall';

    return (
        <section
            className={cn(
                'relative w-full overflow-hidden',
                tall
                    ? 'h-[70vh] min-h-[520px]'
                    : 'h-[300px] sm:h-[360px] lg:h-[420px]',
                className,
            )}
        >
            <img
                src={image}
                alt={imageAlt}
                className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-navy/15" />
            <div className="relative z-10 flex h-full items-end justify-center">
                <div
                    className={cn(
                        'flex w-full flex-col items-center bg-navy/95',
                        tall
                            ? 'max-w-[760px] px-12 pt-16 pb-12'
                            : 'max-w-[700px] px-8 py-7 sm:px-10 sm:py-8',
                    )}
                >
                    {eyebrow && (
                        <p className="mb-2 text-center text-[12px] leading-[16px] font-normal tracking-[0.25em] text-white uppercase">
                            {eyebrow}
                        </p>
                    )}
                    <h1
                        className={cn(
                            'text-center font-normal tracking-wide text-white uppercase',
                            tall
                                ? 'text-[clamp(34px,6vw,60px)] leading-[1.1]'
                                : 'text-[clamp(22px,3.5vw,38px)] leading-[1.15]',
                        )}
                    >
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-3 text-center text-[14px] leading-[20px] font-light text-white/90">
                            {subtitle}
                        </p>
                    )}
                    {scrollTarget && (
                        <a
                            href={`#${scrollTarget}`}
                            aria-label="Scroll down"
                            className={cn(
                                'flex items-center justify-center rounded-full border border-white text-white transition-colors hover:bg-white hover:text-navy',
                                tall ? 'mt-10 h-14 w-14' : 'mt-6 h-10 w-10',
                            )}
                        >
                            <svg
                                className={tall ? 'h-5 w-5' : 'h-4 w-4'}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
}
