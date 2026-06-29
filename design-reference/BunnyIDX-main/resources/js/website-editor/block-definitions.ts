import { FieldConfig } from './types';

export interface BlockDefinition {
    type: string;
    label: string;
    icon: string;
    fields: FieldConfig[];
    category: BlockCategory;
    /** Editor capability this block needs to appear in the palette (e.g. 'sold_comps'). */
    requires?: 'sold_comps';
}

export type BlockCategory = 'Listings' | 'Services & Team' | 'Social Proof' | 'Lead Capture' | 'Calculators' | 'Content';

/** Display order of the categories in the "Add a Block" palette. */
export const BLOCK_CATEGORY_ORDER: BlockCategory[] = [
    'Listings',
    'Services & Team',
    'Social Proof',
    'Lead Capture',
    'Calculators',
    'Content',
];

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
    {
        // Reusable page hero — image/video background + scrim + heading. Edited via
        // the dedicated PageHeaderBlockEditorModal, so fields stay empty here.
        type: 'page-header',
        label: 'Page Header',
        category: 'Content',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="1"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 14l4-4 4 4 5-5 5 5"/><circle cx="8.5" cy="9" r="1.3"/></svg>',
        fields: [],
    },
    {
        // Edited via the dedicated ServicesEditorModal (repeater + grid/slider),
        // not the generic field renderer — fields stay empty here.
        type: 'services',
        label: 'Services',
        category: 'Services & Team',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
        fields: [],
    },
    {
        // Edited via the dedicated TeamEditorModal (members repeater + grid/slider).
        type: 'team',
        label: 'Team',
        category: 'Services & Team',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></svg>',
        fields: [],
    },
    {
        // Edited via the dedicated LogoMarqueeEditorModal (logos repeater).
        type: 'logo-marquee',
        label: 'Logo Marquee',
        category: 'Social Proof',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="6" height="10" rx="1"/><rect x="9" y="7" width="6" height="10" rx="1"/><rect x="16" y="7" width="6" height="10" rx="1"/></svg>',
        fields: [],
    },
    {
        // Edited via the dedicated FeaturedEditorModal (showcase/slider/grid + MLS source).
        type: 'featured',
        label: 'Featured Listings',
        category: 'Listings',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12 11.2 3.05a1.125 1.125 0 0 1 1.59 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"/></svg>',
        fields: [],
    },
    {
        // Edited via the dedicated CommunitiesEditorModal (grid/slider + card style).
        // Auto-populates from the website's Areas/Communities; placeholders show
        // until the agent adds any.
        type: 'communities',
        label: 'Communities',
        category: 'Listings',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h6v18h-6V3Zm9 6h6v12h-6V9Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m7.5-.75h1.5m-1.5 3h1.5"/></svg>',
        fields: [],
    },
    {
        // Edited via the dedicated TestimonialsBlockEditorModal (spotlight/slider/grid).
        type: 'testimonials',
        label: 'Testimonials',
        category: 'Social Proof',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/></svg>',
        fields: [],
    },
    {
        // Contact details + social + location map (left) and a lead-capture form
        // (right). Details (name, phone, email, address, social) pull live from the
        // site settings; the only editable field is an optional map address override.
        type: 'contact',
        label: 'Contact',
        category: 'Lead Capture',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>',
        fields: [
            { key: 'map_address', label: 'Map Address (defaults to office address)', type: 'text' },
        ],
    },
    {
        // Edited via the dedicated NewsletterEditorModal (split / centered + image).
        type: 'newsletter',
        label: 'Newsletter',
        category: 'Lead Capture',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>',
        fields: [],
    },
    {
        type: 'home-valuation',
        label: 'Free Home Valuation',
        category: 'Listings',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"/></svg>',
        fields: [
            { key: 'headline', label: 'Headline', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
            { key: 'placeholder', label: 'Address Placeholder', type: 'text' },
            { key: 'cta_text', label: 'Button Text', type: 'text' },
        ],
    },
    {
        // Edited via the dedicated ContentEditorModal (image + eyebrow/heading/body/buttons).
        type: 'content',
        label: 'Content',
        category: 'Services & Team',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="8" height="16" rx="1"/><path d="M14 7h8M14 11h8M14 15h6"/></svg>',
        fields: [],
    },
    {
        // Full-bleed CTA: background image + muted overlay + centered frosted card.
        type: 'cta',
        label: 'Call to Action',
        category: 'Lead Capture',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 14h8M9.5 10.5h5" stroke-linecap="round"/></svg>',
        fields: [
            { key: 'image', label: 'Background Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
            { key: 'eyebrow', label: 'Eyebrow Label', type: 'text' },
            { key: 'heading', label: 'Heading', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
            { key: 'button_label', label: 'Button Text', type: 'text' },
            { key: 'button_link', label: 'Button Link', type: 'text' },
        ],
    },
    {
        // Edited via the dedicated VideosEditorModal (grid/slider + video repeater).
        type: 'videos',
        label: 'Videos',
        category: 'Content',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none"/></svg>',
        fields: [],
    },
    {
        // Edited via the dedicated ProcessEditorModal (steps repeater + row/vertical
        // layout, numbered cards, icon or image per step). Ships with default steps.
        type: 'process',
        label: 'How It Works',
        category: 'Content',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5" cy="6" r="2.25"/><circle cx="5" cy="18" r="2.25"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 8.25v7.5M10.5 6h9M10.5 18h9"/></svg>',
        fields: [],
    },
    {
        // Edited via the dedicated FaqEditorModal (heading + Q&A accordion items).
        type: 'faqs',
        label: 'FAQs',
        category: 'Content',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.5 2.1-2.5 3.6"/><path d="M12 17h.01"/></svg>',
        fields: [],
    },
    {
        // Edited via the dedicated LatestBlogPostsEditorModal (category filter + styles).
        type: 'latest-blog-posts',
        label: 'Latest Blog Posts',
        category: 'Content',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"/></svg>',
        fields: [],
    },
    {
        type: 'html',
        label: 'Custom HTML',
        category: 'Content',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"/></svg>',
        fields: [
            { key: 'code', label: 'HTML Code', type: 'code', rows: 12 },
        ],
    },
    // ── Calculators ─────────────────────────────────────────────────────────
    // Interactive, client-side estimator blocks. Their "settings panel" is the
    // generic block editor: heading/subtitle/theme/CTA plus the default input
    // assumptions an agent can localise. Rendered by partials/blocks/{type}.blade.php.
    {
        type: 'mortgage-calculator',
        label: 'Mortgage Calculator',
        category: 'Calculators',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2.5" width="16" height="19" rx="2"/><path stroke-linecap="round" d="M8 6.5h8M8 11h2m4 0h2m-8 3.5h2m4 0h2M8 18h2m4 0h2"/></svg>',
        fields: [
            { key: 'heading', label: 'Heading', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            { key: 'theme', label: 'Theme', type: 'select', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
            { key: 'default_price', label: 'Default Home Price', type: 'number' },
            { key: 'default_down_pct', label: 'Default Down Payment (%)', type: 'number' },
            { key: 'default_rate', label: 'Default Interest Rate (%)', type: 'number' },
            { key: 'default_term', label: 'Default Loan Term (years)', type: 'number' },
            { key: 'default_tax', label: 'Default Property Tax / yr ($)', type: 'number' },
            { key: 'default_insurance', label: 'Default Insurance / yr ($)', type: 'number' },
            { key: 'default_hoa', label: 'Default HOA / month ($)', type: 'number' },
            { key: 'cta_label', label: 'Button Label', type: 'text' },
        ],
    },
    {
        type: 'affordability-calculator',
        label: 'Affordability Calculator',
        category: 'Calculators',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path stroke-linecap="round" d="M12 13v4m-1.5-3.2c.4-.5 2.6-.6 2.6.7 0 1.1-2.2 1-2.2 2.1 0 1.2 2.2 1.2 2.6.7"/></svg>',
        fields: [
            { key: 'heading', label: 'Heading', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            { key: 'theme', label: 'Theme', type: 'select', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
            { key: 'default_income', label: 'Default Annual Income ($)', type: 'number' },
            { key: 'default_debts', label: 'Default Monthly Debts ($)', type: 'number' },
            { key: 'default_down', label: 'Default Down Payment ($)', type: 'number' },
            { key: 'default_rate', label: 'Default Interest Rate (%)', type: 'number' },
            { key: 'default_term', label: 'Default Loan Term (years)', type: 'number' },
            { key: 'default_dti', label: 'Max DTI Ratio (%)', type: 'number', hint: 'Typical conventional limit is 36–43%.' },
            { key: 'default_tax_rate', label: 'Property Tax Rate / yr (%)', type: 'number' },
            { key: 'default_ins_rate', label: 'Insurance Rate / yr (%)', type: 'number' },
            { key: 'default_hoa', label: 'Default HOA / month ($)', type: 'number' },
            { key: 'cta_label', label: 'Button Label', type: 'text' },
        ],
    },
    {
        type: 'rent-vs-buy-calculator',
        label: 'Rent vs. Buy Calculator',
        category: 'Calculators',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5 8 6.5l5 4M5 9.5V19h7V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 14h6m0 0-2.5-2.5M21 14l-2.5 2.5"/></svg>',
        fields: [
            { key: 'heading', label: 'Heading', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            { key: 'theme', label: 'Theme', type: 'select', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
            { key: 'mls_lookup', label: 'MLS Address Lookup', type: 'select', options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], hint: 'Lets visitors prefill the home price from your connected MLS by address.' },
            { key: 'default_price', label: 'Default Home Price ($)', type: 'number' },
            { key: 'default_down_pct', label: 'Default Down Payment (%)', type: 'number' },
            { key: 'default_rate', label: 'Default Mortgage Rate (%)', type: 'number' },
            { key: 'default_term', label: 'Default Loan Term (years)', type: 'number' },
            { key: 'default_tax', label: 'Default Property Tax / yr ($)', type: 'number' },
            { key: 'default_insurance', label: 'Default Insurance / yr ($)', type: 'number' },
            { key: 'default_maintenance', label: 'Default Maintenance / yr ($)', type: 'number' },
            { key: 'default_hoa', label: 'Default HOA / month ($)', type: 'number' },
            { key: 'default_rent', label: 'Default Monthly Rent ($)', type: 'number' },
            { key: 'default_rent_increase', label: 'Rent Increase / yr (%)', type: 'number' },
            { key: 'default_years', label: 'Default Years You Stay', type: 'number' },
            { key: 'default_appreciation', label: 'Home Appreciation / yr (%)', type: 'number' },
            { key: 'default_investment_return', label: 'Investment Return / yr (%)', type: 'number', hint: 'Opportunity cost on the down payment if invested instead.' },
            { key: 'cta_label', label: 'Button Label', type: 'text' },
        ],
    },
    {
        type: 'refinance-calculator',
        label: 'Refinance Calculator',
        category: 'Calculators',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 9a8 8 0 0 1 13.5-3.5L20 8M20 5v3h-3M20 15a8 8 0 0 1-13.5 3.5L4 16m0 3v-3h3"/></svg>',
        fields: [
            { key: 'heading', label: 'Heading', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            { key: 'theme', label: 'Theme', type: 'select', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
            { key: 'default_balance', label: 'Default Loan Balance ($)', type: 'number' },
            { key: 'default_current_rate', label: 'Default Current Rate (%)', type: 'number' },
            { key: 'default_term_left', label: 'Default Years Remaining', type: 'number' },
            { key: 'default_new_rate', label: 'Default New Rate (%)', type: 'number' },
            { key: 'default_new_term', label: 'Default New Term (years)', type: 'number' },
            { key: 'default_costs', label: 'Default Closing Costs ($)', type: 'number' },
            { key: 'cta_label', label: 'Button Label', type: 'text' },
        ],
    },
    {
        type: 'closing-cost-calculator',
        label: 'Closing Cost Estimator',
        category: 'Calculators',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><path stroke-linecap="round" d="M8 7h8M8 11h8M8 15h5"/></svg>',
        fields: [
            { key: 'heading', label: 'Heading', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            { key: 'theme', label: 'Theme', type: 'select', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
            { key: 'mls_lookup', label: 'MLS Address Lookup', type: 'select', options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }] },
            { key: 'default_price', label: 'Default Home Price ($)', type: 'number' },
            { key: 'default_down_pct', label: 'Default Down Payment (%)', type: 'number' },
            { key: 'default_lender_pct', label: 'Lender Fees (% of loan)', type: 'number' },
            { key: 'default_title_pct', label: 'Title & Escrow (% of price)', type: 'number' },
            { key: 'default_gov_pct', label: 'Taxes & Gov (% of price)', type: 'number' },
            { key: 'default_fixed', label: 'Appraisal & Inspection ($)', type: 'number' },
            { key: 'default_prepaids', label: 'Prepaids & Escrow ($)', type: 'number' },
            { key: 'cta_label', label: 'Button Label', type: 'text' },
        ],
    },
    {
        type: 'home-value-estimator',
        label: 'Home Value Estimator (AVM)',
        category: 'Calculators',
        // MLS-gated: only offered when the owner's MLS carries sold comparables.
        requires: 'sold_comps',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M9.5 14h5m-2.5-2.5v5"/></svg>',
        fields: [
            { key: 'heading', label: 'Heading', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            { key: 'theme', label: 'Theme', type: 'select', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
            { key: 'default_sqft', label: 'Default Square Footage', type: 'number' },
            { key: 'default_ppsf', label: 'Fallback Price per Sq Ft ($)', type: 'number', hint: 'Used until sold comps set the local rate.' },
            { key: 'cta_label', label: 'Button Label', type: 'text' },
        ],
    },
    {
        type: 'property-tax-calculator',
        label: 'Property Tax Calculator',
        category: 'Calculators',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5"/></svg>',
        fields: [
            { key: 'heading', label: 'Heading', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            { key: 'theme', label: 'Theme', type: 'select', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
            { key: 'default_state', label: 'Default State', type: 'select', hint: 'Pre-selected state; visitors can change it.', options: [
                { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
                { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' }, { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
                { value: 'DC', label: 'District of Columbia' }, { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
                { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
                { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' },
                { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
                { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
                { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' },
                { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
                { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
                { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' },
                { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' },
                { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
            ] },
            { key: 'default_value', label: 'Default Home Value ($)', type: 'number' },
            { key: 'cta_label', label: 'Button Label', type: 'text' },
        ],
    },
];
