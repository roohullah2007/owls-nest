@extends('agent-website.templates.luxury.layout')

@section('nav-new-developments', 'active')

{{--
    One New Development project — curated info (photo, status/completion/price
    facts, description, highlights, video) above the project's live MLS
    listings. Reuses the community page's white ap-* layout like the condo
    building page. $development: NewDevelopment.
--}}

@php
    use Illuminate\Support\Str;

    $mediaUrl = fn (?string $p) => $p
        ? (Str::startsWith($p, ['http://', 'https://']) ? $p : asset('storage/' . $p))
        : '';

    $imgUrl = $mediaUrl($development->image);
    $logoUrl = $mediaUrl($development->logo);
    $brochureUrl = $mediaUrl($development->brochure);

    $searchUrl = route('agent-site.properties', $site->slug) . '?q=' . urlencode($development->listingKeyword());

    $listingsTotal = (int) ($listingsTotal ?? 0);
    $highlights = array_values(array_filter((array) ($development->highlights ?? [])));

    // Owner/admin-entered structured extras.
    $keyDetails = array_values(array_filter((array) ($development->key_details ?? []), fn ($d) => ! empty($d['label']) && ! empty($d['value'])));
    $gallery = array_values(array_filter((array) ($development->gallery ?? [])));
    $floorPlans = array_values(array_filter((array) ($development->floor_plans ?? []), fn ($f) => ! empty($f['image'])));
    $depositSchedule = array_values(array_filter(array_map('trim', (array) ($development->deposit_schedule ?? []))));
    $moreByDeveloper = $moreByDeveloper ?? collect();

    $siteName = $site->agent_name ?: ($site->brokerage_name ?: 'This website');

    $facts = array_filter([
        'Status' => $development->statusLabel(),
        'Developer' => $development->developer,
        'Architect' => $development->architect,
        'Interior Design' => $development->interior_design,
        'Est. Completion' => $development->completion_year,
        'Pricing' => $development->price_label,
        'Address' => $development->fullAddress(),
    ]);

    // Developer taxonomy profile (logo + about) with the denormalized
    // columns as fallback for rows that predate the taxonomy.
    $developerProfile = $development->developerProfile;
    $developerLogoUrl = $mediaUrl($developerProfile?->logo);
    $developerInfo = trim((string) ($developerProfile?->info ?: $development->developer_info));

    $crumbItems = [
        ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
        ['label' => 'New Developments', 'url' => route('agent-site.new-developments', $site->slug)],
        ['label' => $development->name],
    ];
@endphp

@section('content')
@include('agent-website.partials.blocks.page-header', ['block' => [
    'id' => 'new-development-hero-' . $development->slug,
    'crumbs' => $crumbItems,
    'data' => [
        'bg_type' => 'image',
        'image' => $imgUrl,
        'logo' => $logoUrl,
        'overlay' => 'medium',
        'height' => 'compact',
        'style' => $imgUrl ? 'boxed' : 'light',
        'heading' => $development->name,
        'subtitle' => trim(implode(' · ', array_filter([$development->statusLabel(), $development->area, $development->price_label]))),
        'show_scroll' => false,
    ],
]])

