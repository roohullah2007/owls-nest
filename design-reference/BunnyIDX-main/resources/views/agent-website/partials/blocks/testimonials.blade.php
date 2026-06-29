{{--
    Testimonials block — three variants (grid = default centered, slider =
    two-column, spotlight = full-bleed carousel). Colour is driven by a Light/Dark
    theme; bg / card / font / text colours are individually overridable.
    Emits schema.org Review JSON-LD.
    Data: variant, theme, title, subtitle, align (grid), bg_image,
    bg_color, card_bg, font_color, text_color, view_all_label, view_all_link,
    items (JSON [{quote, author, role, link}]).
--}}
@php
    $tbVariant = in_array(($block['data']['variant'] ?? 'grid'), ['spotlight', 'slider', 'grid'], true) ? ($block['data']['variant'] ?? 'grid') : 'grid';
    $tbTheme = (($block['data']['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';
    $tbTitle = $block['data']['title'] ?? 'Testimonials';
    $tbSubtitle = trim((string) ($block['data']['subtitle'] ?? ''));
    $tbAlign = in_array(($block['data']['align'] ?? 'center'), ['left', 'center', 'right'], true) ? ($block['data']['align'] ?? 'center') : 'center';
    $tbViewLabel = trim((string) ($block['data']['view_all_label'] ?? '')) ?: 'View All';
    $tbViewLink = trim((string) ($block['data']['view_all_link'] ?? ''));
    // Source: 'site' pulls from the site-wide Testimonials tab (website settings);
    // 'manual' (default) uses the block's own repeater items.
    $tbSource = ($block['data']['source'] ?? 'manual') === 'site' ? 'site' : 'manual';
    if ($tbSource === 'site') {
        $tbItems = collect($site->testimonials ?? [])->map(fn ($t) => [
            'quote' => trim((string) ($t['text'] ?? '')),
            'author' => trim((string) ($t['name'] ?? '')),
            'role' => trim((string) ($t['role'] ?? '')),
            'link' => '',
            'rating' => $t['rating'] ?? null,
        ])->all();
    } else {
        $tbItems = json_decode($block['data']['items'] ?? '[]', true);
    }
    $tbItems = is_array($tbItems) ? array_values(array_filter($tbItems, fn ($i) => is_array($i) && (trim((string) ($i['quote'] ?? '')) !== '' || trim((string) ($i['author'] ?? '')) !== ''))) : [];

    $tbBgImg = trim((string) ($block['data']['bg_image'] ?? ''));
    $tbBgImgUrl = $tbBgImg ? (\Illuminate\Support\Str::startsWith($tbBgImg, ['http://', 'https://']) ? $tbBgImg : Storage::url($tbBgImg)) : '';
    $tbBgColor = trim((string) ($block['data']['bg_color'] ?? ''));
    $tbCardBg = trim((string) ($block['data']['card_bg'] ?? ''));
    $tbFont = trim((string) ($block['data']['font_color'] ?? ''));
    $tbTextColor = trim((string) ($block['data']['text_color'] ?? ''));

    $tbHasImage = $tbBgImgUrl !== '';
    $tbImageMode = $tbVariant === 'spotlight' && $tbHasImage; // overlay + forced white text
    $tbLightText = $tbTheme === 'dark' || $tbImageMode;

    // Section style: optional bg image + colour overrides (theme tokens are the defaults).
    $tbStyle = '';
    if ($tbBgColor) { $tbStyle .= 'background-color: ' . $tbBgColor . ';'; }
    if ($tbHasImage) { $tbStyle .= ' background-image: url(\'' . $tbBgImgUrl . '\'); background-size: cover; background-position: center;'; }
    if ($tbImageMode && ! $tbFont) { $tbStyle .= ' --tb-fg: #FFFFFF; --tb-on: #111315;'; }
    if ($tbFont) { $tbStyle .= ' --tb-fg: ' . $tbFont . ';'; }
    if ($tbCardBg) { $tbStyle .= ' --tb-card-bg: ' . $tbCardBg . ';'; }
    if ($tbTextColor) { $tbStyle .= ' --tb-text: ' . $tbTextColor . ';'; }

    $tbViewBtn = 'btn ' . ($tbLightText ? 'btn-white-outline' : 'btn-outline');
    $tbThemeClass = 'tb-theme-' . $tbTheme;
    $tbId = 'tb-' . ($block['id'] ?? uniqid());
@endphp
@if(count($tbItems))
@php
    // schema.org Review structured data so the testimonials are machine-readable.
    $tbReviews = [];
    foreach ($tbItems as $rv) {
        $body = trim((string) ($rv['quote'] ?? ''));
        if ($body === '') {
            continue;
        }
        $rvRating = isset($rv['rating']) && (int) $rv['rating'] >= 1 ? (string) min(5, (int) $rv['rating']) : '5';
        $review = ['@type' => 'Review', 'reviewBody' => $body, 'reviewRating' => ['@type' => 'Rating', 'ratingValue' => $rvRating, 'bestRating' => '5']];
        if (! empty($rv['author'])) {
            $review['author'] = ['@type' => 'Person', 'name' => (string) $rv['author']];
        }
        $tbReviews[] = $review;
    }
    $tbSchema = [
        '@context' => 'https://schema.org',
        '@type' => 'RealEstateAgent',
        'name' => $site->agent_name ?: ($site->brokerage_name ?: 'Real Estate Agent'),
        'review' => $tbReviews,
    ];
@endphp
@if(count($tbReviews))
<script type="application/ld+json">{!! json_encode($tbSchema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
@endif
@if($tbVariant === 'spotlight')
<section class="tb-spotlight {{ $tbThemeClass }}{{ $tbImageMode ? ' tb-spotlight-image' : '' }}" style="{{ $tbStyle }}">
    <div class="tb-spotlight-overlay"></div>
    <h2 class="tb-spotlight-title">{{ $tbTitle }}</h2>
    @if($tbSubtitle)<p class="tb-subtitle">{{ $tbSubtitle }}</p>@endif
    <div class="tb-spotlight-wrap" id="{{ $tbId }}">
        <button type="button" class="tb-arrow tb-prev" aria-label="Previous">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button type="button" class="tb-arrow tb-next" aria-label="Next">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
        <div class="tb-viewport">
            <div class="tb-track">
                @foreach($tbItems as $item)
                <div class="tb-slide">
                    <div class="tb-badge">
                        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z"/></svg>
                    </div>
                    @if(!empty($item['quote']))<p class="tb-quote">{{ $item['quote'] }}</p>@endif
                    @if(!empty($item['link']))
                    <a href="{{ $item['link'] }}" class="tb-readmore">Read More
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </a>
                    @endif
                    @if(!empty($item['author']))<p class="tb-author">{{ $item['author'] }}</p>@endif
                </div>
                @endforeach
            </div>
        </div>
    </div>
    @if($tbViewLink)
    <div class="tb-viewall-row"><a href="{{ $tbViewLink }}" class="{{ $tbViewBtn }}">{{ $tbViewLabel }}</a></div>
    @endif
</section>
<script>
    (function () {
        var root = document.getElementById('{{ $tbId }}');
        if (!root) return;
        var track = root.querySelector('.tb-track');
        if (!track) return;
        var n = track.children.length, i = 0;
        function go(x) { i = (x + n) % n; track.style.transform = 'translateX(-' + (i * 100) + '%)'; }
        root.querySelector('.tb-prev').addEventListener('click', function () { go(i - 1); });
        root.querySelector('.tb-next').addEventListener('click', function () { go(i + 1); });
    })();
</script>
@else
<section class="tb-block {{ $tbThemeClass }}" style="{{ $tbStyle }}">
    <div class="tb-block-inner">
        @if($tbVariant === 'slider')
        <div class="tb-slider" id="{{ $tbId }}">
            <div class="tb-slider-aside">
                <div>
                    <h2 class="tb-slider-title">{{ $tbTitle }}</h2>
                    @if($tbSubtitle)<p class="tb-slider-subtitle">{{ $tbSubtitle }}</p>@endif
                    @if($tbViewLink)<a href="{{ $tbViewLink }}" class="{{ $tbViewBtn }}">{{ $tbViewLabel }}</a>@endif
                </div>
                <div class="tb-slider-arrows">
                    <button type="button" class="tb-slider-arrow tb-slider-prev" aria-label="Previous">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button type="button" class="tb-slider-arrow tb-slider-next" aria-label="Next">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
            <div class="tb-slider-track">
                @foreach($tbItems as $item)
                    @include('agent-website.partials.blocks.testimonials-card', ['item' => $item])
                @endforeach
            </div>
        </div>
        @else
        <div class="tb-head tb-head-{{ $tbAlign }}">
            <h2 class="tb-head-title">{{ $tbTitle }}</h2>
            @if($tbSubtitle)<p class="tb-subtitle">{{ $tbSubtitle }}</p>@endif
        </div>
        <div class="tb-grid">
            @foreach($tbItems as $item)
                @include('agent-website.partials.blocks.testimonials-card', ['item' => $item])
            @endforeach
        </div>
        @if($tbViewLink)
        <div class="tb-light-viewall-row"><a href="{{ $tbViewLink }}" class="{{ $tbViewBtn }}">{{ $tbViewLabel }}</a></div>
        @endif
        @endif
    </div>
</section>
@if($tbVariant === 'slider')
<script>
    (function () {
        var root = document.getElementById('{{ $tbId }}');
        if (!root) return;
        var track = root.querySelector('.tb-slider-track');
        if (!track) return;
        root.querySelector('.tb-slider-prev').addEventListener('click', function () { track.scrollBy({ left: -384, behavior: 'smooth' }); });
        root.querySelector('.tb-slider-next').addEventListener('click', function () { track.scrollBy({ left: 384, behavior: 'smooth' }); });
    })();
</script>
@endif
@endif
@endif
