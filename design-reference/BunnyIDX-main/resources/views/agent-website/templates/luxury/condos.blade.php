@extends('agent-website.templates.luxury.layout')

@section('nav-condos', 'active')

{{--
    Condo Directory — duplicate of the New Developments directory (shared
    cd-* styles, filters + map view). $groups: area => Collection<CondoBuilding>.
--}}

@php
    use Illuminate\Support\Str;

    // Hero/CTA backdrop — the first project photo in the catalog. Falls back
    // to the white "light" head when no project has a photo yet, the same
    // pattern the community pages use.
    $heroImage = $groups->flatten()->firstWhere('image')?->image;
    $heroImageUrl = $heroImage
        ? (Str::startsWith($heroImage, ['http://', 'https://']) ? $heroImage : asset('storage/' . $heroImage))
        : '';
@endphp

@section('content')
@include('agent-website.partials.blocks.page-header', ['block' => [
    'id' => 'condo-directory-hero',
    'crumbs' => [
        ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
        ['label' => 'Condo Directory'],
    ],
    'data' => [
        'bg_type' => 'image',
        'image' => $heroImageUrl,
        'overlay' => 'medium',
        'height' => 'compact',
        'style' => $heroImageUrl ? 'boxed' : 'light',
        'heading' => 'Condo Directory',
        'subtitle' => 'Browse condo buildings by area',
        'show_scroll' => false,
    ],
]])

