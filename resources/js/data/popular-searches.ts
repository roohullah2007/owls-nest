// "Popular Searches" link columns shown on the home page navy band.

export interface SearchLink {
    label: string;
    href: string;
}

export interface SearchColumn {
    title: string;
    links: SearchLink[];
}

const HREF = '/property-search';
const link = (label: string): SearchLink => ({ label, href: HREF });

export const POPULAR_SEARCHES: SearchColumn[] = [
    {
        title: 'Lake Living',
        links: [
            'Conway Lake Real Estate',
            'Umbagog Lake Real Estate',
            'Lake Winnipesaukee Real Estate',
            'Lake Winnisquam Real Estate',
            'Newfound Lake Real Estate',
            'Silver Lake Real Estate',
            'Squam Lake Real Estate',
            'Stinson Lake Real Estate',
        ].map(link),
    },
    {
        title: 'Ski Area Living',
        links: [
            'Attitash Mountain Resort Real Estate',
            'Black Mountain Real Estate',
            'Bretton Woods Real Estate',
            'Cannon Mountain Ski Area Real Estate',
            'Cranmore Mountain Resort Real Estate',
            'Jericho Mountain State Park Real Estate',
            'Loon Mountain Ski Area Real Estate',
            'Tenney Mountain Ski Area Real Estate',
            'Waterville Valley Ski Area Real Estate',
            'Wildcat Mountain Real Estate',
        ].map(link),
    },
    {
        title: 'Golf Course Living',
        links: [
            'Androscoggin Valley Country Club Real Estate',
            'Bretton Woods Golf Area Real Estate',
            'North Conway Country Club Real Estate',
            'Maplewood Golf Course Area Real Estate',
            "Owl's Nest Golf Club Real Estate",
            'Waumbek Golf Course Area Real Estate',
        ].map(link),
    },
    {
        title: 'Homes & Communities',
        links: [
            "Owl's Nest Resort Homes For Sale",
            "Owl's Nest Resort Condos For Sale",
            "Owl's Nest Resort Real Estate Guide",
            'Thornton NH Homes For Sale',
            'Campton NH Homes For Sale',
            'Plymouth NH Homes For Sale',
            'Meredith NH Homes For Sale',
            'White Mountains Luxury Homes',
            'Lake Winnipesaukee Luxury Homes',
            'White Mountains Land For Sale',
        ].map(link),
    },
    {
        title: 'Land & Investment',
        links: [
            'NH Land Development Opportunities',
            'Subdivision Potential Land NH',
            'White Mountains Investment Properties',
            'Short-Term Rental Properties NH',
            'Airbnb Investment Properties NH',
        ].map(link),
    },
];
