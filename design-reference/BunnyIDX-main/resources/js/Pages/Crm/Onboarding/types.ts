import { TemplateConfig } from '../Websites/types';

export interface MlsProviderOption {
    id: number;
    slug: string;
    name: string;
    region: string | null;
    country: string | null;
    logo: string | null;
    has_idx_feed: boolean;
    has_vow_feed: boolean;
    monthly_fee: string;
}

export type FeaturedChoice = 'mine' | 'office' | 'none';

export interface OnboardingTeamMember {
    first_name: string;
    last_name: string;
    role: string;
    // Optional — when set (and the user is on the Team plan) a real invitation
    // is sent on submit; otherwise the row is website-display only.
    email: string;
    // All-string shape so the array is FormData-convertible in the Inertia payload.
    [key: string]: string;
}

export interface OnboardingData {
    custom_domain: string;
    template: string;
    business_description: string;
    agent_name: string;
    agent_email: string;
    agent_phone: string;
    agent_country: string;
    agent_city: string;
    agent_state: string;
    brokerage_name: string;
    agent_whatsapp: string;
    office_address: string;
    site_type: 'agent' | 'team';
    team_members: OnboardingTeamMember[];
    features: string[];
    mls_provider_id: number | null;
    communities: string[];
    blogging: boolean | null;
    featured: FeaturedChoice;
}

export interface OnboardingPageProps {
    templates: Record<string, TemplateConfig>;
    mlsProviders: MlsProviderOption[];
    hasMls: boolean;
    isTeamContext: boolean;
    hasTeam: boolean;
    canInviteTeam: boolean;
    // Set only when an admin runs the wizard for another user (admin → Websites).
    forUser?: { id: number; name: string } | null;
    defaults: {
        agent_name: string;
        agent_email: string;
        agent_phone: string;
        brokerage_name: string;
        agent_city: string;
        agent_state: string;
        agent_country: string;
        mls_provider_id: number | null;
    };
}

/** Props every step body receives from the wizard shell. */
export interface StepProps {
    data: OnboardingData;
    set: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
    page: OnboardingPageProps;
    errors: Record<string, string>;
}
