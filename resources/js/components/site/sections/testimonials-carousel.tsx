// Google-review testimonials carousel (auto-advances every 6s, prev/next arrows
// on the sides). Data-driven and reused across home / about / buyers / sellers.
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import { useCarousel } from '@/hooks/use-carousel';
import {
    CarouselArrowButton,
    DisplayHeading,
} from '@/components/site/primitives';
import { GOOGLE_REVIEWS_URL } from '@/data/testimonials';
import type { Testimonial } from '@/data/testimonials';

interface TestimonialsCarouselProps {
    heading?: string;
    testimonials: Testimonial[];
    /** Public reviews link for the "Verified" footer. */
    reviewsUrl?: string;
    className?: string;
}

function QuoteIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
        </svg>
    );
}

function StarIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
        </svg>
    );
}

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" {...props}>
            <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
        </svg>
    );
}

function Stars() {
    return (
        <span className="flex gap-0.5 text-[#f5b301]">
            {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} className="h-4 w-4" />
            ))}
        </span>
    );
}

export function TestimonialsCarousel({
    heading = 'Testimonials',
    testimonials,
    reviewsUrl = GOOGLE_REVIEWS_URL,
    className,
}: TestimonialsCarouselProps) {
    const { index, next, prev } = useCarousel(testimonials.length, 6000);

    return (
        <section className={cn('bg-white pt-20 pb-20', className)}>
            <DisplayHeading className="mb-14 text-center text-[clamp(34px,5vw,52px)] text-navy">
                {heading}
            </DisplayHeading>

            <div className="relative mx-auto max-w-[1000px] px-6">
                <CarouselArrowButton
                    direction="prev"
                    onClick={prev}
                    className="absolute top-1/2 left-0 z-20 -translate-y-1/2"
                />
                <CarouselArrowButton
                    direction="next"
                    onClick={next}
                    className="absolute top-1/2 right-0 z-20 -translate-y-1/2"
                />

                <div className="mx-6 sm:mx-14">
                    <div className="grid">
                        {testimonials.map((t, i) => (
                            <div
                                key={t.id}
                                className={cn(
                                    'col-start-1 row-start-1 flex flex-col items-center justify-center px-4 py-6 text-center transition-opacity duration-700 ease-in-out',
                                    i === index
                                        ? 'opacity-100'
                                        : 'hidden opacity-0',
                                )}
                            >
                                <QuoteIcon className="mx-auto mb-6 h-10 w-10 text-navy" />
                                <p className="mx-auto max-w-[820px] text-[clamp(18px,2.4vw,26px)] leading-[1.5] font-light text-[#333]">
                                    {t.quote}
                                </p>
                                <div className="mt-8 flex items-center justify-center gap-4">
                                    {t.avatar ? (
                                        <img
                                            src={t.avatar}
                                            alt={t.name}
                                            className="h-12 w-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span
                                            className="flex h-12 w-12 items-center justify-center rounded-full text-[20px] font-medium text-white"
                                            style={{
                                                backgroundColor: t.initialBg,
                                            }}
                                        >
                                            {t.initial}
                                        </span>
                                    )}
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[16px] font-semibold tracking-[0.1em] text-navy uppercase">
                                                {t.name}
                                            </p>
                                            <GoogleIcon className="h-5 w-5" />
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Stars />
                                            <span className="text-[13px] text-[#707070]">
                                                {t.timeAgo}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-[14px] text-[#555]">
                        <Stars />
                        Based on {testimonials.length} Google reviews
                    </div>
                    <a
                        href={reviewsUrl}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1.5 rounded bg-navy px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-navydark"
                    >
                        Verified by Trustindex
                        <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
}
