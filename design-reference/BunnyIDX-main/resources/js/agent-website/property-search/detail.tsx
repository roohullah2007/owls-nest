/*
 | Entry for the standalone public listing-detail page. Reuses the exact same
 | <ListingDetail> the result-card modal renders (mode="page"), so the modal and
 | the full screen are identical. The Blade page builds a PsListing-shaped JSON
 | from the real MlsListing and the page config into the #ps-detail mount node.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ListingDetail from './components/ListingDetail';
import { fetchFavoriteIds, toggleFavorite } from './lib/api';
import { PsAccountEndpoints, PsListing } from './types';

interface DetailCfg {
    leadEndpoint: string;
    backHref?: string;
    description?: string;
    endpoint?: string;
    courtesy?: { office?: string | null; mlsName?: string | null; logo?: string | null; disclaimer?: string | null };
    visitor?: { name: string } | null;
    account?: PsAccountEndpoints;
    consentText?: string;
    agent?: { name?: string | null; title?: string | null; phone?: string | null; photo?: string | null; bg?: string | null };
    showingEndpoint?: string;
    building?: Array<[string, string]> | null;
    detailBlocks?: import('./lib/merge').PsDetailBlock[];
    detailSections?: Array<{ key: string; label?: string; enabled?: boolean }>;
}

/** Page root — owns the visitor-account favorite state for this listing. */
function DetailPage({ cfg, listing, accent }: { cfg: DetailCfg; listing: PsListing; accent: string }) {
    const authed = !!(cfg.visitor && cfg.account);
    const [favorited, setFavorited] = useState(false);

    useEffect(() => {
        if (!authed || !cfg.account) return;
        const ctrl = new AbortController();
        fetchFavoriteIds(cfg.account.favoriteIds, ctrl.signal)
            .then((ids) => setFavorited(ids.includes(listing.id)))
            .catch(() => { /* guest-like fallback */ });
        return () => ctrl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authed]);

    const handleFavorite = (l: PsListing) => {
        if (!authed || !cfg.account) {
            window.dispatchEvent(new CustomEvent('ps:open-auth', { detail: 'register' }));
            return;
        }
        toggleFavorite(cfg.account.favorites, {
            mls_slug: l.mls_slug,
            listing_id: l.mls_id,
            snapshot: {
                address: l.address,
                price_formatted: l.price_formatted,
                photo: l.photos[0] || null,
                href: l.href,
                beds: l.beds,
                baths: l.baths,
                sqft: l.sqft,
            },
        }).then((fav) => { if (fav !== null) setFavorited(fav); });
    };

    return (
        <ListingDetail
            listing={listing}
            accent={accent}
            leadEndpoint={cfg.leadEndpoint}
            searchEndpoint={cfg.endpoint}
            courtesy={cfg.courtesy}
            favorited={favorited}
            onToggleFavorite={handleFavorite}
            consentText={cfg.consentText}
            agent={cfg.agent}
            showingEndpoint={cfg.showingEndpoint}
            building={cfg.building}
            customBlocks={cfg.detailBlocks}
            detailSections={cfg.detailSections}
            mode="page"
            backHref={cfg.backHref}
            descriptionOverride={cfg.description ?? null}
        />
    );
}

const node = document.getElementById('ps-detail');
if (node) {
    const cfg = JSON.parse(node.dataset.config || '{}') as DetailCfg;
    const listing = JSON.parse(node.dataset.listing || 'null') as PsListing | null;
    const accent = getComputedStyle(node).getPropertyValue('--ps-accent').trim() || '#022E50';
    if (listing) {
        createRoot(node).render(<DetailPage cfg={cfg} listing={listing} accent={accent} />);
    }
}
