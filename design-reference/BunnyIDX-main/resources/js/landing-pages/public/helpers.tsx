/*
 | Shared helpers for the public landing page React app: image URL resolution,
 | YouTube/Vimeo embed conversion, and the marketing-attribution (UTM) hidden
 | fields that ride along with every lead form post.
 |
 | These mirror the behaviour of the old Blade partials (utm-capture, utm-fields)
 | and the per-block Storage::url() resolution, so leads + attribution land in
 | the CRM exactly as before.
 */
import { useEffect, useState } from 'react';
import type { LpPageData } from './types';

/** Resolve a stored image path to a URL (http(s) passes through; else assetBase + path). */
export function img(value: string | null | undefined, page: LpPageData): string {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
    const base = (page.assetBase || '/storage/').replace(/\/$/, '');
    return `${base}/${String(value).replace(/^\//, '')}`;
}

/** Convert a YouTube/Vimeo watch URL into an embeddable iframe src. Empty → ''. */
export function embedUrl(url: string | null | undefined): string {
    if (!url) return '';
    const u = String(url).trim();
    let m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
    return u;
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'] as const;

/** Read UTM/click-id params from the URL into sessionStorage (survives navigation). */
export function captureUtm(): void {
    if (typeof window === 'undefined') return;
    let store: Record<string, string> = {};
    try { store = JSON.parse(sessionStorage.getItem('lp_utm') || '{}'); } catch { /* ignore */ }
    let params: URLSearchParams;
    try { params = new URLSearchParams(window.location.search); } catch { params = new URLSearchParams(); }
    UTM_KEYS.forEach((k) => { const v = params.get(k); if (v) store[k] = v; });
    if (!store._ref) store._ref = document.referrer || '';
    try { sessionStorage.setItem('lp_utm', JSON.stringify(store)); } catch { /* ignore */ }
}

/** Read the captured UTM bundle back out of sessionStorage. */
function readUtm(): Record<string, string> {
    try { return JSON.parse(sessionStorage.getItem('lp_utm') || '{}'); } catch { return {}; }
}

/**
 * Hidden marketing-attribution inputs for a lead form. Renders the CSRF token,
 * the UTM/click-id fields, the referrer and the current landing URL — matching
 * the old utm-fields Blade partial so the controller validation is unchanged.
 */
export function HiddenAttribution({ page, extra }: { page: LpPageData; extra?: Record<string, string> }) {
    const [store, setStore] = useState<Record<string, string>>({});
    useEffect(() => { setStore(readUtm()); }, []);

    return (
        <>
            <input type="hidden" name="_token" value={page.csrf} />
            {UTM_KEYS.map((k) => (
                <input key={k} type="hidden" name={k} value={store[k] || ''} />
            ))}
            <input type="hidden" name="referrer" value={store._ref || ''} />
            <input type="hidden" name="landing_url" value={typeof window !== 'undefined' ? window.location.href : page.showUrl} />
            {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        </>
    );
}
