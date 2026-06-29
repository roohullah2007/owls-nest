{{--
    Mortgage Calculator block — estimated monthly payment (P&I + tax + insurance
    + HOA). Per-instance JS (scoped to .calc-mortgage), so multiple instances are
    safe. Editable via the generic block editor (heading/subtitle/theme + default
    assumptions). Shared .calc-* styles in _calculators.css.
--}}
@php
    $d = $block['data'] ?? [];
    $theme = (($d['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';
    $heading = trim((string) ($d['heading'] ?? 'Mortgage Calculator'));
    $subtitle = trim((string) ($d['subtitle'] ?? 'Estimate your monthly payment in seconds.'));
    $num = fn ($k, $def) => is_numeric($d[$k] ?? null) ? (float) $d[$k] : $def;
    $price = $num('default_price', 650000);
    $downPct = $num('default_down_pct', 20);
    $rate = $num('default_rate', 6.5);
    $term = (int) $num('default_term', 30);
    $tax = $num('default_tax', round($price * 0.011));
    $ins = $num('default_insurance', 1500);
    $hoa = $num('default_hoa', 0);
    $ctaLabel = trim((string) ($d['cta_label'] ?? 'Contact Us'));
@endphp
<section class="calc-block calc-theme-{{ $theme }} calc-mortgage" data-calc="mortgage">
    <div class="calc-inner">
        @if($heading || $subtitle)
        <div class="calc-head">
            <span class="calc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5"/><path stroke-linecap="round" d="M12 13v4m-1.4-3.1c.4-.5 2.5-.6 2.5.6 0 1.1-2.1 1-2.1 2 0 1.1 2.1 1.1 2.5.6"/></svg>Monthly Payment</span>
            @if($heading)<h2 class="calc-title">{{ $heading }}</h2>@endif
            @if($subtitle)<p class="calc-sub">{{ $subtitle }}</p>@endif
        </div>
        @endif

        <div class="calc-grid">
            <div class="calc-form">
                <div class="calc-field">
                    <label class="calc-label">Home Price</label>
                    <div class="calc-input-wrap"><span class="calc-input-prefix">$</span>
                        <input class="calc-input has-prefix" type="number" data-f="price" value="{{ $price }}" min="0" step="1000" inputmode="numeric"></div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Down Payment</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="downPct" value="{{ $downPct }}" min="0" max="100" step="1"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Down Amount</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span>
                            <input class="calc-input has-prefix" type="number" data-f="downAmt" value="{{ round($price * $downPct / 100) }}" min="0" step="1000" inputmode="numeric"></div>
                    </div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Interest Rate</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="rate" value="{{ $rate }}" min="0" max="25" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Loan Term</label>
                        <div class="calc-segment" data-f="term">
                            @foreach([30, 20, 15, 10] as $t)
                            <button type="button" class="calc-seg-btn{{ $t === $term ? ' active' : '' }}" data-term="{{ $t }}">{{ $t }} yr</button>
                            @endforeach
                        </div>
                    </div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Property Tax / yr</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span>
                            <input class="calc-input has-prefix" type="number" data-f="tax" value="{{ $tax }}" min="0" step="50" inputmode="numeric"></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Insurance / yr</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span>
                            <input class="calc-input has-prefix" type="number" data-f="ins" value="{{ $ins }}" min="0" step="50" inputmode="numeric"></div>
                    </div>
                </div>
                <div class="calc-field">
                    <label class="calc-label">HOA / month</label>
                    <div class="calc-input-wrap"><span class="calc-input-prefix">$</span>
                        <input class="calc-input has-prefix" type="number" data-f="hoa" value="{{ $hoa }}" min="0" step="10" inputmode="numeric"></div>
                </div>
            </div>

            <div class="calc-result">
                <div class="calc-result-label">Estimated Monthly Payment</div>
                <div class="calc-result-amount" data-o="total">$0<span>/mo</span></div>
                <div class="calc-result-note">Principal, interest, taxes, insurance &amp; HOA</div>
                <div class="calc-breakdown">
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#1693C9;"></span>Principal &amp; Interest</span><span class="calc-break-val" data-o="pi">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#7C36EE;"></span>Property Tax</span><span class="calc-break-val" data-o="taxMo">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#63A205;"></span>Home Insurance</span><span class="calc-break-val" data-o="insMo">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#D97706;"></span>HOA</span><span class="calc-break-val" data-o="hoaMo">$0</span></div>
                </div>
                <a href="{{ route('agent-site.contact', $site->slug) }}" class="calc-cta">{{ $ctaLabel }}</a>
            </div>
        </div>

        <p class="calc-disclaimer">Estimates only — not a loan offer or financial advice. Actual rates, taxes, insurance and payments vary. Contact a licensed lender for a personalized quote.</p>
    </div>
</section>

@include('agent-website.partials.calculators-script')
