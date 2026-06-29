/**
 * Editable field definitions + palette metadata per landing-page block type.
 *
 * Drives both the block palette (Add Block) and the per-block SlideOverModal
 * editor in the Landing Pages editor. Each Design renders its own blocks under
 * resources/views/landing-pages/templates/{design}/blocks/{type}.blade.php;
 * DESIGN_BLOCKS (below) maps which block types each Design supports, and the
 * renderer whitelist lives in partials/blocks-renderer.blade.php.
 */
import type { LpSection } from '@/landing-pages/public/imageFallbacks';

export type Field =
    | { key: string; label: string; type: 'text' | 'textarea' | 'checkbox' | 'image'; placeholder?: string; help?: string; section?: LpSection }
    | { key: string; label: string; type: 'select'; options: { value: string; label: string }[] }
    | { key: string; label: string; type: 'items'; addLabel: string; itemLabel: string; default: Record<string, any>; itemFields: Field[] };

export interface BlockDef {
    type: string;
    label: string;
    category: string;
    icon: string; // inline SVG (uses currentColor) rendered inside the teal chip
    singleton?: boolean; // only one allowed on a page
    fields: Field[];
    defaults: Record<string, any>;
}

const ICON_OPTIONS = [
    { value: 'search', label: 'Search' },
    { value: 'handshake', label: 'Handshake' },
    { value: 'map-pin', label: 'Map pin' },
    { value: 'chart', label: 'Chart' },
    { value: 'shield', label: 'Shield' },
    { value: 'home', label: 'Home' },
];

// 18px stroke icons; the chip wrapper provides the teal color.
const I = {
    hero: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    logos: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="3"/><rect x="14.5" y="9" width="6" height="6" rx="1.5"/></svg>',
    content: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 11h16M4 16h10"/></svg>',
    about: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>',
    steps: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h4v3H4zM10 12h4v9h-4zM16 6h4v15h-4z"/></svg>',
    valueProps: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    testimonials: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    video: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>',
    videoTestimonials: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M10 8.5l4 2.5-4 2.5z"/></svg>',
    calculator: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h0M8 14h2M12 14h2M16 14h0M8 18h6"/></svg>',
    leadForm: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>',
    cta: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    heroVideo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M10 8.5l4 2.5-4 2.5z"/><path d="M8 21h8"/></svg>',
    benefits: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.6L5.7 20l2.3-7-6-4.4h7.6z"/></svg>',
    guarantee: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/></svg>',
    authority: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M12 2v1M19 5l-1 1"/></svg>',
};

/**
 * The hero is a 3-step capture flow (address → map → contact). Each flow preset
 * is a full copy bundle + the lead `type` the form should create. Picking a flow
 * in the editor swaps all of these in at once (see BlockEditorModal). Keep keys
 * in sync with the hero fields below and the Blade partial.
 */
export const FLOW_PRESETS: Record<string, Record<string, any>> = {
    sell: {
        lead_type: 'seller',
        eyebrow: 'List For 2%',
        headline: 'Save Time and Commission',
        subheadline: 'We will list your house for 2% commission vs the traditional 3%. Enter your address to get started.',
        address_placeholder: 'Enter your address',
        start_label: 'Get Started',
        map_title: 'Is this your home?',
        map_subtitle: "Confirm the location and we'll put together your selling plan.",
        map_confirm_label: 'Yes, This Is My Home',
        form_title: "Let's talk about selling",
        form_subtitle: "Enter your details and we'll reach out with your 2% listing plan.",
        submit_label: 'Get My Free Consultation',
        disclaimer: 'No spam. No obligation. Free, no-pressure consultation.',
    },
    valuation: {
        lead_type: 'seller',
        eyebrow: 'Free Home Valuation',
        headline: "What's Your Home Worth?",
        subheadline: 'Enter your address for a free, no-obligation home value report backed by real local sales data.',
        address_placeholder: 'Enter your home address',
        start_label: 'Get My Estimate',
        map_title: 'Is this your home?',
        map_subtitle: "Confirm the location and we'll prepare your personalized report.",
        map_confirm_label: 'Yes, This Is My Home',
        form_title: 'Where should we send your report?',
        form_subtitle: "Your valuation is ready. Enter your details and we'll send it right over.",
        submit_label: 'Send My Home Value Report',
        disclaimer: 'No spam. No obligation. Free, no-pressure valuation.',
    },
    buyer: {
        lead_type: 'buyer',
        eyebrow: 'For Home Buyers',
        headline: 'Find Your Next Home',
        subheadline: 'Tell us where you want to live and get a curated list of homes that match — including off-market options.',
        address_placeholder: 'Enter a city, neighborhood or ZIP',
        start_label: 'Find Homes',
        map_title: 'Is this the right area?',
        map_subtitle: "Confirm the area and we'll send homes that match.",
        map_confirm_label: 'Yes, Search Here',
        form_title: 'Where should we send matching homes?',
        form_subtitle: "Enter your details and we'll send homes that fit your criteria.",
        submit_label: 'Send Me Homes',
        disclaimer: 'No spam. Unsubscribe anytime.',
    },
};

