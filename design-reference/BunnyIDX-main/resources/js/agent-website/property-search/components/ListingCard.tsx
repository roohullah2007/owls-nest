import { useRef, useState } from 'react';
import { PsListing } from '../types';
import { copyText, onImgError, PHOTO_PLACEHOLDER, statusColor } from '../lib/format';

interface Props {
    listing: PsListing;
    onHover: (on: boolean) => void;
    onOpen: (listing: PsListing) => void;
    /** Visitor-account favorite state + toggle (guests get the auth modal). */
    favorited?: boolean;
    onFavorite?: (listing: PsListing) => void;
}

const ARROW_DOWN = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>;

const BADGE_LABELS: Record<string, { label: string; cls: string; icon?: JSX.Element }> = {
    new: { label: 'New Listing', cls: 'ps-badge--new' },
    price_reduced: { label: 'Price Reduced', cls: 'ps-badge--reduced', icon: ARROW_DOWN },
    // Price increases deliberately carry no badge (we only flag reductions).
};

/** One result card — photo carousel, badges, share/favorite, price/status, facts. */
export default function ListingCard({ listing: l, onHover, onOpen, favorited = false, onFavorite }: Props) {
    const photos = l.photos.length ? l.photos : [''];
    const [idx, setIdx] = useState(0);
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<number | null>(null);

    const go = (e: React.MouseEvent, dir: number) => {
        e.preventDefault();
        e.stopPropagation();
        setIdx((cur) => (cur + dir + photos.length) % photos.length);
    };

    const share = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = new URL(l.href, window.location.origin).href;
        const nav = navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> };
        if (nav.share) {
            try { await nav.share({ title: l.address, url }); } catch { /* dismissed */ }
            return;
        }
        if (await copyText(url)) {
            setCopied(true);
            if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
            copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
        }
    };

    const favorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onFavorite?.(l);
    };

    const primaryBadge = l.badges.find((b) => BADGE_LABELS[b]);
    const facts: Array<string> = [];
    if (l.beds != null) facts.push(`${l.beds} bd`);
    if (l.baths) facts.push(`${l.baths} ba`);
    if (l.parking) facts.push(`${l.parking} Parking`);
    if (l.sqft) facts.push(`${l.sqft} ft²`);
    if (!facts.length && l.lot) facts.push(l.lot);

    return (
        <a
            className="ps-card"
            href={l.href}
            onClick={(e) => { e.preventDefault(); onOpen(l); }}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
        >
            <div className="ps-card-media">
                {photos.map((src, pi) => (
                    <img key={pi} src={src || PHOTO_PLACEHOLDER} onError={onImgError} alt={l.address} loading="lazy" style={{ opacity: pi === idx ? 1 : 0, transition: 'opacity .2s' }} />
                ))}
                {primaryBadge && <span className={`ps-badge ${BADGE_LABELS[primaryBadge].cls}`}>{BADGE_LABELS[primaryBadge].icon}{BADGE_LABELS[primaryBadge].label}</span>}
                {l.badges.includes('virtual_tour') && <span className="ps-badge ps-badge--tour">Virtual Tour</span>}
                {l.badges.includes('open_house') && <span className="ps-badge ps-badge--oh">Open House</span>}
                {/* Share + favorite — white floating buttons, top-right of the photo. */}
                <div className="ps-card-fabs">
                    <button type="button" className="ps-card-fab" onClick={share} title={copied ? 'Link copied!' : 'Share listing'} aria-label="Share listing">
                        {copied
                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" /></svg>}
                    </button>
                    <button type="button" className="ps-card-fab" onClick={favorite} title={favorited ? 'Remove from favorites' : 'Save to favorites'} aria-label="Save to favorites" aria-pressed={favorited}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={favorited ? '#db2777' : 'none'} stroke={favorited ? '#db2777' : 'currentColor'} strokeWidth={2}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                    </button>
                </div>
                {photos.length > 1 && (
                    <>
                        <button type="button" className="ps-card-arrow prev" aria-label="Previous" onClick={(e) => go(e, -1)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <button type="button" className="ps-card-arrow next" aria-label="Next" onClick={(e) => go(e, 1)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                        <div className="ps-dots">
                            {photos.slice(0, 8).map((_, di) => <span key={di} className={`ps-dot${di === idx ? ' is-active' : ''}`} />)}
                        </div>
                    </>
                )}
            </div>
            <div className="ps-card-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <span className="ps-card-price">{l.price_formatted}</span>
                    <span className="ps-card-status" style={{ background: statusColor(l.status_label) }}>{l.status_label}</span>
                </div>
                <div className="ps-card-facts">
                    {facts.map((f, i) => (
                        <span key={i}>
                            {i > 0 && <span style={{ color: '#d1d5db' }}>|</span>}
                            <b>{f}</b>
                        </span>
                    ))}
                </div>
                {l.property_type && <div className="ps-card-type">{l.property_type}</div>}
                <div className="ps-card-addr">{l.address}</div>
                {(l.mls_number || l.office) && (
                    <p className="ps-card-mls">
                        {/* Exclusive/off-MLS listings have no number — show just the office. */}
                        {l.mls_number ? `MLS®: ${l.mls_number}${l.office ? `; ${l.office}` : ''}` : l.office}
                    </p>
                )}
            </div>
        </a>
    );
}
