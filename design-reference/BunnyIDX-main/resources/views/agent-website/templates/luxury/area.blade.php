@extends('agent-website.templates.luxury.layout')

@section('nav-areas', 'active')

{{--
    Community page + its SEO sub-pages (cities / zips / neighborhoods /
    lifestyle pages), all WHITE like /blog — no dark theme tokens. The
    structure (Sierra-style): blog-style hero (Page Header block w/ breadcrumbs)
    → rich community guide → lifestyle buttons → internal links (cities /
    neighborhoods / zips, incl. MLS-discovered ZIPs) → quick search → luxury
    listing grid → search CTA → CTA block. $sub is null on the community page
    itself; sub-pages get {kind, key, label, copy, criteria}.
--}}

@php
    use Illuminate\Support\Str;

    $areasLabel = $site->areas_label ?: 'Communities';
    $isSubPage = ! empty($sub);

    // Concept sub-pages (lifestyle / property type / sub-type) slice the
    // community by an idea; city/zip/neighborhood sub-pages are places.
    $isConceptSub = $isSubPage && in_array($sub['kind'], ['lifestyle', 'property_type', 'property_subtype'], true);

    $imgUrl = $area->image
        ? (Str::startsWith($area->image, ['http://', 'https://']) ? $area->image : asset('storage/' . $area->image))
        : '';

    // Concept pages use their search-intent phrase ("Condos for Sale").
    $subDisplay = $isSubPage ? ($sub['seo_label'] ?? $sub['label']) : null;
    $headline = $isSubPage
        ? ($isConceptSub
            ? "{$subDisplay} in {$area->name}"
            : ($sub['kind'] === 'zip' ? "{$area->name} {$sub['label']}" : "{$sub['label']}"))
        : $area->name;
    $subTitle = $isSubPage
        ? ($sub['kind'] === 'zip' ? "Homes for sale in the {$sub['label']} ZIP code of {$area->name}" : "Part of our {$area->name} community guide")
        : null;

    // Rich text body — rendered by AreaDescription (merge variables resolved
    // to live MLS data + internal links, default SEO template when empty).
    // The fallback keeps older callers without $descriptionHtml working.
    $richText = $descriptionHtml ?? ($isSubPage ? ($sub['copy'] ?? null) : $area->description);

    // Internal-links sections, grouped by kind.
    $subGroups = collect($subAreaEntries ?? [])->groupBy('type');
    $cities = $subGroups->get('city', collect());
    $hoods = $subGroups->get('neighborhood', collect());
    $zips = $subGroups->get('zip', collect());

    // ZIPs auto-discovered from the community's live MLS listings extend the
    // manually configured ones — each resolves as its own sub-page.
    $knownZipSlugs = $zips->pluck('slug')->all();
    foreach (($autoZips ?? []) as $z) {
        if (! in_array($z, $knownZipSlugs, true)) {
            $zips->push(['type' => 'zip', 'label' => $z, 'value' => $z, 'slug' => $z]);
        }
    }
    $zips = $zips->sortBy('label')->values();

    // "Search Homes" target — the Property Search page seeded with this place.
    $criteria = (array) ($area->search_criteria ?? []);
    $searchSeed = $isSubPage && ! $isConceptSub ? $sub['label'] : ((array) ($criteria['cities'] ?? []))[0] ?? $area->name;
    $searchUrl = route('agent-site.properties', $site->slug) . '?q=' . urlencode($searchSeed);

    $listingsTotal = (int) ($listingsTotal ?? 0);
    $listingsPage = max(1, (int) ($listingsPage ?? 1));
    $listingsPerPage = max(1, (int) ($listingsPerPage ?? 12));

    $selfUrl = $isSubPage
        ? route('agent-site.areas.sub', [$site->slug, $area->slug, $sub['key']])
        : route('agent-site.areas.show', [$site->slug, $area->slug]);

    // Breadcrumb trail, shown inside the hero (last item = current page).
    $crumbItems = [
        ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
        ['label' => $areasLabel, 'url' => route('agent-site.areas', $site->slug)],
        ['label' => $area->name, 'url' => route('agent-site.areas.show', [$site->slug, $area->slug])],
    ];
    if ($isSubPage) {
        $crumbItems[] = ['label' => $sub['label']];
    }
@endphp

