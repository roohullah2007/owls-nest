{{--
    Standalone layout for the shared property-search page. It deliberately does
    NOT extend the marketing template layout — the search experience is full-height
    and app-like, so it renders its OWN slim header (resources/views/agent-website/
    search/partials/header.blade.php) instead of the site nav/mega-menu/footer.
    Head essentials (meta, favicon, OG, tracking, accent token) are replicated so
    SEO/analytics keep working. Theme-agnostic — used for every template.
--}}
@php
    // currentPage is 'properties' for search; detail pages can pass their own.
    // Pages may pre-compute richer values ($psMetaTitle/$psMetaDescription,
    // e.g. the live listing count on the search page); owner per-page SEO
    // overrides still win because those pages only set them when no override
    // exists.
    $resolvedMetaTitle = $psMetaTitle ?? $site->seoTitle($currentPage ?? 'properties');
    $resolvedMetaDescription = $psMetaDescription ?? $site->seoDescription($currentPage ?? 'properties');
    $psHeaderTheme = in_array(data_get($site->page_data, '_config.search.header_theme'), ['dark', 'light'], true)
        ? data_get($site->page_data, '_config.search.header_theme')
        : 'dark';
    $psPrimary = $site->accent_color ?: '#022E50';

    // Design settings (website editor → Search Design). Fonts are whitelisted
    // against config/fonts.php before touching the Google Fonts URL.
    $psSearchCfg = (array) data_get($site->page_data, '_config.search', []);
    $psThemeFont = data_get($site->page_data, '_config.design.font');
    $allowedFonts = config('fonts.families', []);
    $pickFont = static fn ($f) => in_array($f, $allowedFonts, true) ? $f : null;

    $psFont = $pickFont($psSearchCfg['font'] ?? null);
    // Header/footer default to the THEME font so they match the rest of the site.
    $psHeaderFont = $pickFont($psSearchCfg['header_font'] ?? null) ?? $pickFont($psThemeFont);
    $psFooterFont = $pickFont($psSearchCfg['footer_font'] ?? null) ?? $pickFont($psThemeFont);
    $psCardFont = $pickFont($psSearchCfg['card_font'] ?? null);
    $psLogoHeight = (int) ($psSearchCfg['logo_height'] ?? 0);
    $psCardRadius = $psSearchCfg['card_radius'] ?? null;
    $psCustomCss = trim((string) ($psSearchCfg['custom_css'] ?? ''));

    $psGoogleFonts = array_values(array_unique(array_filter([$psFont, $psHeaderFont, $psFooterFont, $psCardFont])));

    // Lead gating — lock this page behind the login modal for guests. Pages set
    // $psPageKind ('search'|'detail'); owners previewing are never locked out.
    $psLayoutVisitor = app(\App\Services\Sites\VisitorAuth::class)->current($site);
    $psGated = ! $psLayoutVisitor
        && empty($isOwner)
        && (
            (($psPageKind ?? '') === 'search' && ! empty($psSearchCfg['require_login_search']))
            || (($psPageKind ?? '') === 'detail' && ! empty($psSearchCfg['require_login_detail']))
        );
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $resolvedMetaTitle ?: ($site->agent_name.' | Property Search') }}</title>
    @if($resolvedMetaDescription)<meta name="description" content="{{ $resolvedMetaDescription }}">@endif
    @if($site->favicon)<link rel="icon" href="{{ asset('storage/'.$site->favicon) }}">@endif
    <meta property="og:title" content="{{ $site->og_title ?: $resolvedMetaTitle ?: $site->agent_name }}">
    @if($site->og_description || $resolvedMetaDescription)<meta property="og:description" content="{{ $site->og_description ?: $resolvedMetaDescription }}">@endif
    @if($site->og_image)<meta property="og:image" content="{{ asset('storage/'.$site->og_image) }}">@endif
    <meta property="og:type" content="website">
    @include('agent-website.partials.tracking-scripts')
    @if($psGoogleFonts)
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?{{ implode('&', array_map(fn ($f) => 'family='.str_replace(' ', '+', $f).':wght@400;500;600;700;800', $psGoogleFonts)) }}&display=swap" rel="stylesheet">
    @endif
    <style>
        html, body { margin: 0; padding: 0; }
        body {
            background: #fff;
            --search-primary: {{ $psPrimary }};
            /* The active theme's primary (near-black) color — selected/active
               controls use this rather than the accent. */
            --ps-theme-primary: {{ config("templates.{$site->template}.preview.bg") ?: '#0f1115' }};
            /* Per-site design settings (website editor → Search Design). */
            @if($psFont)--ps-font: '{{ $psFont }}', ui-sans-serif, system-ui, sans-serif;@endif
            @if($psHeaderFont)--ps-header-font: '{{ $psHeaderFont }}', ui-sans-serif, system-ui, sans-serif;@endif
            @if($psCardFont)--ps-card-font: '{{ $psCardFont }}', ui-sans-serif, system-ui, sans-serif;@endif
            @if($psLogoHeight >= 20 && $psLogoHeight <= 80)--ps-logo-h: {{ $psLogoHeight }}px;@endif
            @if(is_numeric($psCardRadius))--ps-card-radius: {{ (int) $psCardRadius }}px;@endif
            /* Plus Jakarta Sans (loaded by the search bundle); also covers the
               shared footer, which renders outside the .ps-app island. */
            font-family: var(--ps-font, 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif);
        }
        @if($psFooterFont)
        .site-footer { font-family: '{{ $psFooterFont }}', ui-sans-serif, system-ui, sans-serif; }
        @endif
    </style>
    @if($psCustomCss !== '')
        {{-- User-authored custom CSS (website editor → Search Design → Custom CSS). --}}
        <style id="ps-custom-css">{!! str_ireplace(['</style', '<script'], '', $psCustomCss) !!}</style>
    @endif
    @stack('styles')
</head>
<body @class(['ps-gated' => $psGated])>
    @include('agent-website.search.partials.header', ['psAuthForce' => $psGated])

    <main>
        @yield('content')
    </main>

    {{-- Detail pages opt in to the shared site footer; the full-height
         search screen stays footer-less (app-like map view). --}}
    @includeWhen(! empty($showSiteFooter), 'agent-website.partials.footer')

    {{-- "Choose your language" modal + Google Translate plumbing (opened by the header language button). --}}
    @includeWhen(\App\Services\Sites\SiteTranslations::enabledFor($site), 'agent-website.partials.translate-modal')

    @stack('scripts')
    @if($site->tracking_body){!! $site->tracking_body !!}@endif
</body>
</html>
