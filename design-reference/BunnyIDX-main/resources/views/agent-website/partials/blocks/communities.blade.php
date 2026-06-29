{{--
    Communities block — a grid (default) or slider of community cards sourced from
    the website's Areas/Communities. Either shows every active community or a
    curated, re-ordered selection (data.source = all|selected, data.selected =
    JSON array of area ids). Each card shows the community background image with
    the name below it or overlaid on the image (data.card_style = below|overlay).
    Placeholders fill in when the agent has no communities yet so the section
    still looks complete (mirrors the Featured block). Data: title,
    view_all_label, view_all_link, layout (grid|slider), card_style, columns
    (2|3|4), image_ratio (landscape|square|wide|portrait), source, selected,
    bg_color, text_color.
--}}
@php
    $cmTitle = trim((string) ($block['data']['title'] ?? ''));
    $cmViewLabel = trim((string) ($block['data']['view_all_label'] ?? ''));
    $cmViewLink = trim((string) ($block['data']['view_all_link'] ?? ''));
    $cmLayout = (($block['data']['layout'] ?? 'grid') === 'slider') ? 'slider' : 'grid';
    $cmCardStyle = (($block['data']['card_style'] ?? 'below') === 'overlay') ? 'overlay' : 'below';
    $cmColumns = in_array(($block['data']['columns'] ?? '3'), ['2', '3', '4'], true) ? ($block['data']['columns'] ?? '3') : '3';
    $cmSource = (($block['data']['source'] ?? 'all') === 'selected') ? 'selected' : 'all';
    // Dark (default) / light theme — controls the section bg, card text and
    // the outlined View All button (white on dark, dark on light).
    $cmTheme = (($block['data']['theme'] ?? 'dark') === 'light') ? 'light' : 'dark';

    $cmAll = $site->areas()->active()->orderBy('sort_order')->orderBy('name')->get();
    if ($cmSource === 'selected') {
        $cmSelected = json_decode($block['data']['selected'] ?? '[]', true);
        $cmSelected = is_array($cmSelected) ? $cmSelected : [];
        $cmById = $cmAll->keyBy('id');
        $cmAreas = collect($cmSelected)->map(fn ($id) => $cmById->get((int) $id))->filter()->values();
    } else {
        $cmAreas = $cmAll;
    }

    // Placeholders fill in when there are no communities to show yet.
    if ($cmAreas->isEmpty()) {
        $cmCards = collect(['Community One', 'Community Two', 'Community Three'])
            ->map(fn ($name) => ['name' => $name, 'url' => '', 'image' => '']);
    } else {
        $cmCards = $cmAreas->map(fn ($a) => [
            'name' => $a->name,
            'url' => route('agent-site.areas.show', [$site->slug, $a->slug]),
            'image' => $a->image ? (\Illuminate\Support\Str::startsWith($a->image, ['http://', 'https://']) ? $a->image : asset('storage/' . $a->image)) : '',
        ]);
    }

    // "View All" defaults to the site's communities index page. A raw "/areas"
    // path (the old block seed) would escape the /site/{slug} prefix, so treat
    // it as "use the default" too.
    $cmViewHref = ($cmViewLink === '' || $cmViewLink === '/areas')
        ? route('agent-site.areas', $site->slug)
        : $cmViewLink;

    $cmRatios = ['landscape' => '4 / 3', 'square' => '1 / 1', 'wide' => '16 / 9', 'portrait' => '3 / 4'];
    $cmRatio = $cmRatios[$block['data']['image_ratio'] ?? 'landscape'] ?? $cmRatios['landscape'];

    $cmBg = trim((string) ($block['data']['bg_color'] ?? ''));
    $cmText = trim((string) ($block['data']['text_color'] ?? ''));
    $cmStyle = ($cmBg ? 'background-color: ' . $cmBg . ';' : '')
        . ($cmText ? ' --cm-fg: ' . $cmText . ';' : '')
        . ($cmRatio !== '4 / 3' ? ' --cm-ratio: ' . $cmRatio . ';' : '');
    $cmId = 'cm-' . ($block['id'] ?? uniqid());
@endphp
<section class="cm-block cm-theme-{{ $cmTheme }}" @if($cmStyle) style="{{ $cmStyle }}" @endif>
    <div class="cm-inner">
        @if($cmLayout === 'slider')
        <div class="cm-slider" id="{{ $cmId }}">
            <div class="cm-aside">
                <div>
                    @if($cmTitle)<h2 class="cm-title">{{ $cmTitle }}</h2>@endif
                    @if($cmViewLabel)
                    <a href="{{ $cmViewHref }}" class="team-block-viewall">{{ $cmViewLabel }} <span class="team-block-viewall-line"></span></a>
                    @endif
                </div>
                <div class="cm-arrows">
                    <button type="button" class="cm-arrow cm-prev" aria-label="Previous communities">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button type="button" class="cm-arrow cm-next" aria-label="Next communities">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
            <div class="cm-track">
                @foreach($cmCards as $card)
                    @include('agent-website.partials.blocks.communities-card', ['card' => $card, 'cardStyle' => $cmCardStyle])
                @endforeach
            </div>
            @if($cmViewLabel)
            {{-- Mobile-only: the View All pill re-renders under the track (the aside copy hides). --}}
            <div class="slider-viewall-m"><a href="{{ $cmViewHref }}" class="team-block-viewall">{{ $cmViewLabel }} <span class="team-block-viewall-line"></span></a></div>
            @endif
        </div>
        @else
        @if($cmTitle || $cmViewLabel)
        <div class="cm-head">
            @if($cmTitle)<h2 class="cm-title">{{ $cmTitle }}</h2>@endif
            @if($cmViewLabel)
            <a href="{{ $cmViewHref }}" class="team-block-viewall">{{ $cmViewLabel }} <span class="team-block-viewall-line"></span></a>
            @endif
        </div>
        @endif
        <div class="cm-grid cm-grid-{{ $cmColumns }}">
            @foreach($cmCards as $card)
                @include('agent-website.partials.blocks.communities-card', ['card' => $card, 'cardStyle' => $cmCardStyle])
            @endforeach
        </div>
        @endif
    </div>
</section>

@if($cmLayout === 'slider')
<script>
    (function () {
        var root = document.getElementById('{{ $cmId }}');
        if (!root) return;
        var track = root.querySelector('.cm-track');
        var prev = root.querySelector('.cm-prev');
        var next = root.querySelector('.cm-next');
        if (!track) return;
        prev && prev.addEventListener('click', function () { track.scrollBy({ left: -340, behavior: 'smooth' }); });
        next && next.addEventListener('click', function () { track.scrollBy({ left: 340, behavior: 'smooth' }); });
    })();
</script>
@endif
