// Home-page marketing card data. Listing/property data is NOT kept here — the
// Featured Listings rail and Featured Properties slider render live PrimeMLS
// listings passed as Inertia props from HomeController. This file only holds the
// static navigation "path" cards (Home Search / Valuation / Contact), which are
// marketing teasers, not listings.
import type { PathCardItem } from '@/types/listing';

/** The three teaser/path cards on the navy band (Home Search / Valuation / Contact). */
export const PATH_CARDS: PathCardItem[] = [
    {
        image: '/images/hero-property-search.webp',
        alt: 'Home Search',
        title: 'Home Search',
        href: '/property-search',
        cta: 'Learn More',
    },
    {
        image: '/images/cta-home.webp',
        alt: 'Home Valuation',
        title: 'Home Valuation',
        // In-page anchor: the ValuationWidget section further down the home page.
        href: '#valuation',
        cta: 'Learn More',
    },
    {
        image: '/images/hero-contact.webp',
        alt: 'Contact Us',
        title: 'Contact Us',
        href: '/contact',
        cta: 'Learn More',
    },
];
