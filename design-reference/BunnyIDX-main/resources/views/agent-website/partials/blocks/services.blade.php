{{--
    Services block — a black panel of square image cards (image, uppercase title,
    "Learn More" pill). Renders as a grid or, with 4+ services, an optional
    scroll-snap slider. Replaces the old Buy & Sell cards; insertable anywhere.
    Data: title, description, layout (grid|slider), button_label, items (JSON
    string of [{image, title, link}]).
--}}
@php
    $svcTitle = $block['data']['title'] ?? '';
    $svcDesc = $block['data']['description'] ?? '';
    $svcButton = trim((string) ($block['data']['button_label'] ?? '')) ?: 'Learn More';
    $svcAlign = in_array(($block['data']['align'] ?? 'center'), ['left', 'center', 'right'], true) ? ($block['data']['align'] ?? 'center') : 'center';
    $svcItems = json_decode($block['data']['items'] ?? '[]', true);
    $svcItems = is_array($svcItems) ? array_values(array_filter($svcItems, fn ($i) => is_array($i))) : [];
    // A slider only makes sense with more than 3 cards — otherwise force grid.
    $svcLayout = (($block['data']['layout'] ?? 'grid') === 'slider' && count($svcItems) > 3) ? 'slider' : 'grid';
    $svcBg = trim((string) ($block['data']['bg_color'] ?? '')) ?: '#000000';
    $svcText = trim((string) ($block['data']['text_color'] ?? ''));
    $svcStyle = 'background-color: ' . $svcBg . ';' . ($svcText ? ' --svc-fg: ' . $svcText . ';' : '');
    $svcId = 'services-' . ($block['id'] ?? uniqid());
@endphp
@if(count($svcItems))
<section class="services-block" style="{{ $svcStyle }}">
    <div class="services-block-inner">
        @if($svcTitle || $svcDesc)
        <div class="services-block-head services-block-head-{{ $svcAlign }}">
            @if($svcTitle)<h2 class="services-block-title">{{ $svcTitle }}</h2>@endif
            @if($svcDesc)<p class="services-block-desc">{{ $svcDesc }}</p>@endif
        </div>
        @endif

        <div class="services-block-{{ $svcLayout }}" id="{{ $svcId }}">
            <div class="services-block-track">
                @foreach($svcItems as $item)
                @php
                    $img = $item['image'] ?? '';
                    $imgSrc = $img ? (\Illuminate\Support\Str::startsWith($img, ['http://', 'https://']) ? $img : Storage::url($img)) : '';
                    $itemTitle = $item['title'] ?? '';
                    $itemLink = $item['link'] ?? '';
                @endphp
                <div class="services-block-card">
                    <div class="services-block-img">
                        @if($imgSrc)
                        <img src="{{ $imgSrc }}" alt="{{ $itemTitle }}" loading="lazy">
                        @else
                        <div class="services-block-img-placeholder">{{ $itemTitle ?: 'Service' }}</div>
                        @endif
                    </div>
                    @if($itemTitle)<h3 class="services-block-card-title">{{ $itemTitle }}</h3>@endif
                    @if($itemLink)<a href="{{ $itemLink }}" class="services-block-btn">{{ $svcButton }}</a>@endif
                </div>
                @endforeach
            </div>

            @if($svcLayout === 'slider')
            <div class="services-block-controls">
                <button type="button" class="services-block-arrow services-block-prev" aria-label="Previous services">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
                </button>
                <div class="services-block-dots"></div>
                <button type="button" class="services-block-arrow services-block-next" aria-label="Next services">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
                </button>
            </div>
            @endif
        </div>
    </div>
</section>

@if($svcLayout === 'slider')
<script>
    (function () {
        var root = document.getElementById('{{ $svcId }}');
        if (!root) return;
        var track = root.querySelector('.services-block-track');
        var dotsWrap = root.querySelector('.services-block-dots');
        var prev = root.querySelector('.services-block-prev');
        var next = root.querySelector('.services-block-next');
        if (!track) return;

        function pageCount() { return Math.max(1, Math.round(track.scrollWidth / track.clientWidth)); }
        function currentPage() { return Math.round(track.scrollLeft / track.clientWidth); }

        function buildDots() {
            if (!dotsWrap) return;
            var n = pageCount();
            dotsWrap.innerHTML = '';
            for (var i = 0; i < n; i++) {
                var dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'services-block-dot' + (i === currentPage() ? ' active' : '');
                dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
                (function (idx) { dot.addEventListener('click', function () { track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' }); }); })(i);
                dotsWrap.appendChild(dot);
            }
        }
        function syncDots() {
            if (!dotsWrap) return;
            var p = currentPage();
            dotsWrap.querySelectorAll('.services-block-dot').forEach(function (d, i) { d.classList.toggle('active', i === p); });
        }

        prev && prev.addEventListener('click', function () { track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' }); });
        next && next.addEventListener('click', function () { track.scrollBy({ left: track.clientWidth, behavior: 'smooth' }); });
        track.addEventListener('scroll', syncDots, { passive: true });
        window.addEventListener('resize', buildDots);
        buildDots();
    })();
</script>
@endif
@endif