<section class="lbp-block ap-page">
    <div class="lbp-inner">

        {{-- Project facts strip — the key facts + brochure download --}}
        @if(! empty($facts) || $brochureUrl)
        <div class="nd-facts">
            @foreach($facts as $label => $value)
            <div class="nd-fact">
                <span class="nd-fact-label">{{ $label }}</span>
                <span class="nd-fact-value">{{ $value }}</span>
            </div>
            @endforeach
            @if($brochureUrl)
            <div class="nd-facts-brochure">
                <a class="nd-brochure-btn" href="{{ $brochureUrl }}" target="_blank" rel="noopener">
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"/><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/></svg>
                    Download Brochure
                </a>
            </div>
            @endif
        </div>
        @endif

        {{-- Primary actions --}}
        <div class="nd-actions">
            <a class="nd-action-btn nd-action-primary" href="#request-info" data-nd-interest="Information request">Request Information</a>
            @if(! empty($floorPlans))
            <a class="nd-action-btn" href="#floor-plans">View Floor Plans</a>
            @endif
            @if($development->video_url)
            <a class="nd-action-btn" href="{{ $development->video_url }}" target="_blank" rel="noopener">Watch Video</a>
            @endif
        </div>

        @php $hasSide = ! empty($keyDetails) || ! empty($depositSchedule); @endphp
        @if(trim((string) $development->description) !== '' || $hasSide)
        <div class="ap-guide{{ $hasSide ? '' : ' ap-guide--solo' }}">
            @if(trim((string) $development->description) !== '')
            <div class="ap-rich">
                <h2>About {{ $development->name }}</h2>
                @if(Str::contains($development->description, '<'))
                    {!! strip_tags($development->description, '<p><br><strong><b><em><i><u><ul><ol><li><a><h3><h4><blockquote>') !!}
                @else
                    {!! nl2br(e($development->description)) !!}
                @endif
                @if($development->video_url)
                <p><a href="{{ $development->video_url }}" target="_blank" rel="noopener">Watch the project video</a></p>
                @endif
            </div>
            @endif

            @if($hasSide)
            <aside class="ap-side">
                @if(! empty($keyDetails))
                <div class="ap-side-card">
                    <h3 class="ap-side-title">Key Building Details</h3>
                    <dl class="nd-details">
                        @foreach($keyDetails as $detail)
                        <div class="nd-detail">
                            <dt>{{ $detail['label'] }}</dt>
                            <dd>{{ $detail['value'] }}</dd>
                        </div>
                        @endforeach
                    </dl>
                </div>
                @endif

                @if(! empty($depositSchedule))
                <div class="ap-side-card">
                    <h3 class="ap-side-title">Deposit Schedule</h3>
                    <ol class="nd-deposit">
                        @foreach($depositSchedule as $step)
                        <li><span class="nd-deposit-num">{{ $loop->iteration }}</span><span>{{ $step }}</span></li>
                        @endforeach
                    </ol>
                </div>
                @endif

            </aside>
            @endif
        </div>
        @endif

        {{-- Project highlights — full-width section right after the About copy --}}
        @if(! empty($highlights))
        <div class="ap-section">
            <h2 class="ap-section-title">Project Highlights</h2>
            <ul class="nd-highlights">
                @foreach($highlights as $highlight)
                <li>{{ $highlight }}</li>
                @endforeach
            </ul>
        </div>
        @endif

        {{-- Photo gallery — thumbnails open the shared lightbox --}}
        @if(! empty($gallery))
        <div class="ap-section">
            <h2 class="ap-section-title">Gallery</h2>
            <div class="nd-gallery">
                @foreach($gallery as $i => $photo)
                <button type="button" class="nd-gallery-item" data-nd-lightbox="gallery" data-nd-index="{{ $i }}" aria-label="Open photo {{ $i + 1 }}">
                    <img src="{{ $mediaUrl($photo) }}" alt="{{ $development->name }} — photo {{ $i + 1 }}" loading="lazy">
                </button>
                @endforeach
            </div>
        </div>
        @endif

        {{-- Floor plans --}}
        @if(! empty($floorPlans))
        <div class="ap-section" id="floor-plans">
            <h2 class="ap-section-title">Floor Plans</h2>
            <div class="nd-floorplans">
                @foreach($floorPlans as $i => $plan)
                <button type="button" class="nd-floorplan" data-nd-lightbox="plans" data-nd-index="{{ $i }}" aria-label="Open floor plan {{ $plan['label'] ?? $i + 1 }}">
                    <span class="nd-floorplan-media"><img src="{{ $mediaUrl($plan['image']) }}" alt="{{ $plan['label'] ?? $development->name . ' floor plan' }}" loading="lazy"></span>
                    @if(! empty($plan['label']))<span class="nd-floorplan-label">{{ $plan['label'] }}</span>@endif
                </button>
                @endforeach
            </div>
        </div>
        @endif

        {{-- About the Developer --}}
        @if($development->developer && $developerInfo !== '')
        <div class="ap-section">
            <h2 class="ap-section-title">About {{ $development->developer }}</h2>
            <div class="nd-developer{{ $developerLogoUrl ? ' nd-developer--logo' : '' }}">
                @if($developerLogoUrl)
                <div class="nd-developer-logo"><img src="{{ $developerLogoUrl }}" alt="{{ $development->developer }} logo"></div>
                @endif
                <div class="nd-developer-body">{!! nl2br(e($developerInfo)) !!}</div>
            </div>
        </div>
        @endif

        {{-- More projects by the same developer --}}
        @if($moreByDeveloper->isNotEmpty())
        <div class="ap-section">
            <h2 class="ap-section-title">More by {{ $development->developer }}</h2>
            <div class="cd-grid">
                @foreach($moreByDeveloper as $project)
                <a class="cd-card" href="{{ route('agent-site.new-developments.show', [$site->slug, $project->slug]) }}">
                    <div class="cd-card-media">
                        @if($project->image)
                            <img src="{{ $mediaUrl($project->image) }}" alt="{{ $project->name }}" loading="lazy">
                        @else
                            <span class="cd-card-placeholder" aria-hidden="true"></span>
                        @endif
                    </div>
                    <div class="cd-card-body">
                        <h3 class="cd-card-name notranslate" translate="no">{{ $project->name }}</h3>
                        <p class="cd-card-addr">
                            {{ $project->area }} &middot; {{ $project->statusLabel() }}@if($project->price_label) &middot; {{ $project->price_label }}@endif
                        </p>
                    </div>
                </a>
                @endforeach
            </div>
        </div>
        @endif

        {{-- Live MLS listings in the project — only when there are any. --}}
        @if(! empty($developmentListings))
        <div class="ap-section ap-listings">
            <div class="ap-listings-head">
                <h2 class="ap-section-title">Listings at {{ $development->name }}</h2>
                @if($listingsTotal > 0)
                <p class="ap-listings-count">{{ number_format($listingsTotal) }} {{ Str::plural('listing', $listingsTotal) }}</p>
                @endif
            </div>

            <div class="ap-grid">
                @foreach($developmentListings as $prop)
                    @include('agent-website.templates.luxury.area-card', ['prop' => $prop])
                @endforeach
            </div>

            <div class="ap-search-cta">
                <a class="ap-search-btn" href="{{ $searchUrl }}">Search Homes near {{ $development->name }}</a>
            </div>
        </div>
        @endif
    </div>
