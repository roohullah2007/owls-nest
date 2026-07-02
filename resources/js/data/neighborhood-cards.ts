// Data for the Neighborhoods page "Areas and Current Projects" grid. These are
// the white article cards (image on top + body) — a different shape from the
// home/communities `NEIGHBORHOODS` overlay cards, so they live separately.
// Remote image URLs kept verbatim from the design contract.

export interface NeighborhoodCard {
    id: string;
    name: string;
    image: string;
    description: string;
    href: string;
}

export const NEIGHBORHOOD_CARDS: NeighborhoodCard[] = [
    {
        id: 'owls-nest-resort',
        name: "Owl's Nest Resort",
        image: '/images/nb-owls-nest-resort.webp',
        description:
            'A premier four-season resort community in Thornton offering luxury homes, championship golf, and stunning mountain-view living.',
        href: '/property-search',
    },
    {
        id: 'rumney-ridge-trade-center',
        name: 'Rumney Ridge Trade Center',
        image: '/images/nb-rumney-ridge.webp',
        description:
            'A prime commercial and mixed-use development opportunity in the heart of Rumney, designed for growth and connectivity.',
        href: '/property-search',
    },
    {
        id: 'waterville-valley',
        name: 'Waterville Valley',
        image: '/images/nb-waterville-valley.webp',
        description:
            'A classic White Mountains village known for skiing, a charming town square, and year-round outdoor recreation.',
        href: '/property-search',
    },
    {
        id: 'lakes-region',
        name: 'Lakes Region',
        image: '/images/nb-lakes-region.webp',
        description:
            "Sparkling lakes and waterfront living across central New Hampshire's most sought-after shoreline communities.",
        href: '/property-search',
    },
    {
        id: 'featured-properties',
        name: 'Featured Properties',
        image: '/images/hero-communities.webp',
        description:
            'Browse our latest active listings across the White Mountains and Lakes Region, hand-picked by our team.',
        href: '/featured-properties',
    },
];
