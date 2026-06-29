{{--
    Shared property-search page (map + grid). ONE implementation rendered for
    every theme — it extends whatever layout the active template ships so the
    site header/footer stay on-brand, while the search experience itself is a
    self-contained React app (resources/js/agent-website/property-search/)
    mounted into the .ps-app node below. Filters, map, cards, pagination,
    MLS® compliance and the Save Search lead capture are all rendered client-
    side from the JSON feed at agent-site.properties.search.
--}}
@extends('agent-website.search.layout')

@php
    // Lead gating: the layout locks this page kind when configured.
    $psPageKind = 'search';

    // SEO: "12,345 Homes for Sale | Property Search | {site}" with the live
    // (2h-cached) listing count — unless the owner set per-page SEO, which
    // wins (the layout falls back to seoTitle/seoDescription then).
    $psSiteName = $site->agent_name ?: ($site->brokerage_name ?: 'Real Estate');
    $psCount = isset($listingsTotal) && $listingsTotal ? number_format($listingsTotal) : null;
    if (trim((string) data_get($site->page_data, 'properties.meta_title')) === '' && trim((string) $site->meta_title) === '') {
        $psMetaTitle = ($psCount ? "{$psCount} Homes for Sale | " : '')."Property Search | {$psSiteName}";
    }
    if (trim((string) data_get($site->page_data, 'properties.meta_description')) === '' && trim((string) $site->meta_description) === '') {
        $psMetaDescription = 'Search '.($psCount ? "{$psCount} " : '')."homes for sale with {$psSiteName}. Live MLS listings with photos, prices, open houses and detailed filters — updated throughout the day.";
    }
    $psPageVisitor = app(\App\Services\Sites\VisitorAuth::class)->current($site);
    $psConfig = [
        'endpoint' => route('agent-site.properties.search', $site->slug),
        'leadEndpoint' => route('agent-site.contact.submit', $site->slug),
        'mapsKey' => $googleMapsKey ?? '',
        'currency' => $site->page_data['_config']['country'] ?? 'US',
        'isOwner' => (bool) ($isOwner ?? false),
        'connectUrl' => \Illuminate\Support\Facades\Route::has('crm.idx.index') ? route('crm.idx.index') : url('/crm'),
        // Visitor account — favorites, saved searches and view tracking.
        'visitor' => $psPageVisitor ? ['name' => $psPageVisitor->name] : null,
        // Marketing-consent disclosure shown on guest lead forms.
        'consentText' => $site->consentText(),
        // Sidebar agent card + tour requests (modal detail view).
        'agent' => [
            'name' => $site->agent_name,
            'title' => $site->agent_title,
            'phone' => $site->agent_phone,
            'photo' => $site->agent_photo ? asset('storage/'.$site->agent_photo) : null,
            'bg' => data_get($site->page_data, '_config.search.agent_card_bg') ?: null,
        ],
        'showingEndpoint' => route('agent-site.showing.submit', $site->slug),
        // Owner-authored content (merge fields substituted client-side).
        'detailBlocks' => array_values((array) data_get($site->page_data, '_config.search.detail_blocks', [])),
        'gridCards' => array_map(function ($card) {
            // Uploaded backgrounds are stored as public-disk paths — resolve to
            // absolute URLs (same as the agent photo above); http(s) passes through.
            $img = trim((string) (is_array($card) ? ($card['image'] ?? '') : ''));
            if ($img !== '' && ! \Illuminate\Support\Str::startsWith($img, ['http://', 'https://'])) {
                $card['image'] = asset('storage/'.ltrim($img, '/'));
            }
            return $card;
        }, array_values((array) data_get($site->page_data, '_config.search.grid_cards', []))),
        'detailSections' => array_values((array) data_get($site->page_data, '_config.search.detail_sections', [])),
        'account' => [
            'favorites' => route('agent-site.visitor.favorites.toggle', $site->slug),
            'favoriteIds' => route('agent-site.visitor.favorites.index', $site->slug),
            'savedSearches' => route('agent-site.visitor.searches.store', $site->slug),
            'trackView' => route('agent-site.visitor.track-view', $site->slug),
        ],
    ];
@endphp

@push('styles')
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/agent-website/search/app.css'])
@endpush

@section('content')
<div class="ps-app" id="ps-app" data-config='@json($psConfig)'></div>
@endsection

@php
    // Structured data: the search page as a CollectionPage + SearchAction
    // (sitelinks searchbox) + the agent as a RealEstateAgent entity.
    $psUrl = route('agent-site.properties', $site->slug);
    $psHome = route('agent-site.home', $site->slug);
    $psLd = [
        [
            '@context' => 'https://schema.org',
            '@type' => 'CollectionPage',
            'name' => $psMetaTitle ?? $site->seoTitle('properties'),
            'url' => $psUrl,
            'description' => $psMetaDescription ?? $site->seoDescription('properties'),
            'isPartOf' => ['@type' => 'WebSite', 'name' => $psSiteName, 'url' => $psHome],
        ] + (isset($listingsTotal) && $listingsTotal ? ['mainEntity' => [
            '@type' => 'ItemList',
            'name' => 'Homes for Sale',
            'numberOfItems' => (int) $listingsTotal,
        ]] : []),
        [
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => $psSiteName,
            'url' => $psHome,
            'potentialAction' => [
                '@type' => 'SearchAction',
                'target' => ['@type' => 'EntryPoint', 'urlTemplate' => $psUrl.'?q={search_term_string}'],
                'query-input' => 'required name=search_term_string',
            ],
        ],
        array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'RealEstateAgent',
            'name' => $psSiteName,
            'url' => $psHome,
            'telephone' => $site->agent_phone ?: null,
            'image' => $site->agent_photo ? asset('storage/'.$site->agent_photo) : null,
        ]),
        [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => $psHome],
                ['@type' => 'ListItem', 'position' => 2, 'name' => 'Property Search', 'item' => $psUrl],
            ],
        ],
    ];
@endphp
@push('scripts')
    @foreach($psLd as $ld)
    <script type="application/ld+json">{!! json_encode($ld, JSON_UNESCAPED_SLASHES) !!}</script>
    @endforeach
    {{-- React Refresh preamble (dev only). Without it @vitejs/plugin-react
         throws "can't detect preamble" and the React island never mounts. --}}
    @viteReactRefresh
    @vite(['resources/js/agent-website/property-search/index.tsx'])
@endpush
