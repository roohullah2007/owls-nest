/* Tiny display helpers shared by the search components. */

export function shortPrice(price: number | null): string {
    if (price == null) return '—';
    if (price >= 1_000_000) return '$' + (price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1) + 'M';
    if (price >= 1_000) return '$' + Math.round(price / 1_000) + 'k';
    return '$' + price;
}

/**
 * Inline SVG fallback for property photos that are missing or fail to load
 * (dead MLS CDN links): soft gray panel with a house glyph.
 */
export const PHOTO_PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">'
    + '<rect width="640" height="420" fill="#eef1f4"/>'
    + '<g transform="translate(284,164)" fill="none" stroke="#c3cad3" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M4 36 36 8l32 28v44a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M26 84V56h20v28"/>'
    + '</g>'
    + '<text x="320" y="296" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#9aa3ad">Photo unavailable</text>'
    + '</svg>',
);

/** <img onError> handler — swaps in the placeholder exactly once (no loops). */
export function onImgError(e: React.SyntheticEvent<HTMLImageElement>): void {
    const img = e.currentTarget;
    if (img.src !== PHOTO_PLACEHOLDER) img.src = PHOTO_PLACEHOLDER;
}

/**
 * Copy text to the clipboard. navigator.clipboard needs a secure context
 * (HTTPS/localhost) — on plain-HTTP hosts (e.g. *.test dev domains) we fall
 * back to the legacy hidden-textarea + execCommand path.
 */
export async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch { /* fall through to the legacy path */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

export function statusColor(label: string): string {
    const l = label.toLowerCase();
    if (l.includes('sale')) return '#16a34a';
    if (l.includes('pending')) return '#d97706';
    if (l.includes('sold') || l.includes('closed')) return '#dc2626';
    if (l.includes('expired')) return '#6b7280';
    return '#16a34a';
}
