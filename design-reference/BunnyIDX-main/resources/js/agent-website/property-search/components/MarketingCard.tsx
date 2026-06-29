import { PsGridCard } from '../lib/merge';

/**
 * Marketing CTA tile mixed into the results grid (Sierra-style) — same card
 * footprint as a listing, but it's a call-to-action: home valuation funnel,
 * "list with me", buyer guide, etc.
 */
export default function MarketingCard({ card }: { card: PsGridCard }) {
    // Relative storage paths are normally resolved to absolute URLs in the
    // Blade config mapping; this is just a safety net for stale configs.
    const image = card.image && !/^https?:\/\//i.test(card.image)
        ? `/storage/${card.image.replace(/^\/+/, '')}`
        : card.image;
    // With a photo: cover background + dark scrim so the white copy stays
    // legible. Without: the original solid theme-primary tile.
    const background = image
        ? {
              backgroundImage: `linear-gradient(rgba(10,12,16,.35), rgba(10,12,16,.75)), url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
          }
        : { background: 'var(--ps-theme-primary, #0f1115)' };
    return (
        <a
            href={card.cta_url || '#'}
            className="ps-card ps-marketing-card flex flex-col justify-between"
            style={{ ...background, color: '#fff', border: 0, minHeight: 280 }}
        >
            <div className="p-6">
                <span className="inline-flex items-center rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,.14)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                    {card.title || 'Featured'}
                </span>
                {card.body && <p className="mt-4" style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.35, letterSpacing: '-.01em' }}>{card.body}</p>}
            </div>
            {card.cta_text && (
                <div className="p-6 pt-0">
                    <span className="inline-flex items-center gap-2 rounded-xl bg-white px-5" style={{ height: 42, color: 'var(--ps-theme-primary, #0f1115)', fontSize: 13.5, fontWeight: 700 }}>
                        {card.cta_text}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </span>
                </div>
            )}
        </a>
    );
}
