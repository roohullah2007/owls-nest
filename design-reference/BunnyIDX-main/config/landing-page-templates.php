<?php

/**
 * Landing-page template registry.
 *
 * Each entry is a prebuilt, fully-editable lead-capture page built from the same
 * block system (hero capture flow → sections → footer CTA). Creating a landing
 * page deep-copies an entry's `defaults` into the new record; the AI quick-create
 * flow starts from one of these and rewrites the copy.
 *
 * Blocks are ordered; each is { id, type, data }. Supported types are registered
 * in the React block registry (resources/js/landing-pages/public/registry.ts),
 * which renders the public page. The hero `flow` (sell | valuation | buyer)
 * drives its copy + the lead type captured.
 */
$heroPresets = [
    'sell' => [
        'flow' => 'sell', 'lead_type' => 'seller',
        'eyebrow' => 'List For 2%',
        'headline' => 'Save Time and Commission',
        'subheadline' => 'We will list your house for 2% commission vs the traditional 3%. Enter your address to get started.',
        'address_placeholder' => 'Enter your address',
        'start_label' => 'Get Started',
        'map_title' => 'Is this your home?',
        'map_subtitle' => "Confirm the location and we'll put together your selling plan.",
        'map_confirm_label' => 'Yes, This Is My Home',
        'form_title' => "Let's talk about selling",
        'form_subtitle' => "Enter your details and we'll reach out with your 2% listing plan.",
        'submit_label' => 'Get My Free Consultation',
        'disclaimer' => 'No spam. No obligation. Free, no-pressure consultation.',
    ],
    'valuation' => [
        'flow' => 'valuation', 'lead_type' => 'seller',
        'eyebrow' => 'Free Home Valuation',
        'headline' => "What's Your Home Worth?",
        'subheadline' => 'Enter your address for a free, no-obligation home value report backed by real local sales data.',
        'address_placeholder' => 'Enter your home address',
        'start_label' => 'Get My Estimate',
        'map_title' => 'Is this your home?',
        'map_subtitle' => "Confirm the location and we'll prepare your personalized report.",
        'map_confirm_label' => 'Yes, This Is My Home',
        'form_title' => 'Where should we send your report?',
        'form_subtitle' => "Your valuation is ready. Enter your details and we'll send it right over.",
        'submit_label' => 'Send My Home Value Report',
        'disclaimer' => 'No spam. No obligation. Free, no-pressure valuation.',
    ],
    'cash' => [
        'flow' => 'sell', 'lead_type' => 'seller',
        'eyebrow' => 'Sell As-Is',
        'headline' => 'Get a Cash Offer on Your Home',
        'subheadline' => 'Skip the showings and repairs. Enter your address for a no-obligation cash offer in 24 hours.',
        'address_placeholder' => 'Enter your address',
        'start_label' => 'Get My Cash Offer',
        'map_title' => 'Is this your home?',
        'map_subtitle' => "Confirm the location and we'll prepare your cash offer.",
        'map_confirm_label' => 'Yes, This Is My Home',
        'form_title' => 'Where should we send your offer?',
        'form_subtitle' => "Enter your details and we'll send your no-obligation cash offer.",
        'submit_label' => 'Get My Cash Offer',
        'disclaimer' => 'No spam. No obligation. No repairs or showings required.',
    ],
    'buyer' => [
        'flow' => 'buyer', 'lead_type' => 'buyer',
        'eyebrow' => 'For Home Buyers',
        'headline' => 'Find Your Next Home',
        'subheadline' => 'Tell us where you want to live and get a curated list of homes that match — including off-market options.',
        'address_placeholder' => 'Enter a city, neighborhood or ZIP',
        'start_label' => 'Find Homes',
        'map_title' => 'Is this the right area?',
        'map_subtitle' => "Confirm the area and we'll send homes that match.",
        'map_confirm_label' => 'Yes, Search Here',
        'form_title' => 'Where should we send matching homes?',
        'form_subtitle' => "Enter your details and we'll send homes that fit your criteria.",
        'submit_label' => 'Send Me Homes',
        'disclaimer' => 'No spam. Unsubscribe anytime.',
    ],
    'luxury' => [
        'flow' => 'sell', 'lead_type' => 'seller',
        'eyebrow' => 'Luxury Listings',
        'headline' => 'Sell Your Home for What It\'s Worth',
        'subheadline' => 'White-glove marketing for distinctive homes. Enter your address for a private, expert valuation.',
        'address_placeholder' => 'Enter your address',
        'start_label' => 'Request Valuation',
        'map_title' => 'Is this your home?',
        'map_subtitle' => "Confirm the location and we'll prepare your private valuation.",
        'map_confirm_label' => 'Yes, This Is My Home',
        'form_title' => 'Request your private valuation',
        'form_subtitle' => "Enter your details and we'll be in touch discreetly.",
        'submit_label' => 'Request Private Valuation',
        'disclaimer' => 'Discreet and confidential. No obligation.',
    ],
];

