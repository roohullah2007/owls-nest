{{--
    Brand / logo block — shared by the desktop nav and the mobile menu header.
    Renders the site logo (light + dark variants) or the agent name, plus the
    optional brokerage logo. Pass $brokerage = false to omit the brokerage logo
    (the mobile menu header keeps it lean). Relies on $site from the parent scope.
--}}
@php $brandBrokerage = $brokerage ?? true; @endphp
<a href="{{ route('agent-site.home', $site->slug) }}" class="nav-brand">
    @if($site->site_logo_light || $site->site_logo_dark)
        @if($site->site_logo_light)
        <img src="{{ asset('storage/' . $site->site_logo_light) }}" alt="{{ $site->agent_name }}" class="nav-brand-logo nav-logo-light">
        @endif
        @if($site->site_logo_dark)
        <img src="{{ asset('storage/' . $site->site_logo_dark) }}" alt="{{ $site->agent_name }}" class="nav-brand-logo nav-logo-dark">
        @endif
    @else
        <span class="nav-brand-text">{{ $site->agent_name }}</span>
    @endif
    @if($brandBrokerage)
        @if($site->brokerage_logo_light && $site->brokerage_logo_dark)
            <img src="{{ asset('storage/' . $site->brokerage_logo_light) }}" alt="{{ $site->brokerage_name }}" class="nav-brokerage-logo nav-brokerage-light">
            <img src="{{ asset('storage/' . $site->brokerage_logo_dark) }}" alt="{{ $site->brokerage_name }}" class="nav-brokerage-logo nav-brokerage-dark">
        @elseif($site->brokerage_logo_light)
            <img src="{{ asset('storage/' . $site->brokerage_logo_light) }}" alt="{{ $site->brokerage_name }}" class="nav-brokerage-logo">
        @elseif($site->brokerage_logo_dark)
            <img src="{{ asset('storage/' . $site->brokerage_logo_dark) }}" alt="{{ $site->brokerage_name }}" class="nav-brokerage-logo">
        @endif
    @endif
</a>
