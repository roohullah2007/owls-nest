{{--
    Full-screen "More" mega menu (luxury) — a 70% right-side slide-over. Renders
    only when the "More" Menu feature is enabled. Numbered nav items (from the
    shared navTree) + a Contact / Office / Follow-Us footer, all from site data.
--}}
@if(data_get($headerConfig, 'menu_modal', true))
<div class="mega-menu" id="megaMenu" aria-hidden="true">
    <div class="mega-menu-panel">
        <div class="mega-menu-bar">
            <button type="button" class="mega-menu-close" id="megaMenuClose" aria-label="Close menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <div class="mega-menu-inner">
            <div class="mega-menu-grid">
                @php $mmIndex = 0; @endphp
                @foreach($site->navTree() as $item)
                    @if(! $item['show_in_nav'])
                        @continue
                    @endif
                    @php $mmIndex++; @endphp
                    <div class="mega-menu-item">
                        <a href="{{ $item['href'] }}" class="mega-menu-link">
                            <span class="mega-menu-num">{{ sprintf('%02d', $mmIndex) }}</span>
                            <span class="mega-menu-label">{{ $item['label'] }}</span>
                        </a>
                        @if(count($item['children']))
                        <ul class="mega-menu-sublist">
                            @foreach($item['children'] as $kid)
                            <li><a href="{{ $kid['href'] }}">{{ $kid['label'] }}</a></li>
                            @endforeach
                            @if($item['view_all'])
                            <li><a href="{{ $item['view_all'] }}">View All &rarr;</a></li>
                            @endif
                        </ul>
                        @endif
                    </div>
                @endforeach
            </div>

            <div class="mega-menu-divider"></div>

            <div class="mega-menu-foot">
                <div>
                    <p class="mega-menu-foot-title">Contact</p>
                    <p class="mega-menu-foot-line">{{ $site->agent_name }}</p>
                    @if($site->agent_phone)<a href="tel:{{ $site->agent_phone }}" class="mega-menu-foot-line underline">{{ $site->agent_phone }}</a>@endif
                    @if($site->agent_email)<a href="mailto:{{ $site->agent_email }}" class="mega-menu-foot-line underline">{{ $site->agent_email }}</a>@endif
                </div>
                @if($site->office_address || $site->agent_city)
                <div>
                    <p class="mega-menu-foot-title">Office</p>
                    @if($site->office_address)<p class="mega-menu-foot-line">{{ $site->office_address }}</p>@endif
                    @if($site->agent_city)<p class="mega-menu-foot-line">{{ $site->agent_city }}{{ $site->agent_state ? ', ' . $site->agent_state : '' }}</p>@endif
                </div>
                @endif
                @php $mmSocial = $site->socialAccounts(); @endphp
                @if(count($mmSocial))
                <div>
                    <p class="mega-menu-foot-title">Follow Us</p>
                    @include('agent-website.partials.social-icons', ['items' => $mmSocial, 'class' => 'mega-menu-social'])
                </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endif
