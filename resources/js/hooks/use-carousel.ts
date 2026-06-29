import { useCallback, useEffect, useState } from 'react';

/**
 * Index-based carousel with optional autoplay — powers the testimonials slider
 * and any other "show one of N, auto-advance, prev/next" UI on the site.
 */
export function useCarousel(length: number, autoplayMs = 0) {
    const [index, setIndex] = useState(0);

    const goTo = useCallback(
        (i: number) => setIndex(((i % length) + length) % length),
        [length],
    );
    const next = useCallback(() => goTo(index + 1), [goTo, index]);
    const prev = useCallback(() => goTo(index - 1), [goTo, index]);

    useEffect(() => {
        if (!autoplayMs || length <= 1) {
            return;
        }

        const id = setInterval(
            () => setIndex((i) => (i + 1) % length),
            autoplayMs,
        );

        return () => clearInterval(id);
    }, [autoplayMs, length]);

    return { index, next, prev, goTo };
}
