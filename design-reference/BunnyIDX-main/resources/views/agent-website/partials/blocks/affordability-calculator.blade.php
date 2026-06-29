{{--
    Affordability Calculator block — how much home a buyer can afford from income,
    monthly debts, down payment and a target DTI. Solves the max purchase price
    (P&I + tax + insurance + HOA fit the monthly budget). Per-instance JS scoped
    to .calc-afford. Shared .calc-* styles in _calculators.css.
--}}
@php
    $d = $block['data'] ?? [];
    $theme = (($d['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';
    $heading = trim((string) ($d['heading'] ?? 'Home Affordability Calculator'));
    $subtitle = trim((string) ($d['subtitle'] ?? 'Find out how much home you can comfortably afford.'));
    $num = fn ($k, $def) => is_numeric($d[$k] ?? null) ? (float) $d[$k] : $def;
    $income = $num('default_income', 120000);
    $debts = $num('default_debts', 500);
    $down = $num('default_down', 60000);
    $rate = $num('default_rate', 6.5);
    $term = (int) $num('default_term', 30);
    $dti = $num('default_dti', 36);
    $taxRate = $num('default_tax_rate', 1.1);
    $insRate = $num('default_ins_rate', 0.35);
    $hoa = $num('default_hoa', 0);
    $ctaLabel = trim((string) ($d['cta_label'] ?? 'Contact Us'));
@endphp
<section class="calc-block calc-theme-{{ $theme }} calc-afford" data-calc="affordability">
    <div class="calc-inner">
        @if($heading || $subtitle)
        <div class="calc-head">
            <span class="calc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="m11 11 9 9m-3 0h3v-3"/></svg>Buying Power</span>
            @if($heading)<h2 class="calc-title">{{ $heading }}</h2>@endif
            @if($subtitle)<p class="calc-sub">{{ $subtitle }}</p>@endif
        </div>
        @endif

        <div class="calc-grid">
            <div class="calc-form">
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Annual Income</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="income" value="{{ $income }}" min="0" step="1000" inputmode="numeric"></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Monthly Debts</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="debts" value="{{ $debts }}" min="0" step="50" inputmode="numeric"></div>
                    </div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Down Payment</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="down" value="{{ $down }}" min="0" step="1000" inputmode="numeric"></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Interest Rate</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="rate" value="{{ $rate }}" min="0" max="25" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Loan Term</label>
                        <div class="calc-segment" data-f="term">
                            @foreach([30, 20, 15] as $t)
                            <button type="button" class="calc-seg-btn{{ $t === $term ? ' active' : '' }}" data-term="{{ $t }}">{{ $t }} yr</button>
                            @endforeach
                        </div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Max DTI Ratio</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="dti" value="{{ $dti }}" min="10" max="60" step="1"><span class="calc-input-suffix">%</span></div>
                    </div>
                </div>
                <div class="calc-row-3">
                    <div class="calc-field">
                        <label class="calc-label">Tax Rate / yr</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="taxRate" value="{{ $taxRate }}" min="0" max="10" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Insurance / yr</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="insRate" value="{{ $insRate }}" min="0" max="5" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">HOA / month</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="hoa" value="{{ $hoa }}" min="0" step="10" inputmode="numeric"></div>
                    </div>
                </div>
            </div>

            <div class="calc-result">
                <div class="calc-result-label">You Can Afford Up To</div>
                <div class="calc-result-amount" data-o="price">$0</div>
                <div class="calc-result-note">Target home price at your selected DTI</div>

                <div class="calc-meter">
                    <div class="calc-meter-track"><div class="calc-meter-fill" data-o="meter" style="width:0%"></div></div>
                    <div class="calc-meter-legend"><span data-o="meterPay">$0/mo payment</span><span data-o="meterBudget">$0/mo budget</span></div>
                </div>

                <div class="calc-breakdown">
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#1693C9;"></span>Loan Amount</span><span class="calc-break-val" data-o="loan">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#7C36EE;"></span>Down Payment</span><span class="calc-break-val" data-o="down">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#63A205;"></span>Monthly Budget (DTI)</span><span class="calc-break-val" data-o="budget">$0</span></div>
                    <div class="calc-break-row is-total"><span class="calc-break-key">Est. Monthly Payment</span><span class="calc-break-val" data-o="payment">$0</span></div>
                </div>
                <a href="{{ route('agent-site.contact', $site->slug) }}" class="calc-cta">{{ $ctaLabel }}</a>
            </div>
        </div>

        <p class="calc-disclaimer">Estimates only — not a pre-approval or financial advice. Lenders weigh credit, reserves and program rules beyond DTI. Contact a licensed lender to confirm what you qualify for.</p>
    </div>
</section>

@include('agent-website.partials.calculators-script')
