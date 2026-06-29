export interface BlockData {
    id: string;
    type: string;
    slot: string;
    data: Record<string, string>;
}

export interface PageData {
    blocks?: BlockData[];
    [key: string]: unknown;
}

export interface SiteData {
    id: number;
    uuid: string;
    slug: string;
    agent_name: string;
    agent_title: string | null;
    agent_bio: string | null;
    agent_photo: string | null;
    agent_email: string | null;
    agent_phone: string | null;
    agent_city: string | null;
    agent_state: string | null;
    template: string;
    header_style: string | null;
    header_sticky: boolean;
    site_logo_light: string | null;
    site_logo_dark: string | null;
    hero_headline: string | null;
    hero_subtitle: string | null;
    hero_image: string | null;
    buy_headline: string | null;
    buy_description: string | null;
    sell_headline: string | null;
    sell_description: string | null;
    about_extended: string | null;
    testimonials: Array<{ text: string; name: string; role: string }> | null;
    brokerage_logo: string | null;
    page_data: Record<string, PageData> | null;
    meta_title: string | null;
    meta_description: string | null;
    favicon: string | null;
    og_image: string | null;
    og_title: string | null;
    og_description: string | null;
    robots_txt: string | null;
    llms_txt: string | null;
    tracking_head: string | null;
    tracking_body: string | null;
}

export interface MediaItem {
    id?: number;
    path: string;
    url: string;
    label?: string;
    source?: string;
}

export interface EditorCapabilities {
    /** Owner's MLS carries sold/closed listings — gates the AVM / Home Value block. */
    sold_comps?: boolean;
}

export interface ApiResponse<T = unknown> {
    success?: boolean;
    site?: SiteData;
    capabilities?: EditorCapabilities;
    value?: string;
    url?: string;
    error?: string;
    errors?: Record<string, string[]>;
    data?: T;
}

// Template config types
export interface FieldConfig {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'image' | 'code' | 'select' | 'number';
    rows?: number;
    ai?: string;
    uploadKey?: string;
    siteKey?: string;
    maxSizeMb?: number;
    storage?: 'column';
    sourcePage?: string;
    defaultValue?: string;
    /** For `select` fields. */
    options?: { value: string; label: string }[];
    /** Optional helper text shown under the field. */
    hint?: string;
}

export interface SectionConfig {
    id: string;
    label: string;
    fields: FieldConfig[];
}

export interface PageConfig {
    label: string;
    sections: SectionConfig[];
}

export type TemplateConfig = Record<string, Record<string, PageConfig>>;
