@extends('agent-website.templates.luxury.layout')

@section('nav-home', 'active')


@section('content')
{{-- ── Hero ── --}}
@php
    // Default hero backdrop (used when the owner hasn't set an image/video/slideshow):
    // a rotating set of downloaded property photos — see public/images/backgrounds.
    $heroDefaultImages = [
        asset('images/backgrounds/bg-1.jpg'),
        asset('images/backgrounds/bg-5.jpg'),
        asset('images/backgrounds/bg-2.jpg'),
        asset('images/backgrounds/bg-3.jpg'),
    ];
    $explicitBgType = $site->page_data['home']['hero_bg_type'] ?? null;
    $userVideoUrl = $site->page_data['home']['hero_video_url'] ?? null;
    // Resolve the background: an explicit editor choice wins; then an uploaded
    // image; then a configured video; otherwise fall back to the default photos.
    if ($explicitBgType) {
        $heroBgType = $explicitBgType;
    } elseif ($site->hero_image) {
        $heroBgType = 'image';
    } elseif ($userVideoUrl) {
        $heroBgType = 'video';
    } else {
        $heroBgType = 'default-images';
    }
    $heroVideoUrl = $userVideoUrl ?? 'https://videos.pexels.com/video-files/7578554/7578554-uhd_2560_1440_25fps.mp4';
    $heroSlides = array_filter([
        $site->page_data['home']['hero_slide_1'] ?? null,
        $site->page_data['home']['hero_slide_2'] ?? null,
        $site->page_data['home']['hero_slide_3'] ?? null,
    ]);
    // Detect YouTube URL
    $heroYouTubeId = null;
    if (preg_match('/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/', $heroVideoUrl, $ytMatch)) {
        $heroYouTubeId = $ytMatch[1];
    }
    // Hero settings
    $hd = $site->page_data['home'] ?? [];
    $heroLayout = ($hd['hero_layout'] ?? 'single') === 'two-column' ? 'two-column' : 'single';
    $heroHeight = ($hd['hero_height'] ?? 'full') === 'compact' ? 'compact' : 'full';
    $heroAlign = $hd['hero_align'] ?? 'center';
    $heroAlign = in_array($heroAlign, ['left','center','right'], true) ? $heroAlign : 'center';
    // Overlay darkness over the background image (legibility). Default medium.
    $heroOverlay = $hd['hero_overlay'] ?? 'medium';
    $heroOverlay = in_array($heroOverlay, ['none','light','medium','dark'], true) ? $heroOverlay : 'medium';
    // Heading is the only required field. Eyebrow & paragraph are optional — no default text, hidden when empty.
    // Once the field exists in page_data (set OR cleared) we respect it; the site column is only a first-time fallback.
    $heroEyebrow = $hd['hero_eyebrow'] ?? '';
    $heroHeadline = $hd['hero_headline'] ?? ($site->hero_headline ?: 'Buy &amp; Sell with<br>' . e($site->agent_name));
    $heroSubtitle = array_key_exists('hero_subtitle', $hd) ? (string) $hd['hero_subtitle'] : ($site->hero_subtitle ?: '');
    $heroSearch = ! empty($hd['hero_search']);
    // Tabbed CTAs — each tab can be disabled/renamed (default: all enabled, default labels)
    $heroTabs = [];
    foreach ([['buy','Buy'],['rent','Rent'],['sell','Sell'],['value','Home Value']] as [$tk, $tdef]) {
        $enabled = array_key_exists("hero_tab_$tk", $hd) ? ! empty($hd["hero_tab_$tk"]) : true;
        if (! $enabled) continue;
        $heroTabs[] = [
            'key' => $tk,
            'label' => (($hd["hero_tab_{$tk}_label"] ?? '') ?: $tdef),
            // Per-tab search settings (gear sub-modal in the editor).
            'ai' => ! empty($hd["hero_tab_{$tk}_ai"]),
            'ptype' => $hd["hero_tab_{$tk}_ptype"] ?? '',
            'subtypes' => array_values(array_filter((array) json_decode($hd["hero_tab_{$tk}_subtypes"] ?? '[]', true))),
            'status' => $hd["hero_tab_{$tk}_status"] ?? '',
            'loc' => $hd["hero_tab_{$tk}_loc"] ?? '',
            'min_price' => $hd["hero_tab_{$tk}_min_price"] ?? '',
            'max_price' => $hd["hero_tab_{$tk}_max_price"] ?? '',
        ];
    }
    // Tab alignment: explicit, or "auto" = follow the hero (two-column → left, otherwise the hero alignment)
    $tabAlign = $hd['hero_tab_align'] ?? 'auto';
    if (! in_array($tabAlign, ['left','center','right'], true)) {
        $tabAlign = $heroLayout === 'two-column' ? 'left' : $heroAlign;
    }
    // CTA buttons (default Buy + Sell when nothing configured)
    $heroHasCta = isset($hd['hero_cta_search']) || isset($hd['hero_cta_buy']) || isset($hd['hero_cta_sell']);
    $ctaSearch = ! empty($hd['hero_cta_search']);
    $ctaBuy = $heroHasCta ? ! empty($hd['hero_cta_buy']) : true;
    $ctaSell = $heroHasCta ? ! empty($hd['hero_cta_sell']) : true;
    $ctaSearchLabel = ($hd['hero_cta_search_label'] ?? '') ?: 'Search';
    $ctaBuyLabel = ($hd['hero_cta_buy_label'] ?? '') ?: 'I Want to Buy';
    $ctaSellLabel = ($hd['hero_cta_sell_label'] ?? '') ?: 'I Want to Sell';
    $heroRightType = $hd['hero_right_type'] ?? 'form';
    $heroFormType = $hd['hero_form_type'] ?? 'contact';
    if (! in_array($heroFormType, ['buyer','seller','contact'], true)) {
        $heroFormType = 'contact';
    }
    $heroFormDefaults = [
        'buyer' => ['heading' => 'Find Your Dream Home', 'text' => "Tell us what you're looking for and we'll send matching listings.", 'submit' => 'Start My Search'],
        'seller' => ['heading' => "What's Your Home Worth?", 'text' => 'Get a free, no-obligation valuation of your property.', 'submit' => 'Get My Valuation'],
        'contact' => ['heading' => 'Get In Touch', 'text' => "Have a question? Send a message and we'll get right back to you.", 'submit' => 'Send Message'],
    ];
    $heroFormHeading = $hd['hero_form_heading'] ?? $heroFormDefaults[$heroFormType]['heading'];
    $heroFormText = $hd['hero_form_text'] ?? $heroFormDefaults[$heroFormType]['text'];
    $heroFormSubmit = $heroFormDefaults[$heroFormType]['submit'];
