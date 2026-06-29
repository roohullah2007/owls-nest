/*
 | Shared types for the public, React-rendered landing page (classic +
 | video-landing designs) and the full-screen lead flow.
 |
 | The Blade shell (resources/views/landing-pages/partials/spa-shell.blade.php)
 | emits a #lp-root node with a data-page JSON payload of this exact shape and
 | mounts resources/js/landing-pages/public/app.tsx into it. There is NO Blade
 | templating of the page content — every block is a React component.
 */

export interface LpBlock {
    id: string;
    type: string;
    hidden?: boolean;
    data: Record<string, any>;
}

export interface LpAgent {
    name: string | null;
    email: string | null;
    phone: string | null;
    photo: string | null; // already resolved to a URL server-side
}

export interface LpConfig {
    logo?: string | null; // already resolved to a URL server-side
    header_brand?: string | null;
    webhook_url?: string | null;
    urgency_text?: string | null;
    [key: string]: any;
}

export interface LpPage {
    name: string;
    type: string; // buyer | seller
    slug: string;
}

/** Flow-only payload — the multi-step buyer/seller questionnaire. */
export interface LpFlow {
    hero: Record<string, any>;
    address: string;
    owner: string;
}

export interface LpPageData {
    template: string; // classic | video-landing
    mode: 'page' | 'flow';
    accent: string;
    submitUrl: string;
    showUrl: string;
    flowUrl: string;
    csrf: string;
    submitted: boolean;
    isOwnerDraft: boolean;
    isPublished: boolean;
    mapsKey: string | null;
    assetBase: string; // base URL for resolving relative storage paths
    privacyUrl: string;
    termsUrl: string;
    page: LpPage;
    agent: LpAgent;
    config: LpConfig;
    blocks: LpBlock[];
    flow?: LpFlow;
}

export interface BlockProps {
    data: Record<string, any>;
    page: LpPageData;
}
