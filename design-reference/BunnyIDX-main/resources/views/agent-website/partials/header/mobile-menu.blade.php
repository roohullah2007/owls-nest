{{--
    Mobile slide-over menu (luxury). Opened by the header hamburger (#navHamburger).
    Same navTree() source as the desktop nav — items with children become
    expandable sub-lists. Relies on $site from the layout scope.
--}}
<div class="mobile-menu" id="mobileMenu">
    <div class="mobile-menu-header">
        @include('agent-website.partials.header.brand', ['brokerage' => false])
        <button type="button" class="mobile-menu-close" id="mobileMenuClose" aria-label="Close menu">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
        </button>
    </div>
    <ul class="mobile-menu-links">
        @foreach($site->navTree() as $item)
            @if(! $item['show_in_nav'])
                @continue
            @endif
            @if(count($item['children']))
                <li class="mobile-menu-expandable">
                    <a href="{{ $item['href'] }}" class="@yield('nav-' . $item['key'])">{{ $item['label'] }}</a>
                    <button type="button" class="mobile-menu-expand-btn" aria-label="Expand">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
                    </button>
                    <ul class="mobile-menu-sub">
                        @foreach($item['children'] as $kid)
                        <li><a href="{{ $kid['href'] }}">{{ $kid['label'] }}</a></li>
                        @endforeach
                        @if($item['view_all'])
                        <li><a href="{{ $item['view_all'] }}">View All &rarr;</a></li>
                        @endif
                    </ul>
                </li>
            @else
                <li><a href="{{ $item['href'] }}" class="@yield('nav-' . $item['key'])">{{ $item['label'] }}</a></li>
            @endif
        @endforeach
    </ul>
    <div class="mobile-menu-footer">
        @if($site->agent_phone)
        <a href="tel:{{ $site->agent_phone }}" class="mobile-menu-contact">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>
            {{ $site->agent_phone }}
        </a>
        @endif
        @if($site->agent_email)
        <a href="mailto:{{ $site->agent_email }}" class="mobile-menu-contact">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>
            {{ $site->agent_email }}
        </a>
        @endif
    </div>
</div>