</section>

{{-- Project location — full-width map (Leaflet, lazy-loaded) --}}
@if($development->lat && $development->lng)
<section class="nd-map-section">
    <div class="lbp-inner nd-map-head">
        <h2 class="ap-section-title">Location</h2>
        @if($development->fullAddress())<p class="nd-map-addr">{{ $development->fullAddress() }}</p>@endif
    </div>
    <div id="nd-map" class="nd-map"
         data-lat="{{ $development->lat }}"
         data-lng="{{ $development->lng }}"
         data-pin="{{ $development->name }}"
         aria-label="Map showing {{ $development->name }}"></div>
</section>
<script>
(function () {
    var el = document.getElementById('nd-map');
    if (!el) return;
    function init() {
        var map = L.map(el, { scrollWheelZoom: false }).setView([parseFloat(el.dataset.lat), parseFloat(el.dataset.lng)], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);
        L.marker([parseFloat(el.dataset.lat), parseFloat(el.dataset.lng)], {
            icon: L.divIcon({ className: 'cd-pin-wrap', html: '<span class="cd-pin notranslate" translate="no">' + el.dataset.pin.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</span>', iconSize: [0, 0] }),
        }).addTo(map);
    }
    if (window.L) { init(); return; }
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = init;
    document.head.appendChild(s);
})();
</script>
@endif

{{-- Legal disclaimer — developer-sourced marketing materials --}}
<section class="nd-disclaimer-section">
    <div class="lbp-inner">
        <p class="nd-disclaimer">
            <strong>Legal Disclaimer.</strong>
            All promotional content displayed on this page — including renderings, floor plans, brochures,
            videos and similar materials — is provided by or sourced from the project&rsquo;s developer to
            facilitate the marketing of the project; {{ $siteName }} does not assert ownership or creation of
            these materials. Renderings are artist&rsquo;s conceptions. Pricing, availability, deposit
            structures, dimensions and completion dates are set by the developer and are subject to change or
            withdrawal without notice. This page is for information only and is not an offer to sell or a
            solicitation to buy in any jurisdiction where prohibited by law. Oral representations cannot be
            relied upon as correctly stating the representations of the developer; refer to the developer&rsquo;s
            offering documents. E&amp;OE.
        </p>
    </div>
</section>

{{-- Sticky VIP CTA (bottom-left) — opens the Request Information modal --}}
<a class="nd-vip-btn" href="#request-info" data-nd-interest="VIP Price List">
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 1c-1.828 0-3.623.149-5.371.435a.75.75 0 0 0-.629.74v.387c-.827.157-1.642.345-2.445.564a.75.75 0 0 0-.552.698 5 5 0 0 0 4.503 5.152 6 6 0 0 0 2.946 1.822A6.451 6.451 0 0 1 7.768 13H7.5A1.5 1.5 0 0 0 6 14.5V17h-.75C4.56 17 4 17.56 4 18.25c0 .414.336.75.75.75h10.5a.75.75 0 0 0 .75-.75c0-.69-.56-1.25-1.25-1.25H14v-2.5a1.5 1.5 0 0 0-1.5-1.5h-.268a6.453 6.453 0 0 1-.684-2.202 6 6 0 0 0 2.946-1.822 5 5 0 0 0 4.503-5.152.75.75 0 0 0-.552-.698A31.804 31.804 0 0 0 16 2.562v-.387a.75.75 0 0 0-.629-.74A33.227 33.227 0 0 0 10 1Z" clip-rule="evenodd"/></svg>
    Get VIP Price List
</a>

{{-- Request Information modal — posts to the site's contact lead endpoint --}}
<div class="nd-req-modal" id="nd-req-modal" hidden role="dialog" aria-modal="true" aria-labelledby="nd-req-title">
    <div class="nd-req-card">
        <button type="button" class="nd-req-close" data-nd-req-close aria-label="Close">&times;</button>
        <h3 class="nd-req-title" id="nd-req-title">Request Information</h3>
        <p class="nd-req-sub">{{ $development->name }} &middot; {{ $development->area }}</p>
        <form method="POST" action="{{ route('agent-site.contact.submit', $site->slug) }}">
            @csrf
            <input type="hidden" name="interest" id="nd-req-interest" value="Information request — {{ $development->name }}">
            <div class="nd-req-field">
                <label for="nd-req-name">Name</label>
                <input id="nd-req-name" type="text" name="name" required autocomplete="name">
            </div>
            <div class="nd-req-row">
                <div class="nd-req-field">
                    <label for="nd-req-email">Email</label>
                    <input id="nd-req-email" type="email" name="email" required autocomplete="email">
                </div>
                <div class="nd-req-field">
                    <label for="nd-req-phone">Phone</label>
                    <input id="nd-req-phone" type="tel" name="phone" autocomplete="tel">
                </div>
            </div>
            <div class="nd-req-field">
                <label for="nd-req-message">Message</label>
                <textarea id="nd-req-message" name="message" rows="4">I'd like more information about {{ $development->name }}.</textarea>
            </div>
            <button type="submit" class="nd-req-submit">Send Request</button>
        </form>
    </div>
</div>
<script>
(function () {
    var modal = document.getElementById('nd-req-modal');
    if (!modal) return;
    var interest = document.getElementById('nd-req-interest');
    var message = document.getElementById('nd-req-message');
    var devName = @json($development->name);
    function open(kind) {
        interest.value = kind + ' — ' + devName;
        if (kind === 'VIP Price List') {
            message.value = "I'd like the VIP price list for " + devName + '.';
        }
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        var name = document.getElementById('nd-req-name');
        if (name) name.focus();
    }
    function close() {
        modal.hidden = true;
        document.body.style.overflow = '';
    }
    // Delegated — the bottom CTA's #request-info link renders after this script.
    document.addEventListener('click', function (e) {
        var el = e.target.closest && e.target.closest('a[href="#request-info"]');
        if (!el) return;
        e.preventDefault();
        open(el.getAttribute('data-nd-interest') || 'Information request');
    });
    modal.querySelector('[data-nd-req-close]').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (!modal.hidden && e.key === 'Escape') close(); });
})();
</script>

@include('agent-website.partials.blocks.cta', ['block' => ['data' => [
    'image' => $imgUrl,
    'eyebrow' => 'New Developments',
    'heading' => "Interested in {$development->name}?",
    'description' => 'Get floor plans, pricing and priority access to developer inventory.',
    'button_label' => 'Request Information',
    'button_link' => '#request-info',
]]])

{{-- Shared lightbox for the gallery + floor plans --}}
@if(! empty($gallery) || ! empty($floorPlans))
@php
    $lightboxSets = [
        'gallery' => array_map(fn ($p, $i) => ['src' => $mediaUrl($p), 'caption' => $development->name . ' — photo ' . ($i + 1)], $gallery, array_keys($gallery)),
        'plans' => array_map(fn ($f) => ['src' => $mediaUrl($f['image']), 'caption' => $f['label'] ?? 'Floor plan'], $floorPlans),
    ];
@endphp
<div class="nd-lightbox" id="nd-lightbox" hidden role="dialog" aria-modal="true" aria-label="Photo viewer">
    <button type="button" class="nd-lb-close" data-nd-close aria-label="Close">&times;</button>
    <button type="button" class="nd-lb-nav nd-lb-prev" data-nd-prev aria-label="Previous">&#8249;</button>
    <figure>
        <img id="nd-lb-img" src="" alt="">
        <figcaption id="nd-lb-caption"></figcaption>
    </figure>
    <button type="button" class="nd-lb-nav nd-lb-next" data-nd-next aria-label="Next">&#8250;</button>
</div>
<script type="application/json" id="nd-lightbox-data">@json($lightboxSets)</script>
<script>
(function () {
    var box = document.getElementById('nd-lightbox');
    if (!box) return;
    var sets = JSON.parse(document.getElementById('nd-lightbox-data').textContent || '{}');
    var img = document.getElementById('nd-lb-img');
    var caption = document.getElementById('nd-lb-caption');
    var current = { set: 'gallery', index: 0 };

    function show(setKey, index) {
        var items = sets[setKey] || [];
        if (!items.length) return;
        current = { set: setKey, index: (index + items.length) % items.length };
        var item = items[current.index];
        img.src = item.src;
        img.alt = item.caption || '';
        caption.textContent = (item.caption || '') + (items.length > 1 ? '  ·  ' + (current.index + 1) + ' / ' + items.length : '');
        box.hidden = false;
        document.body.style.overflow = 'hidden';
    }
    function close() {
        box.hidden = true;
        img.src = '';
        document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-nd-lightbox]').forEach(function (el) {
        el.addEventListener('click', function () {
            show(el.getAttribute('data-nd-lightbox'), parseInt(el.getAttribute('data-nd-index'), 10) || 0);
        });
    });
    box.querySelector('[data-nd-close]').addEventListener('click', close);
    box.querySelector('[data-nd-prev]').addEventListener('click', function () { show(current.set, current.index - 1); });
    box.querySelector('[data-nd-next]').addEventListener('click', function () { show(current.set, current.index + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
        if (box.hidden) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(current.set, current.index - 1);
        if (e.key === 'ArrowRight') show(current.set, current.index + 1);
    });
})();
</script>
@endif

@php
    $selfUrl = route('agent-site.new-developments.show', [$site->slug, $development->slug]);
    $breadcrumbLd = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => collect($crumbItems)->values()->map(fn ($c, $i) => array_filter([
            '@type' => 'ListItem', 'position' => $i + 1, 'name' => $c['label'], 'item' => $c['url'] ?? ($i === count($crumbItems) - 1 ? $selfUrl : null),
        ]))->all(),
    ];
    $placeLd = array_filter([
        '@context' => 'https://schema.org',
        '@type' => 'ApartmentComplex',
        'name' => $development->name,
        'url' => $selfUrl,
        'image' => $imgUrl ?: null,
        'address' => $development->address ?: null,
        'description' => $development->description ? Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags($development->description))), 300) : null,
    ]);
@endphp
<script type="application/ld+json">{!! json_encode($breadcrumbLd, JSON_UNESCAPED_SLASHES) !!}</script>
<script type="application/ld+json">{!! json_encode($placeLd, JSON_UNESCAPED_SLASHES) !!}</script>
@endsection
