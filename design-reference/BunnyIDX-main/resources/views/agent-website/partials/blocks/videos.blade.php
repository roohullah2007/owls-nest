{{--
    Videos block — grid or slider of video cards (YouTube / Vimeo / mp4), each a
    click-to-play facade. Data: title, subtitle, align, layout (grid|slider),
    bg_color, font_color, items (JSON [{url, title, thumb}]).
--}}
@php
    $vidLayout = (($block['data']['layout'] ?? 'grid') === 'slider') ? 'slider' : 'grid';
    $vidTitle = trim((string) ($block['data']['title'] ?? ''));
    $vidSubtitle = trim((string) ($block['data']['subtitle'] ?? ''));
    $vidAlign = in_array(($block['data']['align'] ?? 'center'), ['left', 'center', 'right'], true) ? ($block['data']['align'] ?? 'center') : 'center';

    $vidBg = trim((string) ($block['data']['bg_color'] ?? ''));
    $vidFont = trim((string) ($block['data']['font_color'] ?? ''));

    $vidItems = json_decode($block['data']['items'] ?? '[]', true);
    $vidItems = is_array($vidItems) ? array_values(array_filter($vidItems, fn ($i) => is_array($i) && trim((string) ($i['url'] ?? '')) !== '')) : [];

    $vidStyle = '';
    if ($vidBg) { $vidStyle .= '--vid-bg: ' . $vidBg . ';'; }
    if ($vidFont) { $vidStyle .= ' --vid-fg: ' . $vidFont . ';'; }

    $vidId = 'vid-' . ($block['id'] ?? uniqid());
@endphp
@if(count($vidItems))
<section class="vid-block" style="{{ $vidStyle }}" id="{{ $vidId }}">
    <div class="vid-inner">
        @if($vidTitle !== '' || $vidSubtitle !== '')
        <div class="vid-head vid-head-{{ $vidAlign }}">
            @if($vidTitle !== '')<h2 class="vid-title-h">{{ $vidTitle }}</h2>@endif
            @if($vidSubtitle !== '')<p class="vid-subtitle">{{ $vidSubtitle }}</p>@endif
        </div>
        @endif

        @if($vidLayout === 'slider')
        <div class="vid-slider">
            <div class="vid-track">
                @foreach($vidItems as $video)
                    @include('agent-website.partials.blocks.videos-card', ['video' => $video])
                @endforeach
            </div>
            @if(count($vidItems) > 3)
            <div class="vid-controls">
                <button type="button" class="vid-arrow vid-prev" aria-label="Previous">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <button type="button" class="vid-arrow vid-next" aria-label="Next">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
            </div>
            @endif
        </div>
        @else
        <div class="vid-grid">
            @foreach($vidItems as $video)
                @include('agent-website.partials.blocks.videos-card', ['video' => $video])
            @endforeach
        </div>
        @endif
    </div>
</section>
<script>
    (function () {
        var root = document.getElementById('{{ $vidId }}');
        if (!root) return;
        root.querySelectorAll('.vid-thumb').forEach(function (thumb) {
            function play() {
                if (thumb.classList.contains('vid-playing')) return;
                var embed = thumb.getAttribute('data-embed');
                var mp4 = thumb.getAttribute('data-mp4');
                var el;
                if (embed) {
                    el = document.createElement('iframe');
                    el.className = 'vid-iframe';
                    el.src = embed;
                    el.allow = 'autoplay; fullscreen; picture-in-picture';
                    el.setAttribute('allowfullscreen', '');
                } else if (mp4) {
                    el = document.createElement('video');
                    el.className = 'vid-video';
                    el.src = mp4;
                    el.controls = true;
                    el.autoplay = true;
                } else {
                    return;
                }
                thumb.innerHTML = '';
                thumb.appendChild(el);
                thumb.classList.add('vid-playing');
            }
            thumb.addEventListener('click', play);
            thumb.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
            });
        });
        var track = root.querySelector('.vid-track');
        if (track) {
            var step = function () { return track.clientWidth * 0.8; };
            var prev = root.querySelector('.vid-prev');
            var next = root.querySelector('.vid-next');
            if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
            if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
        }
    })();
</script>
@endif
