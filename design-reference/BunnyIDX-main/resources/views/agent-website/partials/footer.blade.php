{{--
    Shared site footer — brand logo + social, contact/office, nav, disclaimer,
    logos row and the legal bottom row. Extracted from the luxury layout so the
    SAME footer renders on template pages and the theme-agnostic property
    search/detail pages. Styled by templates/luxury/organisms/_footer.css
    (white, self-contained — no dark theme tokens), which both the template
    bundle and the search bundle include. Relies on $site.
--}}
@php
    $appName = config('app.name', 'BunnyIDX');
    $fcfg = $site->page_data['_config']['footer'] ?? [];
    $resolveAsset = static fn ($v) => ($v = trim((string) $v)) === ''
        ? ''
        : (\Illuminate\Support\Str::startsWith($v, ['http://', 'https://']) ? $v : \Illuminate\Support\Facades\Storage::url($v));

    // Footer brand logo: explicit footer logo → brokerage logo → text fallback.
    $footerLogoUrl = $resolveAsset($fcfg['logo'] ?? '') ?: $resolveAsset($site->brokerage_logo_dark ?? '');
    // Extra logos row.
    $footerBrokerageLogoUrl = $resolveAsset($fcfg['brokerage_logo'] ?? '');
    $footerMlsLogoUrl = $resolveAsset($fcfg['mls_logo'] ?? '');
    $footerShowEho = ($fcfg['show_eho'] ?? true) ? true : false;

    $footerCityState = trim(implode(', ', array_filter([$site->agent_city, $site->agent_state])));
    $footerCopyright = trim((string) ($fcfg['copyright'] ?? '')) ?: ('Copyright © ' . date('Y'));

    // Disclaimer: explicit override, else generated from agent/brokerage.
    $brokerage = $site->brokerage_name ?: null;
    $footerDisclaimer = trim((string) ($fcfg['disclaimer'] ?? '')) ?: (
        ($site->agent_name ? $site->agent_name . ' is a real estate professional' : 'This is a real estate website')
        . ($brokerage ? ' affiliated with ' . $brokerage . '. ' . $brokerage . ' is a licensed real estate broker and abides by equal housing opportunity laws.' : '. All listings abide by equal housing opportunity laws.')
        . ' All material presented herein is intended for informational purposes only. Information is compiled from sources deemed reliable but is subject to errors, omissions, changes in price, condition, sale, or withdrawal without notice. No statement is made as to the accuracy of any description. All measurements and square footages are approximate. Nothing herein shall be construed as legal, accounting, or other professional advice outside the realm of real estate brokerage.'
    );
@endphp
<footer class="site-footer">
    <div class="footer-inner">
        {{-- Top: brand logo + social --}}
        <div class="footer-top">
            @if($footerLogoUrl)
                <img class="footer-logo-img" src="{{ $footerLogoUrl }}" alt="{{ $site->brokerage_name ?: $site->agent_name }}">
            @else
                <span class="footer-logo-text">{{ $site->brokerage_name ?: $site->agent_name }}</span>
            @endif
            @include('agent-website.partials.social-icons', ['items' => $site->socialAccounts(), 'class' => 'footer-social'])
        </div>

        <h3 class="footer-brand">{{ $site->agent_name }}</h3>

        {{-- Contact + Office --}}
        <div class="footer-cols">
            @if($site->agent_phone || $site->agent_email)
            <div class="footer-col">
                <p class="footer-col-label">Contact</p>
                @if($site->agent_phone)<a href="tel:{{ $site->agent_phone }}">{{ $site->agent_phone }}</a>@endif
                @if($site->agent_email)<a class="footer-email" href="mailto:{{ $site->agent_email }}">{{ $site->agent_email }}</a>@endif
            </div>
            @endif
            @if($site->office_address || $footerCityState)
            <div class="footer-col">
                <p class="footer-col-label">Office</p>
                @if($site->office_address)<p>{{ $site->office_address }}</p>@endif
                @if($footerCityState)<p>{{ $footerCityState }}</p>@endif
            </div>
            @endif
        </div>

        <div class="footer-divider"></div>

        {{-- Navigation — a curated footer menu (editor → Menus) when one is
             saved, otherwise mirrors the header navigation. --}}
        @php
            $footerNavItems = collect($site->navTree());
            $footerMenuKeys = array_values(array_filter((array) ($fcfg['menu'] ?? [])));
            if ($footerMenuKeys) {
                $footerByKey = $footerNavItems->keyBy('key');
                $footerNavItems = collect($footerMenuKeys)->map(fn ($k) => $footerByKey->get($k))->filter()->values();
            } else {
                $footerNavItems = $footerNavItems->filter(fn ($item) => $item['show_in_nav'] ?? true)->values();
            }
        @endphp
        <div class="footer-nav-row">
            <p class="footer-col-label">Navigation</p>
            <nav class="footer-nav">
                @foreach($footerNavItems as $item)
                    <a href="{{ $item['href'] }}">{{ $item['label'] }}</a>
                @endforeach
            </nav>
        </div>

        {{-- Disclaimer --}}
        <p class="footer-disclaimer">{{ $footerDisclaimer }}</p>

        {{-- Logos row: brokerage, MLS, and the Realtor / Equal Housing logo --}}
        @if($footerBrokerageLogoUrl || $footerMlsLogoUrl || $footerShowEho)
        <div class="footer-logos">
            @if($footerBrokerageLogoUrl)<img class="footer-logo-mark" src="{{ $footerBrokerageLogoUrl }}" alt="{{ $site->brokerage_name ?: 'Brokerage' }}" loading="lazy">@endif
            @if($footerMlsLogoUrl)<img class="footer-logo-mark" src="{{ $footerMlsLogoUrl }}" alt="MLS" loading="lazy">@endif
            @if($footerShowEho)<img class="footer-logo-mark footer-eho" src="https://res.cloudinary.com/luxuryp/images/f_auto,q_auto/g5qzbyky8ifp5w0ex0ik/realtor-eho-logo-07232021-update-dark" alt="Realtor and Equal Housing Opportunity" loading="lazy">@endif
        </div>
        @endif

        {{-- Bottom: app name + legal links --}}
        <div class="footer-bottom">
            <span class="footer-bottom-left">Powered by <a href="/">{{ $appName }}</a></span>
            <div class="footer-legal">
                <span>{{ $footerCopyright }}</span>
                <span class="footer-sep">|</span>
                <a href="/privacy-policy">Privacy Policy</a>
                <span class="footer-sep">|</span>
                <a href="{{ route('agent-site.sitemap', $site->slug) }}">Sitemap</a>
                <span class="footer-sep">|</span>
                <a href="/accessibility">Accessibility</a>
            </div>
        </div>
    </div>
</footer>
