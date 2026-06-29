{{--
    Featured Listings block — three variants:
      showcase : one big property + two thumbnails per slide, carousel, partial
                 black backdrop (the signature layout).
      slider   : team-style two-column (heading/arrows + horizontal scroll).
      grid     : centered heading + grid of cards.
    Listings come from the configured source (manual by default; MLS sources are
    resolved in PublicWebsiteController and passed as $block['_listings']). With
    no listings, sample placeholders render. Data: variant, title,
    view_all_label, view_all_link, bg_color, source, items (JSON).
--}}
@php
    $flVariant = in_array(($block['data']['variant'] ?? 'showcase'), ['showcase', 'slider', 'grid'], true) ? ($block['data']['variant'] ?? 'showcase') : 'showcase';
    $flTitle = $block['data']['title'] ?? 'Featured Properties';
    $flViewLabel = trim((string) ($block['data']['view_all_label'] ?? '')) ?: 'View All';
    $flViewLink = trim((string) ($block['data']['view_all_link'] ?? ''));
    $flBgColor = trim((string) ($block['data']['bg_color'] ?? ''));

    // Source resolution: MLS (or auto, when a connection exists) → live MLS
    // listings via the gateway; otherwise the agent's own CRM Properties; with
    // sample placeholders as the last resort.
    $flSource = $block['data']['source'] ?? 'own';
    $flProps = null;
    if (in_array($flSource, ['mls', 'auto'], true)) {
        $flResolved = \App\Services\Mls\FeaturedListingsResolver::resolve($site, $block['data']);
        if ($flResolved) {
            $flProps = $flResolved['listings'];
        }
    }
    if (! is_array($flProps)) {
        $flProps = \App\Services\Mls\FeaturedListingsResolver::resolveOwn($site, $block['data']) ?? [];
    }
    if (count($flProps) === 0) {
        $flProps = [
            ['image' => '', 'status' => 'For Sale', 'price' => '$2,550,000', 'address' => '88 Pine Cone Drive, West Yarmouth, MA', 'beds' => '3', 'baths' => '5', 'sqft' => '3,221'],
            ['image' => '', 'status' => 'For Sale', 'price' => '$2,195,000', 'address' => '61 Airpark Drive, Teaticket, MA', 'beds' => '4', 'baths' => '3', 'sqft' => '2,400'],
            ['image' => '', 'status' => 'For Sale', 'price' => '$1,650,000', 'address' => '35 Shore Drive, Mashpee, MA', 'beds' => '3', 'baths' => '2', 'sqft' => '1,980'],
        ];
    }
    // "View All" goes to the shared property-search page unless the agent set a
    // custom link. (Raw "/buy" would escape the /site/{slug} prefix.)
    $flViewHref = $flViewLink ?: route('agent-site.properties', $site->slug);
    $flId = 'fl-' . ($block['id'] ?? uniqid());
    $flFont = trim((string) ($block['data']['font_color'] ?? ''));
    $flStyle = ($flBgColor ? 'background-color: ' . $flBgColor . ';' : '') . ($flFont ? ' --fl-fg: ' . $flFont . ';' : '');
@endphp
@if(count($flProps))
@if($flVariant === 'showcase')
@php $flGroups = array_chunk($flProps, 3); @endphp
<section class="fl-showcase-section" @if($flStyle) style="{{ $flStyle }}" @endif>
    <div class="fl-inner">
        <div class="fl-head">
            <h2 class="fl-title">{{ $flTitle }}</h2>
            @if(count($flGroups) > 1)
            <div class="fl-arrows">
                <button type="button" class="fl-arrow fl-prev" aria-label="Previous"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
                <button type="button" class="fl-arrow fl-next" aria-label="Next"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
            </div>
            @endif
        </div>
    </div>
    <div class="fl-showcase">
        <div class="fl-backdrop"></div>
        <div class="fl-showcase-wrap" id="{{ $flId }}">
            <div class="fl-viewport">
                <div class="fl-track">
                    @foreach($flGroups as $group)
                    <div class="fl-slide">
                        <div class="fl-big">
                            @include('agent-website.partials.blocks.featured-card', ['prop' => $group[0], 'size' => 'big'])
                        </div>
                        @if(count($group) > 1)
                        <div class="fl-thumbs">
                            @foreach(array_slice($group, 1, 2) as $thumb)
                                @include('agent-website.partials.blocks.featured-card', ['prop' => $thumb, 'size' => 'thumb'])
                            @endforeach
                        </div>
                        @endif
                    </div>
                    @endforeach
                </div>
            </div>
            @if($flViewLabel)
            <div class="fl-viewall-row"><a href="{{ $flViewHref }}" class="team-block-viewall" style="--team-fg: #fff;">{{ $flViewLabel }} <span class="team-block-viewall-line"></span></a></div>
            @endif
        </div>
    </div>