$testimonialImgs = [
    'landing-pages/templates/testimonial-1.webp',
    'landing-pages/templates/testimonial-2.webp',
    'landing-pages/templates/testimonial-3.webp',
];

$aboutPhoto = 'landing-pages/templates/about.webp';

/**
 * Assemble a full block set from per-template overrides. Keeps every template on
 * the same proven structure while letting copy / images / flow differ.
 */
$consentText = 'By checking this box, I agree to receive marketing and informational text messages at the phone number provided, including messages sent via automated technology. Consent is not a condition of purchase. Message and data rates may apply. Message frequency varies. Reply STOP to unsubscribe or HELP for help.';

$build = function (array $o) use ($heroPresets, $testimonialImgs, $aboutPhoto, $consentText): array {
    $hero = array_merge($heroPresets[$o['flow']], ['image' => $o['hero_image'], 'consent_text' => $consentText]);

    $blocks = [];
    $blocks[] = ['id' => 'hero', 'type' => 'hero', 'data' => $hero];
    $blocks[] = ['id' => 'steps', 'type' => 'steps', 'data' => [
        'title' => 'How It Works',
        'items' => $o['steps'],
    ]];
    $blocks[] = ['id' => 'about', 'type' => 'about', 'data' => [
        'eyebrow' => 'About',
        'title' => $o['about_title'],
        'body' => $o['about_body'],
        'photo' => $aboutPhoto,
        'stats' => $o['stats'],
    ]];
    $blocks[] = ['id' => 'testimonials', 'type' => 'testimonials', 'data' => [
        'title' => $o['testimonials_title'],
        'items' => array_map(fn ($t, $i) => $t + ['image' => $testimonialImgs[$i] ?? ''], $o['testimonials'], array_keys($o['testimonials'])),
    ]];
    if (! empty($o['calculator'])) {
        $blocks[] = ['id' => 'calculator', 'type' => 'calculator', 'data' => [
            'title' => "See How Much You'll Save",
            'subtitle' => "Slide to your home's value and watch the savings add up.",
            'traditional_rate' => '3', 'our_rate' => '2',
            'default_value' => '500000', 'min_value' => '100000', 'max_value' => '2000000', 'step' => '25000',
            'savings_label' => 'You keep',
            'note' => 'Based on listing-side commission only. Actual savings vary by final sale price.',
            'cta_label' => 'Start Saving',
        ]];
    }
    $blocks[] = ['id' => 'video-testimonials', 'type' => 'video-testimonials', 'data' => [
        'title' => 'Hear From Our Clients',
        'subtitle' => 'Real people, real results.',
        'items' => [
            ['video_url' => '', 'name' => 'David Park', 'caption' => $o['vt_captions'][0], 'poster' => ''],
            ['video_url' => '', 'name' => 'Maria Gonzalez', 'caption' => $o['vt_captions'][1], 'poster' => ''],
            ['video_url' => '', 'name' => 'The Whitfields', 'caption' => $o['vt_captions'][2], 'poster' => ''],
        ],
    ]];
    $blocks[] = ['id' => 'video', 'type' => 'video', 'data' => [
        'eyebrow' => 'Watch',
        'title' => $o['video_title'],
        'subtitle' => $o['video_sub'],
        'video_url' => '', 'poster' => '',
        'cta_label' => $o['cta_button'],
        'cta_link' => '#hero',
    ]];
    $blocks[] = ['id' => 'cta', 'type' => 'cta', 'data' => [
        'headline' => $o['cta_headline'],
        'subtext' => $o['cta_sub'],
        'button_label' => $o['cta_button'],
        'image' => $o['hero_image'],
    ]];

    return $blocks;
};

