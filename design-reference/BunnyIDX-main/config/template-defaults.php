<?php

/**
 * Default page_data content per template.
 * Used when creating new websites to seed initial content.
 */
return [
    'luxury' => [
        'home' => [
            'hero_headline' => 'Buy & Sell with Confidence',
            'hero_subtitle' => 'Your trusted real estate advisor',
        ],
        'about' => [
            'about_extended' => '',
        ],
        'buy' => [
            'headline' => 'Find Your Dream Home',
            'description' => 'Whether you\'re a first-time buyer or looking for your next investment, I\'ll guide you through every step of the buying process.',
        ],
        'sell' => [
            'headline' => 'Sell for Top Dollar',
            'description' => 'Get the best value for your property with my proven marketing strategy and deep knowledge of the local market.',
        ],
        // Contact is a block canvas like every other page. The Contact block
        // carries its own /blog-style page header, so no separate hero block.
        'contact' => [
            'blocks' => [
                [
                    'id' => 'contact-main',
                    'type' => 'contact',
                    'slot' => 'default',
                    'data' => [],
                ],
            ],
        ],
        // Communities index — the grid is the Communities block + the CTA
        // block, both editable (the boxed hero is the page's built-in header).
        'areas' => [
            'blocks' => [
                [
                    'id' => 'areas-grid',
                    'type' => 'communities',
                    'slot' => 'default',
                    'data' => ['title' => '', 'theme' => 'light', 'layout' => 'grid', 'card_style' => 'below', 'columns' => '3', 'source' => 'all'],
                ],
                [
                    'id' => 'areas-cta',
                    'type' => 'cta',
                    'slot' => 'default',
                    'data' => [
                        'eyebrow' => 'Communities',
                        'heading' => 'Not Sure Which Neighborhood Fits?',
                        'description' => 'Tell us how you live — commute, schools, lifestyle, budget — and we\'ll point you to the communities worth your shortlist, with private tours when you\'re ready.',
                        'button_label' => 'Contact Us',
                        'button_link' => '/contact',
                    ],
                ],
            ],
        ],
        // Team page — the members grid is the Team block (dynamic source: the
        // site's Team section) + a closing CTA block, both editable (the boxed
        // hero is the page's built-in header until a Page Header block is added).
        'team' => [
            'blocks' => [
                [
                    'id' => 'team-grid',
                    'type' => 'team',
                    'slot' => 'default',
                    'data' => ['title' => '', 'source' => 'team', 'layout' => 'grid', 'align' => 'left', 'view_all_label' => '', 'view_all_link' => ''],
                ],
                [
                    'id' => 'team-cta',
                    'type' => 'cta',
                    'slot' => 'default',
                    'data' => [
                        'eyebrow' => 'Work With Us',
                        'heading' => 'Let\'s Find Your Place Together',
                        'description' => 'Buying, selling or just exploring the market — our team is ready to put local expertise to work for you.',
                        'button_label' => 'Contact Us',
                        'button_link' => '/contact',
                    ],
                ],
            ],
        ],
        // Home Valuation is a block canvas too — a dark, image-backed Home
        // Valuation block is the hero (carries the page H1 + address bar); the
        // ?address= map results + lead form render after the blocks, and the
        // marketing sections below give it the depth of a real funnel page.
        'home-valuation' => [
            'blocks' => [
                [
                    'id' => 'home-valuation-main',
                    'type' => 'home-valuation',
                    'slot' => 'default',
                    'data' => [
                        'headline' => 'Free Home Valuation',
                        'description' => 'Instant property valuation backed by a local expert. Enter your address to see your home on the map and what it could sell for in today’s market.',
                        'cta_text' => 'Get My Valuation',
                        'placeholder' => 'Enter your home address',
                        'theme' => 'dark',
                        'bg_image' => '/images/backgrounds/bg-1.jpg',
                    ],
                ],
                [
                    'id' => 'home-valuation-process',
                    'type' => 'process',
                    'slot' => 'default',
                    'data' => [
                        'title' => 'How It Works',
                        'description' => 'A clear, no-obligation path from your address to a confident asking price.',
                        'layout' => 'row',
                        'show_numbers' => '1',
                        'media_type' => 'icon',
                        'bg_color' => '#F5F5F4',
                        'text_color' => '#1F2937',
                        'accent_color' => '#111315',
                        'items' => json_encode([
                            ['title' => 'Enter Your Address', 'description' => 'Tell us where your home is — we’ll pull it up on the map and confirm the details.', 'icon' => 'map-pin'],
                            ['title' => 'Get Expert Analysis', 'description' => 'We review recent comparable sales, condition and current demand in your neighborhood.', 'icon' => 'search'],
                            ['title' => 'Receive Your Report', 'description' => 'You get a clear, data-backed valuation and a strategy to maximize your sale price.', 'icon' => 'document'],
                        ]),
                    ],
                ],
                [
                    'id' => 'home-valuation-why',
                    'type' => 'content',
                    'slot' => 'default',
                    'data' => [
                        'image_position' => 'left',
                        'image' => '/images/backgrounds/bg-7.jpg',
                        'eyebrow' => 'Why a Professional Valuation',
                        'heading' => 'Automated estimates guess. A local expert knows.',
                        'body' => "Online estimates can’t see your renovations, your view, or what buyers are actually paying on your street this month. They average the whole neighborhood and call it a number.\n\nA professional valuation factors in real comparable sales, your home’s exact condition, and live market demand — so you price right the first time, attract serious buyers, and sell for the most the market will pay.",
                        'buttons' => json_encode([
                            ['label' => 'Get My Valuation', 'link' => '#', 'style' => 'primary'],
                        ]),
                    ],
                ],
                [
                    'id' => 'home-valuation-faqs',
                    'type' => 'faqs',
                    'slot' => 'default',
                    'data' => [
                        'layout' => 'split',
                        'eyebrow' => 'Good to Know',
                        'heading' => 'Home Valuation FAQs',
                        'items' => json_encode([
                            ['question' => 'Is the valuation really free?', 'answer' => 'Yes — it’s completely free and there’s no obligation to list or to work with us afterward.'],
                            ['question' => 'How accurate is it?', 'answer' => 'Because a local expert reviews real comparable sales and your home’s specifics, it’s far more accurate than an automated online estimate.'],
                            ['question' => 'What happens after I submit my address?', 'answer' => 'You’ll see your property on the map right away, and we’ll follow up with a detailed, data-backed valuation report.'],
                        ]),
                    ],
                ],
                [
                    'id' => 'home-valuation-cta',
                    'type' => 'cta',
                    'slot' => 'default',
                    'data' => [
                        'image' => '/images/backgrounds/bg-5.jpg',
                        'eyebrow' => 'Ready When You Are',
                        'heading' => 'Thinking About Selling?',
                        'description' => 'Start with your free valuation — no pressure, no obligation, just a clear picture of what your home is worth today.',
                        'button_label' => 'Get My Free Valuation',
                        'button_link' => '#',
                    ],
                ],
            ],
        ],
    ],
];
