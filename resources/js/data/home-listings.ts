// Home-page listing data (interim fixtures — replace with backend/Inertia props
// later). Kept out of JSX per the DRY/data rules in CLAUDE.md.
import type { Listing, PathCardItem, PropertySlide } from '@/types/listing';

const LISTINGS = {
    listing1: {
        id: 'listing1',
        image: '/images/listings/listing1.webp',
        alt: '3039 Us Route 3 Lot 1, Thornton, NH',
        price: '$1,395,000',
        beds: 4,
        baths: 3,
        sqft: '3,840',
        address: '3039 Us Route 3 Lot 1, Thornton, NH',
        href: '/property-search',
    },
    listing2: {
        id: 'listing2',
        image: '/images/listings/listing2.webp',
        alt: '41 Fischer Mountain Road, Thornton, NH',
        price: '$1,300,000',
        beds: 3,
        baths: 4,
        sqft: '2,427',
        address: '41 Fischer Mountain Road, Thornton, NH',
        href: '/property-search',
    },
    listing3: {
        id: 'listing3',
        image: '/images/listings/listing3.webp',
        alt: '15 Edgewater Lane, Thornton, NH',
        price: '$1,195,000',
        beds: 4,
        baths: 4,
        sqft: '3,740',
        address: '15 Edgewater Lane, Thornton, NH',
        href: '/property-search',
    },
    listing4: {
        id: 'listing4',
        image: '/images/listings/listing4.webp',
        alt: '1072 State Route 49, Thornton, NH',
        price: '$1,100,000',
        beds: 4,
        baths: 4,
        sqft: '2,582',
        address: '1072 State Route 49, Thornton, NH',
        href: '/property-search',
    },
} satisfies Record<string, Omit<Listing, 'status'>>;

/** Featured Listings rail (overlay cards). */
export const FEATURED_LISTINGS: Listing[] = [
    { ...LISTINGS.listing1, status: 'Active' },
    { ...LISTINGS.listing2, status: 'Active' },
    { ...LISTINGS.listing3, status: 'Active' },
    { ...LISTINGS.listing4, status: 'Active' },
];

/** Featured Properties slider (slide-up cards): a big card + two thumbnails. */
export const FEATURED_PROPERTY_SLIDES: PropertySlide[] = [
    {
        big: { ...LISTINGS.listing1, status: 'For Sale' },
        thumbnails: [
            { ...LISTINGS.listing2, status: 'For Sale' },
            { ...LISTINGS.listing3, status: 'For Sale' },
        ],
    },
    {
        big: { ...LISTINGS.listing4, status: 'For Sale' },
        thumbnails: [
            { ...LISTINGS.listing3, status: 'For Sale' },
            { ...LISTINGS.listing2, status: 'For Sale' },
        ],
    },
];

/** The three teaser/path cards on the navy band (Home Search / Valuation / Contact). */
export const PATH_CARDS: PathCardItem[] = [
    {
        image: '/images/hero-property-search.webp',
        alt: 'Home Search',
        title: 'Home Search',
        href: '#',
        cta: 'Learn More',
    },
    {
        image: '/images/cta-home.webp',
        alt: 'Home Valuation',
        title: 'Home Valuation',
        href: '#',
        cta: 'Learn More',
    },
    {
        image: '/images/hero-contact.webp',
        alt: 'Contact Us',
        title: 'Contact Us',
        href: '#',
        cta: 'Learn More',
    },
];