export const FLOW_OPTIONS = [
    { value: 'sell', label: 'Sell Flow' },
    { value: 'valuation', label: 'Home Valuation Flow' },
    { value: 'buyer', label: 'Buyer Flow' },
];

/** A2P 10DLC / TCPA-friendly default SMS consent copy. */
export const A2P_CONSENT =
    'By checking this box, I agree to receive marketing and informational text messages at the phone number provided, including messages sent via automated technology. Consent is not a condition of purchase. Message and data rates may apply. Message frequency varies. Reply STOP to unsubscribe or HELP for help.';

export const BLOCK_DEFS: BlockDef[] = [
    {
        type: 'hero',
        label: 'Hero — Capture Flow',
        category: 'Lead Capture',
        icon: I.hero,
        singleton: true,
        fields: [
            { key: 'flow', label: 'Flow', type: 'select', options: FLOW_OPTIONS },
            { key: 'image', label: 'Background image', type: 'image', section: 'hero' },
            { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { key: 'headline', label: 'Headline', type: 'text' },
            { key: 'subheadline', label: 'Subheadline', type: 'textarea' },
            { key: 'address_placeholder', label: 'Address field placeholder', type: 'text' },
            { key: 'start_label', label: 'Step 1 button label', type: 'text' },
            { key: 'map_title', label: 'Step 2 (map) title', type: 'text' },
            { key: 'map_subtitle', label: 'Step 2 (map) subtitle', type: 'text' },
            { key: 'map_confirm_label', label: 'Step 2 confirm button', type: 'text' },
            { key: 'form_title', label: 'Step 3 (form) title', type: 'text' },
            { key: 'form_subtitle', label: 'Step 3 (form) subtitle', type: 'textarea' },
            { key: 'submit_label', label: 'Submit button label', type: 'text' },
            { key: 'disclaimer', label: 'Hero disclaimer', type: 'text' },
            { key: 'consent_text', label: 'SMS consent text (A2P)', type: 'textarea', help: 'Shown next to the consent checkbox on the final step. Keep it A2P/TCPA-compliant.' },
        ],
        defaults: {
            flow: 'sell',
            image: 'landing-pages/templates/hero-sell.webp',
            consent_text: A2P_CONSENT,
            ...FLOW_PRESETS.sell,
        },
    },
    {
        type: 'logos',
        label: 'Logos Slider',
        category: 'Content',
        icon: I.logos,
        fields: [
            { key: 'title', label: 'Section title', type: 'text' },
            {
                key: 'items',
                label: 'Logos',
                type: 'items',
                addLabel: 'Add Logo',
                itemLabel: 'Logo',
                default: { name: '', image: '' },
                itemFields: [
                    { key: 'name', label: 'Name (shown if no image)', type: 'text' },
                    { key: 'image', label: 'Logo image', type: 'image' },
                ],
            },
        ],
        defaults: {
            title: 'Trusted by homeowners across the region',
            items: [
                { name: 'Zillow', image: '' },
                { name: 'Realtor.com', image: '' },
                { name: 'Redfin', image: '' },
                { name: 'Homes.com', image: '' },
            ],
        },
    },
    {
        type: 'content',
        label: 'Content Section',
        category: 'Content',
        icon: I.content,
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'body', label: 'Body', type: 'textarea' },
        ],
        defaults: {
            eyebrow: 'Why List For 2%',
            title: 'Full Service. Lower Commission.',
            body: 'Same full-service listing — pro photography, MLS exposure and expert negotiation — for 2% instead of 3%. Keep more of your equity at closing.',
        },
    },
    {
        type: 'about',
        label: 'About Section',
        category: 'Content',
        icon: I.about,
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'body', label: 'Body', type: 'textarea' },
            { key: 'photo', label: 'Photo', type: 'image', section: 'about' },
            {
                key: 'stats',
                label: 'Stats',
                type: 'items',
                addLabel: 'Add Stat',
                itemLabel: 'Stat',
                default: { value: '', label: '' },
                itemFields: [
                    { key: 'value', label: 'Value', type: 'text', placeholder: '250+' },
                    { key: 'label', label: 'Label', type: 'text', placeholder: 'Homes Sold' },
                ],
            },
        ],
        defaults: {
            eyebrow: 'About',
            title: 'Full Service. Lower Fee.',
            body: "Selling your home shouldn't cost 3% of everything you've built. We offer the complete, full-service listing experience — professional photography, premium MLS and portal exposure, targeted marketing, expert pricing and hands-on negotiation — for a flat 2% listing fee.\n\nThat's the same level of service you'd expect from any top brokerage, with thousands of dollars more staying in your pocket at closing.",
            photo: 'landing-pages/templates/about.webp',
            stats: [
                { value: '250+', label: 'Homes Sold' },
                { value: '1%', label: 'You Save vs. 3%' },
                { value: '11 days', label: 'Avg. Time to Offer' },
            ],
        },
    },
    {
        type: 'steps',
        label: 'How It Works',
        category: 'Content',
        icon: I.steps,
        fields: [
            { key: 'title', label: 'Section title', type: 'text' },
            {
                key: 'items',
                label: 'Steps',
                type: 'items',
                addLabel: 'Add Step',
                itemLabel: 'Step',
                default: { title: '', text: '' },
                itemFields: [
                    { key: 'title', label: 'Title', type: 'text' },
                    { key: 'text', label: 'Text', type: 'textarea' },
                ],
            },
        ],
        defaults: {
            title: 'How It Works',
            items: [
                { title: 'Share Your Address', text: 'Tell us about your property in under a minute.' },
                { title: 'Get Your Valuation', text: 'We prepare a tailored, data-backed value range.' },
                { title: 'Plan Your Sale', text: 'Optional strategy session to maximize your sale price.' },
            ],
        },
    },
    {
        type: 'value-props',
        label: 'Value Propositions',
        category: 'Content',
        icon: I.valueProps,
        fields: [
            { key: 'title', label: 'Section title', type: 'text' },
            {
                key: 'items',
                label: 'Items',
                type: 'items',
                addLabel: 'Add Value Prop',
                itemLabel: 'Value prop',
                default: { icon: 'home', title: '', text: '' },
                itemFields: [
                    { key: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS },
                    { key: 'title', label: 'Title', type: 'text' },
                    { key: 'text', label: 'Text', type: 'textarea' },
                ],
            },
        ],
        defaults: {
            title: 'Why Sellers Trust Us',
            items: [
                { icon: 'chart', title: 'Accurate Pricing', text: 'A data-driven valuation from real comparable sales in your neighborhood.' },
                { icon: 'handshake', title: 'Top-Dollar Strategy', text: 'Proven marketing and negotiation to sell faster and for more.' },
                { icon: 'shield', title: 'No Pressure', text: 'A free, honest assessment with zero obligation to list.' },
            ],
        },
    },
    {
        type: 'testimonials',
        label: 'Testimonials',
        category: 'Content',
        icon: I.testimonials,
        fields: [
            { key: 'title', label: 'Section title', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            {
                key: 'items',
                label: 'Testimonials',
                type: 'items',
                addLabel: 'Add Testimonial',
                itemLabel: 'Testimonial',
                default: { quote: '', author: '', location: '', image: '' },
                itemFields: [
                    { key: 'image', label: 'Photo (optional)', type: 'image' },
                    { key: 'quote', label: 'Quote', type: 'textarea' },
                    { key: 'author', label: 'Author', type: 'text' },
                    { key: 'location', label: 'Detail / location', type: 'text' },
                ],
            },
        ],
        defaults: {
            title: 'What Sellers Say',
            subtitle: '',
            items: [
                { quote: 'Same great service as the big brokerages but we saved over $9,000 in commission.', author: 'David Park', location: 'Saved $9,000+', image: 'landing-pages/templates/testimonial-1.webp' },
                { quote: 'Honest, responsive and knowledgeable. We sold above asking and kept more of our equity.', author: 'Maria Gonzalez', location: 'Sold above asking', image: 'landing-pages/templates/testimonial-2.webp' },
                { quote: 'No pressure at all — just real numbers and a clear plan.', author: 'James Whitfield', location: 'Repeat client', image: 'landing-pages/templates/testimonial-3.webp' },
            ],
        },
    },
    {
        type: 'video',
        label: 'Video',
        category: 'Content',
        icon: I.video,
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
            { key: 'video_url', label: 'Video URL', type: 'text', placeholder: 'YouTube or Vimeo link', help: 'Paste a YouTube or Vimeo link — it is converted to an embed automatically.' },
            { key: 'poster', label: 'Poster image (optional)', type: 'image' },
            { key: 'cta_label', label: 'Button label (optional)', type: 'text' },
            { key: 'cta_link', label: 'Button link', type: 'text', placeholder: '#hero' },
        ],
        defaults: {
            eyebrow: 'See How It Works',
            title: 'A Better Way to Sell Your Home',
            subtitle: 'Watch a quick overview of our pricing and marketing strategy.',
            video_url: '',
            poster: '',
            cta_label: 'Get Started',
            cta_link: '#hero',
        },
    },
    {
        type: 'video-testimonials',
        label: 'Video Testimonials',
        category: 'Content',
        icon: I.videoTestimonials,
        fields: [
            { key: 'title', label: 'Section title', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            {
                key: 'items',
                label: 'Videos',
                type: 'items',
                addLabel: 'Add Video',
                itemLabel: 'Video',
                default: { video_url: '', name: '', caption: '', poster: '' },
                itemFields: [
                    { key: 'video_url', label: 'Video URL', type: 'text', placeholder: 'YouTube or Vimeo link' },
                    { key: 'name', label: 'Name', type: 'text' },
                    { key: 'caption', label: 'Caption', type: 'text' },
                    { key: 'poster', label: 'Poster image (optional)', type: 'image' },
                ],
            },
        ],
        defaults: {
            title: 'Hear From Our Sellers',
            subtitle: 'Real clients, real savings.',
            items: [
                { video_url: '', name: 'David Park', caption: 'Saved $9,000+ in commission', poster: '' },
                { video_url: '', name: 'Maria Gonzalez', caption: 'Sold above asking', poster: '' },
                { video_url: '', name: 'The Whitfields', caption: 'Repeat clients', poster: '' },
            ],
        },
    },
    {
        type: 'calculator',
        label: 'Commission Savings Calculator',
        category: 'Content',
        icon: I.calculator,
        fields: [
            { key: 'title', label: 'Section title', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            { key: 'traditional_rate', label: 'Traditional rate (%)', type: 'text', placeholder: '3' },
            { key: 'our_rate', label: 'Our rate (%)', type: 'text', placeholder: '2' },
            { key: 'default_value', label: 'Default home value', type: 'text', placeholder: '500000' },
            { key: 'min_value', label: 'Min value', type: 'text', placeholder: '100000' },
            { key: 'max_value', label: 'Max value', type: 'text', placeholder: '2000000' },
            { key: 'step', label: 'Slider step', type: 'text', placeholder: '25000' },
            { key: 'savings_label', label: 'Savings label', type: 'text', placeholder: 'You keep' },
            { key: 'note', label: 'Note', type: 'text' },
            { key: 'cta_label', label: 'Button label (optional)', type: 'text' },
        ],
        defaults: {
            title: "See How Much You'll Save",
            subtitle: "Slide to your home's value and watch the savings add up.",
            traditional_rate: '3',
            our_rate: '2',
            default_value: '500000',
            min_value: '100000',
            max_value: '2000000',
            step: '25000',
            savings_label: 'You keep',
            note: 'Based on listing-side commission only. Actual savings vary by final sale price.',
            cta_label: 'Start Saving',
        },
    },
    {
        type: 'lead-form',
        label: 'Lead Capture Form',
        category: 'Lead Capture',
        icon: I.leadForm,
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
            { key: 'message_label', label: 'Message field label', type: 'text' },
            { key: 'show_phone', label: 'Show phone field', type: 'checkbox' },
            { key: 'button_label', label: 'Button label', type: 'text' },
            { key: 'consent_text', label: 'SMS consent text (A2P)', type: 'textarea', help: 'Shown next to the consent checkbox. Keep it A2P/TCPA-compliant.' },
            { key: 'disclaimer', label: 'Disclaimer', type: 'text' },
        ],
        defaults: {
            eyebrow: 'Get Started',
            title: 'Request Your Free Home Valuation',
            subtitle: "Fill out the form and we'll send your personalized home value report.",
            message_label: 'Anything we should know about your home?',
            show_phone: true,
            button_label: 'Get My Valuation',
            consent_text: A2P_CONSENT,
            disclaimer: 'By submitting, you agree to be contacted about selling your home.',
        },
    },
    {
        type: 'cta',
        label: 'Footer CTA',
        category: 'Lead Capture',
        icon: I.cta,
        fields: [
            { key: 'headline', label: 'Headline', type: 'text' },
            { key: 'subtext', label: 'Subtext', type: 'textarea' },
            { key: 'button_label', label: 'Button label', type: 'text' },
            { key: 'image', label: 'Background image', type: 'image', section: 'cta' },
        ],
        defaults: {
            headline: 'Ready to Sell for Less?',
            subtext: 'List with us for 2% and keep more of your equity. It only takes a minute to start.',
            button_label: 'Get Started',
            image: 'landing-pages/templates/hero-sell.webp',
        },
    },

    // ── Video Landing design blocks ──────────────────────────────────────────
    {
        type: 'hero-video',
        label: 'Video Hero',
        category: 'Lead Capture',
        icon: I.heroVideo,
        singleton: true,
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { key: 'headline', label: 'Headline', type: 'text' },
            { key: 'subheadline', label: 'Subheadline', type: 'textarea' },
            { key: 'video_url', label: 'Video URL', type: 'text', placeholder: 'https://youtube.com/watch?v=…', help: 'YouTube or Vimeo link. Leave empty to show a poster image with a play button.' },
            { key: 'video_tab', label: 'Video tab label', type: 'text', help: 'The small label on the orange bar above the video.' },
            { key: 'poster', label: 'Poster image', type: 'image', section: 'video' },
            { key: 'caption', label: 'Caption under video', type: 'textarea', help: 'Shown below the video. Basic HTML (e.g. <strong>) is allowed.' },
            { key: 'cta_label', label: 'Button label', type: 'text' },
            { key: 'cta_link', label: 'Button link', type: 'text', placeholder: '#apply', help: 'Anchor (#apply) or URL. Defaults to the application form.' },
            { key: 'note', label: 'Note under button', type: 'text' },
            {
                key: 'stats',
                label: 'Stats strip',
                type: 'items',
                addLabel: 'Add Stat',
                itemLabel: 'Stat',
                default: { value: '', label: '' },
                itemFields: [
                    { key: 'value', label: 'Value', type: 'text', placeholder: '$250M+' },
                    { key: 'label', label: 'Label', type: 'text', placeholder: 'In Closed Sales' },
                ],
            },
        ],
        defaults: {
            eyebrow: 'Free Home-Selling Masterclass',
            headline: 'Sell for Top Dollar — Watch How',
            subheadline: 'A short breakdown of the exact strategy we use to sell homes faster and for more. Then apply for a private strategy session.',
            video_url: '',
            video_tab: 'Watch How We Sell for More',
            poster: 'landing-pages/templates/hero-sell.webp',
            caption: 'Spots are limited each month — <strong>applications fill fast.</strong>',
            cta_label: 'Apply for a Strategy Session',
            cta_link: '#apply',
            note: 'Limited spots — by application only.',
            stats: [
                { value: '$250M+', label: 'In Closed Sales' },
                { value: '11 days', label: 'Avg. to Offer' },
                { value: '4.9★', label: 'Client Rating' },
            ],
        },
    },
    {
        type: 'benefits',
        label: 'Benefits Grid',
        category: 'Content',
        icon: I.benefits,
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
            {
                key: 'items',
                label: 'Benefits',
                type: 'items',
                addLabel: 'Add Benefit',
                itemLabel: 'Benefit',
                default: { title: '', text: '' },
                itemFields: [
                    { key: 'title', label: 'Title', type: 'text' },
                    { key: 'text', label: 'Text', type: 'textarea' },
                ],
            },
        ],
        defaults: {
            eyebrow: 'What You Get',
            title: 'Everything You Need to Win',
            subtitle: 'A complete, full-service plan built to get you the best outcome — nothing left to chance.',
            items: [
                { title: 'Premium Marketing', text: 'Pro photography, video and portal exposure that makes buyers compete for your home.' },
                { title: 'Expert Pricing', text: 'Data-backed pricing strategy tuned to your micro-market, not a generic estimate.' },
                { title: 'Sharp Negotiation', text: 'We protect your equity at every step and drive the best possible terms.' },
                { title: 'Concierge Prep', text: 'Staging guidance and trusted vendors to get your home show-ready, stress-free.' },
                { title: 'Off-Market Reach', text: 'Access to a private buyer network before your home ever hits the portals.' },
                { title: 'White-Glove Service', text: 'One dedicated point of contact from first call to closing day.' },
            ],
        },
    },
    {
        type: 'guarantee',
        label: 'Guarantee',
        category: 'Content',
        icon: I.guarantee,
        fields: [
            { key: 'badge_label', label: 'Badge label', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'body', label: 'Body', type: 'textarea' },
            { key: 'cta_label', label: 'Button label', type: 'text' },
            { key: 'cta_link', label: 'Button link', type: 'text', placeholder: '#apply' },
        ],
        defaults: {
            badge_label: 'Our Promise',
            title: 'The No-Risk Guarantee',
            body: 'If you’re not completely satisfied with our service at any point before we list, you can walk away — no fees, no obligation, no hard feelings.',
            cta_label: 'Apply Now',
            cta_link: '#apply',
        },
    },
    {
        type: 'authority',
        label: 'Expert / Authority',
        category: 'Content',
        icon: I.authority,
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'title', label: 'Title / tagline', type: 'text' },
            { key: 'photo', label: 'Photo', type: 'image', section: 'authority' },
            { key: 'body', label: 'Bio', type: 'textarea' },
            {
                key: 'points',
                label: 'Credentials',
                type: 'items',
                addLabel: 'Add Credential',
                itemLabel: 'Credential',
                default: { text: '' },
                itemFields: [{ key: 'text', label: 'Text', type: 'text' }],
            },
            { key: 'cta_label', label: 'Button label', type: 'text' },
            { key: 'cta_link', label: 'Button link', type: 'text', placeholder: '#apply' },
        ],
        defaults: {
            eyebrow: 'Meet Your Agent',
            name: 'Jordan Rivera',
            title: 'Top 1% Listing Agent · 500+ Homes Sold',
            photo: 'landing-pages/templates/about.webp',
            body: "For over a decade I've helped homeowners sell for more with less stress. My team treats every listing like it's our own — sharp strategy, relentless marketing and honest guidance from first call to closing.\n\nWhen you work with us, you get a partner who's genuinely in your corner.",
            points: [
                { text: 'Over $250M in closed sales' },
                { text: 'Average 11 days to offer' },
                { text: '4.9★ average client rating' },
            ],
            cta_label: 'Apply to Work With Me',
            cta_link: '#apply',
        },
    },
];

