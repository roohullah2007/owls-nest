// Horizontal, hidden-scrollbar card rail with optional prev/next arrows.
// Powers the home "Featured Listings" and "Neighborhoods" rails. Exposes an
// imperative handle so consumers can wire external arrows or sync the rail to a
// list selection (scrollToIndex).
import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CarouselArrowButton } from '@/components/site/primitives';

export interface CardRailHandle {
    scrollPrev: () => void;
    scrollNext: () => void;
    scrollToIndex: (index: number) => void;
}

interface CardRailProps {
    children: ReactNode;
    /** Pixels advanced per arrow click and per index (card width + gap). */
    step?: number;
    /** Render the built-in prev/next arrows above the track. */
    showArrows?: boolean;
    arrowTone?: 'dark' | 'light';
    /** Classes for the arrow row (placement, e.g. "justify-end mb-6"). */
    arrowsClassName?: string;
    /** Classes for the scroll viewport (e.g. the negative right margin). */
    className?: string;
    /** Classes for the inner flex track (e.g. trailing padding). */
    trackClassName?: string;
}

export const CardRail = forwardRef<CardRailHandle, CardRailProps>(
    function CardRail(
        {
            children,
            step = 416,
            showArrows = false,
            arrowTone = 'dark',
            arrowsClassName,
            className,
            trackClassName,
        },
        ref,
    ) {
        const scrollRef = useRef<HTMLDivElement>(null);

        useImperativeHandle(ref, () => ({
            scrollPrev: () =>
                scrollRef.current?.scrollBy({
                    left: -step,
                    behavior: 'smooth',
                }),
            scrollNext: () =>
                scrollRef.current?.scrollBy({ left: step, behavior: 'smooth' }),
            scrollToIndex: (index: number) =>
                scrollRef.current?.scrollTo({
                    left: index * step,
                    behavior: 'smooth',
                }),
        }));

        return (
            <>
                {showArrows && (
                    <div className={cn('flex gap-3', arrowsClassName)}>
                        <CarouselArrowButton
                            direction="prev"
                            tone={arrowTone}
                            onClick={() =>
                                scrollRef.current?.scrollBy({
                                    left: -step,
                                    behavior: 'smooth',
                                })
                            }
                        />
                        <CarouselArrowButton
                            direction="next"
                            tone={arrowTone}
                            onClick={() =>
                                scrollRef.current?.scrollBy({
                                    left: step,
                                    behavior: 'smooth',
                                })
                            }
                        />
                    </div>
                )}
                <div
                    ref={scrollRef}
                    className={cn(
                        '[scrollbar-width:none] overflow-x-auto scroll-smooth [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
                        className,
                    )}
                >
                    <div className={cn('flex min-w-max gap-4', trackClassName)}>
                        {children}
                    </div>
                </div>
            </>
        );
    },
);
