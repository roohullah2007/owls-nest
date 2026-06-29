// Home hero search tabs (Buy / Sell / Home Valuation). Each tab restyles the
// active pill and swaps the search form's action, the input placeholder, and the
// submit button label. Ported from the original inline #heroSearchTabs script.

export interface HeroSearchTab {
    id: string;
    label: string;
    /** Form `action` when this tab is active. */
    action: string;
    /** Search input placeholder when this tab is active. */
    placeholder: string;
    /** Submit button label when this tab is active. */
    cta: string;
}

export const HERO_SEARCH_TABS: HeroSearchTab[] = [
    {
        id: 'buy',
        label: 'Buy',
        action: '/property-search',
        placeholder: 'Search address or city',
        cta: 'Search',
    },
    {
        id: 'sell',
        label: 'Sell',
        action: '/sellers',
        placeholder: 'Enter your property address',
        cta: 'Get Started',
    },
    {
        id: 'valuation',
        label: 'Home Valuation',
        action: '#',
        placeholder: 'Enter your property address',
        cta: 'Get Estimate',
    },
];
