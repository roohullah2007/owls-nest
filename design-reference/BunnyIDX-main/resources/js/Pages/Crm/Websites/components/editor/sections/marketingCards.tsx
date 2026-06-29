import { ReactNode } from 'react';

export interface GridCard {
    id: string;
    enabled?: boolean;
    title?: string;
    body?: string;
    cta_text?: string;
    cta_url?: string;
    /** Background photo — absolute URL or a relative public-storage path. */
    image?: string;
    slot?: number;
}

export const newCardId = () => 'c' + Math.random().toString(36).slice(2, 9);

const icon = (path: ReactNode) => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);

const I_BLANK = icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></>);
const I_HOME = icon(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>);
const I_TAG = icon(<><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></>);

export interface MarketingCardPreset {
    key: string;
    label: string;
    description: string;
    icon: ReactNode;
    make: (slug: string) => Omit<GridCard, 'id'>;
}

export const MARKETING_CARD_PRESETS: MarketingCardPreset[] = [
    {
        key: 'blank',
        label: 'Blank card',
        description: 'Your own tag, copy, button and grid position.',
        icon: I_BLANK,
        make: () => ({ enabled: true, slot: 3 }),
    },
    {
        key: 'valuation',
        label: 'Home Valuation',
        description: 'Drive sellers to your valuation funnel.',
        icon: I_HOME,
        make: (slug) => ({
            enabled: true, slot: 3,
            title: 'Free Home Valuation',
            body: "What's your home worth? Find out in minutes — free, no obligation.",
            cta_text: 'Get my valuation', cta_url: `/site/${slug}/home-valuation`,
            image: '/images/backgrounds/bg-4.jpg',
        }),
    },
    {
        key: 'list-with-me',
        label: 'List With Me',
        description: 'Pitch your listing services mid-grid.',
        icon: I_TAG,
        make: (slug) => ({
            enabled: true, slot: 8,
            title: 'Selling Soon?',
            body: 'List with a local expert. Get a pricing strategy built for this exact market.',
            cta_text: "Let's talk", cta_url: `/site/${slug}/contact`,
        }),
    },
];