@endphp
@include('agent-website.partials.hero.section')

@include('agent-website.partials.blocks-renderer', ['currentPage' => 'home', 'slot' => 'after-hero'])

{{-- The legacy static About Preview section was removed — agents use a Content
     block in this slot for the same (and more flexible) layout. --}}
@include('agent-website.partials.blocks-renderer', ['currentPage' => 'home', 'slot' => 'after-about'])

{{-- The old Buy & Sell cards section was replaced by the insertable Services
     block — agents add a "Services" block in this slot from the editor. --}}
@include('agent-website.partials.blocks-renderer', ['currentPage' => 'home', 'slot' => 'after-buysell'])

{{-- The legacy static Testimonials section was removed — agents use the
     Testimonials block (spotlight / slider / grid variants) in this slot. --}}
@include('agent-website.partials.blocks-renderer', ['currentPage' => 'home', 'slot' => 'after-testimonials'])

{{-- The old hardcoded "Areas We Serve" section was removed — the insertable
     Communities block covers it (dark/light themes + curated selection). --}}

{{-- Blog content is now provided by the insertable "Latest Blog Posts" block. --}}

{{-- The legacy static Call to Action section was removed — agents use the CTA
     block (background image, headline, button) in this slot. --}}
@include('agent-website.partials.blocks-renderer', ['currentPage' => 'home', 'slot' => 'after-cta'])

<script>
    // Hero zoom animation
    window.addEventListener('load', () => {
        document.getElementById('hero')?.classList.add('loaded');
    });

    // Testimonials slider
    (function() {
        const slider = document.getElementById('testimonialsSlider');
        if (!slider) return;
        const track = slider.querySelector('.testimonials-slider-track');
        const slides = slider.querySelectorAll('.testimonial-slide');
        const dotsContainer = document.getElementById('testimonialsDots');
        const prevBtn = slider.querySelector('.testimonials-slider-prev');
        const nextBtn = slider.querySelector('.testimonials-slider-next');
        if (!track || slides.length === 0) return;

        let currentPage = 0;
        const perPage = window.innerWidth < 769 ? 1 : 3;
        const totalPages = Math.ceil(slides.length / perPage);

        // Create dots
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'testimonials-slider-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to page ' + (i + 1));
            dot.addEventListener('click', () => goTo(i));
            dotsContainer.appendChild(dot);
        }

        function goTo(page) {
            currentPage = Math.max(0, Math.min(page, totalPages - 1));
            const offset = currentPage * (100 / totalPages);
            track.style.transform = 'translateX(-' + offset + '%)';
            const dots = dotsContainer.querySelectorAll('.testimonials-slider-dot');
            dots.forEach((d, i) => d.classList.toggle('active', i === currentPage));
        }

        // Set track width based on total slides and per-page count
        track.style.width = (slides.length / perPage * 100) + '%';
        slides.forEach(s => s.style.width = (100 / slides.length) + '%');

        prevBtn.addEventListener('click', () => goTo(currentPage - 1));
        nextBtn.addEventListener('click', () => goTo(currentPage + 1));

        // Auto-advance every 6 seconds
        let autoTimer = setInterval(() => goTo((currentPage + 1) % totalPages), 6000);
        slider.addEventListener('mouseenter', () => clearInterval(autoTimer));
        slider.addEventListener('mouseleave', () => {
            autoTimer = setInterval(() => goTo((currentPage + 1) % totalPages), 6000);
        });
    })();

    // Hero slideshow cycling
    (function() {
        const slideshow = document.getElementById('heroSlideshow');
        if (!slideshow) return;
        const slides = slideshow.querySelectorAll('.hero-slide');
        if (slides.length < 2) return;
        let current = 0;
        setInterval(() => {
            slides[current].classList.remove('active');
            current = (current + 1) % slides.length;
            slides[current].classList.add('active');
        }, 5000);
    })();
</script>
@endsection
