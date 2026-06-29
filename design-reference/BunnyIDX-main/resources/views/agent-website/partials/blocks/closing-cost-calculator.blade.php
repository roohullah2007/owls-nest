{{--
    Closing Cost Estimator block — itemised buyer closing costs on a purchase, plus
    total cash-to-close (down payment + costs). Logic is global (calculators-script,
    data-calc="closing-cost"); optional MLS address lookup prefills the price.
--}}
@php
    $d = $block['data'] ?? [];
    $theme = (($d['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';
    $heading = trim((string) ($d['heading'] ?? 'Closing Cost Estimator'));
    $subtitle = trim((string) ($d['subtitle'] ?? 'Estimate the cash you’ll need to close.'));
    $mlsLookup = ($d['mls_lookup'] ?? 'on') !== 'off';
    $num = fn ($k, $def) => is_numeric($d[$k] ?? null) ? (float) $d[$k] : $def;
    $price = $num('default_price', 650000);
    $downPct = $num('default_down_pct', 20);
    $lenderPct = $num('default_lender_pct', 1.0);
    $titlePct = $num('default_title_pct', 0.7);
    $govPct = $num('default_gov_pct', 0.5);
    $fixed = $num('default_fixed', 1100);
    $prepaids = $num('default_prepaids', 2400);
    $ctaLabel = trim((string) ($d['cta_label'] ?? 'Contact Us'));
@endphp
<section class="calc-block calc-theme-{{ $theme }} calc-closing" data-calc="closing-cost" data-search-url="{{ route('agent-site.properties.search', $site->slug) }}">
    <div class="calc-inner">
        @if($heading || $subtitle)
        <div class="calc-head">
            <span class="calc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path stroke-linecap="round" d="M8 7h8M8 11h8M8 15h5"/></svg>Closing Costs</span>
            @if($heading)<h2 class="calc-title">{{ $heading }}</h2>@endif
            @if($subtitle)<p class="calc-sub">{{ $subtitle }}</p>@endif
        </div>
        @endif

        <div class="calc-grid">
            <div class="calc-form">
                @if($mlsLookup)
                <div class="calc-field">
                    <label class="calc-label">Find by Address — optional</label>
                    <div class="calc-lookup">
                        <div class="calc-input-wrap"><input class="calc-input" type="text" data-f="address" placeholder="123 Main St, City, ST" autocomplete="off"></div>
                        <button type="button" class="calc-lookup-btn" data-lookup>Find</button>
                    </div>
                    <p class="calc-lookup-status" data-o="lookupStatus"></p>
                </div>
                @endif

                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Home Price</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="price" value="{{ $price }}" min="0" step="1000" inputmode="numeric"></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Down Payment</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="downPct" value="{{ $downPct }}" min="0" max="100" step="1"><span class="calc-input-suffix">%</span></div>
                    </div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Lender Fees (% of loan)</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="lenderPct" value="{{ $lenderPct }}" min="0" max="5" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Title &amp; Escrow (% of price)</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="titlePct" value="{{ $titlePct }}" min="0" max="3" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Taxes &amp; Gov (% of price)</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="govPct" value="{{ $govPct }}" min="0" max="3" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Appraisal &amp; Inspection</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="fixed" value="{{ $fixed }}" min="0" step="50" inputmode="numeric"></div>
                    </div>
                </div>
                <div class="calc-field">
                    <label class="calc-label">Prepaids &amp; Escrow (taxes + insurance)</label>
                    <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="prepaids" value="{{ $prepaids }}" min="0" step="50" inputmode="numeric"></div>
                </div>
            </div>

            <div class="calc-result">
                <div class="calc-result-label">Estimated Closing Costs</div>
                <div class="calc-result-amount" data-o="total">$0</div>
                <div class="calc-result-note" data-o="pctNote">% of the purchase price</div>
                <div class="calc-breakdown">
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#1693C9;"></span>Lender Fees</span><span class="calc-break-val" data-o="lender">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#7C36EE;"></span>Title &amp; Escrow</span><span class="calc-break-val" data-o="title">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#D97706;"></span>Taxes &amp; Government</span><span class="calc-break-val" data-o="gov">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#63A205;"></span>Appraisal &amp; Inspection</span><span class="calc-break-val" data-o="fixed">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#DE3884;"></span>Prepaids &amp; Escrow</span><span class="calc-break-val" data-o="prepaids">$0</span></div>
                    <div class="calc-break-row is-total"><span class="calc-break-key">Cash to Close</span><span class="calc-break-val" data-o="cash">$0</span></div>
                </div>
                <a href="{{ route('agent-site.contact', $site->slug) }}" class="calc-cta">{{ $ctaLabel }}</a>
            </div>
        </div>

        <p class="calc-disclaimer">Estimates only — actual closing costs vary by lender, location, loan type and negotiation, and may include items not shown here. Request a Loan Estimate for exact figures.</p>
    </div>
</section>

@include('agent-website.partials.calculators-script')
