{{--
    Refinance Calculator block — compares the current loan to a new one: monthly
    savings, break-even point (months to recoup closing costs) and lifetime
    interest savings. Per-instance JS scoped to .calc-refi. Shared .calc-* styles.
--}}
@php
    $d = $block['data'] ?? [];
    $theme = (($d['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';
    $heading = trim((string) ($d['heading'] ?? 'Refinance Calculator'));
    $subtitle = trim((string) ($d['subtitle'] ?? 'See if refinancing could lower your payment.'));
    $num = fn ($k, $def) => is_numeric($d[$k] ?? null) ? (float) $d[$k] : $def;
    $balance = $num('default_balance', 350000);
    $curRate = $num('default_current_rate', 7.5);
    $curTermLeft = (int) $num('default_term_left', 27);
    $newRate = $num('default_new_rate', 6.0);
    $newTerm = (int) $num('default_new_term', 30);
    $costs = $num('default_costs', 6000);
    $ctaLabel = trim((string) ($d['cta_label'] ?? 'Contact Us'));
@endphp
<section class="calc-block calc-theme-{{ $theme }} calc-refi" data-calc="refinance">
    <div class="calc-inner">
        @if($heading || $subtitle)
        <div class="calc-head">
            <span class="calc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 9a8 8 0 0 1 13.5-3.5L20 8M20 5v3h-3M20 15a8 8 0 0 1-13.5 3.5L4 16m0 3v-3h3"/></svg>Refinance Savings</span>
            @if($heading)<h2 class="calc-title">{{ $heading }}</h2>@endif
            @if($subtitle)<p class="calc-sub">{{ $subtitle }}</p>@endif
        </div>
        @endif

        <div class="calc-grid">
            <div class="calc-form">
                <div class="calc-field">
                    <label class="calc-label">Current Loan Balance</label>
                    <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="balance" value="{{ $balance }}" min="0" step="1000" inputmode="numeric"></div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Current Rate</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="curRate" value="{{ $curRate }}" min="0" max="25" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Years Remaining</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="curTerm" value="{{ $curTermLeft }}" min="1" max="40" step="1"></div>
                    </div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">New Rate</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="newRate" value="{{ $newRate }}" min="0" max="25" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">New Term</label>
                        <div class="calc-segment" data-f="newTerm">
                            @foreach([30, 20, 15] as $t)
                            <button type="button" class="calc-seg-btn{{ $t === $newTerm ? ' active' : '' }}" data-term="{{ $t }}">{{ $t }} yr</button>
                            @endforeach
                        </div>
                    </div>
                </div>
                <div class="calc-field">
                    <label class="calc-label">Refinance / Closing Costs</label>
                    <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="costs" value="{{ $costs }}" min="0" step="100" inputmode="numeric"></div>
                </div>
            </div>

            <div class="calc-result">
                <div class="calc-result-label">Estimated Monthly Savings</div>
                <div class="calc-result-amount" data-o="savings">$0<span>/mo</span></div>
                <div class="calc-result-note" data-o="breakevenNote">Break-even on your costs</div>

                <div class="calc-compare">
                    <div class="calc-compare-tile"><div class="t-label">Current P&amp;I</div><div class="t-val" data-o="curPayTile">$0</div></div>
                    <div class="calc-compare-arrow">→</div>
                    <div class="calc-compare-tile is-new"><div class="t-label">New P&amp;I</div><div class="t-val" data-o="newPayTile">$0</div></div>
                </div>

                <div class="calc-breakdown">
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#D97706;"></span>Break-even Point</span><span class="calc-break-val" data-o="breakeven">—</span></div>
                    <div class="calc-break-row is-total"><span class="calc-break-key">Lifetime Interest Savings</span><span class="calc-break-val" data-o="lifetime">$0</span></div>
                </div>
                <a href="{{ route('agent-site.contact', $site->slug) }}" class="calc-cta">{{ $ctaLabel }}</a>
            </div>
        </div>

        <p class="calc-disclaimer">Estimates only — not a loan offer or financial advice. A longer new term can lower the payment while increasing total interest paid. Contact a licensed lender for personalized refinance terms.</p>
    </div>
</section>

@include('agent-website.partials.calculators-script')