/**
 * Assemble the block set for a "Video Landing" design preset — a long-scroll
 * video sales letter: video hero → benefits → testimonials → guarantee →
 * authority bio → application form → closing CTA. All CTAs drive to #apply.
 */
$buildVideo = function (array $o) use ($testimonialImgs, $aboutPhoto, $consentText): array {
    return [
        ['id' => 'hero-video', 'type' => 'hero-video', 'data' => [
            'eyebrow' => $o['eyebrow'],
            'headline' => $o['headline'],
            'subheadline' => $o['subheadline'],
            'video_url' => '',
            'video_tab' => $o['video_tab'] ?? 'Watch This Video',
            'poster' => $o['poster'],
            'caption' => $o['caption'] ?? null,
            'cta_label' => $o['cta_label'],
            'cta_link' => '#apply',
            'note' => $o['note'] ?? 'Limited spots — by application only.',
            'stats' => $o['stats'] ?? [],
        ]],
        ['id' => 'benefits', 'type' => 'benefits', 'data' => [
            'eyebrow' => $o['benefits_eyebrow'] ?? 'What You Get',
            'title' => $o['benefits_title'],
            'subtitle' => $o['benefits_sub'],
            'items' => $o['benefits'],
        ]],
        ['id' => 'testimonials', 'type' => 'testimonials', 'data' => [
            'eyebrow' => $o['testimonials_eyebrow'] ?? 'People Choose Us Because',
            'title' => $o['testimonials_title'],
            'items' => array_map(fn ($t, $i) => $t + ['image' => $testimonialImgs[$i] ?? ''], $o['testimonials'], array_keys($o['testimonials'])),
        ]],
        ['id' => 'guarantee', 'type' => 'guarantee', 'data' => [
            'badge_label' => 'Our Promise',
            'title' => $o['guarantee_title'],
            'body' => $o['guarantee_body'],
            'cta_label' => $o['cta_label'],
            'cta_link' => '#apply',
        ]],
        ['id' => 'authority', 'type' => 'authority', 'data' => [
            'eyebrow' => 'Meet Your Agent',
            'name' => $o['agent_name'] ?? 'Jordan Rivera',
            'title' => $o['agent_title'],
            'photo' => $aboutPhoto,
            'body' => $o['agent_body'],
            'points' => $o['agent_points'],
            'cta_label' => $o['authority_cta'] ?? 'Apply to Work With Me',
            'cta_link' => '#apply',
        ]],
        ['id' => 'lead-form', 'type' => 'lead-form', 'data' => [
            'eyebrow' => 'Apply Now',
            'title' => $o['form_title'],
            'subtitle' => $o['form_sub'],
            'button_label' => $o['form_button'],
            'message_label' => $o['form_msg_label'] ?? 'Tell us about your goals',
            'show_phone' => true,
            'consent_text' => $consentText,
            'disclaimer' => 'No spam. Your information is kept private.',
        ]],
        ['id' => 'cta', 'type' => 'cta', 'data' => [
            'eyebrow' => $o['cta_eyebrow'] ?? 'Applications Closing Soon',
            'headline' => $o['cta_headline'],
            'subtext' => $o['cta_sub'],
            'button_label' => $o['cta_label'],
            'cta_link' => '#apply',
            'image' => $o['poster'],
        ]],
    ];
};

