/*
 | Central landing-page image resolver + fallbacks.
 |
 | Every image-based section resolves through here so no broken / empty image
 | ever renders on a public page. The chain (per the product spec) is:
 |   1. the AI / stored image URL, if present & usable
 |   2. a section-specific fallback for the page's category
 |   3. the category's hero fallback
 |   4. a final generic real-estate fallback
 |
 | Fallback URLs are curated, license-free Unsplash CDN images (verified 200).
 | This is the single source of truth — blocks never hardcode image URLs.
 */
import type { LpPageData } from './types';
import { img } from './helpers';

export type LpCategory = 'seller' | 'buyer' | 'luxury' | 'cash' | 'valuation';
export type LpSection = 'hero' | 'about' | 'cta' | 'video' | 'authority' | 'feature' | 'testimonial' | 'generic';

const W = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

// Verified real-estate imagery (all return 200 image/jpeg).
const IMG = {
    houseExterior: W('1568605114967-8130f3a36994'),
    homeExterior2: W('1570129477492-45c003edd2be'),
    modernHouse: W('1512917774080-9991f1c4c750'),
    neighborhood: W('1564013799919-ab600027ffc6'),
    luxuryHome: W('1613490493576-7fde63acd811'),
    luxuryInterior: W('1600596542815-ffad4c1539a9'),
    forSaleSign: W('1560518883-ce09059eeffa'),
    keys: W('1582407947304-fd86f028f716'),
    valuation: W('1554224155-8d04cb21cd6c'),
    homeSearch: W('1560448204-e02f11c3d0e2'),
    coupleViewing: W('1582268611958-ebfd161ef9cf'),
    familyHome: W('1511895426328-dc8714191300'),
    citySkyline: W('1486406146926-c627a92ad1ab'),
    // people (smaller crop) — used for the agent/authority placeholder only
    agent: W('1560250097-0b93528c311a', 600),
};

/** Final generic real-estate fallback. */
export const GENERIC_IMAGE = IMG.houseExterior;

const BY_CATEGORY: Record<LpCategory, Partial<Record<LpSection, string>>> = {
    seller: { hero: IMG.houseExterior, about: IMG.familyHome, cta: IMG.forSaleSign, video: IMG.houseExterior, authority: IMG.agent, feature: IMG.modernHouse },
    valuation: { hero: IMG.valuation, about: IMG.homeExterior2, cta: IMG.valuation, video: IMG.homeExterior2, authority: IMG.agent, feature: IMG.valuation },
    cash: { hero: IMG.forSaleSign, about: IMG.keys, cta: IMG.keys, video: IMG.forSaleSign, authority: IMG.agent, feature: IMG.keys },
    buyer: { hero: IMG.coupleViewing, about: IMG.homeSearch, cta: IMG.neighborhood, video: IMG.coupleViewing, authority: IMG.agent, feature: IMG.modernHouse },
    luxury: { hero: IMG.luxuryHome, about: IMG.luxuryInterior, cta: IMG.luxuryHome, video: IMG.luxuryHome, authority: IMG.agent, feature: IMG.luxuryInterior },
};

const TEMPLATE_CATEGORY: Record<string, LpCategory> = {
    'home-value': 'seller',
    'home-valuation': 'valuation',
    'cash-offer': 'cash',
    'buyer-search': 'buyer',
    'luxury-listing': 'luxury',
    'listing-masterclass': 'seller',
    'buyer-vip': 'buyer',
};

/** The page's image category — stored at create, else derived from type/flow/design. */
export function pageCategory(page: LpPageData): LpCategory {
    const stored = (page.config?.image_category as LpCategory | undefined);
    if (stored && BY_CATEGORY[stored]) return stored;

    const heroData = (page.blocks || []).find((b) => b.type === 'hero' || b.type === 'hero-video')?.data ?? {};
    const flow = heroData.flow as string | undefined;
    if (page.page.type === 'buyer' || flow === 'buyer') return 'buyer';
    if (flow === 'valuation') return 'valuation';
    return 'seller';
}

/** True if a stored image value is worth attempting (non-empty). Broken ones are caught at render via onError. */
export function hasImage(url?: string | null): boolean {
    return !!(url && String(url).trim().length > 0);
}

/** Section/category fallback (no stored image). */
export function fallbackFor(section: LpSection, category: LpCategory): string {
    return BY_CATEGORY[category]?.[section] ?? BY_CATEGORY[category]?.hero ?? GENERIC_IMAGE;
}

/**
 * Resolve the ordered list of candidate URLs for an image slot: the stored image
 * first (resolved to a URL), then the section fallback, then generic. Deduped so
 * onError never retries the same URL.
 */
export function imageCandidates(section: LpSection, page: LpPageData, url?: string | null): string[] {
    const list: string[] = [];
    if (hasImage(url)) list.push(img(url!, page));
    const category = pageCategory(page);
    list.push(fallbackFor(section, category));
    list.push(GENERIC_IMAGE);
    return [...new Set(list)];
}

/**
 * Single best image URL for a slot (matches the suggested
 * resolveLandingPageImage(sectionType, templateType, imageUrl) signature, but
 * derives the category from the page so callers can't pass a wrong one).
 */
export function resolveLandingPageImage(section: LpSection, page: LpPageData, url?: string | null): string {
    return imageCandidates(section, page, url)[0];
}

export { TEMPLATE_CATEGORY };
