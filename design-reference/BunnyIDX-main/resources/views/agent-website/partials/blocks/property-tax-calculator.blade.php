{{--
    Property Tax Calculator block — annual/monthly property tax by US state. The
    state dropdown is populated by the global script (calculators-script,
    data-calc="property-tax") from its per-state effective-rate table; picking a
    state auto-fills the rate, which the visitor can still override. The owner sets
    the default state via the block settings (data-default-state).
--}}
@php
    $d = $block['data'] ?? [];
    $theme = (($d['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';
    $heading = trim((string) ($d['heading'] ?? 'Property Tax Calculator'));
    $subtitle = trim((string) ($d['subtitle'] ?? 'Estimate your annual property tax by state.'));
    $defaultState = strtoupper(trim((string) ($d['default_state'] ?? 'FL')));
    $num = fn ($k, $def) => is_numeric($d[$k] ?? null) ? (float) $d[$k] : $def;
    $value = $num('default_value', 500000);
    $ctaLabel = trim((string) ($d['cta_label'] ?? 'Contact Us'));
@endphp
<section class="calc-block calc-theme-{{ $theme }} calc-ptax" data-calc="property-tax" data-default-state="{{ $defaultState }}">
    <div class="calc-inner">
        @if($heading || $subtitle)
        <div class="calc-head">
            <span class="calc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5"/></svg>Property Tax</span>
            @if($heading)<h2 class="calc-title">{{ $heading }}</h2>@endif
            @if($subtitle)<p class="calc-sub">{{ $subtitle }}</p>@endif
        </div>
        @endif

        <div class="calc-grid">
            <div class="calc-form">
                <div class="calc-field">
                    <label class="calc-label">Home Value</label>
                    <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="value" value="{{ $value }}" min="0" step="1000" inputmode="numeric"></div>
                </div>
                <div class="calc-field">
                    <label class="calc-label">State</label>
                    <select class="calc-input" data-f="state"></select>
                </div>
                <div class="calc-field">
                    <label class="calc-label">Effective Tax Rate</label>
                    <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="rate" value="" min="0" max="5" step="0.01"><span class="calc-input-suffix">%</span></div>
                    <p class="calc-lookup-status">Auto-filled from the state — adjust for your county or exemptions.</p>
                </div>
            </div>

            <div class="calc-result">
                <div class="calc-result-label">Estimated Annual Property Tax</div>
                <div class="calc-result-amount" data-o="annual">$0</div>
                <div class="calc-result-note" data-o="rateNote">% effective rate</div>
                <div class="calc-breakdown">
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#2563EB;"></span>Monthly Escrow</span><span class="calc-break-val" data-o="monthly">$0</span></div>
                    <div class="calc-break-row is-total"><span class="calc-break-key">vs. National Average</span><span class="calc-break-val" data-o="vsAvg">—</span></div>
                </div>
                <a href="{{ route('agent-site.contact', $site->slug) }}" class="calc-cta">{{ $ctaLabel }}</a>
            </div>
        </div>

        <p class="calc-disclaimer">Estimates use approximate statewide average effective rates; your actual property tax depends on local county/municipal rates, assessment ratios and exemptions (e.g. homestead). Check your county assessor for exact figures.</p>
    </div>
</section>

@include('agent-website.partials.calculators-script')