/**
 * Which block types each Design can render (matches the Blade partials under
 * resources/views/landing-pages/templates/{design}/blocks/ + the shared
 * partials). The editor palette is filtered to the page's design so owners only
 * add blocks that actually render on their template. Unknown design → all blocks.
 */
export const DESIGN_BLOCKS: Record<string, string[]> = {
    classic: ['hero', 'logos', 'content', 'about', 'value-props', 'steps', 'calculator', 'testimonials', 'video-testimonials', 'video', 'lead-form', 'cta'],
    'video-landing': ['hero-video', 'benefits', 'testimonials', 'guarantee', 'authority', 'lead-form', 'cta'],
};

export const BLOCK_DEF_MAP: Record<string, BlockDef> = Object.fromEntries(BLOCK_DEFS.map((d) => [d.type, d]));

/** Legacy single-quote block still renders publicly but is not offered in the palette. */
export const LEGACY_BLOCK_LABELS: Record<string, string> = {
    testimonial: 'Testimonial (legacy)',
};

export function blockLabel(type: string): string {
    return BLOCK_DEF_MAP[type]?.label ?? LEGACY_BLOCK_LABELS[type] ?? type;
}

export function blockIcon(type: string): string {
    return BLOCK_DEF_MAP[type]?.icon ?? I.cta;
}

export function seedBlock(type: string): { id: string; type: string; data: Record<string, any> } {
    const def = BLOCK_DEF_MAP[type];
    const rand = Math.random().toString(36).slice(2, 8);
    return { id: `${type}-${rand}`, type, data: def ? structuredClone(def.defaults) : {} };
}
