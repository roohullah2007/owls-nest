{{--
    Page Header block — a reusable page hero. Full-bleed background IMAGE or VIDEO
    (mp4 / YouTube auto-detected, mirroring the home hero) with an adjustable dark
    overlay. The heading shows either in a centered bottom card ("boxed", like the
    Compass-style reference) or as plain centered text. Optional eyebrow, subtitle,
    and a scroll-down button. All settings live in $block['data'].
--}}
@php
    $d = $block['data'] ?? [];
    $phBgType  = ($d['bg_type'] ?? 'image') === 'video' ? 'video' : 'image';
    $phImage   = trim((string) ($d['image'] ?? ''));
    $phVideo   = trim((string) ($d['video_url'] ?? ''));
    $phOverlay = in_array(($d['overlay'] ?? 'medium'), ['none', 'light', 'medium', 'dark'], true) ? ($d['overlay'] ?? 'medium') : 'medium';
    $phHeight  = in_array(($d['height'] ?? 'tall'), ['full', 'tall', 'compact'], true) ? ($d['height'] ?? 'tall') : 'tall';
    $phStyle   = in_array(($d['style'] ?? 'boxed'), ['plain', 'light'], true) ? $d['style'] : 'boxed';
    $phHeading = trim((string) ($d['heading'] ?? ''));
    $phSub     = trim((string) ($d['subtitle'] ?? ''));
    $phScroll  = ! empty($d['show_scroll']);

    $phImageUrl = $phImage
        ? (\Illuminate\Support\Str::startsWith($phImage, ['http://', 'https://']) ? $phImage : Storage::url($phImage))
        : '';

    // Optional brand/project logo shown above the heading (e.g. a New
    // Development's project logo).
    $phLogo = trim((string) ($d['logo'] ?? ''));
    $phLogoUrl = $phLogo
        ? (\Illuminate\Support\Str::startsWith($phLogo, ['http://', 'https://']) ? $phLogo : Storage::url($phLogo))
        : '';

    // YouTube id detection mirrors the home hero (partials/hero/background.blade.php).
    $phYouTube = null;
    if ($phBgType === 'video' && $phVideo && preg_match('/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/', $phVideo, $m)) {
        $phYouTube = $m[1];
    }
    $phId = 'pgh-' . ($block['id'] ?? uniqid());

    // Optional breadcrumb trail rendered inside the hero (pages pass it in;
    // not an editor-managed setting). Items: {label, url?} — last is current.
    $phCrumbs = is_array($block['crumbs'] ?? null) ? $block['crumbs'] : [];
@endphp
@if($phStyle === 'light')
{{-- Light variant — the blog-page hero: white background, serif dark title.
     No background image/video/overlay; pairs with white pages. --}}
<section class="pgh-light" id="{{ $phId }}">
    <div class="blog-head" style="margin-bottom:0;">
        @if($phCrumbs)
            @include('agent-website.partials.blocks.page-header-crumbs', ['crumbs' => $phCrumbs])
        @endif
        @if($phLogoUrl)<img class="pgh-logo pgh-logo-light" src="{{ $phLogoUrl }}" alt="{{ $phHeading }} logo">@endif
        @if($phHeading)<h1 class="blog-title">{!! nl2br(e($phHeading)) !!}</h1>@endif
        @if($phSub)<p class="blog-head-sub">{{ $phSub }}</p>@endif
    </div>
</section>
<span id="{{ $phId }}-after" aria-hidden="true"></span>
@else
<section class="pgh pgh-h-{{ $phHeight }} pgh-scrim-{{ $phOverlay }} pgh-style-{{ $phStyle }}" id="{{ $phId }}">
    {{-- Background: image · YouTube · mp4 video --}}
    @if($phBgType === 'video' && $phYouTube)
        <div class="pgh-youtube">
            <iframe src="https://www.youtube.com/embed/{{ $phYouTube }}?autoplay=1&mute=1&controls=0&loop=1&playlist={{ $phYouTube }}&showinfo=0&rel=0&modestbranding=1&playsinline=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>
    @elseif($phBgType === 'video' && $phVideo)
        <video class="pgh-video" autoplay muted loop playsinline @if($phImageUrl) poster="{{ $phImageUrl }}" @endif>
            <source src="{{ $phVideo }}" type="video/mp4">
        </video>
    @elseif($phImageUrl)
        <div class="pgh-bg" style="background-image: url('{{ $phImageUrl }}');"></div>
    @endif

    <div class="pgh-overlay"></div>

    <div class="pgh-inner">
        <div class="pgh-content">
            @if($phCrumbs)
                @include('agent-website.partials.blocks.page-header-crumbs', ['crumbs' => $phCrumbs])
            @endif
            @if($phLogoUrl)<img class="pgh-logo" src="{{ $phLogoUrl }}" alt="{{ $phHeading }} logo">@endif
            @if($phHeading)<h1 class="pgh-title">{!! nl2br(e($phHeading)) !!}</h1>@endif
            @if($phSub)<p class="pgh-sub">{{ $phSub }}</p>@endif
            @if($phScroll)
            <a class="pgh-scroll" href="#{{ $phId }}-after" aria-label="Scroll down">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7"/></svg>
            </a>
            @endif
        </div>
    </div>
</section>
<span id="{{ $phId }}-after" aria-hidden="true"></span>
@endif
