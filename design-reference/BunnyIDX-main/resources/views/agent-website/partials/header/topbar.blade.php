{{--
    Header top bar (luxury). Auto-appears on solid headers whenever something
    that belongs in it is enabled — Social Links or Login/Register. No standalone
    toggle. Contact info sits on the left; social icons + auth links on the right.
    Relies on $site, $headerConfig and $headerTransparent from the layout scope.
--}}
@php
    $tbTransparent = $headerTransparent ?? false;
    $tbSocial = (bool) data_get($headerConfig, 'social');
    $tbAuth = (bool) data_get($headerConfig, 'auth');
    $tbLang = \App\Services\Sites\SiteTranslations::enabledFor($site);

    // Which social platforms to show (defaults: facebook + instagram on). A blank
    // URL still renders as a placeholder so the agent sees what they've enabled.
    $tbSocialItems = [];
    if ($tbSocial) {
        foreach (['facebook' => true, 'instagram' => true, 'linkedin' => false, 'youtube' => false, 'tiktok' => false] as $key => $default) {
            $on = array_key_exists("show_{$key}", $headerConfig) ? ! empty($headerConfig["show_{$key}"]) : $default;
            if ($on) {
                $tbSocialItems[] = ['key' => $key, 'url' => $site->{"social_{$key}"} ?? ''];
            }
        }
    }
@endphp
@if(! $tbTransparent && ($tbSocial || $tbAuth || $tbLang))
<div class="site-topbar">
    <div class="site-topbar-inner">
        <div class="site-topbar-left">
            @if($site->agent_phone)<a href="tel:{{ $site->agent_phone }}">{{ $site->agent_phone }}</a>@endif
            @if($site->agent_email)<a href="mailto:{{ $site->agent_email }}">{{ $site->agent_email }}</a>@endif
            @if($site->office_address)<span>{{ $site->office_address }}</span>@endif
        </div>
        <div class="site-topbar-right">
            @if($tbLang)
            @php
                $tbLangCurrent = \App\Services\Sites\SiteTranslations::currentFor($site);
                $tbLangFlag = $tbLangCurrent === 'en' ? 'us' : (\App\Services\Sites\SiteTranslations::CATALOG[$tbLangCurrent]['flag'] ?? 'us');
            @endphp
            <button type="button" class="site-topbar-lang" data-lt-open aria-label="Choose your language">
                <span class="lt-flag lt-flag-sm"><img src="https://flagcdn.com/w40/{{ $tbLangFlag }}.png" alt=""></span>
                {{ strtoupper(explode('-', $tbLangCurrent)[0]) }}
            </button>
            @endif
            @if($tbSocial)
                @include('agent-website.partials.social-icons', ['items' => $tbSocialItems, 'class' => 'site-topbar-social'])
            @endif
            @if($tbAuth)
            @php $tbVisitor = app(\App\Services\Sites\VisitorAuth::class)->current($site); @endphp
            <div class="site-topbar-auth">
                @if($tbVisitor)
                    <a href="{{ route('agent-site.visitor.account', $site->slug) }}">My Account</a>
                @else
                    <button type="button" data-ps-auth="login">Login</button>
                    <button type="button" data-ps-auth="register">Register</button>
                @endif
            </div>
            @endif
        </div>
    </div>
</div>
@endif
