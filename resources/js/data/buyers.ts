// Buyers-page content: the "Your Path" teaser cards and the "Buy Your Dream
// Home" feature columns. Copy/assets kept verbatim from the design contract
// (design-reference/buyers.html). Data lives here, not in JSX (CLAUDE.md §6).
import type { PathCardItem } from '@/types/listing';

/** Three "Your Path to Homeownership" teaser cards (rendered via PathCard). */
export const BUYER_PATHS: PathCardItem[] = [
    {
        image: '/images/hero-property-search.webp',
        alt: 'Search Homes',
        title: 'Search Homes',
        href: '/property-search',
        cta: 'Browse Listings',
    },
    {
        image: '/images/cta-home.webp',
        alt: 'Get Pre-Approved',
        title: 'Get Pre-Approved',
        href: '/contact',
        cta: 'Connect With a Lender',
    },
    {
        image: '/images/hero-contact.webp',
        alt: 'Talk to an Agent',
        title: 'Talk to an Agent',
        href: '/contact',
        cta: 'Contact Us',
    },
];

/** One "Buy Your Dream Home" feature column. */
export interface BuyFeature {
    title: string;
    /** Body copy split into lines so the original lg-only <br> breaks render. */
    lines: string[];
}

export const BUY_FEATURES: BuyFeature[] = [
    {
        title: 'Listing Alerts',
        lines: [
            'Discover your ideal home or',
            'investment with us. We take into',
            'account your budget, style, desired',
            'location, lifestyle, and business',
            'goals to find the perfect match for',
            'you.',
        ],
    },
    {
        title: 'Home Inspections',
        lines: [
            'We recognize the significance of a',
            'home inspection and the',
            'importance of selecting the right',
            'home inspector to ensure a',
            'thorough evaluation.',
        ],
    },
    {
        title: 'Vendor Network',
        lines: [
            'We collaborate with lenders and',
            'contractors to provide exclusive',
            'access to essential home services,',
            'including inspections, repairs,',
            'renovations, and financing.',
        ],
    },
    {
        title: 'Negotiating Power',
        lines: [
            'Our team is committed to helping',
            'you negotiate the best price and',
            'secure deal terms that align',
            'perfectly with your needs.',
        ],
    },
];
