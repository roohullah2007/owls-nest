{{--
    Dedicated property-search header — INTENTIONALLY separate from the marketing
    site nav. The search page is an app-like, full-height experience, so it ships
    its own slim bar (dark by default, light optional) instead of the theme's
    header/mega-menu. Links still come from $site->navTree() so it stays in sync
    with the rest of the site. Relies on $site, $currentPage and $psHeaderTheme.
--}}
@php
    $dark = ($psHeaderTheme ?? 'dark') !== 'light';
    $logoLight = $site->site_logo_light ? asset('storage/'.$site->site_logo_light) : null;
    $logoDark = $site->site_logo_dark ? asset('storage/'.$site->site_logo_dark) : null;
    // On a dark bar prefer the light logo; on a light bar prefer the dark logo.
    $logo = $dark ? ($logoLight ?: $logoDark) : ($logoDark ?: $logoLight);
    $homeUrl = route('agent-site.home', $site->slug);
    $navItems = collect($site->navTree())->filter(fn ($i) => $i['show_in_nav'])->values();
    // Visitor account (per-site session) — drives Login/Register vs My Account.
    $psVisitor = app(\App\Services\Sites\VisitorAuth::class)->current($site);
@endphp
<header class="ps-header {{ $dark ? 'ps-header--dark' : 'ps-header--light' }}">
    <div class="ps-header-inner">
        <a href="{{ $homeUrl }}" class="ps-header-brand" aria-label="{{ $site->agent_name }} — home">
            @if($logo)
                <img src="{{ $logo }}" alt="{{ $site->agent_name }}">
            @else
                <span>{{ $site->agent_name }}</span>
            @endif
        </a>

        <nav class="ps-header-nav" aria-label="Primary">
            @foreach($navItems as $item)
                @if(! empty($item['children']))
                {{-- Hover/focus dropdown (pure CSS — works on every search page) --}}
                <div class="ps-header-dd">
                    <a href="{{ $item['href'] }}" class="ps-header-link {{ $item['key'] === ($currentPage ?? '') ? 'is-active' : '' }}" aria-haspopup="true">
                        {{ $item['label'] }}
                        <svg class="ps-header-dd-chev" viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </a>
                    <div class="ps-header-dd-menu">
                        @foreach($item['children'] as $child)
                            <a href="{{ $child['href'] }}">{{ $child['label'] }}</a>
                        @endforeach
                    </div>
                </div>
                @else
                <a href="{{ $item['href'] }}" class="ps-header-link {{ $item['key'] === ($currentPage ?? '') ? 'is-active' : '' }}">{{ $item['label'] }}</a>
                @endif
            @endforeach

            {{-- Priority-nav overflow: starts empty + hidden. The script below
                 moves trailing items in here as the bar narrows (and pulls them
                 back out when there's room) so the nav never overlaps the
                 actions before the burger breakpoint. --}}
            <div class="ps-header-dd ps-header-more" id="psHeaderMore" hidden>
                <button type="button" class="ps-header-link" aria-haspopup="true">
                    More
                    <svg class="ps-header-dd-chev" viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <div class="ps-header-dd-menu ps-header-more-menu"></div>
            </div>
        </nav>

        <div class="ps-header-actions">
            @php $psLang = \App\Services\Sites\SiteTranslations::enabledFor($site); @endphp
            @if($psLang)
            @php
                $psLangCurrent = \App\Services\Sites\SiteTranslations::currentFor($site);
                $psLangFlag = $psLangCurrent === 'en' ? 'us' : (\App\Services\Sites\SiteTranslations::CATALOG[$psLangCurrent]['flag'] ?? 'us');
            @endphp
            <button type="button" class="lt-headbtn" data-lt-open aria-label="Choose your language">
                <span class="lt-flag lt-flag-sm"><img src="https://flagcdn.com/w40/{{ $psLangFlag }}.png" alt=""></span>
                {{ strtoupper(explode('-', $psLangCurrent)[0]) }}
            </button>
            @endif
            @if($site->agent_phone)
                <a href="tel:{{ preg_replace('/[^0-9+]/', '', $site->agent_phone) }}" class="ps-header-phone">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>{{ $site->agent_phone }}</span>
                </a>
            @endif
            @if($psVisitor)
                <a href="{{ route('agent-site.visitor.account', $site->slug) }}" class="ps-header-link">My Account</a>
                <form method="POST" action="{{ route('agent-site.visitor.logout', $site->slug) }}" style="display:contents">
                    @csrf
                    <button type="submit" class="ps-header-cta">Logout</button>
                </form>
            @else
                <button type="button" class="ps-header-link" data-ps-auth="login">Login</button>
                <button type="button" class="ps-header-cta" data-ps-auth="register">Register</button>
            @endif
            <button type="button" class="ps-header-burger" id="psHeaderBurger" aria-label="Open menu" aria-expanded="false">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
        </div>
    </div>

    {{-- Mobile dropdown --}}
    <div class="ps-header-mobile" id="psHeaderMobile">
        @foreach($navItems as $item)
            <a href="{{ $item['href'] }}" class="{{ $item['key'] === ($currentPage ?? '') ? 'is-active' : '' }}">{{ $item['label'] }}</a>
            @foreach($item['children'] ?? [] as $child)
                <a href="{{ $child['href'] }}" class="ps-header-mobile-sub">{{ $child['label'] }}</a>
            @endforeach
        @endforeach
        @if($site->agent_phone)
            <a href="tel:{{ preg_replace('/[^0-9+]/', '', $site->agent_phone) }}">{{ $site->agent_phone }}</a>
        @endif
        @if($psVisitor)
            <a href="{{ route('agent-site.visitor.account', $site->slug) }}">My Account</a>
            <form method="POST" action="{{ route('agent-site.visitor.logout', $site->slug) }}">
                @csrf
                <button type="submit" class="ps-header-mobile-cta" style="width:100%">Logout</button>
            </form>
        @else
            <button type="button" data-ps-auth="login">Login</button>
            <button type="button" class="ps-header-mobile-cta" data-ps-auth="register">Register</button>
        @endif
    </div>
</header>

{{-- Login / Register modal — shared partial (also used by the theme topbar). --}}
@include('agent-website.partials.visitor-auth-modal')
@once
<script>
    (function () {
        var burger = document.getElementById('psHeaderBurger');
        var menu = document.getElementById('psHeaderMobile');
        if (burger && menu) {
            burger.addEventListener('click', function () {
                var open = menu.classList.toggle('is-open');
                burger.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }

        // Priority navigation — as the bar narrows, move trailing nav items into
        // a "More" dropdown (and pull them back out when space frees up) so the
        // links never overlap the right-side actions before the burger kicks in.
        var nav = document.querySelector('.ps-header-nav');
        var more = document.getElementById('psHeaderMore');
        if (nav && more) {
            var moreMenu = more.querySelector('.ps-header-dd-menu');
            var fits = function () { return nav.scrollWidth <= nav.clientWidth + 1; };
            var reflow = function () {
                // Restore every overflowed item to the bar (original order), then
                // re-measure from a clean slate so widening pulls items back.
                while (moreMenu.firstChild) { nav.insertBefore(moreMenu.firstChild, more); }
                more.hidden = true;
                if (fits()) { return; }
                more.hidden = false;
                var guard = 0;
                while (!fits() && guard++ < 100) {
                    var item = more.previousElementSibling; // last item before "More"
                    if (!item) { break; }
                    moreMenu.insertBefore(item, moreMenu.firstChild); // prepend keeps order
                }
            };
            var raf;
            var schedule = function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(reflow); };
            window.addEventListener('resize', schedule);
            window.addEventListener('load', schedule); // fonts/logo can shift widths post-load
            reflow();
        }
    })();
</script>
@endonce
