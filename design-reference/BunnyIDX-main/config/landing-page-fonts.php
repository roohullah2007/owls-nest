<?php

/**
 * Recommended fonts a user can apply to a landing page.
 *
 * The chosen font's `name` is stored on the page at `page_data._config.font`.
 * The public templates (classic layout + the full-screen flow) resolve it via
 * resources/views/landing-pages/partials/fonts.blade.php, which loads the
 * matching Google Font and exposes its stack as the `--lp-font` CSS variable.
 *
 * Keep `name` values in sync with FONT_OPTIONS in
 * resources/js/Pages/Crm/LandingPages/components/SettingsModal.tsx.
 *
 *   name   — label shown in the editor + the value stored on the page
 *   google — Google Fonts `family=` query (spaces as +, axes/weights included)
 *   stack  — the CSS font-family stack applied to the page
 */

return [
    'default' => 'Roboto Flex',

    /**
     * Per-template default font, keyed by the page's rendering `template`.
     * Used when a page hasn't explicitly chosen a font. Falls back to `default`.
     */
    'template_defaults' => [
        'video-landing' => 'Open Sans',
    ],

    'options' => [
        ['name' => 'Roboto Flex', 'google' => 'Roboto+Flex:opsz,wght@8..144,400..900', 'stack' => "'Roboto Flex', system-ui, sans-serif"],
        ['name' => 'Inter', 'google' => 'Inter:wght@400;500;600;700', 'stack' => "'Inter', system-ui, sans-serif"],
        ['name' => 'Roboto', 'google' => 'Roboto:wght@400;500;700', 'stack' => "'Roboto', system-ui, sans-serif"],
        ['name' => 'Open Sans', 'google' => 'Open+Sans:wght@400;500;600;700', 'stack' => "'Open Sans', system-ui, sans-serif"],
        ['name' => 'Poppins', 'google' => 'Poppins:wght@400;500;600;700', 'stack' => "'Poppins', system-ui, sans-serif"],
        ['name' => 'Montserrat', 'google' => 'Montserrat:wght@400;500;600;700', 'stack' => "'Montserrat', system-ui, sans-serif"],
        ['name' => 'Lato', 'google' => 'Lato:wght@400;700', 'stack' => "'Lato', system-ui, sans-serif"],
        ['name' => 'Nunito Sans', 'google' => 'Nunito+Sans:opsz,wght@6..12,400..700', 'stack' => "'Nunito Sans', system-ui, sans-serif"],
        ['name' => 'Work Sans', 'google' => 'Work+Sans:wght@400;500;600;700', 'stack' => "'Work Sans', system-ui, sans-serif"],
        ['name' => 'DM Sans', 'google' => 'DM+Sans:opsz,wght@9..40,400..700', 'stack' => "'DM Sans', system-ui, sans-serif"],
        ['name' => 'Playfair Display', 'google' => 'Playfair+Display:wght@400;500;600;700', 'stack' => "'Playfair Display', Georgia, serif"],
    ],
];
