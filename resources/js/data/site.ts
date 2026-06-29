// Single source of truth for sitewide brand data (nav, contact, footer).
// Change a link or phone number here and it updates everywhere (DRY).

export interface NavLink {
    label: string;
    href: string;
    children?: NavLink[];
}

export const NAV_LINKS: NavLink[] = [
    { label: 'Property Search', href: '/property-search' },
    { label: 'Featured Properties', href: '/featured-properties' },
    { label: 'Buyers', href: '/buyers' },
    { label: 'Sellers', href: '/sellers' },
    { label: 'About', href: '/about' },
    {
        label: 'Communities & Projects',
        href: '/communities-projects',
        children: [{ label: 'Neighborhoods', href: '/neighborhoods' }],
    },
    { label: 'Contact', href: '/contact' },
];

export const SITE = {
    name: "Owl's Nest Real Estate",
    logo: '/assets/images/logo.png',
    phoneDisplay: '401-648-5308',
    phoneHref: 'tel:+14016485308',
    email: 'TomDeMatteo.ONR@gmail.com',
    address: { line1: '399 NH Route 49', line2: 'Campton, NH 03223' },
    social: {
        facebook: '#',
        instagram: '#',
        x: '#',
    },
    realtorEhoLogo:
        'https://res.cloudinary.com/luxuryp/images/f_auto,q_auto/g5qzbyky8ifp5w0ex0ik/realtor-eho-logo-07232021-update-dark',
} as const;

// PrimeMLS IDX disclaimer shown in the footer (design contract — keep verbatim).
export const MLS_DISCLAIMER =
    "Copyright 2026 PrimeMLS, Inc. All rights reserved. This information is deemed reliable, but not guaranteed. The data relating to real estate displayed on this Site comes in part from the IDX Program of PrimeMLS. The information being provided is for consumers' personal, non-commercial use and may not be used for any purpose other than to identify prospective properties consumers may be interested in purchasing. This display of listings may or may not be the entire Compilation from the PrimeMLS database, and PrimeMLS does not guarantee the accuracy of such information. The listing broker's offer of compensation is made only to other real estate licensees who are participant members of the PrimeMLS.";

// Footer "Navigation" column links.
export const FOOTER_NAV: NavLink[] = [
    { label: 'Featured Properties', href: '/featured-properties' },
    { label: 'Home Search', href: '/property-search' },
    { label: 'Home Valuation', href: '#' },
    { label: 'Neighborhoods', href: '/neighborhoods' },
    { label: 'Contact Us', href: '/contact' },
];
