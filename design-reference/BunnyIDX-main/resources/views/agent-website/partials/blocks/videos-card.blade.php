{{--
    Video card facade — poster + play button; the real player (YouTube/Vimeo
    iframe or <video> for mp4) is swapped in on click by the block's JS.
    Expects $video = [url, title, thumb].
--}}
@php
    $vUrl = trim((string) ($video['url'] ?? ''));
    $vTitle = trim((string) ($video['title'] ?? ''));
    $vThumb = trim((string) ($video['thumb'] ?? ''));
    $vThumbUrl = $vThumb ? (\Illuminate\Support\Str::startsWith($vThumb, ['http://', 'https://']) ? $vThumb : Storage::url($vThumb)) : '';

    $embed = '';
    $mp4 = '';
    $poster = $vThumbUrl;
    if (preg_match('/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/', $vUrl, $m)) {
        $embed = 'https://www.youtube.com/embed/' . $m[1] . '?autoplay=1&rel=0&modestbranding=1';
        if ($poster === '') {
            $poster = 'https://img.youtube.com/vi/' . $m[1] . '/hqdefault.jpg';
        }
    } elseif (preg_match('/vimeo\.com\/(?:video\/)?(\d+)/', $vUrl, $m)) {
        $embed = 'https://player.vimeo.com/video/' . $m[1] . '?autoplay=1';
    } elseif ($vUrl !== '') {
        $mp4 = $vUrl; // assume a direct video file
    }
@endphp
@if($embed !== '' || $mp4 !== '')
<div class="vid-card">
    <div class="vid-thumb"
        role="button" tabindex="0"
        aria-label="Play video{{ $vTitle !== '' ? ': ' . $vTitle : '' }}"
        @if($embed !== '') data-embed="{{ $embed }}" @endif
        @if($mp4 !== '') data-mp4="{{ $mp4 }}" @endif
        @if($poster !== '') style="background-image: url('{{ $poster }}');" @endif>
        @if($poster === '')<span class="vid-thumb-empty">Video</span>@endif
        <span class="vid-play" aria-hidden="true">
            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </span>
    </div>
    @if($vTitle !== '')<p class="vid-caption">{{ $vTitle }}</p>@endif
</div>
@endif
