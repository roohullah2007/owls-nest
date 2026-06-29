export interface AgentWebsite {
    id: number;
    uuid: string;
    slug: string;
    custom_domain: string | null;
    domain_status: string | null;
    domain_verified_at: string | null;
    domain_last_checked_at: string | null;
    template: string;
    accent_color: string | null;
    custom_colors: Record<string, string> | null;
    header_style: string | null;
    header_sticky: boolean;
    agent_name: string;
    agent_title: string | null;
    agent_tagline: string | null;
    agent_bio: string | null;
    agent_photo: string | null;
    agent_email: string | null;
    agent_phone: string | null;
    agent_whatsapp: string | null;
    office_address: string | null;
    contact_display: Record<string, boolean> | null;
    agent_city: string | null;
    agent_state: string | null;
    agent_license_number: string | null;
    brokerage_name: string | null;
    brokerage_logo_light: string | null;
    brokerage_logo_dark: string | null;
    site_logo_light: string | null;
    site_logo_dark: string | null;
    areas_label: string | null;
    hero_image: string | null;
    hero_headline: string | null;
    hero_subtitle: string | null;
    hero_style: string | null;
    buy_headline: string | null;
    buy_description: string | null;
    sell_headline: string | null;
    sell_description: string | null;
    about_extended: string | null;
    testimonials: { text: string; name: string; role?: string; source?: string; google_id?: string }[] | null;
    page_data?: {
        _config?: {
            google_reviews?: GoogleReviewsConfig | null;
            [key: string]: any;
        };
        [key: string]: any;
    } | null;
    social_facebook: string | null;
    social_instagram: string | null;
    social_linkedin: string | null;
    social_youtube: string | null;
    social_tiktok: string | null;
    meta_title: string | null;
    meta_description: string | null;
    og_title: string | null;
    og_description: string | null;
    og_image: string | null;
    favicon: string | null;
    robots_txt: string | null;
    llms_txt: string | null;
    tracking_head: string | null;
    tracking_body: string | null;
    thank_you_headline: string | null;
    thank_you_message: string | null;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}


/** Connected Google Business Profile (page_data._config.google_reviews). */
export interface GoogleReviewsConfig {
    place_id: string;
    name: string;
    address: string | null;
    connected_at: string;
}

export interface ColorOption {
    key: string;
    label: string;
    default?: string;
}

export interface TemplateConfig {
    name: string;
    description: string;
    /** Swatch shown on the template card (bg + accent). */
    preview?: { bg: string; accent: string };
    /** Color slots this theme supports (Primary, Secondary, …). Optional — defaults to Primary + Secondary. */
    colors?: ColorOption[];
}

export interface BlogPostData {
    id: number;
    slug: string;
    title: string;
    excerpt: string | null;
    category: string | null;
    body: string;
    featured_image: string | null;
    status: 'draft' | 'published';
    published_at: string | null;
    meta_title: string | null;
    meta_description: string | null;
    created_at: string;
}

export interface WebsiteFormData {
    agent_name: string;
    agent_title: string;
    agent_tagline: string;
    agent_bio: string;
    agent_email: string;
    agent_phone: string;
    agent_whatsapp: string;
    office_address: string;
    contact_display: Record<string, boolean>;
    agent_city: string;
    agent_state: string;
    agent_license_number: string;
    brokerage_name: string;
    template: string;
    accent_color: string;
    custom_colors: Record<string, string>;
    social_facebook: string;
    social_instagram: string;
    social_linkedin: string;
    social_youtube: string;
    social_tiktok: string;
    meta_title: string;
    meta_description: string;
    is_published: boolean;
}

export type FormSetData = (key: keyof WebsiteFormData, value: any) => void;
export type FormErrors = Partial<Record<keyof WebsiteFormData, string>>;