@section('content')
{{-- Page hero — the same boxed Page Header block the blog page uses, with the
     community photo as the backdrop. Sub-pages (ZIPs / cities / neighborhoods /
     lifestyles) reuse the parent community's photo. Falls back to the white
     "light" head when the community has no photo. --}}
@include('agent-website.partials.blocks.page-header', ['block' => [
    'id' => 'area-hero-' . $area->slug . ($isSubPage ? '-' . $sub['key'] : ''),
    'crumbs' => $crumbItems,
    'data' => [
        'bg_type' => 'image',
        'image' => $imgUrl,
        'overlay' => 'medium',
        'height' => 'compact',
        'style' => $imgUrl ? 'boxed' : 'light',
        'heading' => $headline,
        'subtitle' => $subTitle ?? '',
        'show_scroll' => false,
    ],
]])

<section class="lbp-block ap-page">
    <div class="lbp-inner">

        {{-- Community guide: 70/30 split — description column + sidebar cards
             (Explore … Real Estate / Cities / Neighborhoods / ZIP Codes).
             The main heading is the owner-set description_heading, defaulting
             to "Welcome to …" (suppressed if the copy starts with its own <h2>).
             Sub-pages and communities without links keep the centered column. --}}
        @php
            $propertyPages = $propertyPages ?? [];
            $hasSide = ! $isSubPage && (! empty($lifestylePages) || ! empty($propertyPages) || $cities->isNotEmpty() || $hoods->isNotEmpty());
            // ZIP chips live at the bottom of the guide's LEFT column.
            $zipBlock = ! $isSubPage && $zips->isNotEmpty();
            $subUrl = fn (string $key) => route('agent-site.areas.sub', [$site->slug, $area->slug, $key]);
        @endphp
        @if($richText || $hasSide || $zipBlock)
        <div class="ap-guide{{ $hasSide ? '' : ' ap-guide--solo' }}">
            @if($richText || $zipBlock)
            <div class="ap-rich">
            @if($richText)
                @unless(preg_match('/<h2[\s>]/i', $richText))
                    @php
                        // Every sub-page gets a keyword market heading —
                        // "4,272 Condos for Sale in Miami Beach" on concept
                        // pages, "312 Homes for Sale in 33162" on ZIP /
                        // city / neighborhood pages. Only the community page
                        // itself keeps the "Welcome to …" guide heading.
                        $countPrefix = $listingsTotal > 0 ? number_format($listingsTotal).' ' : '';
                        $defaultHeading = $isSubPage
                            ? trim($countPrefix.($isConceptSub ? "{$subDisplay} in {$area->name}" : "Homes for Sale in {$sub['label']}"))
                            : ('Welcome to '.$area->name);
                    @endphp
                    <h2>{{ ($isSubPage ? null : $area->description_heading) ?: $defaultHeading }}</h2>
                @endunless
                @if(Str::contains($richText, '<'))
                    {!! strip_tags($richText, '<p><br><strong><b><em><i><u><ul><ol><li><a><h2><h3><h4><blockquote>') !!}
                @else
                    {!! nl2br(e($richText)) !!}
                @endif
            @endif

                {{-- ZIP codes — chip grid at the bottom of the guide column. --}}
                @if($zipBlock)
                <div class="ap-zips">
                    <h3>{{ $area->name }} Zip Codes</h3>
                    <div class="ap-zips-grid">
                        @foreach($zips as $entry)
                        <a class="ap-zip-chip" href="{{ $subUrl($entry['slug']) }}">{{ $entry['label'] }}</a>
                        @endforeach
                    </div>
                </div>
                @endif
            </div>
            @endif

            @if($hasSide)
            <aside class="ap-side">
                @if(! empty($propertyPages))
                <div class="ap-side-card">
                    <h3 class="ap-side-title">{{ $area->name }} Property Types</h3>
                    <ul class="ap-side-list">
                        @foreach($propertyPages as $pp)
                        <li><a href="{{ $subUrl($pp['key']) }}">{{ $pp['nav_label'] ?? $pp['label'] }}</a></li>
                        @endforeach
                    </ul>
                </div>
                @endif

                @if(! empty($lifestylePages))
                <div class="ap-side-card">
                    <h3 class="ap-side-title">Lifestyle in {{ $area->name }}</h3>
                    <ul class="ap-side-list">
                        @foreach($lifestylePages as $lp)
                        <li><a href="{{ $subUrl($lp['key']) }}">{{ $lp['label'] }}</a></li>
                        @endforeach
                    </ul>
                </div>
                @endif

                @foreach([
                    ['items' => $cities, 'title' => "Cities in {$area->name}", 'fold' => 8],
                    ['items' => $hoods, 'title' => "Neighborhoods in {$area->name}", 'fold' => 8],
                ] as $group)
                    @if($group['items']->isNotEmpty())
                    @php $extra = $group['items']->slice($group['fold']); @endphp
                    <div class="ap-side-card">
                        <h3 class="ap-side-title">{{ $group['title'] }}</h3>
                        <ul class="ap-side-list">
                            @foreach($group['items']->take($group['fold']) as $entry)
                            <li><a href="{{ $subUrl($entry['slug']) }}">{{ $entry['label'] }}</a></li>
                            @endforeach
                        </ul>
                        @if($extra->isNotEmpty())
                        <details class="ap-side-more">
                            <summary>Show all ({{ $group['items']->count() }})</summary>
                            <ul class="ap-side-list">
                                @foreach($extra as $entry)
                                <li><a href="{{ $subUrl($entry['slug']) }}">{{ $entry['label'] }}</a></li>
                                @endforeach
                            </ul>
                        </details>
                        @endif
                    </div>
                    @endif
                @endforeach
            </aside>
            @endif
        </div>
        @endif

        {{-- Live MLS listings --}}
        <div class="ap-section ap-listings">
            <div class="ap-listings-head">
                {{-- Concept pages keep their own phrase ("Condos for Sale" /
                     "Homes for Rent"); place pages stay "Homes for Sale in …". --}}
                <h2 class="ap-section-title">{{ $isConceptSub ? "{$subDisplay} in {$area->name}" : 'Homes for Sale in ' . ($isSubPage ? $sub['label'] : $area->name) }}</h2>
                @if($listingsTotal > 0)
                <p class="ap-listings-count">{{ number_format($listingsTotal) }} {{ Str::plural('listing', $listingsTotal) }}</p>
                @endif
            </div>

            {{-- Quick search, seeded with this community / sub-area --}}
            <form class="ap-search-form" action="{{ route('agent-site.properties', $site->slug) }}" method="GET" role="search">
                <div class="ap-search-field ap-search-q">
                    <label for="ap-q">Location</label>
                    <input id="ap-q" type="text" name="q" value="{{ $searchSeed }}" placeholder="City, neighborhood, ZIP or address" aria-label="Search homes">
                </div>
                <div class="ap-search-field">
                    <label for="ap-minprice">Min Price</label>
                    <select id="ap-minprice" name="min_price">
                        <option value="">Any</option>
                        @foreach([100000, 250000, 500000, 750000, 1000000, 2000000, 3000000, 5000000] as $p)
                        <option value="{{ $p }}">${{ $p >= 1000000 ? rtrim(rtrim(number_format($p / 1000000, 1), '0'), '.') . 'M' : ($p / 1000) . 'K' }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="ap-search-field">
                    <label for="ap-maxprice">Max Price</label>
                    <select id="ap-maxprice" name="max_price">
                        <option value="">Any</option>
                        @foreach([250000, 500000, 750000, 1000000, 2000000, 3000000, 5000000, 10000000] as $p)
                        <option value="{{ $p }}">${{ $p >= 1000000 ? rtrim(rtrim(number_format($p / 1000000, 1), '0'), '.') . 'M' : ($p / 1000) . 'K' }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="ap-search-field">
                    <label for="ap-beds">Beds</label>
                    <select id="ap-beds" name="beds">
                        <option value="">Any</option>
                        @foreach([1, 2, 3, 4, 5] as $n)
                        <option value="{{ $n }}">{{ $n }}+</option>
                        @endforeach
                    </select>
                </div>
                <div class="ap-search-field">
                    <label for="ap-baths">Baths</label>
                    <select id="ap-baths" name="baths">
                        <option value="">Any</option>
                        @foreach([1, 2, 3, 4, 5] as $n)
                        <option value="{{ $n }}">{{ $n }}+</option>
                        @endforeach
                    </select>
                </div>
                <button type="submit">Search</button>
            </form>

            @if(! empty($areaListings))
                <div class="ap-grid">
                    @foreach($areaListings as $prop)
                        @include('agent-website.templates.luxury.area-card', ['prop' => $prop])
                    @endforeach
                </div>

            @elseif(! $mlsIntegrated)
                @if($isOwner)
                <div class="ap-notice">
                    <p>Connect your MLS to automatically show live listings for this community. Visitors won&rsquo;t see this message.</p>
                    <a href="{{ route('crm.idx.index') }}">Integrate your MLS &rarr;</a>
                </div>
                @else
                <p class="ap-empty">Listings for this community are coming soon.</p>
                @endif
            @else
                <p class="ap-empty">No current listings match right now. Please check back soon.</p>
            @endif

            <div class="ap-search-cta">
                <a class="ap-search-btn" href="{{ $searchUrl }}">Search Homes in {{ $isSubPage && ! $isConceptSub ? $sub['label'] : $area->name }}</a>
            </div>
        </div>

        {{-- Secondary grid: rentals in the area (sale listings stay primary). --}}
        @if(! empty($rentalListings))
        <div class="ap-section ap-listings">
            <div class="ap-listings-head">
                <h2 class="ap-section-title">Homes for Rent in {{ $isSubPage && ! $isConceptSub ? $sub['label'] : $area->name }}</h2>
                @if(($rentalsTotal ?? 0) > 0)
                <p class="ap-listings-count">{{ number_format($rentalsTotal) }} {{ Str::plural('rental', $rentalsTotal) }}</p>
                @endif
            </div>
            <div class="ap-grid">
                @foreach($rentalListings as $prop)
                    @include('agent-website.templates.luxury.area-card', ['prop' => $prop])
                @endforeach
            </div>
        </div>
        @endif
    </div>
</section>

{{-- CTA block (the shared theme block) --}}
@include('agent-website.partials.blocks.cta', ['block' => ['data' => [
    'image' => $imgUrl,
    'eyebrow' => $areasLabel,
    'heading' => "Thinking of Buying or Selling in {$area->name}?",
    'description' => 'Get neighborhood-level guidance, private tours and a strategy tailored to your goals.',
    'button_label' => 'Contact ' . ($site->agent_name ?: 'Us'),
    'button_link' => route('agent-site.contact', $site->slug),
]]])

{{-- SEO: breadcrumbs + place + the listing collection --}}
@php
    $crumbs = [
        ['name' => 'Home', 'item' => route('agent-site.home', $site->slug)],
        ['name' => $areasLabel, 'item' => route('agent-site.areas', $site->slug)],
        ['name' => $area->name, 'item' => route('agent-site.areas.show', [$site->slug, $area->slug])],
    ];
    if ($isSubPage) {
        $crumbs[] = ['name' => $sub['label'], 'item' => $selfUrl];
    }
    $breadcrumbLd = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => collect($crumbs)->values()->map(fn ($c, $i) => [
            '@type' => 'ListItem', 'position' => $i + 1, 'name' => $c['name'], 'item' => $c['item'],
        ])->all(),
    ];
    $placeLd = array_filter([
        '@context' => 'https://schema.org',
        '@type' => 'Place',
        'name' => $isSubPage ? "{$sub['label']}, {$area->name}" : $area->name,
        'url' => $selfUrl,
        'image' => $imgUrl ?: null,
        'description' => $richText ? Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags($richText))), 300) : null,
    ]);
    $itemListLd = [
        '@context' => 'https://schema.org',
        '@type' => 'ItemList',
        'name' => $isConceptSub
            ? "{$subDisplay} in {$area->name}"
            : 'Homes for Sale in ' . ($isSubPage ? "{$sub['label']}, {$area->name}" : $area->name),
        'numberOfItems' => $listingsTotal,
        'itemListElement' => collect($areaListings ?? [])->values()->map(function ($prop, $i) use ($listingsPage, $listingsPerPage) {
            $entry = [
                '@type' => 'ListItem',
                'position' => ($listingsPage - 1) * $listingsPerPage + $i + 1,
                'name' => trim(($prop['price'] ?? '') . ' — ' . ($prop['address'] ?? ''), ' —'),
            ];
            if (! empty($prop['link'])) {
                $entry['url'] = $prop['link'];
            }
            return $entry;
        })->all(),
    ];
@endphp
<script type="application/ld+json">{!! json_encode($breadcrumbLd, JSON_UNESCAPED_SLASHES) !!}</script>
<script type="application/ld+json">{!! json_encode($placeLd, JSON_UNESCAPED_SLASHES) !!}</script>
@if(! empty($areaListings))
<script type="application/ld+json">{!! json_encode($itemListLd, JSON_UNESCAPED_SLASHES) !!}</script>
@endif
@endsection
