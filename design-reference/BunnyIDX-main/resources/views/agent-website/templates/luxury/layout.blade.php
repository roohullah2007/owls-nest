<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @php
        // Per-page SEO: controller-provided override (dynamic pages like
        // community/sub-area pages) → page override → site meta → smart
        // per-page default (every page gets a distinct, descriptive title).
        $resolvedMetaTitle = $metaTitle ?? $site->seoTitle($currentPage ?? null);
        $resolvedMetaDescription = $metaDescription ?? $site->seoDescription($currentPage ?? null);
    @endphp
    <title>{{ $resolvedMetaTitle }}</title>
    <meta name="description" content="{{ $resolvedMetaDescription }}">
    <link rel="canonical" href="{{ url()->current() }}">
    @if($site->favicon)
    <link rel="icon" href="{{ asset('storage/' . $site->favicon) }}">
    @endif
    @if($site->og_title || $resolvedMetaTitle)
    <meta property="og:title" content="{{ $site->og_title ?: $resolvedMetaTitle ?: $site->agent_name }}">
    @endif
    @if($site->og_description || $resolvedMetaDescription)
    <meta property="og:description" content="{{ $site->og_description ?: $resolvedMetaDescription }}">
    @endif
    @if($site->og_image)
    <meta property="og:image" content="{{ asset('storage/' . $site->og_image) }}">
    @endif
    <meta property="og:type" content="website">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,300..700&display=swap" rel="stylesheet">
    @php
        // Optional site-wide font override (website editor → Search Design →
        // Theme font). Whitelisted against config/fonts.php.
        $themeFont = data_get($site->page_data, '_config.design.font');
        $themeFont = in_array($themeFont, config('fonts.families', []), true) ? $themeFont : null;
    @endphp
    @if($themeFont)
    <link href="https://fonts.googleapis.com/css2?family={{ str_replace(' ', '+', $themeFont) }}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    @endif
    @include('agent-website.partials.tracking-scripts')
    @vite(['resources/css/agent-website/templates/luxury/main.css'])
    <style>
        :root {
            @if($site->accent_color)
            --accent: {{ $site->accent_color }};
            --accent-hover: {{ $site->accent_color }};
            @endif
            @if($themeFont)
            --font: '{{ $themeFont }}', sans-serif;
            --font-heading: '{{ $themeFont }}', sans-serif;
            @endif
        }
    </style>
    @php
        $weCfg = $site->page_data['_config'] ?? [];
        $weDisabledSections = $weCfg['disabled_sections'][$currentPage ?? ''] ?? [];
        $weSectionOrder = $weCfg['section_order'][$currentPage ?? ''] ?? [];
        $hCfg = $weCfg['header'] ?? [];
        $hBg = $hCfg['bg'] ?? null;
        $hFont = $hCfg['font_color'] ?? null;
        $hDd = ! empty($hCfg['dropdown_enabled']);
        $hDdBg = $hCfg['dropdown_bg'] ?? null;
        $hDdFont = $hCfg['dropdown_font_color'] ?? null;
        $hCta = ! empty($hCfg['cta_enabled']);
        $hBtnBg = $hCfg['btn_bg'] ?? null;
        $hBtnText = $hCfg['btn_text'] ?? null;
        $headerTransparent = ($site->header_style ?? 'solid') === 'transparent';
        $headerSticky = $site->header_sticky ?? true;
        $menuAlign = in_array(($hCfg['menu_align'] ?? 'right'), ['left','center','right']) ? ($hCfg['menu_align'] ?? 'right') : 'right';
        // Top bar auto-shows on solid headers whenever it has content — social,
        // auth or the translations language button.
        $translationsEnabled = \App\Services\Sites\SiteTranslations::enabledFor($site);
        $hasTopbar = (data_get($hCfg, 'social') || data_get($hCfg, 'auth') || $translationsEnabled) && ! $headerTransparent;
    @endphp
    @if(!empty($weDisabledSections))
    <style>
        @foreach($weDisabledSections as $weSec)
        section:has(.we-sec-marker[data-we-sec="{{ $weSec }}"]) { display: none !important; }
        @endforeach
    </style>
    @endif
    @if(!empty($weSectionOrder))
    <style>
        .site-main { display: flex; flex-direction: column; }
        .site-main > section:not(:has(.we-sec-marker)),
        .site-main > .we-block { order: 500; }
        @foreach($weSectionOrder as $weIdx => $weSec)
        .site-main > section:has(.we-sec-marker[data-we-sec="{{ $weSec }}"]) { order: {{ $weIdx }}; }
        @endforeach
    </style>
    @endif
    @if($hBg || $hFont || ($hDd && ($hDdBg || $hDdFont)) || $hBtnBg || $hBtnText)
    <style>
        @if($hBg)
        /* Custom header background — always on solid headers, on scroll for transparent. */
        body:not(.header-transparent) .site-nav { background: {{ $hBg }} !important; }
        .site-nav.scrolled { background: {{ $hBg }} !important; }
        @endif
        @if($hFont)
        .site-nav .nav-links a,
        .site-nav .nav-phone,
        .site-nav .nav-brand-text,
        .site-nav .nav-menu-btn { color: {{ $hFont }} !important; }
        .site-nav .nav-menu-btn { border-color: {{ $hFont }} !important; }
        .site-nav .nav-hamburger span { background: {{ $hFont }} !important; }
        @endif
        @if($hDd && $hDdBg)
        .nav-dropdown { background: {{ $hDdBg }} !important; }
        @endif
        @if($hDd && $hDdFont)
        .nav-dropdown a { color: {{ $hDdFont }} !important; }
        @endif
        @if($hBtnBg)
        .nav-cta-btn { background: {{ $hBtnBg }} !important; border-color: {{ $hBtnBg }} !important; }
        @endif
        @if($hBtnText)
        .nav-cta-btn { color: {{ $hBtnText }} !important; }
        @endif
    </style>
    @endif
    @stack('styles')
