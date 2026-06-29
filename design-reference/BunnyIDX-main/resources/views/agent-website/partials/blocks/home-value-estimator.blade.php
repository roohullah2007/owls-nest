{{--
    Home Value Estimator (AVM) block — estimates a home's value from MLS SOLD comps
    near an address (avg sold $/sq ft × the home's size × condition). Only offered
    in the editor when the owner's MLS carries sold data (palette gated on the
    `sold_comps` capability). Logic is global (calculators-script, data-calc="home-value").
--}}
@php
    $d = $block['data'] ?? [];
    $theme = (($d['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';
    $heading = trim((string) ($d['heading'] ?? 'Home Value Estimator'));
    $subtitle = trim((string) ($d['subtitle'] ?? 'Get an instant estimate from recent sold comparables.'));
    $num = fn ($k, $def) => is_numeric($d[$k] ?? null) ? (float) $d[$k] : $def;
    $sqft = $num('default_sqft', 2000);
    $ppsf = $num('default_ppsf', 300);
    $ctaLabel = trim((string) ($d['cta_label'] ?? 'Get a Professional Valuation'));
    // Dataset-declared locations for the address autocomplete (1h-cached per owner).
    $avmLocations = app(\App\Services\Mls\PublicPropertySearch::class)->locationSuggestions($site);
@endphp
<section class="calc-block calc-theme-{{ $theme }} calc-hvalue" data-calc="home-value" data-search-url="{{ route('agent-site.properties.search', $site->slug) }}">
    <div class="calc-inner">
        @if($heading || $subtitle)
        <div class="calc-head">
            <span class="calc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M9.5 14h5m-2.5-2.5v5"/></svg>Home Value · AVM</span>
            @if($heading)<h2 class="calc-title">{{ $heading }}</h2>@endif
            @if($subtitle)<p class="calc-sub">{{ $subtitle }}</p>@endif
        </div>
        @endif

        <div class="calc-grid">
            <div class="calc-form">
                <div class="calc-field">
                    <label class="calc-label">Location</label>
                    <div class="calc-lookup">
                        <div class="calc-input-wrap js-calc-suggest" data-mode="locations">
                            <input class="calc-input" type="text" data-f="address" placeholder="City, neighborhood or ZIP" autocomplete="off">
                            <div class="calc-suggest" hidden></div>
                        </div>
                        <button type="button" class="calc-lookup-btn" data-lookup>Estimate</button>
                    </div>
                    <p class="calc-lookup-status" data-o="lookupStatus">Start typing — suggestions come from your connected MLS. Pulls recent sold comps to set the local price per sq ft.</p>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Square Footage</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="sqft" value="{{ $sqft }}" min="0" step="50" inputmode="numeric"><span class="calc-input-suffix">sqft</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Condition</label>
                        <select class="calc-input" data-f="cond">
                            <option value="0.9">Needs Work</option>
                            <option value="1" selected>Average</option>
                            <option value="1.08">Updated</option>
                            <option value="1.15">Fully Renovated</option>
                        </select>
                    </div>
                </div>
                <div class="calc-field">
                    <label class="calc-label">Price per Sq Ft</label>
                    <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="ppsf" value="{{ $ppsf }}" min="0" step="5" inputmode="numeric"></div>
                </div>
            </div>

            <div class="calc-result">
                <div class="calc-result-label">Estimated Home Value</div>
                <div class="calc-result-amount" data-o="value">$0</div>
                <div class="calc-result-note" data-o="ppsfNote">$/sq ft effective</div>
                <div class="calc-breakdown">
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#4F46E5;"></span>Estimated Range</span><span class="calc-break-val" data-o="range">$0 – $0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#8B9096;"></span>Low</span><span class="calc-break-val" data-o="low">$0</span></div>
                    <div class="calc-break-row is-total"><span class="calc-break-key">High</span><span class="calc-break-val" data-o="high">$0</span></div>
                </div>
                <a href="{{ route('agent-site.contact', $site->slug) }}" class="calc-cta">{{ $ctaLabel }}</a>
            </div>
        </div>

        <p class="calc-disclaimer">Automated estimate only — based on recent sold comparables and the details you enter, not an appraisal or a guarantee of value. A local agent’s comparative market analysis (CMA) accounts for condition, upgrades and micro-location an AVM can’t. Contact us for a precise valuation.</p>
    </div>
</section>

@include('agent-website.partials.calculators-script')

{{-- MLS-location autocomplete on the address input (shared SiteSuggest core). --}}
@include('agent-website.partials.site-suggest')
@once
@push('scripts')
<script>
(function () {
    if (!window.SiteSuggest) return;
    var LOCATIONS = @json($avmLocations);
    document.querySelectorAll('.calc-hvalue .js-calc-suggest').forEach(function (wrap) {
        var input = wrap.querySelector('input');
        window.SiteSuggest.attach({
            wrap: wrap,
            input: input,
            panel: wrap.querySelector('.calc-suggest'),
            mode: wrap.dataset.mode || 'locations',
            locations: LOCATIONS,
            itemClass: 'calc-suggest-item',
            hintClass: 'calc-suggest-hint',
            onPick: function (value) { input.value = value; }
        });
    });
})();
</script>
@endpush
@endonce
