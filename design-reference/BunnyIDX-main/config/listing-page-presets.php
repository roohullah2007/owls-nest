<?php

/**
 * IDX Squeeze / Listing Lead Page presets.
 *
 * This is its OWN product — a single-listing squeeze page (market your own
 * listing or an MLS listing). It is NOT Landing Pages: the marketing video
 * funnels (Listing Masterclass, Buyer VIP, …) live under Landing Pages, not here.
 *
 * All squeeze pages render through the single Blade design `idx-squeeze` and store
 * their content in page_data._listing (the property snapshot) + page_data._config
 * (agent/copy overrides) — NOT in a blocks array. Edited via the dedicated Listing
 * Pages flow, never the block editor.
 *
 *   key                — preset id (the create() selector)
 *   name               — default page name + card label
 *   description        — one-line summary on the create card
 *   type               — buyer | seller (drives the CRM lead type)
 *   accent             — default CTA/accent color
 *   requires_property  — a property (own listing or MLS) is snapshotted into _listing
 *   config             — default page_data._config (agent bio + copy defaults)
 */

return [
    'property-squeeze' => [
        'name' => 'Listing Squeeze Page',
        'description' => 'Market a single listing — teaser photo, then the full gallery & details gated behind the lead form.',
        'type' => 'buyer',
        'accent' => '#2a5d8f',
        'requires_property' => true,
        'design' => 'villa-serena',
        'config' => [
            'design' => 'villa-serena',
            'gate' => true,
            'cta_button' => 'Schedule a Private Showing',
            'agent_role' => 'Your Local Real Estate Advisor',
            'pricing_note' => 'Shown by appointment only. Qualified buyers and representing agents may request the full offering details and disclosures below.',
            'why_buy_title' => 'Why buy this home',
            'why_buy' => "Architectural design in a sought-after location\nMove-in ready with high-end finishes throughout\nStrong value with rare features for the area",
        ],
    ],
];
