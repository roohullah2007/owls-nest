/*
 | Reusable landing-page image primitives with automatic broken-image fallback.
 |
 |  <LpImage>          — an <img> that walks the resolver's candidate chain on
 |                       error (stored → section fallback → generic), so a broken
 |                       or missing image is replaced instead of showing the
 |                       browser's broken-image icon.
 |  useResolvedBg()    — for CSS background images (where onError can't fire):
 |                       preloads candidates and returns the first that loads.
 |
 | Blocks use these instead of raw <img>/background-image. No hardcoded URLs.
 */
import { useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';
import type { LpPageData } from './types';
import { imageCandidates, type LpSection } from './imageFallbacks';

interface LpImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    section: LpSection;
    page: LpPageData;
    src?: string | null;
}

export default function LpImage({ section, page, src, alt = '', loading = 'lazy', ...rest }: LpImageProps) {
    const candidates = useMemo(() => imageCandidates(section, page, src), [section, page, src]);
    const [idx, setIdx] = useState(0);

    // Reset to the first candidate whenever the source set changes.
    useEffect(() => { setIdx(0); }, [candidates.join('|')]);

    const current = candidates[Math.min(idx, candidates.length - 1)];

    return (
        <img
            {...rest}
            src={current}
            alt={alt}
            loading={loading}
            onError={() => setIdx((i) => (i < candidates.length - 1 ? i + 1 : i))}
        />
    );
}

/** Resolve a guaranteed-loadable background image URL (preloads the candidate chain). */
export function useResolvedBg(section: LpSection, page: LpPageData, src?: string | null): string {
    const candidates = useMemo(() => imageCandidates(section, page, src), [section, page, src]);
    const [resolved, setResolved] = useState(candidates[0]);

    useEffect(() => {
        let cancelled = false;
        setResolved(candidates[0]);
        if (typeof window === 'undefined') return;

        const tryLoad = (i: number) => {
            if (cancelled || i >= candidates.length) return;
            const im = new Image();
            im.onload = () => { if (!cancelled) setResolved(candidates[i]); };
            im.onerror = () => { if (!cancelled) tryLoad(i + 1); };
            im.src = candidates[i];
        };
        tryLoad(0);

        return () => { cancelled = true; };
    }, [candidates.join('|')]);

    return resolved;
}