</head>
<body class="{{ $headerTransparent ? 'header-transparent ' : '' }}menu-align-{{ $menuAlign }}{{ $headerSticky ? '' : ' header-static' }}{{ $hasTopbar ? ' has-topbar' : '' }}">
    @php
        // Header feature config — read once; nav/topbar/mega-menu partials rely on
        // it. Navigation links themselves come from $site->navTree() (memoized).
        $headerConfig = $site->page_data['_config']['header'] ?? [];
    @endphp

    {{-- Header --}}
    @include("agent-website.partials.header.nav")
    @include("agent-website.partials.header.mega-menu")
    @include("agent-website.partials.header.mobile-menu")

    <main class="site-main">
        @yield('content')
    </main>

    {{-- Footer (shared partial — also rendered on the property search/detail pages) --}}
    @include('agent-website.partials.footer')

    {{-- Visitor Login/Register modal — opened by the topbar auth buttons. --}}
    @includeWhen((bool) data_get($headerConfig, 'auth'), 'agent-website.partials.visitor-auth-modal')

    {{-- "Choose your language" modal + Google Translate plumbing — opened by the topbar language button. --}}
    @includeWhen($translationsEnabled ?? false, 'agent-website.partials.translate-modal')

    {{-- Sticky Connect Button --}}
    <div class="connect-wrapper" id="connectWrapper">
        <div class="connect-popup" id="connectPopup">
            <div class="connect-popup-header">
                <h4>Let's Connect</h4>
                <p>How would you like to reach out?</p>
            </div>
            <div class="connect-menu" id="connectMenu">
                @if($site->agent_phone)
                <a href="tel:{{ $site->agent_phone }}" class="connect-menu-item">
                    <div class="icon">
                        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                    </div>
                    <div>
                        <div class="label">Call Now</div>
                        <div class="sublabel">{{ $site->agent_phone }}</div>
                    </div>
                </a>
                @endif
                @if($site->agent_email)
                <a href="mailto:{{ $site->agent_email }}" class="connect-menu-item">
                    <div class="icon">
                        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                    </div>
                    <div>
                        <div class="label">Send Email</div>
                        <div class="sublabel">{{ $site->agent_email }}</div>
                    </div>
                </a>
                @endif
                <button type="button" class="connect-menu-item" id="connectMsgBtn">
                    <div class="icon">
                        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
                    </div>
                    <div>
                        <div class="label">Send Message</div>
                        <div class="sublabel">Quick inquiry form</div>
                    </div>
                </button>
            </div>

            {{-- Message form panel --}}
            <div class="connect-form-panel" id="connectFormPanel">
                <div class="connect-form-header">
                    <button type="button" class="connect-form-back" id="connectFormBack">
                        <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    </button>
                    <h4>Send a Message</h4>
                </div>
                <div class="connect-form-body">
                    <form id="connectForm">
                        @csrf
                        <input type="hidden" name="site_id" value="{{ $site->id }}">
                        <div class="field">
                            <label>Name</label>
                            <input type="text" name="name" placeholder="Your full name" required>
                        </div>
                        <div class="field">
                            <label>Email</label>
                            <input type="email" name="email" placeholder="you@email.com" required>
                        </div>
                        <div class="field">
                            <label>Phone</label>
                            <input type="tel" name="phone" placeholder="(555) 000-0000">
                        </div>
                        <div class="field">
                            <label>Message</label>
                            <textarea name="message" placeholder="How can I help you?" required></textarea>
                        </div>
                        {{-- Site-wide consent disclosure (editable in the website editor). --}}
                        <label style="display:flex;align-items:flex-start;gap:8px;margin:2px 0 10px;cursor:pointer">
                            <input type="checkbox" name="sms_consent" value="1" required style="margin-top:3px;flex-shrink:0">
                            <span style="font-size:10px;line-height:1.5;color:#8B9096;max-height:84px;overflow-y:auto">{{ $site->consentText() }}</span>
                        </label>
                        <button type="submit" class="connect-form-submit">Send Message</button>
                    </form>
                    <div class="connect-form-success" id="connectSuccess">
                        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        <p>Message Sent!</p>
                        <span>We'll get back to you shortly.</span>
                    </div>
                </div>
            </div>
        </div>

        <button type="button" class="connect-btn" id="connectBtn">
            Let's Connect
            <svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
        </button>
    </div>

    <script>
        // Sticky nav scroll effect
        const nav = document.getElementById('siteNav');
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 60);
        });

        // "More" mega menu
        const megaMenu = document.getElementById('megaMenu');
        const megaMenuToggle = document.getElementById('megaMenuToggle');
        const megaMenuClose = document.getElementById('megaMenuClose');
        function openMega() { megaMenu?.classList.add('open'); document.body.style.overflow = 'hidden'; }
        function closeMega() { megaMenu?.classList.remove('open'); document.body.style.overflow = ''; }
        megaMenuToggle?.addEventListener('click', openMega);
        megaMenuClose?.addEventListener('click', closeMega);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMega(); });

        // Hero tabbed search
        document.querySelectorAll('.hero-search-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                const t = tab.getAttribute('data-tab');
                document.querySelectorAll('.hero-search-tab').forEach((x) => x.classList.toggle('active', x === tab));
                document.querySelectorAll('.hero-search-bar').forEach((p) => p.classList.toggle('active', p.getAttribute('data-panel') === t));
            });
        });

        // Mobile menu
        const hamburger = document.getElementById('navHamburger');
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuClose = document.getElementById('mobileMenuClose');
        hamburger?.addEventListener('click', () => {
            mobileMenu?.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
        mobileMenuClose?.addEventListener('click', () => {
            mobileMenu?.classList.remove('open');
            document.body.style.overflow = '';
        });
        // Expandable sub-menu (areas)
        document.querySelectorAll('.mobile-menu-expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const parent = btn.closest('.mobile-menu-expandable');
                parent?.classList.toggle('expanded');
            });
        });

        // Nav email button opens connect popup with form
        const navEmailBtn = document.getElementById('navEmailBtn');
        navEmailBtn?.addEventListener('click', () => {
            const popup = document.getElementById('connectPopup');
            const btn = document.getElementById('connectBtn');
            const formPanel = document.getElementById('connectFormPanel');
            popup.classList.add('visible');
            btn.classList.add('open');
            formPanel.classList.add('visible');
        });

        // Connect button popup
        const connectBtn = document.getElementById('connectBtn');
        const connectPopup = document.getElementById('connectPopup');
        const connectMsgBtn = document.getElementById('connectMsgBtn');
        const connectFormPanel = document.getElementById('connectFormPanel');
        const connectFormBack = document.getElementById('connectFormBack');
        const connectForm = document.getElementById('connectForm');
        const connectSuccess = document.getElementById('connectSuccess');

        connectBtn?.addEventListener('click', () => {
            const isOpen = connectPopup.classList.contains('visible');
            connectPopup.classList.toggle('visible', !isOpen);
            connectBtn.classList.toggle('open', !isOpen);
            // Reset form panel when closing
            if (isOpen) {
                connectFormPanel.classList.remove('visible');
            }
        });

        // Close popup when clicking outside
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('connectWrapper');
            if (!wrapper?.contains(e.target)) {
                connectPopup?.classList.remove('visible');
                connectBtn?.classList.remove('open');
                connectFormPanel?.classList.remove('visible');
            }
        });

        // Show message form
        connectMsgBtn?.addEventListener('click', () => {
            connectFormPanel.classList.add('visible');
        });

        // Back button
        connectFormBack?.addEventListener('click', () => {
            connectFormPanel.classList.remove('visible');
        });

        // Form submit
        connectForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(connectForm);
            try {
                await fetch('{{ route("agent-site.contact.submit", $site->slug) }}', {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                connectForm.style.display = 'none';
                connectSuccess.classList.add('visible');
                setTimeout(() => {
                    connectPopup.classList.remove('visible');
                    connectBtn.classList.remove('open');
                    connectFormPanel.classList.remove('visible');
                    // Reset
                    setTimeout(() => {
                        connectForm.style.display = '';
                        connectForm.reset();
                        connectSuccess.classList.remove('visible');
                    }, 300);
                }, 2500);
            } catch (err) {
                // Silent fail - form still works
            }
        });
    </script>
    @if($site->tracking_body)
    {!! $site->tracking_body !!}
    @endif
    @stack('scripts')
</body>
</html>
