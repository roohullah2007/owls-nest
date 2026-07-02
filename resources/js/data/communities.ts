// Page-specific data for the Communities & Projects page: the six featured
// area/project cards, the four "Welcome" area write-ups, and the two-step
// valuation timeline. Copy kept verbatim from the design contract
// (communities-projects.html). Remote image URLs preserved verbatim.
import type { Neighborhood } from '@/data/neighborhoods';

/** The six "Areas and Current Projects" cards (CommunityCardOverlay grid). */
export const COMMUNITY_PROJECTS: Neighborhood[] = [
    {
        id: 'owls-nest-resort',
        name: "Owl's Nest Resort",
        image: '/images/nb-owls-nest-resort.webp',
        href: '/property-search',
    },
    {
        id: 'rumney-ridge-trade-center',
        name: 'Rumney Ridge Trade Center',
        image: '/images/nb-rumney-ridge.webp',
        href: '/property-search',
    },
    {
        id: 'waterville-valley',
        name: 'Waterville Valley',
        image: '/images/nb-waterville-valley.webp',
        href: '/property-search',
    },
    {
        id: 'lakes-region',
        name: 'Lakes Region',
        image: '/images/nb-lakes-region.webp',
        href: '/property-search',
    },
    {
        id: 'featured-properties',
        name: 'Featured Properties',
        image: '/images/hero-communities.webp',
        href: '/featured-properties',
    },
    {
        id: 'investment-opportunities',
        name: 'Investment Opportunities',
        image: '/images/hero-owls-nest-resort.webp',
        href: '/property-search',
    },
];

/** One of the four "Welcome to ..." area write-ups (ImageTextSplit). */
export interface WelcomeSection {
    id: string;
    eyebrow?: string;
    title: string;
    paragraphs: string[];
    cta: { label: string; href: string };
    image: string;
    imageAlt: string;
    /** `'navy'` renders the section on a navy background with white copy. */
    tone?: 'light' | 'navy';
}

export const WELCOME_SECTIONS: WelcomeSection[] = [
    {
        id: 'owls-nest-resort',
        title: "Welcome To Owl's Nest Resort Real Estate",
        paragraphs: [
            "Welcome to Owl's Nest Resort, one of New Hampshire's premier luxury resort communities nestled in the heart of the White Mountains. Known for its breathtaking mountain views, upscale residences, and world-class amenities, Owl's Nest Resort offers an unmatched lifestyle for homeowners seeking both relaxation and adventure. Whether you're looking for a vacation retreat, full-time residence, or investment opportunity, this vibrant resort community delivers exceptional value and lifestyle appeal.",
            "As your trusted real estate partner, we're here to help you navigate the Owl's Nest Resort real estate market with confidence. From elegant townhomes to luxury vacation properties, we'll guide you in finding the perfect home to fit your goals and lifestyle.",
        ],
        cta: { label: "Explore Owl's Nest Resort", href: '/property-search' },
        image: '/images/hero-owls-nest-resort.webp',
        imageAlt: "Aerial view of Owl's Nest Resort",
    },
    {
        id: 'rumney-ridge',
        tone: 'navy',
        eyebrow: 'Communities & Projects',
        title: 'Welcome to Rumney Ridge Trade Center Real Estate',
        paragraphs: [
            'Welcome to Rumney Ridge Trade Center, a growing and strategically located area offering excellent opportunities for residential and commercial real estate investment. Positioned near key travel routes and surrounded by scenic New Hampshire beauty, this area appeals to business owners, investors, and homebuyers alike seeking convenience and future growth.',
            "Whether you're exploring nearby residential opportunities or investment properties in the surrounding area, Rumney Ridge Trade Center offers a unique blend of accessibility and development potential.",
        ],
        cta: {
            label: 'Explore Rumney Ridge Trade Center',
            href: '/property-search',
        },
        image: '/images/rumney-welcome.webp',
        imageAlt: 'Rumney Ridge Trade Center development',
    },
    {
        id: 'waterville-valley',
        eyebrow: 'Communities & Projects',
        title: 'Welcome to Waterville Valley Real Estate',
        paragraphs: [
            'Welcome to Waterville Valley, a beloved mountain town known for its year-round recreation, charming alpine atmosphere, and incredible natural surroundings. Tucked within the White Mountains, Waterville Valley offers residents and visitors a perfect blend of outdoor adventure, scenic beauty, and small-town community living.',
            "Whether you're searching for a mountain getaway, ski condo, or full-time residence, Waterville Valley offers a wide range of properties to suit every lifestyle.",
        ],
        cta: { label: 'Explore Waterville Valley', href: '/property-search' },
        image: '/images/wv-hero.webp',
        imageAlt: 'Waterville Valley Town Square resort village',
    },
    {
        id: 'lakes-region',
        tone: 'navy',
        title: 'Welcome To Lakes Region Real Estate',
        paragraphs: [
            "Welcome to New Hampshire's stunning Lakes Region, a destination celebrated for its crystal-clear lakes, charming waterfront towns, and unmatched outdoor lifestyle. This sought-after area offers a unique blend of scenic beauty, recreation, and relaxed lakeside living that attracts homeowners from all over the country.",
            'From waterfront estates to cozy lake cottages and luxury retreats, the Lakes Region offers real estate opportunities for every kind of buyer.',
        ],
        cta: { label: 'Explore Lakes Region', href: '/property-search' },
        image: '/images/nb-lakes-region.webp',
        imageAlt: 'Lakes Region waterfront town',
    },
];

