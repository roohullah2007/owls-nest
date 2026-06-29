{{--
    Hero section (luxury) — the composed hero: background, headline/eyebrow/
    subtitle, then either the tabbed search, CTA buttons, or (two-column) a
    lead form / listings column. All $hero* vars come from the home page's
    hero config block, which stays page-side so it can read page_data.
--}}
<section class="hero we-editable-section hero-layout-{{ $heroLayout }} hero-align-{{ $heroAlign }} hero-height-{{ $heroHeight }} hero-scrim-{{ $heroOverlay }}" id="hero">
    @include('agent-website.partials.section-edit-btn', ['section' => 'hero', 'label' => 'Edit Hero'])
    @include('agent-website.partials.hero.background')
    <div class="hero-overlay"></div>
    <div class="hero-inner">
        <div class="hero-content">
            @if($heroEyebrow)<div class="hero-label">{{ $heroEyebrow }}</div>@endif
            <h1 class="hero-title">{!! $heroHeadline !!}</h1>
            @if($heroSubtitle)<p class="hero-subtitle">{{ $heroSubtitle }}</p>@endif
            @if($heroSearch && count($heroTabs))
                @include('agent-website.partials.hero.search')
            @elseif($ctaSearch || $ctaBuy || $ctaSell)
            <div class="hero-buttons">
                @if($ctaSearch)<a href="{{ route('agent-site.buy', $site->slug) }}" class="btn btn-white">{{ $ctaSearchLabel }}</a>@endif
                @if($ctaBuy)<a href="{{ route('agent-site.buy', $site->slug) }}" class="btn btn-white">{{ $ctaBuyLabel }}</a>@endif
                @if($ctaSell)<a href="{{ route('agent-site.sell', $site->slug) }}" class="btn btn-white-outline">{{ $ctaSellLabel }}</a>@endif
            </div>
            @endif
        </div>

        @if($heroLayout === 'two-column')
            @include('agent-website.partials.hero.form')
        @endif
    </div>
    <div class="hero-scroll"><span></span></div>
</section>
