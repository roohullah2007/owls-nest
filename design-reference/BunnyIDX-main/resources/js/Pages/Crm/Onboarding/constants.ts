import { ReactNode } from 'react';

/** Larger (40px) input/select styling — scoped to the onboarding wizard only. */
export const onboardingInputClass =
    'block w-full h-10 px-3 text-[14px] border border-[#C8CCD1] rounded-lg text-[#111315] bg-white placeholder-[#C4C9D1] focus:outline-none focus:border-[#1693C9] focus:ring-0';

/** Selectable site features. Keys must match OnboardingController::FEATURE_BLOCKS + flags. */
export interface FeatureDef {
    key: string;
    title: string;
    desc: string;
    icon: ReactNode;
}

// Inline SVG paths kept as data so the list stays declarative; rendered by FeaturesStep.
export const FEATURE_ICON_PATHS: Record<string, string> = {
    ai_chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4-.84L3 20l1.16-3.48A7.93 7.93 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z',
    home_valuation: 'M3 12l9-9 9 9M5 10v10h14V10M9 21v-6h6v6',
    home_search: 'M21 21l-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z',
    off_market: 'M3 7l9-4 9 4-9 4-9-4Zm0 5l9 4 9-4m-18 5l9 4 9-4',
    team_profiles: 'M17 20h5v-1a4 4 0 0 0-4-4h-1m-6 5H2v-1a4 4 0 0 1 4-4h4m4-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    new_developments: 'M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M19 21V11a2 2 0 0 0-2-2h-2M9 7h2M9 11h2M9 15h2',
};

export const FEATURES: { key: string; title: string; desc: string }[] = [
    { key: 'ai_chat', title: 'AI Buyer/Seller Chat', desc: 'A 24/7 assistant that captures qualified leads.' },
    { key: 'home_valuation', title: 'AI Home Valuation', desc: 'Let visitors get an instant estimate of their home’s value.' },
    { key: 'home_search', title: 'AI-Powered Home Search', desc: 'Smart property search across your connected MLS.' },
    { key: 'new_developments', title: 'New Developments', desc: 'Showcase new and pre-construction projects.' },
    { key: 'off_market', title: 'Off-Market Listings', desc: 'Showcase exclusive pocket listings to qualified buyers.' },
    { key: 'team_profiles', title: 'Team / Agent Profiles', desc: 'Highlight the agents on your team with bios and photos.' },
];

// Geography lives in the shared Websites constants (single source of truth).
export { COUNTRIES, CA_PROVINCES } from '../Websites/constants';

/**
 * "New Developments" is gated to regions we have preloaded data for: Florida in
 * the US, and all of Canada.
 */
export function newDevelopmentsAvailable(country: string, state: string): boolean {
    return country === 'CA' || (country === 'US' && state === 'FL');
}