<section class="lbp-block cd-page">
    <div class="lbp-inner">
        @if($isOwner && ! $directoryEnabled)
        <div class="ap-notice">
            <p>The Condo Directory is switched off — visitors get a 404 on this page. Enable it in your website settings. Visitors won&rsquo;t see this message.</p>
        </div>
        @endif

        @if($totalBuildings === 0)
            <p class="ap-empty">Condo buildings are coming soon. Please check back shortly.</p>
        @else
            @php
                $priceOptions = [
                    '' => 'Any Price',
                    '0-1000000' => 'Under $1M',
                    '1000000-3000000' => '$1M – $3M',
                    '3000000-5000000' => '$3M – $5M',
                    '5000000-10000000' => '$5M – $10M',
                    '10000000-' => '$10M+',
                ];
            @endphp
            <div class="cd-filters">
                <input id="cd-q" type="text" placeholder="Search buildings by name&hellip;" aria-label="Search condo buildings by name">

                {{-- Custom dropdowns drive the hidden selects (the filter JS
                     listens to their change events). --}}
                <div class="cd-dd" data-cd-dd>
                    <select id="cd-area" hidden aria-hidden="true" tabindex="-1">
                        <option value="">All Areas</option>
                        @foreach($groups->keys() as $areaName)
                        <option value="{{ $areaName }}">{{ $areaName }}</option>
                        @endforeach
                    </select>
                    <button type="button" class="cd-dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Filter by area">
                        <span data-cd-dd-label>All Areas</span>
                        <svg viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <ul class="cd-dd-menu" role="listbox" hidden>
                        <li role="option" data-value="" aria-selected="true">All Areas</li>
                        @foreach($groups->keys() as $areaName)
                        <li role="option" data-value="{{ $areaName }}">{{ $areaName }}</li>
                        @endforeach
                    </ul>
                </div>

                <div class="cd-dd" data-cd-dd>
                    <select id="cd-price" hidden aria-hidden="true" tabindex="-1">
                        @foreach($priceOptions as $value => $label)
                        <option value="{{ $value }}">{{ $label }}</option>
                        @endforeach
                    </select>
                    <button type="button" class="cd-dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Filter by price">
                        <span data-cd-dd-label>Any Price</span>
                        <svg viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <ul class="cd-dd-menu" role="listbox" hidden>
                        @foreach($priceOptions as $value => $label)
                        <li role="option" data-value="{{ $value }}" @if($value === '') aria-selected="true" @endif>{{ $label }}</li>
                        @endforeach
                    </ul>
                </div>

                <div class="cd-view-toggle" role="group" aria-label="View">
                    <button type="button" id="cd-view-grid" class="is-active" aria-pressed="true">Grid</button>
                    <button type="button" id="cd-view-map" aria-pressed="false">Map</button>
                </div>
            </div>
            <p class="cd-count" id="cd-count">{{ number_format($totalBuildings) }} {{ Str::plural('building', $totalBuildings) }} across {{ $groups->count() }} {{ Str::plural('area', $groups->count()) }}</p>

            <div id="cd-results">
                @foreach($groups as $areaName => $buildings)
                <div class="cd-area" data-cd-group>
                    <div class="cd-area-head">
                        <h2 class="cd-area-title">{{ $areaName }}</h2>
                        <span class="cd-area-count">{{ number_format($buildings->count()) }} {{ Str::plural('building', $buildings->count()) }}</span>
                    </div>
                    <div class="cd-grid">
                        @foreach($buildings as $building)
                        <a class="cd-card" href="{{ route('agent-site.condos.building', [$site->slug, $building->slug]) }}" data-cd-name="{{ Str::lower($building->name) }}" data-cd-area="{{ $areaName }}" data-cd-price="{{ $building->priceFromValue() ?? '' }}">
                            <div class="cd-card-media">
                                @if($building->image)
                                    <img src="{{ Str::startsWith($building->image, ['http://', 'https://']) ? $building->image : asset('storage/' . $building->image) }}" alt="{{ $building->name }}" loading="lazy">
                                @else
                                    <span class="cd-card-placeholder" aria-hidden="true"></span>
                                @endif
                            </div>
                            <div class="cd-card-body">
                                <h3 class="cd-card-name notranslate" translate="no">{{ $building->name }}</h3>
                                <p class="cd-card-addr">
                                    {{ $building->statusLabel() }}@if($building->completion_year) &middot; Est. {{ $building->completion_year }}@endif
                                    @if($building->price_label) &middot; {{ $building->price_label }}@endif
                                </p>
                            </div>
                        </a>
                        @endforeach
                    </div>
                </div>
                @endforeach

                <p class="cd-no-results" id="cd-no-results" hidden>No buildings match those filters.</p>
            </div>

            <div id="cd-map" class="cd-map" hidden aria-label="Map of condo buildings"></div>

            @php
                // Marker data for the map view — only buildings with coordinates.
                $mapBuildings = $groups->flatten()
                    ->filter(fn ($d) => $d->lat && $d->lng)
                    ->map(fn ($d) => [
                        'name' => $d->name,
                        'area' => $d->area,
                        'price' => $d->priceFromValue(),
                        'pin' => $d->price_label ?: $d->name,
                        'meta' => $d->statusLabel()
                            . ($d->completion_year ? ' · Est. ' . $d->completion_year : '')
                            . ($d->price_label ? ' · ' . $d->price_label : ''),
                        'lat' => $d->lat,
                        'lng' => $d->lng,
                        'image' => $d->image
                            ? (Str::startsWith($d->image, ['http://', 'https://']) ? $d->image : asset('storage/' . $d->image))
                            : null,
                        'url' => route('agent-site.condos.building', [$site->slug, $d->slug]),
                    ])->values();
            @endphp
            <script type="application/json" id="cd-map-data">@json($mapBuildings)</script>

            <script>
            (function () {
                var q = document.getElementById('cd-q');
                if (!q) return;
                var areaSel = document.getElementById('cd-area');
                var priceSel = document.getElementById('cd-price');
                var cards = Array.prototype.slice.call(document.querySelectorAll('[data-cd-name]'));
                var groupEls = Array.prototype.slice.call(document.querySelectorAll('[data-cd-group]'));
                var empty = document.getElementById('cd-no-results');
                var countEl = document.getElementById('cd-count');
                var total = cards.length;

                function priceRange() {
                    var v = priceSel.value;
                    if (!v) return null;
                    var parts = v.split('-');
                    return { min: parseInt(parts[0], 10) || 0, max: parts[1] ? parseInt(parts[1], 10) : null };
                }

                function matches(name, area, price) {
                    var term = q.value.trim().toLowerCase();
                    if (term && name.indexOf(term) === -1) return false;
                    if (areaSel.value && area !== areaSel.value) return false;
                    var range = priceRange();
                    if (range) {
                        if (price === null || isNaN(price)) return false;
                        if (price < range.min) return false;
                        if (range.max !== null && price >= range.max) return false;
                    }
                    return true;
                }

                function applyFilters() {
                    var shown = 0;
                    cards.forEach(function (card) {
                        var price = card.getAttribute('data-cd-price');
                        var ok = matches(
                            card.getAttribute('data-cd-name'),
                            card.getAttribute('data-cd-area'),
                            price === '' ? null : parseInt(price, 10)
                        );
                        card.hidden = !ok;
                        if (ok) shown++;
                    });
                    groupEls.forEach(function (group) {
                        group.hidden = group.querySelectorAll('[data-cd-name]:not([hidden])').length === 0;
                    });
                    empty.hidden = shown > 0;
                    countEl.textContent = shown === total
                        ? total + ' building' + (total === 1 ? '' : 's')
                        : shown + ' of ' + total + ' buildings';
                    renderMarkers();
                }

                q.addEventListener('input', applyFilters);
                areaSel.addEventListener('change', applyFilters);
                priceSel.addEventListener('change', applyFilters);

                /* ── Custom dropdowns — drive the hidden selects above ── */
                document.querySelectorAll('[data-cd-dd]').forEach(function (dd) {
                    var btn = dd.querySelector('.cd-dd-btn');
                    var menu = dd.querySelector('.cd-dd-menu');
                    var label = dd.querySelector('[data-cd-dd-label]');
                    var select = dd.querySelector('select');

                    function closeMenu() {
                        menu.hidden = true;
                        btn.setAttribute('aria-expanded', 'false');
                    }
                    btn.addEventListener('click', function () {
                        var willOpen = menu.hidden;
                        document.querySelectorAll('[data-cd-dd] .cd-dd-menu').forEach(function (m) { m.hidden = true; });
                        document.querySelectorAll('[data-cd-dd] .cd-dd-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
                        if (willOpen) {
                            menu.hidden = false;
                            btn.setAttribute('aria-expanded', 'true');
                        }
                    });
                    menu.querySelectorAll('[role="option"]').forEach(function (opt) {
                        opt.addEventListener('click', function () {
                            menu.querySelectorAll('[role="option"]').forEach(function (o) { o.removeAttribute('aria-selected'); });
                            opt.setAttribute('aria-selected', 'true');
                            label.textContent = opt.textContent.trim();
                            select.value = opt.getAttribute('data-value');
                            select.dispatchEvent(new Event('change'));
                            closeMenu();
                        });
                    });
                    document.addEventListener('click', function (e) {
                        if (!dd.contains(e.target)) closeMenu();
                    });
                    dd.addEventListener('keydown', function (e) {
                        if (e.key === 'Escape') { closeMenu(); btn.focus(); }
                    });
                });

                /* ── Map view (Leaflet, lazy-loaded on first open) ── */
                var mapEl = document.getElementById('cd-map');
                var mapData = JSON.parse(document.getElementById('cd-map-data').textContent || '[]');
                var results = document.getElementById('cd-results');
                var gridBtn = document.getElementById('cd-view-grid');
                var mapBtn = document.getElementById('cd-view-map');
                var map = null;
                var markerLayer = null;

                function esc(s) {
                    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
                        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
                    });
                }

                function popupHtml(d) {
                    return '<a class="cd-pop" href="' + esc(d.url) + '">'
                        + (d.image ? '<img src="' + esc(d.image) + '" alt="">' : '<span class="cd-pop-placeholder"></span>')
                        + '<span class="cd-pop-body"><strong class="notranslate" translate="no">' + esc(d.name) + '</strong>'
                        + '<span>' + esc(d.meta) + '</span></span></a>';
                }

                function renderMarkers() {
                    if (!map || !markerLayer) return;
                    markerLayer.clearLayers();
                    var pts = mapData.filter(function (d) {
                        return matches(d.name.toLowerCase(), d.area, d.price === null ? null : d.price);
                    });
                    pts.forEach(function (d) {
                        var icon = L.divIcon({
                            className: 'cd-pin-wrap',
                            html: '<span class="cd-pin notranslate" translate="no">' + esc(d.pin) + '</span>',
                            iconSize: [0, 0],
                        });
                        L.marker([d.lat, d.lng], { icon: icon })
                            .bindPopup(popupHtml(d), { closeButton: false, maxWidth: 280 })
                            .addTo(markerLayer);
                    });
                    if (pts.length) {
                        map.fitBounds(pts.map(function (p) { return [p.lat, p.lng]; }), { padding: [60, 60], maxZoom: 14 });
                    }
                }

                function ensureLeaflet(cb) {
                    if (window.L) return cb();
                    var css = document.createElement('link');
                    css.rel = 'stylesheet';
                    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(css);
                    var s = document.createElement('script');
                    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    s.onload = cb;
                    document.head.appendChild(s);
                }

                function setView(view) {
                    var showMap = view === 'map';
                    results.hidden = showMap;
                    mapEl.hidden = !showMap;
                    gridBtn.classList.toggle('is-active', !showMap);
                    mapBtn.classList.toggle('is-active', showMap);
                    gridBtn.setAttribute('aria-pressed', String(!showMap));
                    mapBtn.setAttribute('aria-pressed', String(showMap));
                    if (showMap) {
                        ensureLeaflet(function () {
                            if (!map) {
                                map = L.map(mapEl, { scrollWheelZoom: false });
                                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                                    maxZoom: 19,
                                }).addTo(map);
                                markerLayer = L.layerGroup().addTo(map);
                            }
                            renderMarkers();
                            map.invalidateSize();
                        });
                    }
                }

                gridBtn.addEventListener('click', function () { setView('grid'); });
                mapBtn.addEventListener('click', function () { setView('map'); });
            })();
            </script>
        @endif
    </div>
</section>

@include('agent-website.partials.blocks.cta', ['block' => ['data' => [
    'image' => $heroImageUrl,
    'eyebrow' => 'Condo Directory',
    'heading' => 'Looking for the Right Building?',
    'description' => 'Get building-level guidance, private tours and a strategy tailored to your goals.',
    'button_label' => 'Contact ' . ($site->agent_name ?: 'Us'),
    'button_link' => route('agent-site.contact', $site->slug),
]]])

@php
    $breadcrumbLd = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('agent-site.home', $site->slug)],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Condo Directory', 'item' => route('agent-site.condos', $site->slug)],
        ],
    ];
@endphp
<script type="application/ld+json">{!! json_encode($breadcrumbLd, JSON_UNESCAPED_SLASHES) !!}</script>
@endsection