return [

    'home-value' => [
        'type' => 'seller',
        'template' => 'classic',
        'name' => '2% Listing',
        'description' => 'Low-commission listing funnel — sell for a 2% fee with a savings calculator.',
        'preview' => ['bg' => '#0E1B2A', 'accent' => '#1693C9'],
        'defaults' => [
            'accent_color' => '#1693C9',
            'meta_title' => 'Save Time and Commission',
            'meta_description' => 'We will list your house for 2% commission vs the traditional 3%. Get started today.',
            'blocks' => $build([
                'flow' => 'sell',
                'hero_image' => 'landing-pages/templates/hero-sell.webp',
                'calculator' => true,
                'steps' => [
                    ['title' => 'Share Your Address', 'text' => 'Tell us about your property in under a minute.'],
                    ['title' => 'Get Your Plan', 'text' => 'We prepare a data-backed price and a 2% listing plan.'],
                    ['title' => 'Sell & Save', 'text' => 'List for top dollar and keep more at closing.'],
                ],
                'about_title' => 'Full Service. Lower Fee.',
                'about_body' => "Selling your home shouldn't cost 3% of everything you've built. We offer the complete, full-service listing experience — professional photography, premium MLS and portal exposure, targeted marketing, expert pricing and hands-on negotiation — for a flat 2% listing fee.\n\nThat's the same level of service you'd expect from any top brokerage, with thousands of dollars more staying in your pocket at closing.",
                'stats' => [['value' => '250+', 'label' => 'Homes Sold'], ['value' => '1%', 'label' => 'You Save vs. 3%'], ['value' => '11 days', 'label' => 'Avg. Time to Offer']],
                'testimonials_title' => 'What Sellers Say',
                'testimonials' => [
                    ['quote' => 'Same great service as the big brokerages but we saved over $9,000 in commission. The 2% fee was a no-brainer.', 'author' => 'David Park', 'location' => 'Saved $9,000+'],
                    ['quote' => 'Honest, responsive and knowledgeable. We sold above asking and kept more of our equity.', 'author' => 'Maria Gonzalez', 'location' => 'Sold above asking'],
                    ['quote' => 'No pressure at all — just real numbers and a clear plan.', 'author' => 'The Whitfields', 'location' => 'Repeat clients'],
                ],
                'vt_captions' => ['Saved $9,000+ in commission', 'Sold above asking', 'Repeat clients'],
                'video_title' => 'A Better Way to Sell Your Home',
                'video_sub' => 'Watch a quick overview of our pricing and marketing strategy.',
                'cta_headline' => 'Ready to Sell for Less?',
                'cta_sub' => 'List with us for 2% and keep more of your equity. It only takes a minute to start.',
                'cta_button' => 'Get Started',
            ]),
        ],
    ],

    'home-valuation' => [
        'type' => 'seller',
        'template' => 'classic',
        'name' => 'Home Valuation',
        'description' => '"What\'s your home worth?" — a free valuation funnel that captures seller leads.',
        'preview' => ['bg' => '#0E2A22', 'accent' => '#0E9F6E'],
        'defaults' => [
            'accent_color' => '#0E9F6E',
            'meta_title' => "What's Your Home Worth?",
            'meta_description' => 'Get a free, no-obligation home valuation backed by real local sales data.',
            'blocks' => $build([
                'flow' => 'valuation',
                'hero_image' => 'landing-pages/templates/hero-valuation.webp',
                'calculator' => false,
                'steps' => [
                    ['title' => 'Share Your Address', 'text' => 'Tell us about your property in under a minute.'],
                    ['title' => 'Get Your Valuation', 'text' => 'We prepare a tailored, data-backed value range.'],
                    ['title' => 'Plan Your Sale', 'text' => 'Optional strategy session to maximize your sale price.'],
                ],
                'about_title' => 'A Real Number, From a Real Expert',
                'about_body' => "Automated estimates miss what makes your home unique. We combine real, recent neighborhood sales with on-the-ground expertise to give you an honest value range — and a clear plan if you decide to sell.\n\nNo pressure, no obligation. Just the number you need to make your next move.",
                'stats' => [['value' => '250+', 'label' => 'Homes Sold'], ['value' => '$120M', 'label' => 'In Sales Volume'], ['value' => '11 days', 'label' => 'Avg. Time to Offer']],
                'testimonials_title' => 'What Sellers Say',
                'testimonials' => [
                    ['quote' => 'Their valuation was spot on and we sold for $40k over what we expected.', 'author' => 'David Park', 'location' => 'Sold in 11 days'],
                    ['quote' => 'Honest, responsive and knowledgeable about our neighborhood.', 'author' => 'Maria Gonzalez', 'location' => 'Sold above asking'],
                    ['quote' => 'No pressure at all — just real numbers and a clear plan.', 'author' => 'The Whitfields', 'location' => 'Repeat clients'],
                ],
                'vt_captions' => ['Sold in 11 days', 'Sold above asking', 'Repeat clients'],
                'video_title' => 'How We Price Your Home',
                'video_sub' => 'A quick look at our data-driven valuation process.',
                'cta_headline' => 'Ready to See What Your Home Is Worth?',
                'cta_sub' => 'Get your free valuation today — it only takes a minute.',
                'cta_button' => 'Get My Home Value',
            ]),
        ],
    ],

    'cash-offer' => [
        'type' => 'seller',
        'template' => 'classic',
        'name' => 'Cash Offer',
        'description' => 'Sell-as-is cash offer funnel — no repairs, no showings, fast close.',
        'preview' => ['bg' => '#2A1A0E', 'accent' => '#F97316'],
        'defaults' => [
            'accent_color' => '#F97316',
            'meta_title' => 'Get a Cash Offer on Your Home',
            'meta_description' => 'Skip the showings and repairs. Get a no-obligation cash offer in 24 hours.',
            'blocks' => $build([
                'flow' => 'cash',
                'hero_image' => 'landing-pages/templates/hero-cash.webp',
                'calculator' => false,
                'steps' => [
                    ['title' => 'Share Your Address', 'text' => 'Tell us about your property in under a minute.'],
                    ['title' => 'Get Your Cash Offer', 'text' => 'Receive a fair, no-obligation offer within 24 hours.'],
                    ['title' => 'Close On Your Timeline', 'text' => 'Pick your closing date — sell as-is, no repairs.'],
                ],
                'about_title' => 'Sell Without the Hassle',
                'about_body' => "Not every home sale needs months of prep, showings and uncertainty. If you want a simple, certain sale, we'll make a fair cash offer and close on your schedule.\n\nNo repairs, no staging, no open houses — just a straightforward way to move on.",
                'stats' => [['value' => '24 hrs', 'label' => 'To an Offer'], ['value' => '$0', 'label' => 'In Repairs'], ['value' => '7 days', 'label' => 'Fast Close Available']],
                'testimonials_title' => 'What Sellers Say',
                'testimonials' => [
                    ['quote' => 'We needed to sell fast and they made it painless. Cash offer in a day, closed in a week.', 'author' => 'David Park', 'location' => 'Closed in 7 days'],
                    ['quote' => 'No repairs, no showings, no stress. Exactly what we needed.', 'author' => 'Maria Gonzalez', 'location' => 'Sold as-is'],
                    ['quote' => 'Fair offer and a smooth process from start to finish.', 'author' => 'The Whitfields', 'location' => 'Hassle-free sale'],
                ],
                'vt_captions' => ['Closed in 7 days', 'Sold as-is', 'Hassle-free sale'],
                'video_title' => 'How Our Cash Offers Work',
                'video_sub' => 'A quick overview of our simple, no-obligation process.',
                'cta_headline' => 'Want a Cash Offer Today?',
                'cta_sub' => 'Enter your address and get a no-obligation cash offer within 24 hours.',
                'cta_button' => 'Get My Cash Offer',
            ]),
        ],
    ],

    'buyer-search' => [
        'type' => 'buyer',
        'template' => 'classic',
        'name' => 'Buyer Search',
        'description' => 'Capture buyer leads with a curated home-search funnel.',
        'preview' => ['bg' => '#0E1B2A', 'accent' => '#2563EB'],
        'defaults' => [
            'accent_color' => '#2563EB',
            'meta_title' => 'Find Your Next Home',
            'meta_description' => 'Get a curated list of homes that match what you want — including off-market options.',
            'blocks' => $build([
                'flow' => 'buyer',
                'hero_image' => 'landing-pages/templates/hero-buyer.webp',
                'calculator' => false,
                'steps' => [
                    ['title' => 'Tell Us What You Want', 'text' => 'Share your area, budget and must-haves in under a minute.'],
                    ['title' => 'Get Curated Matches', 'text' => 'We hand-pick homes that fit — including off-market listings.'],
                    ['title' => 'Tour & Close', 'text' => 'We schedule showings and guide you to the keys.'],
                ],
                'about_title' => 'Your Advantage in a Competitive Market',
                'about_body' => "The best homes move fast — often before they hit the portals. We give you early access to new and off-market listings, sharp negotiation, and deep local knowledge so you buy the right home at the right price.\n\nWork with someone who's in your corner from search to closing.",
                'stats' => [['value' => '500+', 'label' => 'Buyers Helped'], ['value' => '1st', 'label' => 'Access to New Listings'], ['value' => '4.9★', 'label' => 'Client Rating']],
                'testimonials_title' => 'What Buyers Say',
                'testimonials' => [
                    ['quote' => 'They found us a home in our dream neighborhood that wasn\'t even listed yet.', 'author' => 'David Park', 'location' => 'First-time buyers'],
                    ['quote' => 'Sharp negotiation got us under asking in a bidding war. Incredible.', 'author' => 'Maria Gonzalez', 'location' => 'Closed under asking'],
                    ['quote' => 'Patient, knowledgeable and always responsive. Highly recommend.', 'author' => 'The Whitfields', 'location' => 'Relocated buyers'],
                ],
                'vt_captions' => ['First-time buyers', 'Closed under asking', 'Relocated buyers'],
                'video_title' => 'How We Help You Win',
                'video_sub' => 'A quick look at our buyer search and negotiation process.',
                'cta_headline' => 'Ready to Find Your Home?',
                'cta_sub' => 'Tell us what you\'re looking for and we\'ll send matching homes today.',
                'cta_button' => 'Find Homes',
            ]),
        ],
    ],

    'luxury-listing' => [
        'type' => 'seller',
        'template' => 'classic',
        'name' => 'Luxury Listing',
        'description' => 'White-glove listing funnel for distinctive, high-end homes.',
        'preview' => ['bg' => '#1A1610', 'accent' => '#B08D57'],
        'defaults' => [
            'accent_color' => '#B08D57',
            'meta_title' => "Sell Your Home for What It's Worth",
            'meta_description' => 'White-glove marketing for distinctive homes. Request a private, expert valuation.',
            'blocks' => $build([
                'flow' => 'luxury',
                'hero_image' => 'landing-pages/templates/hero-luxury.webp',
                'calculator' => false,
                'steps' => [
                    ['title' => 'Request a Valuation', 'text' => 'Share your address for a private, expert assessment.'],
                    ['title' => 'A Tailored Strategy', 'text' => 'Bespoke marketing built around your home\'s story.'],
                    ['title' => 'Sell at the Top', 'text' => 'Reach qualified buyers and close with confidence.'],
                ],
                'about_title' => 'Marketing Worthy of Your Home',
                'about_body' => "Distinctive homes deserve more than a sign in the yard. We craft cinematic photography, targeted campaigns and discreet outreach to the right buyers — presenting your home at its very best.\n\nA refined, white-glove experience from first conversation to closing.",
                'stats' => [['value' => '$120M', 'label' => 'In Luxury Sales'], ['value' => '98%', 'label' => 'Of List Price'], ['value' => '4.9★', 'label' => 'Client Rating']],
                'testimonials_title' => 'What Sellers Say',
                'testimonials' => [
                    ['quote' => 'The marketing was stunning and the results spoke for themselves. We sold near asking, quickly.', 'author' => 'David Park', 'location' => 'Sold at 98% of list'],
                    ['quote' => 'Discreet, professional and incredibly well-connected. A flawless experience.', 'author' => 'Maria Gonzalez', 'location' => 'Private sale'],
                    ['quote' => 'They understood our home and found exactly the right buyer.', 'author' => 'The Whitfields', 'location' => 'Estate sale'],
                ],
                'vt_captions' => ['Sold at 98% of list', 'Private sale', 'Estate sale'],
                'video_title' => 'A Cinematic Approach to Selling',
                'video_sub' => 'See how we present distinctive homes to the right buyers.',
                'cta_headline' => 'Request Your Private Valuation',
                'cta_sub' => 'Discreet, expert and tailored to your home. No obligation.',
                'cta_button' => 'Request Valuation',
            ]),
        ],
    ],

    // ── Video Landing design ─────────────────────────────────────────────────
    'listing-masterclass' => [
        'type' => 'seller',
        'template' => 'video-landing',
        'name' => 'Listing Masterclass',
        'description' => 'Video sales letter for sellers — watch the strategy, then apply for a private listing consult.',
        'preview' => ['bg' => '#0A0E16', 'accent' => '#F2682C'],
        'defaults' => [
            'accent_color' => '#F2682C',
            'meta_title' => 'Sell for Top Dollar — Free Masterclass',
            'meta_description' => 'Watch how we sell homes faster and for more, then apply for a private strategy session.',
            'blocks' => $buildVideo([
                'eyebrow' => 'Free Home-Selling Masterclass',
                'headline' => 'Sell for Top Dollar — Watch How',
                'subheadline' => 'A short breakdown of the exact strategy we use to sell homes faster and for more — then apply for a private strategy session.',
                'poster' => 'landing-pages/templates/hero-sell.webp',
                'video_tab' => 'Watch How We Sell for More',
                'caption' => 'Spots are limited each month — <strong>applications fill fast.</strong>',
                'stats' => [
                    ['value' => '$250M+', 'label' => 'In Closed Sales'],
                    ['value' => '11 days', 'label' => 'Avg. to Offer'],
                    ['value' => '4.9★', 'label' => 'Client Rating'],
                ],
                'cta_label' => 'Apply for a Strategy Session',
                'cta_eyebrow' => 'Applications Closing Soon So Act Fast',
                'benefits_title' => 'Everything You Need to Win',
                'benefits_sub' => 'A complete, full-service plan built to get you the best outcome — nothing left to chance.',
                'benefits' => [
                    ['title' => 'Premium Marketing', 'text' => 'Pro photography, video and portal exposure that makes buyers compete for your home.'],
                    ['title' => 'Expert Pricing', 'text' => 'Data-backed pricing strategy tuned to your micro-market, not a generic estimate.'],
                    ['title' => 'Sharp Negotiation', 'text' => 'We protect your equity at every step and drive the best possible terms.'],
                    ['title' => 'Concierge Prep', 'text' => 'Staging guidance and trusted vendors to get your home show-ready, stress-free.'],
                    ['title' => 'Off-Market Reach', 'text' => 'Access to a private buyer network before your home hits the portals.'],
                    ['title' => 'White-Glove Service', 'text' => 'One dedicated point of contact from first call to closing day.'],
                ],
                'testimonials_title' => 'Sellers Love the Results',
                'testimonials' => [
                    ['quote' => 'We sold above asking in under two weeks. The marketing was on another level.', 'author' => 'David Park', 'location' => 'Sold above asking'],
                    ['quote' => 'Honest, sharp and always available. They made a stressful process easy.', 'author' => 'Maria Gonzalez', 'location' => 'Closed in 9 days'],
                    ['quote' => 'The strategy session alone was worth it. We netted far more than expected.', 'author' => 'The Whitfields', 'location' => 'Repeat clients'],
                ],
                'guarantee_title' => 'The No-Risk Guarantee',
                'guarantee_body' => 'If you’re not completely satisfied with our service at any point before we list, you can walk away — no fees, no obligation, no hard feelings.',
                'agent_title' => 'Top 1% Listing Agent · 500+ Homes Sold',
                'agent_body' => "For over a decade I've helped homeowners sell for more with less stress. My team treats every listing like it's our own — sharp strategy, relentless marketing and honest guidance from first call to closing.\n\nWhen you work with us, you get a partner who's genuinely in your corner.",
                'agent_points' => [
                    ['text' => 'Over $250M in closed sales'],
                    ['text' => 'Average 11 days to offer'],
                    ['text' => '4.9★ average client rating'],
                ],
                'form_title' => 'Apply for Your Strategy Session',
                'form_sub' => 'Tell us about your home and goals — we’ll reach out to schedule your private consult.',
                'form_button' => 'Submit Application',
                'cta_headline' => 'Ready to Sell for More?',
                'cta_sub' => 'Spots are limited each month. Apply now and we’ll be in touch within one business day.',
            ]),
        ],
    ],

    'buyer-vip' => [
        'type' => 'buyer',
        'template' => 'video-landing',
        'name' => 'Buyer VIP',
        'description' => 'Video funnel for buyers — watch how it works, then apply for VIP access to new and off-market homes.',
        'preview' => ['bg' => '#0A0E16', 'accent' => '#2DD4BF'],
        'defaults' => [
            'accent_color' => '#2DD4BF',
            'meta_title' => 'Get VIP Access to Homes Before They Hit the Market',
            'meta_description' => 'Watch how our buyers win in a competitive market, then apply for VIP access to new and off-market listings.',
            'blocks' => $buildVideo([
                'eyebrow' => 'For Serious Home Buyers',
                'headline' => 'See the Homes Others Don’t',
                'subheadline' => 'Watch how our VIP buyers get early access to new and off-market listings — then apply to join.',
                'poster' => 'landing-pages/templates/hero-buyer.webp',
                'video_tab' => 'Watch How Our Buyers Win',
                'caption' => 'VIP access is limited — <strong>apply to secure your spot.</strong>',
                'stats' => [
                    ['value' => '500+', 'label' => 'Buyers Helped'],
                    ['value' => '1st', 'label' => 'Access to Listings'],
                    ['value' => '4.9★', 'label' => 'Client Rating'],
                ],
                'cta_label' => 'Apply for VIP Access',
                'cta_eyebrow' => 'VIP Spots Are Filling Up',
                'note' => 'Free to apply — VIP access by approval.',
                'benefits_title' => 'Your Unfair Advantage',
                'benefits_sub' => 'The best homes move fast — often before they hit the portals. Here’s how we get you in first.',
                'benefits' => [
                    ['title' => 'Early Access', 'text' => 'See new and coming-soon listings before they reach the public portals.'],
                    ['title' => 'Off-Market Homes', 'text' => 'Tap a private network of sellers who haven’t listed yet.'],
                    ['title' => 'Curated Matches', 'text' => 'Hand-picked homes that actually fit your criteria — no endless scrolling.'],
                    ['title' => 'Sharp Negotiation', 'text' => 'Win in a bidding war without overpaying. We protect your budget.'],
                    ['title' => 'Local Expertise', 'text' => 'Deep neighborhood knowledge so you buy the right home in the right area.'],
                    ['title' => 'End-to-End Support', 'text' => 'From first tour to closing, one dedicated agent in your corner.'],
                ],
                'testimonials_title' => 'Buyers Who Won',
                'testimonials' => [
                    ['quote' => 'They found us a home in our dream neighborhood that wasn’t even listed yet.', 'author' => 'David Park', 'location' => 'First-time buyers'],
                    ['quote' => 'Sharp negotiation got us under asking in a bidding war. Incredible.', 'author' => 'Maria Gonzalez', 'location' => 'Closed under asking'],
                    ['quote' => 'Patient, knowledgeable and always responsive. Highly recommend.', 'author' => 'The Whitfields', 'location' => 'Relocated buyers'],
                ],
                'guarantee_title' => 'No Pressure, Ever',
                'guarantee_body' => 'We work at your pace. There’s no obligation and no pushy sales tactics — just honest guidance until you find the right home.',
                'agent_title' => 'Buyer’s Agent · 500+ Families Helped',
                'agent_body' => "I help buyers win in competitive markets without overpaying or settling. You get early access, honest advice and a true advocate from search to keys.\n\nLet’s find the home that’s actually right for you.",
                'agent_points' => [
                    ['text' => 'First access to new listings'],
                    ['text' => 'Off-market home network'],
                    ['text' => '4.9★ average client rating'],
                ],
                'form_title' => 'Apply for VIP Buyer Access',
                'form_sub' => 'Tell us what you’re looking for and we’ll set up your VIP access and first matches.',
                'form_button' => 'Request VIP Access',
                'form_msg_label' => 'What are you looking for?',
                'cta_headline' => 'Ready to Find Your Home?',
                'cta_sub' => 'Apply now and we’ll send your first curated matches within one business day.',
            ]),
        ],
    ],

];
