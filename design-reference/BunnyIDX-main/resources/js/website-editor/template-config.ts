import { TemplateConfig } from './types';

export const TEMPLATE_CONFIGS: TemplateConfig = {
    luxury: {
        home: {
            label: 'Home',
            sections: [
                {
                    id: 'hero',
                    label: 'Hero Section',
                    fields: [],
                },
                {
                    id: 'about',
                    label: 'About Preview',
                    fields: [
                        { key: 'agent_bio', label: 'Bio', type: 'textarea', rows: 5, ai: 'agent_bio', storage: 'column' },
                        { key: 'about_image', label: 'Section Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
                    ],
                },
                {
                    id: 'cta',
                    label: 'Call to Action',
                    fields: [
                        { key: 'cta_label', label: 'Label', type: 'text', defaultValue: 'Get In Touch' },
                        { key: 'cta_headline', label: 'Headline', type: 'text', defaultValue: 'Ready to Make a Move?' },
                        { key: 'cta_text', label: 'Description', type: 'textarea', rows: 3, defaultValue: "Whether you're buying your first home or selling a luxury property, I'm here to help you every step of the way." },
                        { key: 'cta_button_text', label: 'Button Text', type: 'text', defaultValue: 'Schedule a Consultation' },
                        { key: 'cta_button_link', label: 'Button Link (optional)', type: 'text' },
                    ],
                },
            ],
        },
        about: {
            label: 'About',
            sections: [
                {
                    id: 'page-header',
                    label: 'Page Header',
                    fields: [
                        { key: 'header_label', label: 'Label', type: 'text', defaultValue: 'Get to Know Me' },
                        { key: 'header_title', label: 'Title', type: 'text', defaultValue: 'About Me' },
                        { key: 'header_image', label: 'Background Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
                    ],
                },
                {
                    id: 'about-content',
                    label: 'About Content',
                    fields: [
                        { key: 'agent_name', label: 'Name', type: 'text', storage: 'column' },
                        { key: 'agent_title', label: 'Title', type: 'text', storage: 'column' },
                        { key: 'about_extended', label: 'Extended About', type: 'textarea', rows: 8, ai: 'about_extended' },
                        { key: 'about_image', label: 'Section Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
                    ],
                },
                {
                    id: 'cta',
                    label: 'Call to Action',
                    fields: [
                        { key: 'cta_label', label: 'Label', type: 'text', defaultValue: 'Get In Touch' },
                        { key: 'cta_headline', label: 'Headline', type: 'text', defaultValue: "Let's Work Together" },
                        { key: 'cta_text', label: 'Description', type: 'textarea', rows: 3, defaultValue: "I'd love to hear from you. Whether you're ready to buy, sell, or just have questions — reach out anytime." },
                        { key: 'cta_button_text', label: 'Button Text', type: 'text', defaultValue: 'Contact Me' },
                        { key: 'cta_button_link', label: 'Button Link (optional)', type: 'text' },
                    ],
                },
            ],
        },
        buy: {
            label: 'Buy',
            sections: [
                {
                    id: 'page-header',
                    label: 'Page Header',
                    fields: [
                        { key: 'header_label', label: 'Label', type: 'text', defaultValue: 'Buyers' },
                        { key: 'header_title', label: 'Title', type: 'text', defaultValue: 'Find Your Dream Home' },
                        { key: 'header_subtitle', label: 'Subtitle', type: 'textarea', rows: 3, defaultValue: "Whether you're a first-time buyer or looking for your next investment, I'll guide you through every step of the buying process." },
                        { key: 'header_image', label: 'Background Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
                    ],
                },
                {
                    id: 'steps',
                    label: 'How Buying Works',
                    fields: [
                        { key: 'steps_label', label: 'Section Label', type: 'text', defaultValue: 'The Process' },
                        { key: 'steps_title', label: 'Section Title', type: 'text', defaultValue: 'How Buying Works' },
                        { key: 'step_1_title', label: 'Step 1 Title', type: 'text', defaultValue: 'Consultation' },
                        { key: 'step_1_text', label: 'Step 1 Description', type: 'textarea', rows: 3, defaultValue: "We'll discuss your goals, budget, preferred neighborhoods, and must-have features to create a clear plan for your home search." },
                        { key: 'step_2_title', label: 'Step 2 Title', type: 'text', defaultValue: 'Home Search' },
                        { key: 'step_2_text', label: 'Step 2 Description', type: 'textarea', rows: 3, defaultValue: "I'll curate a personalized selection of properties that match your criteria, schedule viewings, and provide market insights for each option." },
                        { key: 'step_3_title', label: 'Step 3 Title', type: 'text', defaultValue: 'Close the Deal' },
                        { key: 'step_3_text', label: 'Step 3 Description', type: 'textarea', rows: 3, defaultValue: "From offer negotiation to inspections and closing, I'll handle every detail to ensure a smooth and successful transaction." },
                    ],
                },
                {
                    id: 'why-work',
                    label: 'Why Work With Me',
                    fields: [
                        { key: 'why_label', label: 'Section Label', type: 'text', defaultValue: 'Your Advantage' },
                        { key: 'why_title', label: 'Section Title', type: 'text', defaultValue: 'Why Work With Me' },
                        { key: 'why_description', label: 'Description', type: 'textarea', rows: 3, defaultValue: "Buying a home is one of the biggest decisions you'll make. I bring local expertise, market knowledge, and a client-first approach to ensure you find the right property at the right price." },
                        { key: 'why_point_1', label: 'Point 1', type: 'text', defaultValue: 'Deep knowledge of local neighborhoods, schools, and amenities' },
                        { key: 'why_point_2', label: 'Point 2', type: 'text', defaultValue: 'Access to off-market listings and coming-soon properties' },
                        { key: 'why_point_3', label: 'Point 3', type: 'text', defaultValue: 'Skilled negotiator — I fight to get you the best deal possible' },
                        { key: 'why_point_4', label: 'Point 4', type: 'text', defaultValue: 'Transparent communication from first showing to closing day' },
                        { key: 'why_image', label: 'Section Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
                    ],
                },
                {
                    id: 'expect',
                    label: 'What to Expect',
                    fields: [
                        { key: 'expect_label', label: 'Section Label', type: 'text', defaultValue: "Buyer's Guide" },
                        { key: 'expect_title', label: 'Section Title', type: 'text', defaultValue: 'What to Expect' },
                        { key: 'expect_description', label: 'Description', type: 'textarea', rows: 3, defaultValue: "From our first meeting to the moment you receive your keys, I'm committed to making your home buying experience as smooth and stress-free as possible." },
                        { key: 'expect_card_1_title', label: 'Card 1 Title', type: 'text', defaultValue: 'Personalized Search' },
                        { key: 'expect_card_1_text', label: 'Card 1 Text', type: 'textarea', rows: 2, defaultValue: "I won't just send you listings — I'll learn your lifestyle and find homes that truly fit." },
                        { key: 'expect_card_2_title', label: 'Card 2 Title', type: 'text', defaultValue: 'Market Insights' },
                        { key: 'expect_card_2_text', label: 'Card 2 Text', type: 'textarea', rows: 2, defaultValue: 'Real-time data on pricing trends, days on market, and neighborhood comparisons.' },
                        { key: 'expect_card_3_title', label: 'Card 3 Title', type: 'text', defaultValue: 'Offer Strategy' },
                        { key: 'expect_card_3_text', label: 'Card 3 Text', type: 'textarea', rows: 2, defaultValue: 'Crafting competitive offers that stand out while protecting your interests.' },
                        { key: 'expect_card_4_title', label: 'Card 4 Title', type: 'text', defaultValue: 'Closing Support' },
                        { key: 'expect_card_4_text', label: 'Card 4 Text', type: 'textarea', rows: 2, defaultValue: 'Coordinating inspections, appraisals, and paperwork so nothing falls through the cracks.' },
                    ],
                },
                {
                    id: 'cta',
                    label: 'Call to Action',
                    fields: [
                        { key: 'cta_label', label: 'Label', type: 'text', defaultValue: 'Start Your Journey' },
                        { key: 'cta_headline', label: 'Headline', type: 'text', defaultValue: 'Ready to Find Your Home?' },
                        { key: 'cta_text', label: 'Description', type: 'textarea', rows: 3, defaultValue: "Tell me what you're looking for and I'll help you find the perfect property." },
                        { key: 'cta_button_text', label: 'Button Text', type: 'text', defaultValue: 'Get Started' },
                        { key: 'cta_button_link', label: 'Button Link (optional)', type: 'text' },
                    ],
                },
            ],
        },
        sell: {
            label: 'Sell',
            sections: [
                {
                    id: 'page-header',
                    label: 'Page Header',
                    fields: [
                        { key: 'header_label', label: 'Label', type: 'text', defaultValue: 'Sellers' },
                        { key: 'header_title', label: 'Title', type: 'text', defaultValue: 'Sell for Top Dollar' },
                        { key: 'header_subtitle', label: 'Subtitle', type: 'textarea', rows: 3, defaultValue: 'Get the best value for your property with my proven marketing strategy and deep knowledge of the local market.' },
                        { key: 'header_image', label: 'Background Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
                    ],
                },
                {
                    id: 'steps',
                    label: 'How Selling Works',
                    fields: [
                        { key: 'steps_label', label: 'Section Label', type: 'text', defaultValue: 'The Process' },
                        { key: 'steps_title', label: 'Section Title', type: 'text', defaultValue: 'How Selling Works' },
                        { key: 'step_1_title', label: 'Step 1 Title', type: 'text', defaultValue: 'Home Evaluation' },
                        { key: 'step_1_text', label: 'Step 1 Description', type: 'textarea', rows: 3, defaultValue: "I'll provide a comprehensive market analysis of your property, review comparable sales, and recommend a competitive pricing strategy." },
                        { key: 'step_2_title', label: 'Step 2 Title', type: 'text', defaultValue: 'Marketing & Staging' },
                        { key: 'step_2_text', label: 'Step 2 Description', type: 'textarea', rows: 3, defaultValue: 'Professional photography, virtual tours, targeted digital marketing, and staging advice to showcase your home at its best.' },
                        { key: 'step_3_title', label: 'Step 3 Title', type: 'text', defaultValue: 'Negotiate & Close' },
                        { key: 'step_3_text', label: 'Step 3 Description', type: 'textarea', rows: 3, defaultValue: 'Expert negotiation to maximize your return, seamless transaction management, and support through every step to closing.' },
                    ],
                },
                {
                    id: 'why-list',
                    label: 'Why List With Me',
                    fields: [
                        { key: 'why_label', label: 'Section Label', type: 'text', defaultValue: 'Your Listing Agent' },
                        { key: 'why_title', label: 'Section Title', type: 'text', defaultValue: 'Why List With Me' },
                        { key: 'why_description', label: 'Description', type: 'textarea', rows: 3, defaultValue: 'Selling your home requires the right strategy, marketing, and negotiation expertise. I deliver all three to help you achieve the highest possible return.' },
                        { key: 'why_point_1', label: 'Point 1', type: 'text', defaultValue: 'Professional photography, staging consultation, and virtual tours' },
                        { key: 'why_point_2', label: 'Point 2', type: 'text', defaultValue: 'Targeted digital marketing to reach qualified buyers' },
                        { key: 'why_point_3', label: 'Point 3', type: 'text', defaultValue: 'Data-driven pricing strategy for maximum return' },
                        { key: 'why_point_4', label: 'Point 4', type: 'text', defaultValue: 'Expert negotiation and seamless closing coordination' },
                        { key: 'why_image', label: 'Section Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
                    ],
                },
                {
                    id: 'marketing',
                    label: 'My Marketing Plan',
                    fields: [
                        { key: 'marketing_label', label: 'Section Label', type: 'text', defaultValue: "Seller's Advantage" },
                        { key: 'marketing_title', label: 'Section Title', type: 'text', defaultValue: 'My Marketing Plan' },
                        { key: 'marketing_description', label: 'Description', type: 'textarea', rows: 3, defaultValue: 'Every listing gets a comprehensive marketing strategy designed to attract the most buyers and generate the strongest offers.' },
                        { key: 'marketing_card_1_title', label: 'Card 1 Title', type: 'text', defaultValue: 'Professional Media' },
                        { key: 'marketing_card_1_text', label: 'Card 1 Text', type: 'textarea', rows: 2, defaultValue: 'HD photography, drone aerials, 3D virtual tours, and cinematic video to showcase your home.' },
                        { key: 'marketing_card_2_title', label: 'Card 2 Title', type: 'text', defaultValue: 'Digital Reach' },
                        { key: 'marketing_card_2_text', label: 'Card 2 Text', type: 'textarea', rows: 2, defaultValue: 'Targeted social ads, email blasts to my buyer network, and syndication to 500+ listing sites.' },
                        { key: 'marketing_card_3_title', label: 'Card 3 Title', type: 'text', defaultValue: 'Open Houses' },
                        { key: 'marketing_card_3_text', label: 'Card 3 Text', type: 'textarea', rows: 2, defaultValue: 'Strategic open house events and private showings to create urgency and competition.' },
                        { key: 'marketing_card_4_title', label: 'Card 4 Title', type: 'text', defaultValue: 'Pricing Strategy' },
                        { key: 'marketing_card_4_text', label: 'Card 4 Text', type: 'textarea', rows: 2, defaultValue: 'Comparative market analysis and strategic pricing to maximize offers in the shortest time.' },
                    ],
                },
                {
                    id: 'cta',
                    label: 'Call to Action',
                    fields: [
                        { key: 'cta_label', label: 'Label', type: 'text', defaultValue: 'Get Started' },
                        { key: 'cta_headline', label: 'Headline', type: 'text', defaultValue: 'Ready to Sell Your Home?' },
                        { key: 'cta_text', label: 'Description', type: 'textarea', rows: 3, defaultValue: 'Fill out the form below for a free home evaluation.' },
                        { key: 'cta_button_text', label: 'Button Text', type: 'text', defaultValue: 'Get a Free Evaluation' },
                        { key: 'cta_button_link', label: 'Button Link (optional)', type: 'text' },
                    ],
                },
            ],
        },
        contact: {
            label: 'Contact',
            sections: [
                {
                    id: 'page-header',
                    label: 'Page Header',
                    fields: [
                        { key: 'header_label', label: 'Label', type: 'text', defaultValue: 'Get In Touch' },
                        { key: 'header_title', label: 'Title', type: 'text', defaultValue: 'Contact Me' },
                        { key: 'header_subtitle', label: 'Subtitle', type: 'textarea', rows: 3, defaultValue: "Have a question or ready to start your real estate journey? I'd love to hear from you." },
                        { key: 'header_image', label: 'Background Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
                    ],
                },
            ],
        },
        'home-valuation': {
            label: 'Home Valuation',
            sections: [],
        },
        areas: {
            label: 'Areas',
            sections: [
                {
                    id: 'page-header',
                    label: 'Page Header',
                    fields: [
                        { key: 'header_title', label: 'Title', type: 'text', defaultValue: 'Areas We Serve' },
                        { key: 'header_subtitle', label: 'Subtitle', type: 'textarea', rows: 3, defaultValue: 'Explore the neighborhoods and communities I specialize in.' },
                        { key: 'header_image', label: 'Background Image', type: 'image', uploadKey: 'block', maxSizeMb: 5 },
                    ],
                },
            ],
        },
    },
};
