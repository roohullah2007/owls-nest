{{--
    Rent vs Buy Calculator block — compares the net cost of buying vs renting over
    a chosen horizon (mortgage + ownership costs − home equity/appreciation +
    opportunity cost vs cumulative rent). Logic is global (calculators-script).
    Optional MLS address lookup prefills the home price via the public search
    endpoint, degrading gracefully to manual entry. Design only lives here.
--}}
@php
    $d = $block['data'] ?? [];
    $theme = (($d['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';
    $heading = trim((string) ($d['heading'] ?? 'Rent vs. Buy Calculator'));
    $subtitle = trim((string) ($d['subtitle'] ?? 'See whether buying or renting costs less over time.'));
    $mlsLookup = ($d['mls_lookup'] ?? 'on') !== 'off';
    $num = fn ($k, $def) => is_numeric($d[$k] ?? null) ? (float) $d[$k] : $def;
    $price = $num('default_price', 650000);
    $downPct = $num('default_down_pct', 20);
    $rate = $num('default_rate', 6.5);
    $term = (int) $num('default_term', 30);
    $tax = $num('default_tax', round($price * 0.011));
    $ins = $num('default_insurance', 1500);
    $maint = $num('default_maintenance', round($price * 0.01));
    $hoa = $num('default_hoa', 0);
    $rent = $num('default_rent', 2800);
    $rentInc = $num('default_rent_increase', 3);
    $years = (int) $num('default_years', 7);
    $appr = $num('default_appreciation', 3.5);
    $inv = $num('default_investment_return', 5);
    $ctaLabel = trim((string) ($d['cta_label'] ?? 'Contact Us'));
@endphp
<section class="calc-block calc-theme-{{ $theme }} calc-rvb" data-calc="rent-vs-buy" data-search-url="{{ route('agent-site.properties.search', $site->slug) }}">
    <div class="calc-inner">
        @if($heading || $subtitle)
        <div class="calc-head">
            <span class="calc-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5 9 6l6 4.5M5 9.5V19h8V9.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 13h6m0 0-2.5-2.5M21 13l-2.5 2.5"/></svg>Rent vs Buy</span>
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

                <p class="calc-group">Buying</p>
                <div class="calc-field">
                    <label class="calc-label">Home Price</label>
                    <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="price" value="{{ $price }}" min="0" step="1000" inputmode="numeric"></div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Down Payment</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="downPct" value="{{ $downPct }}" min="0" max="100" step="1"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Mortgage Rate</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="rate" value="{{ $rate }}" min="0" max="25" step="0.01"><span class="calc-input-suffix">%</span></div>
                    </div>
                </div>
                <div class="calc-field">
                    <label class="calc-label">Loan Term</label>
                    <div class="calc-segment" data-f="term">
                        @foreach([30, 20, 15] as $t)
                        <button type="button" class="calc-seg-btn{{ $t === $term ? ' active' : '' }}" data-term="{{ $t }}">{{ $t }} yr</button>
                        @endforeach
                    </div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Property Tax / yr</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="tax" value="{{ $tax }}" min="0" step="50" inputmode="numeric"></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Insurance / yr</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="ins" value="{{ $ins }}" min="0" step="50" inputmode="numeric"></div>
                    </div>
                </div>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Maintenance / yr</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="maint" value="{{ $maint }}" min="0" step="100" inputmode="numeric"></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">HOA / month</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="hoa" value="{{ $hoa }}" min="0" step="10" inputmode="numeric"></div>
                    </div>
                </div>

                <p class="calc-group">Renting</p>
                <div class="calc-row">
                    <div class="calc-field">
                        <label class="calc-label">Monthly Rent</label>
                        <div class="calc-input-wrap"><span class="calc-input-prefix">$</span><input class="calc-input has-prefix" type="number" data-f="rent" value="{{ $rent }}" min="0" step="50" inputmode="numeric"></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Rent Increase / yr</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="rentInc" value="{{ $rentInc }}" min="0" max="20" step="0.1"><span class="calc-input-suffix">%</span></div>
                    </div>
                </div>

                <p class="calc-group">Assumptions</p>
                <div class="calc-row-3">
                    <div class="calc-field">
                        <label class="calc-label">Years You'll Stay</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="years" value="{{ $years }}" min="1" max="40" step="1"></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Home Growth / yr</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="appr" value="{{ $appr }}" min="0" max="15" step="0.1"><span class="calc-input-suffix">%</span></div>
                    </div>
                    <div class="calc-field">
                        <label class="calc-label">Invest Return / yr</label>
                        <div class="calc-input-wrap"><input class="calc-input" type="number" data-f="inv" value="{{ $inv }}" min="0" max="15" step="0.1"><span class="calc-input-suffix">%</span></div>
                    </div>
                </div>
            </div>

            <div class="calc-result">
                <div class="calc-verdict"><span data-o="winBuy">Buy</span><span data-o="winRent">Rent</span></div>
                <div class="calc-result-label">Net Cost Difference</div>
                <div class="calc-result-amount" data-o="amount">$0</div>
                <div class="calc-result-note" data-o="note">—</div>
                <div class="calc-breakdown">
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#7C36EE;"></span>Net Cost to Buy</span><span class="calc-break-val" data-o="netBuy">$0</span></div>
                    <div class="calc-break-row"><span class="calc-break-key"><span class="calc-break-dot" style="background:#8B9096;"></span>Net Cost to Rent</span><span class="calc-break-val" data-o="netRent">$0</span></div>
                    <div class="calc-break-row is-total"><span class="calc-break-key">Buying Breaks Even</span><span class="calc-break-val" data-o="breakeven">—</span></div>
                </div>
                <a href="{{ route('agent-site.contact', $site->slug) }}" class="calc-cta">{{ $ctaLabel }}</a>
            </div>
        </div>

        <p class="calc-disclaimer">Estimates only — not financial advice. Results are highly sensitive to home appreciation, rent growth and investment-return assumptions, and exclude taxes on investment gains and the mortgage-interest deduction. Talk to a professional before deciding.</p>
    </div>
</section>

@include('agent-website.partials.calculators-script')
