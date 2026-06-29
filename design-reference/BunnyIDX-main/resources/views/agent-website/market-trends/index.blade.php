{{--
    Market Trends dashboard — a theme-agnostic system page (like /properties).
    It extends the ACTIVE template's site layout so the full on-brand chrome
    wraps the dashboard: the site header + primary nav (including the priority-nav
    "More" overflow once more than 8 menu items exist), and the shared footer —
    exactly like every other page. A standard Page Header hero sits on top (same
    pattern as the Team page) so the dashboard never hides under a sticky/
    transparent header. Stats come from the controller ($market =
    PublicPropertySearch::marketStats), computed from the owner's LIVE MLS sold +
    active data and cached 6h. Charts are inline SVG — no JS dependency.
--}}
@extends("agent-website.templates.{$site->template}.layout")

{{-- Market Trends nests under Buy in navTree() — highlight that parent. --}}
@section('nav-buy', 'active')

@push('styles')
<style>
    /* Light full-bleed band so the dashboard never inherits the theme's dark
       body background (templates like luxury set body { background: var(--bg) }). */
    .mt-section { background: #F6F7F9; }
    .mt-wrap { max-width: 1120px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
    .mt-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.75rem; }
    .mt-head .mt-lead { color: #5F656D; font-size: .95rem; }
    .mt-area-form { display: flex; align-items: center; gap: .6rem; }
    .mt-area-form label { font-size: .8rem; color: #5F656D; font-weight: 500; letter-spacing: .02em; }
    /* Matches the site's other dropdowns (area-page / condo filters): custom SVG
       chevron, native arrow hidden, consistent border/radius/focus. */
    .mt-area-form select {
        height: 46px;
        min-width: 160px;
        padding: 0 40px 0 16px;
        border: 1px solid #D9DDE2;
        border-radius: 10px;
        background-color: #FFFFFF;
        color: #111315;
        font-family: inherit;
        font-size: 14px;
        cursor: pointer;
        outline: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B9096' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 14px center;
        transition: border-color 0.15s;
    }
    .mt-area-form select:hover { border-color: #C2C8CF; }
    .mt-area-form select:focus { border-color: #111315; }
    .mt-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .mt-card { border: 1px solid #E9ECEF; border-radius: 14px; background: #fff; padding: 1.25rem 1.25rem 1.1rem; }
    .mt-card .k { font-size: .72rem; letter-spacing: .04em; text-transform: uppercase; color: #8B9096; font-weight: 600; }
    .mt-card .v { font-size: 1.75rem; font-weight: 700; color: #111315; margin-top: .35rem; line-height: 1; }
    .mt-card .v small { font-size: .9rem; font-weight: 500; color: #5F656D; }
    .mt-charts { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
    @media (min-width: 880px) { .mt-charts { grid-template-columns: 3fr 2fr; } }
    .mt-panel { border: 1px solid #E9ECEF; border-radius: 14px; background: #fff; padding: 1.4rem; }
    .mt-panel h2 { font-size: 1rem; font-weight: 600; color: #111315; margin-bottom: 1.1rem; }
    .mt-panel svg { width: 100%; height: auto; display: block; }
    .mt-bars { display: flex; align-items: flex-end; gap: .6rem; height: 200px; }
    .mt-bars .col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: .4rem; }
    .mt-bars .bar { width: 100%; max-width: 38px; border-radius: 6px 6px 0 0; min-height: 3px; }
    .mt-bars .cnt { font-size: .8rem; font-weight: 600; color: #111315; }
    .mt-bars .lab { font-size: .72rem; color: #8B9096; }
    .mt-empty { border: 1px dashed #D7DBDF; border-radius: 14px; background: #FAFBFC; padding: 3rem 1.5rem; text-align: center; color: #5F656D; }
    .mt-empty strong { display: block; color: #111315; font-size: 1.05rem; margin-bottom: .4rem; }
    .mt-note { margin-top: 1.5rem; font-size: .72rem; color: #9AA0A6; line-height: 1.6; }
    /* Loading overlay — shown while switching areas (a full reload that hits live
       MLS data, so it can take a moment). */
    .mt-loader { position: fixed; inset: 0; z-index: 9000; display: none; align-items: center; justify-content: center; background: rgba(246,247,249,.72); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
    .mt-loader.is-active { display: flex; }
    .mt-loader .mt-spinner { width: 44px; height: 44px; border-radius: 50%; border: 3px solid #E2E5E9; animation: mt-spin .7s linear infinite; }
    @keyframes mt-spin { to { transform: rotate(360deg); } }
</style>
@endpush

@php
    $mtArea = $market['area'] ?? null;
    $accent = $site->accent_color ?: '#022E50';
    $stats = $market['stats'] ?? null;
    $trend = $market['trend'] ?? [];

    // Hero image: the site hero when set, otherwise a default backdrop — same
    // pattern as the Team / Mortgage Calculator pages, so the page header is the
    // boxed image hero (identical to New Developments) on every site.
    $mtHeaderImage = $site->hero_image
        ? \Illuminate\Support\Facades\Storage::url($site->hero_image)
        : asset('images/backgrounds/bg-8.jpg');

    $money = static fn ($n) => $n ? '$'.number_format((int) $n) : '—';

    // Line-chart geometry for the median-price trend (skips months with no data).
    $W = 680; $H = 240; $pad = 28;
    $months = count($trend);
    $step = $months > 1 ? ($W - $pad * 2) / ($months - 1) : 0;
    $medians = array_values(array_filter(array_map(static fn ($t) => $t['median'], $trend), static fn ($v) => $v !== null));
    $minMed = $medians ? min($medians) : 0;
    $maxMed = $medians ? max($medians) : 0;
    $medRange = max(1, $maxMed - $minMed);
    $yFor = static fn ($v) => $H - $pad - (($v - $minMed) / $medRange) * ($H - $pad * 2);

    $linePts = [];
    foreach ($trend as $i => $t) {
        if ($t['median'] === null) { continue; }
        $linePts[] = ['x' => $pad + $i * $step, 'y' => $yFor($t['median']), 'd' => $t];
    }

    $maxCount = max(1, max(array_map(static fn ($t) => $t['count'], $trend) ?: [0]));
@endphp

@section('content')
{{-- Standard page hero (same block other pages use) — keeps the dashboard clear
     of a sticky/transparent header and on-brand with the rest of the site. --}}
@include('agent-website.partials.blocks.page-header', ['block' => [
    'id' => 'market-trends-hero',
    'crumbs' => [
        ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
        ['label' => 'Market Trends'],
    ],
    'data' => [
        'bg_type' => 'image',
        'image' => $mtHeaderImage,
        'overlay' => 'medium',
        'height' => 'compact',
        'style' => $mtHeaderImage ? 'boxed' : 'light',
        'heading' => $mtArea ? "{$mtArea} Market Trends" : 'Market Trends',
        'subtitle' => 'Median prices, days on market and inventory'.($mtArea ? " in {$mtArea}" : '').' — from live MLS data.',
        'show_scroll' => false,
    ],
]])

<div class="mt-section">
<div class="mt-loader" id="mtLoader" aria-hidden="true">
    <div class="mt-spinner" style="border-top-color: {{ $accent }};" role="status" aria-label="Loading market data"></div>
</div>
<div class="mt-wrap">
    <div class="mt-head">
        <div class="mt-lead">Local trends{{ $mtArea ? " for {$mtArea}" : '' }}, drawn from recent closed sales &amp; active listings.</div>
        @if(! empty($market['areas']))
        <form method="GET" class="mt-area-form">
            <label for="mt-area">Area</label>
            <select id="mt-area" name="area" onchange="document.getElementById('mtLoader').classList.add('is-active'); this.form.submit();">
                @foreach($market['areas'] as $city)
                <option value="{{ $city }}" @selected($city === $mtArea)>{{ $city }}</option>
                @endforeach
            </select>
            <noscript><button type="submit">Go</button></noscript>
        </form>
        @endif
    </div>

    @if(empty($market['integrated']))
        <div class="mt-empty">
            <strong>Market data isn't available yet</strong>
            @if(! empty($isOwner))
                Connect an MLS in <a href="{{ \Illuminate\Support\Facades\Route::has('crm.idx.index') ? route('crm.idx.index') : url('/crm') }}" style="color:{{ $accent }};">your dashboard</a> to power this page with live local trends.
            @else
                Please check back soon — local market trends are on the way.
            @endif
        </div>
    @elseif(! $stats)
        <div class="mt-empty">
            <strong>Not enough recent sales{{ $mtArea ? " in {$mtArea}" : '' }}</strong>
            We couldn’t find enough closed sales to chart trends here yet. Try another area above.
        </div>
    @else
        <div class="mt-grid">
            <div class="mt-card"><div class="k">Median Sale Price</div><div class="v">{{ $money($stats['median_price']) }}</div></div>
            <div class="mt-card"><div class="k">Avg Price / Sq Ft</div><div class="v">{{ $stats['median_ppsf'] ? '$'.number_format($stats['median_ppsf']) : '—' }}</div></div>
            <div class="mt-card"><div class="k">Avg Days on Market</div><div class="v">{{ $stats['avg_dom'] !== null ? $stats['avg_dom'] : '—' }}</div></div>
            <div class="mt-card"><div class="k">Homes Sold</div><div class="v">{{ number_format($stats['sales_count']) }} <small>recent</small></div></div>
            <div class="mt-card"><div class="k">Active Listings</div><div class="v">{{ number_format($stats['active_inventory']) }}</div></div>
            <div class="mt-card"><div class="k">Months of Supply</div><div class="v">{{ $stats['months_supply'] !== null ? $stats['months_supply'] : '—' }}</div></div>
        </div>

        <div class="mt-charts">
            <div class="mt-panel">
                <h2>Median Sale Price · last 6 months</h2>
                @if(count($linePts) >= 2)
                <svg viewBox="0 0 {{ $W }} {{ $H }}" role="img" aria-label="Median sale price trend">
                    <polyline fill="none" stroke="{{ $accent }}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"
                        points="{{ collect($linePts)->map(fn ($p) => round($p['x'], 1).','.round($p['y'], 1))->implode(' ') }}" />
                    @foreach($linePts as $p)
                        <circle cx="{{ round($p['x'], 1) }}" cy="{{ round($p['y'], 1) }}" r="4" fill="#fff" stroke="{{ $accent }}" stroke-width="2.5" />
                        <text x="{{ round($p['x'], 1) }}" y="{{ round($p['y'], 1) - 12 }}" text-anchor="middle" font-size="12" font-weight="600" fill="#111315">{{ '$'.round($p['d']['median'] / 1000).'k' }}</text>
                    @endforeach
                    @foreach($trend as $i => $t)
                        <text x="{{ round($pad + $i * $step, 1) }}" y="{{ $H - 6 }}" text-anchor="middle" font-size="12" fill="#8B9096">{{ $t['label'] }}</text>
                    @endforeach
                </svg>
                @else
                <p style="color:#8B9096;font-size:.9rem;">Not enough monthly data to chart a trend yet.</p>
                @endif
            </div>

            <div class="mt-panel">
                <h2>Homes Sold per Month</h2>
                <div class="mt-bars">
                    @foreach($trend as $t)
                    <div class="col">
                        <div class="cnt">{{ $t['count'] }}</div>
                        <div class="bar" style="height: {{ max(3, (int) round(($t['count'] / $maxCount) * 160)) }}px; background: {{ $accent }}; opacity: {{ $t['count'] ? 1 : .25 }};"></div>
                        <div class="lab">{{ $t['label'] }}</div>
                    </div>
                    @endforeach
                </div>
            </div>
        </div>

        <p class="mt-note">
            Figures are derived from recent closed sales and active listings reported by the connected MLS{{ $mtArea ? " for {$mtArea}" : '' }} and are for general informational purposes only — not an appraisal or guarantee of value. Data refreshes periodically.
        </p>
    @endif
</div>
</div>
<script>
    // Clear the loader if the page is restored from the bfcache (back/forward),
    // so a stale spinner never lingers over restored content.
    window.addEventListener('pageshow', function () {
        var l = document.getElementById('mtLoader');
        if (l) { l.classList.remove('is-active'); }
    });
</script>
@endsection
