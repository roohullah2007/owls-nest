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
        image: 'https://owlsnestrealestate.com/wp-content/uploads/2026/05/owl-s-nest-resort.jpg',
        href: '#',
    },
    {
        id: 'rumney-ridge',
        name: 'Rumney Ridge',
        image: 'https://owlsnestrealestate.com/wp-content/uploads/2026/05/file_000000005a2471fd9de364c15aa7385c.png',
        href: '#',
    },
    {
        id: 'waterville-valley',
        name: 'Waterville Valley',
        image: 'https://owlsnestrealestate.com/wp-content/uploads/2026/05/Waterville_Valley_Town_Square_Village_Rd_New_Hampshire_-_panoramio-scaled.jpg',
        href: '#',
    },
    {
        id: 'lakes-region',
        name: 'Lakes Region',
        image: 'https://owlsnestrealestate.com/wp-content/uploads/2026/05/Lakes-Region-NH.png',
        href: '#',
    },
    {
        id: 'investment-properties',
        name: 'Investment Properties',
        image: 'https://owlsnestrealestate.com/wp-content/uploads/2026/05/7xm.xyz685693.jpg',
        href: '#',
    },
];
