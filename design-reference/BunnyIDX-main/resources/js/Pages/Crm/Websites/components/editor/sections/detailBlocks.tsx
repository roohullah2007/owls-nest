import { ReactNode } from 'react';

export interface DetailBlock {
    id: string;
    enabled?: boolean;
    title?: string;
    body?: string;
    cta_text?: string;
    cta_url?: string;
    position?: string;
    statuses?: string[];
}

export const BLOCK_POSITIONS: Array<[string, string]> = [
    ['after_gallery', 'Below the photo gallery (full width)'],
    ['after_description', 'After the description'],
    ['before_comparables', 'Before comparable sales'],
    ['sidebar', 'Right sidebar'],
];

export const positionLabel = (pos?: string) =>
    BLOCK_POSITIONS.find(([v]) => v === (pos || 'after_description'))?.[1] ?? 'After the description';

export const MERGE_FIELDS = '{{address}} {{city}} {{price}} {{beds}} {{baths}} {{sqft}} {{status}} {{property_type}} {{mls_number}} {{agent_name}} {{agent_phone}}';

export const newId = () => 'b' + Math.random().toString(36).slice(2, 9);

const icon = (path: ReactNode) => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);

const I_BLANK = icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></>);
const I_CALENDAR = icon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>);
const I_BELL = icon(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>);
const I_HANDSHAKE = icon(<><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8" /></>);
const I_MAP = icon(<><path d="m9 6-6 3v15l6-3 6 3 6-3V6l-6 3-6-3z" /><path d="M9 6v15M15 9v15" /></>);
const I_STAR = icon(<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />);
const I_HOME = icon(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>);

/**
 * Palette presets for the IDX detail page — one click drops in a proven, fully
 * editable block. Special CTA links: #tour opens the tour modal, #register opens
 * the visitor signup modal.
 */
export interface DetailBlockPreset {
    key: string;
    label: string;
    description: string;
    icon: ReactNode;
    make: (slug: string) => Omit<DetailBlock, 'id'>;
}

export const DETAIL_BLOCK_PRESETS: DetailBlockPreset[] = [
    {
        key: 'blank',
        label: 'Blank block',
        description: 'Start from scratch — your own title, copy and CTA.',
        icon: I_BLANK,
        make: () => ({ enabled: true, position: 'after_description', statuses: [] }),
    },
    {
        key: 'tour',
        label: 'Schedule a tour CTA',
        description: 'Invite visitors to book a private showing.',
        icon: I_CALENDAR,
        make: () => ({
            enabled: true, position: 'after_description', statuses: [],
            title: 'See {{address}} in person',
            body: 'Pick a time that works for you and {{agent_name}} will arrange a private tour — no pressure, no obligation.',
            cta_text: 'Schedule a tour', cta_url: '#tour',
        }),
    },
    {
        key: 'sold-alerts',
        label: 'Sold → get listing alerts',
        description: 'Turn a sold home into an alert signup.',
        icon: I_BELL,
        make: () => ({
            enabled: true, position: 'after_gallery', statuses: ['sold'],
            title: 'This home is sold — don’t miss the next one',
            body: '{{address}} found its buyer. Create a free account and get alerted the moment similar homes in {{city}} hit the market.',
            cta_text: 'Get listing alerts', cta_url: '#register',
        }),
    },
    {
        key: 'pending-backup',
        label: 'Pending → backup offers',
        description: 'Capture interest on pending listings.',
        icon: I_HANDSHAKE,
        make: () => ({
            enabled: true, position: 'after_gallery', statuses: ['pending'],
            title: 'This home is pending — it’s not over yet',
            body: 'An offer was accepted on {{address}}, but deals fall through. Ask {{agent_name}} about backup offers or similar homes in {{city}}.',
            cta_text: 'Ask about this home', cta_url: '#tour',
        }),
    },
    {
        key: 'about-area',
        label: 'About the area (SEO)',
        description: 'Neighborhood copy that ranks and reassures.',
        icon: I_MAP,
        make: () => ({
            enabled: true, position: 'after_description', statuses: [],
            title: 'Living in {{city}}',
            body: 'Thinking about calling {{city}} home? From schools and commute times to dining and parks, {{agent_name}} knows this market street by street.\nAsk anything about the neighborhood before you book a showing — {{agent_phone}}.',
        }),
    },
    {
        key: 'why-me',
        label: 'Why work with me (sidebar)',
        description: 'A trust-building card in the right rail.',
        icon: I_STAR,
        make: (slug) => ({
            enabled: true, position: 'sidebar', statuses: [],
            title: 'Work with {{agent_name}}',
            body: 'Local expertise, sharp negotiation, and straight answers on every {{city}} home — including this one at {{price}}.',
            cta_text: 'Contact {{agent_name}}', cta_url: `/site/${slug}/contact`,
        }),
    },
    {
        key: 'valuation',
        label: 'Home valuation CTA',
        description: 'Catch sellers who need to value their home.',
        icon: I_HOME,
        make: (slug) => ({
            enabled: true, position: 'before_comparables', statuses: [],
            title: 'What’s YOUR home worth?',
            body: 'Selling before buying? Get a free, no-obligation valuation of your current home in minutes.',
            cta_text: 'Get my free valuation', cta_url: `/site/${slug}/home-valuation`,
        }),
    },
];
