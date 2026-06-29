// Mirrors the Blade templates: the ordered interleaving of template sections and
// insertable block slots on each page. Section `id`s match the `section-edit-btn`
// ids in the Blade views (used for show/hide + content editing); slots match the
// `blocks-renderer` slots.

export type LayoutItem =
    | { kind: 'section'; id: string; label: string }
    | { kind: 'slot'; slot: string; label: string };

// Keyed by page slug (only the `luxury` template ships sections today). Pages not
// listed here — including custom pages — fall back to a single default slot.
const LUXURY_LAYOUTS: Record<string, LayoutItem[]> = {
    // The legacy static About Preview / Testimonials / Call to Action sections
    // were removed — superseded by the block-based equivalents (Content, Team /
    // Testimonials, CTA blocks). Their slots stay so any blocks already placed
    // there keep rendering.
    home: [
        { kind: 'section', id: 'hero', label: 'Hero' },
        { kind: 'slot', slot: 'after-hero', label: 'After Hero' },
        { kind: 'slot', slot: 'after-about', label: 'Content' },
        { kind: 'slot', slot: 'after-buysell', label: 'Services / Content' },
        { kind: 'slot', slot: 'after-testimonials', label: 'Content' },
        { kind: 'slot', slot: 'after-cta', label: 'Bottom of Page' },
    ],
    // about / buy / sell / contact / home-valuation are fully block-driven — a
    // single open block area (same as custom pages), via the CUSTOM_PAGE_LAYOUT
    // fallback. Contact ships a Contact block (its own header + details/form/map);
    // home-valuation ships a dark Home Valuation block (the ?address= results +
    // steps sections are hardcoded after the blocks). No hardcoded heroes.
    // areas (Communities index) is fully block-driven too — Communities grid
    // + CTA blocks via the open-canvas fallback; the boxed hero stays built-in
    // until a Page Header block is added.

    blog: [
        { kind: 'section', id: 'blog-listing', label: 'Blog Listing' },
        { kind: 'slot', slot: 'default', label: 'Bottom of Page' },
    ],
};

const CUSTOM_PAGE_LAYOUT: LayoutItem[] = [
    { kind: 'slot', slot: 'default', label: 'Page Content' },
];

export function getPageLayout(template: string, page: string): LayoutItem[] {
    if (template === 'luxury' && LUXURY_LAYOUTS[page]) {
        return LUXURY_LAYOUTS[page];
    }
    return CUSTOM_PAGE_LAYOUT;
}