/** One person in the "Meet The People Behind Owl's Nest" timeline. */
export interface TeamTimelineMember {
    name: string;
    role: string;
    blurb: string;
}

export const TEAM_TIMELINE: TeamTimelineMember[] = [
    {
        name: 'Tom DeMatteo',
        role: 'Broker / Owner',
        blurb: "Founder of Owl's Nest Real Estate, Tom brings a highly strategic, results-driven approach with deep expertise in land analysis, subdivision feasibility, and new construction across the White Mountains.",
    },
    {
        name: 'Dawn Assencoa',
        role: 'Realtor®',
        blurb: 'With a strong background in construction and property maintenance, Dawn offers a practical, client-focused approach and relates closely to buyers relocating from Massachusetts and Rhode Island.',
    },
    {
        name: 'Mattie Boyle',
        role: 'Realtor®',
        blurb: 'A local expert in resort markets and short-term rentals, Mattie helps buyers and investors evaluate vacation and income properties throughout the White Mountains.',
    },
];

/** One step of the "How Is A Valuation Performed?" timeline. */
export interface ValuationStep {
    id: string;
    label: string;
    title: string;
    body: string;
}

export const VALUATION_STEPS: ValuationStep[] = [
    {
        id: 'cma',
        label: 'Market Analysis',
        title: 'Comparative Market Analysis',
        body: 'A Comparative Market Analysis (CMA) is a tool used by real estate agents to value a home. It evaluates similar homes that have recently sold in the same area. Agents find comparable sales and use them to conduct a sales comparison. In most cases, an agent will find three homes that have recently sold and are as similar to and located as close to the home being valued as possible. Each one is then analyzed to pinpoint differences between it and the home being valued. Once these differences are priced out, the price of each comp is adjusted to see what it would cost if it was identical to the home being valued were it to be sold in the current market.',
    },
    {
        id: 'appraisals',
        label: 'Appraisals',
        title: 'Based on a Professional’s Opinion',
        body: "An appraisal is an unbiased valuation of a home based on a professional's opinion. This is usually what mortgage companies use for home purchases and refinances. A lender usually orders a home appraisal and the cost of the appraisal, sometimes up to $500, is paid by the homeowner. An appraiser does a complete visual inspection of the interior and exterior and considers recent sales of similar properties and market trends. The appraiser then compiles a detailed report including building sketches, a street map, photographs, square footage calculations, and other relevant documentation.",
    },
];
