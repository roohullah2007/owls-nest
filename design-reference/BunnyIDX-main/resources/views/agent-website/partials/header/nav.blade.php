{{--
    Header navigation bar (luxury). The foundation header for all templates.
    Links come from $site->navTree() — the single source shared with the mega
    menu, mobile menu and footer. Any item can carry a dropdown (manual links,
    auto-listed areas, or nested custom pages); long dropdowns fan into columns.
    Relies on $site and $headerConfig from the layout scope.
--}}
<nav class="site-nav" id="siteNav">
    @include('agent-website.partials.header.topbar')

    <div class="nav-inner">
        {{-- Brand / logo --}}
        @include('agent-website.partials.header.brand')

        {{-- Primary menu — priority nav: only the first items render inline;
             everything past the cap collapses into a trailing "More" dropdown
             so a growing nav (Condos, New Developments, custom pages…) never
             overflows the bar. Owners control what stays inline by reordering
             in the Menus editor. The mega/mobile menus + footer keep the full
             list. --}}
        @php
            $navItems = collect($site->navTree())->filter(fn ($i) => $i['show_in_nav'])->values();
            $navPrimaryCap = 8;
            $navPrimary = $navItems->take($navPrimaryCap);
            $navOverflow = $navItems->slice($navPrimaryCap)->values();
        @endphp
        <ul class="nav-links">
            @foreach($navPrimary as $item)
                @php
                    $kids = $item['children'];
                    // Long dropdowns fan into 2–3 columns so they stay on-screen.
                    $cols = count($kids) > 16 ? 3 : (count($kids) > 7 ? 2 : 1);
                @endphp
                @if(count($kids))
                    <li class="nav-dropdown-parent">
                        <a href="{{ $item['href'] }}" class="@yield('nav-' . $item['key'])">
                            {{ $item['label'] }}
                            <svg class="nav-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                        </a>
                        <ul class="nav-dropdown nav-dropdown-cols-{{ $cols }}{{ $cols > 1 ? ' nav-dropdown-mega' : '' }}">
                            @foreach($kids as $kid)
                            <li><a href="{{ $kid['href'] }}">{{ $kid['label'] }}</a></li>
                            @endforeach
                            @if($item['view_all'])
                            <li class="nav-dropdown-more"><a href="{{ $item['view_all'] }}">View All &rarr;</a></li>
                            @endif
                        </ul>
                    </li>
                @else
                    <li><a href="{{ $item['href'] }}" class="@yield('nav-' . $item['key'])">{{ $item['label'] }}</a></li>
                @endif
            @endforeach

            @if($navOverflow->isNotEmpty())
            <li class="nav-dropdown-parent">
                <a href="#" onclick="return false;" aria-haspopup="true">
                    More
                    <svg class="nav-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </a>
                <ul class="nav-dropdown nav-dropdown--right nav-dropdown-cols-1">
                    @foreach($navOverflow as $item)
                    <li><a href="{{ $item['href'] }}">{{ $item['label'] }}</a></li>
                    @endforeach
                </ul>
            </li>
            @endif
        </ul>

        {{-- Right-side actions --}}
        <div class="nav-actions">
            {{-- CTA button --}}
            @if(data_get($headerConfig, 'cta_enabled') && data_get($headerConfig, 'cta_text'))
            <a href="{{ data_get($headerConfig, 'cta_link') ?: '#' }}" class="nav-cta-btn">{{ data_get($headerConfig, 'cta_text') }}</a>
            @endif

            {{-- "More" mega-menu trigger (desktop) --}}
            @if(data_get($headerConfig, 'menu_modal', true))
            <button type="button" class="nav-menu-btn" id="megaMenuToggle" aria-label="Open menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            @endif

            {{-- Hamburger (mobile) — opens the mobile slide-over menu --}}
            <button type="button" class="nav-hamburger" id="navHamburger" aria-label="Open navigation">
                <span></span><span></span><span></span>
            </button>
        </div>
    </div>
</nav>