</section>
<script>
    (function () {
        var root = document.getElementById('{{ $flId }}');
        if (!root) return;
        var track = root.querySelector('.fl-track');
        if (!track) return;
        var n = track.children.length, i = 0;
        function go(x) { i = (x + n) % n; track.style.transform = 'translateX(-' + (i * 100) + '%)'; }
        var head = root.closest('.fl-showcase-section');
        var prev = head && head.querySelector('.fl-prev');
        var next = head && head.querySelector('.fl-next');
        prev && prev.addEventListener('click', function () { go(i - 1); });
        next && next.addEventListener('click', function () { go(i + 1); });
    })();
</script>
@else
<section class="fl-block {{ $flVariant === 'grid' ? 'fl-grid-section' : '' }}" @if($flStyle) style="{{ $flStyle }}" @endif>
    <div class="fl-inner">
        @if($flVariant === 'slider')
        <div class="fl-slider" id="{{ $flId }}">
            <div class="fl-slider-aside">
                <div>
                    <h2 class="fl-title">{{ $flTitle }}</h2>
                    @if($flViewLabel)<a href="{{ $flViewHref }}" class="team-block-viewall">{{ $flViewLabel }} <span class="team-block-viewall-line"></span></a>@endif
                </div>
                <div class="fl-slider-arrows">
                    <button type="button" class="fl-arrow fl-slider-prev" aria-label="Previous"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
                    <button type="button" class="fl-arrow fl-slider-next" aria-label="Next"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                </div>
            </div>
            <div class="fl-slider-track">
                @foreach($flProps as $prop)
                    @include('agent-website.partials.blocks.featured-card', ['prop' => $prop, 'size' => 'sm'])
                @endforeach
            </div>
            @if($flViewLabel)
            {{-- Mobile-only: the View All pill re-renders under the track (the aside copy hides). --}}
            <div class="slider-viewall-m"><a href="{{ $flViewHref }}" class="team-block-viewall">{{ $flViewLabel }} <span class="team-block-viewall-line"></span></a></div>
            @endif
        </div>
        <script>
            (function () {
                var root = document.getElementById('{{ $flId }}');
                if (!root) return;
                var track = root.querySelector('.fl-slider-track');
                if (!track) return;
                root.querySelector('.fl-slider-prev').addEventListener('click', function () { track.scrollBy({ left: -384, behavior: 'smooth' }); });
                root.querySelector('.fl-slider-next').addEventListener('click', function () { track.scrollBy({ left: 384, behavior: 'smooth' }); });
            })();
        </script>
        @else
        <div class="fl-head"><h2 class="fl-title">{{ $flTitle }}</h2></div>
        <div class="fl-grid">
            @foreach($flProps as $prop)
                @include('agent-website.partials.blocks.featured-card', ['prop' => $prop, 'size' => 'sm'])
            @endforeach
        </div>
        @if($flViewLabel)
        <div class="fl-light-viewall-row"><a href="{{ $flViewHref }}" class="team-block-viewall">{{ $flViewLabel }} <span class="team-block-viewall-line"></span></a></div>
        @endif
        @endif
    </div>
</section>
@endif
@endif
