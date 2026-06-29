{{--
    Latest Blog Posts block — a large featured post (left) beside a rotating list
    of 3 smaller posts (right). Prev/next arrows cycle the featured post (and the
    list follows) when there are more than 4 posts. Pulls from the site's
    published blog posts; falls back to sample placeholders when there are none.
    Data: title, button_label, count, categories (JSON [string] — empty = all),
    bg_color, font_color.
--}}
@php
    $lbpTitle = trim((string) ($block['data']['title'] ?? '')) ?: 'Recent Blog Posts';
    $lbpBtn = trim((string) ($block['data']['button_label'] ?? '')) ?: 'View Blog Posts';
    $lbpCount = max(4, min(12, (int) ($block['data']['count'] ?? 7)));

    // Optional category filter (none selected = latest posts from every category).
    $lbpCats = json_decode($block['data']['categories'] ?? '[]', true);
    $lbpCats = is_array($lbpCats) ? array_values(array_filter($lbpCats, fn ($c) => is_string($c) && trim($c) !== '')) : [];

    $lbpQuery = $site->blogPosts()->published()->orderByDesc('published_at');
    if (count($lbpCats)) {
        $lbpQuery->whereIn('category', $lbpCats);
    }
    $posts = $lbpQuery->take($lbpCount)->get();

    $lbpBgColor = trim((string) ($block['data']['bg_color'] ?? ''));
    $lbpFontColor = trim((string) ($block['data']['font_color'] ?? ''));
    $lbpStyle = ($lbpBgColor ? '--lbp-bg: ' . $lbpBgColor . ';' : '') . ($lbpFontColor ? ' --lbp-fg: ' . $lbpFontColor . ';' : '');

    $items = [];
    foreach ($posts as $post) {
        $img = $post->featured_image
            ? (\Illuminate\Support\Str::startsWith($post->featured_image, ['http://', 'https://']) ? $post->featured_image : Storage::url($post->featured_image))
            : asset('images/backgrounds/bg-7.jpg');
        $items[] = [
            'image' => $img,
            'date' => optional($post->published_at)->format('F j, Y') ?? '',
            'title' => (string) $post->title,
            'link' => route('agent-site.blog.post', [$site->slug, $post->slug]),
        ];
    }

    // Sample placeholders so the block looks designed before any posts exist.
    if (empty($items)) {
        $samples = [
            [asset('images/backgrounds/bg-3.jpg'), 'Neighborhoods for Golf, Ponds, and Beaches'],
            [asset('images/backgrounds/bg-4.jpg'), 'What It Is Like to Own a Second Home'],
            [asset('images/backgrounds/bg-6.jpg'), 'Out-of-State Buyer Checklist for Closing'],
            [asset('images/backgrounds/bg-8.jpg'), 'A Village Guide for Local Home Buyers'],
        ];
        foreach ($samples as [$img, $title]) {
            $items[] = ['image' => $img, 'date' => 'Coming soon', 'title' => $title, 'link' => '#'];
        }
    }

    $blogIndex = route('agent-site.blog', $site->slug);
    $featured = $items[0];
    $smalls = array_slice($items, 1, 3);
    $showArrows = count($items) > 4;
    $lbpId = 'lbp-' . ($block['id'] ?? uniqid());
@endphp
<section class="lbp-block" id="{{ $lbpId }}"@if($lbpStyle) style="{{ $lbpStyle }}"@endif>
    <div class="lbp-inner">
        <h2 class="lbp-title">{{ $lbpTitle }}</h2>
        <div class="lbp-grid">
            {{-- Featured --}}
            <div class="lbp-featured">
                <a class="lbp-feat-link" href="{{ $featured['link'] }}">
                    <img class="lbp-feat-img" src="{{ $featured['image'] }}" alt="{{ $featured['title'] }}" loading="lazy" decoding="async">
                </a>
                <p class="lbp-feat-date">{{ $featured['date'] }}</p>
                <a class="lbp-feat-titlelink" href="{{ $featured['link'] }}"><h3 class="lbp-feat-title">{{ $featured['title'] }}</h3></a>
                <a class="lbp-btn" href="{{ $blogIndex }}">{{ $lbpBtn }}<span class="lbp-btn-line"></span></a>
            </div>

            {{-- List --}}
            <div class="lbp-list">
                @foreach($smalls as $small)
                <a class="lbp-item" href="{{ $small['link'] }}">
                    <div class="lbp-item-imgwrap">
                        <img class="lbp-item-img" src="{{ $small['image'] }}" alt="{{ $small['title'] }}" loading="lazy" decoding="async">
                    </div>
                    <div>
                        <p class="lbp-item-date">{{ $small['date'] }}</p>
                        <h3 class="lbp-item-title">{{ $small['title'] }}</h3>
                    </div>
                </a>
                @endforeach
                @if($showArrows)
                <div class="lbp-arrows">
                    <button type="button" class="lbp-arrow lbp-prev" aria-label="Previous posts">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button type="button" class="lbp-arrow lbp-next" aria-label="Next posts">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
                @endif
            </div>
        </div>
    </div>
</section>
@if($showArrows)
<script>
    (function () {
        var root = document.getElementById('{{ $lbpId }}');
        if (!root) return;
        var items = @json($items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        var n = items.length;
        if (n < 5) return;
        var i = 0;
        var featLink = root.querySelector('.lbp-feat-link');
        var featTitleLink = root.querySelector('.lbp-feat-titlelink');
        var featImg = root.querySelector('.lbp-feat-img');
        var featDate = root.querySelector('.lbp-feat-date');
        var featTitle = root.querySelector('.lbp-feat-title');
        var smalls = Array.prototype.slice.call(root.querySelectorAll('.lbp-item'));
        function render() {
            var f = items[i];
            if (featImg) { featImg.src = f.image; featImg.alt = f.title; }
            if (featDate) featDate.textContent = f.date;
            if (featTitle) featTitle.textContent = f.title;
            if (featLink) featLink.href = f.link;
            if (featTitleLink) featTitleLink.href = f.link;
            smalls.forEach(function (el, k) {
                var p = items[(i + 1 + k) % n];
                var img = el.querySelector('.lbp-item-img');
                var d = el.querySelector('.lbp-item-date');
                var t = el.querySelector('.lbp-item-title');
                if (img) { img.src = p.image; img.alt = p.title; }
                if (d) d.textContent = p.date;
                if (t) t.textContent = p.title;
                el.href = p.link;
            });
        }
        var prev = root.querySelector('.lbp-prev');
        var next = root.querySelector('.lbp-next');
        if (prev) prev.addEventListener('click', function () { i = (i - 1 + n) % n; render(); });
        if (next) next.addEventListener('click', function () { i = (i + 1) % n; render(); });
    })();
</script>
@endif
