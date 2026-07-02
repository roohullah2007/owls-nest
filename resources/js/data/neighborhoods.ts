// Neighborhood/community data for the home "Neighborhoods" explorer and the
// communities pages. Remote image URLs kept verbatim from the design contract.

export interface Neighborhood {
    id: string;
    name: string;
    image: string;
    href: string;
}

export const NEIGHBORHOODS: Neighborhood[] = [
    {
        id: 'owls-nest-resort',
        name: "Owl's Nest Resort",
        image: '/images/nb-owls-nest-resort.webp',
        href: '/property-search',
    },
    {
        id: 'rumney-ridge',
        name: 'Rumney Ridge',
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
        id: 'investment-properties',
        name: 'Investment Properties',
        image: '/images/nb-investment-properties.webp',
        href: '/property-search',
    },
];
