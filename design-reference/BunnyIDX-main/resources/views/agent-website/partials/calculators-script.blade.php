{{--
    Global calculator logic — THEME-AGNOSTIC. Lives under partials/ (not under a
    template) so every theme shares one implementation; themes only supply the
    markup + CSS. Each calculator block is a `.calc-block[data-calc="<type>"]`
    with `[data-f]` inputs and `[data-o]` outputs; this dispatcher wires the
    matching logic to every instance on the page. Included (once) by each
    calculator block partial via @once, so it's emitted a single time per page.
--}}
@once
@push('scripts')
<script>
(function () {
    var money = function (n) { return '$' + (Math.round(n) || 0).toLocaleString('en-US'); };
    function fields(root) { var f = {}; root.querySelectorAll('[data-f]').forEach(function (el) { f[el.dataset.f] = el; }); return f; }
    function outs(root) { var o = {}; root.querySelectorAll('[data-o]').forEach(function (el) { o[el.dataset.o] = el; }); return o; }
    function num(el) { var v = parseFloat(el && el.value); return isNaN(v) ? 0 : v; }
    function on(el, cb) { if (el) el.addEventListener('input', cb); }
    function segVal(root, name, def) { var a = root.querySelector('[data-f="' + name + '"] .calc-seg-btn.active'); return a ? (parseInt(a.dataset.term, 10) || def) : def; }
    function onSeg(root, name, cb) {
        var seg = root.querySelector('[data-f="' + name + '"]'); if (!seg) return;
        seg.addEventListener('click', function (e) {
            var b = e.target.closest('.calc-seg-btn'); if (!b) return;
            seg.querySelectorAll('.calc-seg-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
            cb(parseInt(b.dataset.term, 10));
        });
    }
    // Monthly P&I for a balance at an annual rate over a number of years.
    function pay(bal, annualPct, years) { var r = annualPct / 100 / 12, n = years * 12; if (n <= 0) return 0; return r > 0 ? bal * r / (1 - Math.pow(1 + r, -n)) : bal / n; }
    // Remaining loan balance after `months` of a `years`-year loan.
    function balanceAfter(loan, annualPct, years, months) {
        var r = annualPct / 100 / 12, n = years * 12; if (months >= n) return 0;
        return r > 0 ? loan * (Math.pow(1 + r, n) - Math.pow(1 + r, months)) / (Math.pow(1 + r, n) - 1) : loan * (1 - months / n);
    }

    // Approximate average EFFECTIVE property-tax rates by US state (% of value).
    // Used by the Property Tax calculator; estimates only.
    var STATE_TAX = [
        ['AL', 'Alabama', 0.41], ['AK', 'Alaska', 1.19], ['AZ', 'Arizona', 0.62], ['AR', 'Arkansas', 0.62],
        ['CA', 'California', 0.75], ['CO', 'Colorado', 0.51], ['CT', 'Connecticut', 1.79], ['DE', 'Delaware', 0.58],
        ['DC', 'District of Columbia', 0.57], ['FL', 'Florida', 0.91], ['GA', 'Georgia', 0.92], ['HI', 'Hawaii', 0.29],
        ['ID', 'Idaho', 0.69], ['IL', 'Illinois', 2.08], ['IN', 'Indiana', 0.85], ['IA', 'Iowa', 1.57],
        ['KS', 'Kansas', 1.41], ['KY', 'Kentucky', 0.85], ['LA', 'Louisiana', 0.55], ['ME', 'Maine', 1.28],
        ['MD', 'Maryland', 1.07], ['MA', 'Massachusetts', 1.20], ['MI', 'Michigan', 1.48], ['MN', 'Minnesota', 1.11],
        ['MS', 'Mississippi', 0.79], ['MO', 'Missouri', 0.98], ['MT', 'Montana', 0.83], ['NE', 'Nebraska', 1.67],
        ['NV', 'Nevada', 0.59], ['NH', 'New Hampshire', 1.93], ['NJ', 'New Jersey', 2.47], ['NM', 'New Mexico', 0.78],
        ['NY', 'New York', 1.72], ['NC', 'North Carolina', 0.82], ['ND', 'North Dakota', 0.98], ['OH', 'Ohio', 1.59],
        ['OK', 'Oklahoma', 0.90], ['OR', 'Oregon', 0.93], ['PA', 'Pennsylvania', 1.49], ['RI', 'Rhode Island', 1.40],
        ['SC', 'South Carolina', 0.57], ['SD', 'South Dakota', 1.17], ['TN', 'Tennessee', 0.67], ['TX', 'Texas', 1.68],
        ['UT', 'Utah', 0.57], ['VT', 'Vermont', 1.83], ['VA', 'Virginia', 0.82], ['WA', 'Washington', 0.94],
        ['WV', 'West Virginia', 0.58], ['WI', 'Wisconsin', 1.61], ['WY', 'Wyoming', 0.61]
    ];
    var US_AVG_TAX = 1.10;

    var wirers = {
        mortgage: function (root) {
            var f = fields(root), o = outs(root), term = segVal(root, 'term', 30);
            function calc() {
                var p = num(f.price), loan = Math.max(p - num(f.downAmt), 0);
                var pi = pay(loan, num(f.rate), term);
                var taxMo = num(f.tax) / 12, insMo = num(f.ins) / 12, hoaMo = num(f.hoa);
                o.pi.textContent = money(pi); o.taxMo.textContent = money(taxMo);
                o.insMo.textContent = money(insMo); o.hoaMo.textContent = money(hoaMo);
                o.total.innerHTML = money(pi + taxMo + insMo + hoaMo) + '<span>/mo</span>';
            }
            on(f.price, function () { if (f.downAmt) f.downAmt.value = Math.round(num(f.price) * num(f.downPct) / 100); calc(); });
            on(f.downPct, function () { if (f.downAmt) f.downAmt.value = Math.round(num(f.price) * num(f.downPct) / 100); calc(); });
            on(f.downAmt, function () { if (f.downPct) f.downPct.value = num(f.price) > 0 ? +(num(f.downAmt) / num(f.price) * 100).toFixed(1) : 0; calc(); });
            [f.rate, f.tax, f.ins, f.hoa].forEach(function (el) { on(el, calc); });
            onSeg(root, 'term', function (t) { term = t || 30; calc(); });
            calc();
        },

        affordability: function (root) {
            var f = fields(root), o = outs(root), term = segVal(root, 'term', 30);
            function calc() {
                var budget = Math.max(num(f.income) / 12 * (num(f.dti) / 100) - num(f.debts), 0);
                var r = num(f.rate) / 100 / 12, n = term * 12;
                var k = r > 0 ? r / (1 - Math.pow(1 + r, -n)) : (n > 0 ? 1 / n : 0);
                var taxIns = (num(f.taxRate) + num(f.insRate)) / 100 / 12;
                var down = num(f.down), hoa = num(f.hoa);
                var loan = Math.max((budget - hoa - down * taxIns) / (k + taxIns), 0);
                var price = loan + down, pi = loan * k, payment = pi + price * taxIns + hoa;
                o.price.textContent = money(price); o.loan.textContent = money(loan);
                o.down.textContent = money(down); o.budget.textContent = money(budget) + '/mo';
                o.payment.textContent = money(payment) + '/mo';
                if (o.meter) {
                    o.meter.style.width = (budget > 0 ? Math.min(payment / budget * 100, 100) : 0).toFixed(0) + '%';
                    o.meterPay.textContent = money(payment) + '/mo payment';
                    o.meterBudget.textContent = money(budget) + '/mo budget';
                }
            }
            ['income', 'debts', 'down', 'rate', 'dti', 'taxRate', 'insRate', 'hoa'].forEach(function (k) { on(f[k], calc); });
            onSeg(root, 'term', function (t) { term = t || 30; calc(); });
            calc();
        },

        refinance: function (root) {
            var f = fields(root), o = outs(root), newTerm = segVal(root, 'newTerm', 30);
            function calc() {
                var bal = num(f.balance), curTerm = Math.max(num(f.curTerm), 1);
                var curPay = pay(bal, num(f.curRate), curTerm), newPay = pay(bal, num(f.newRate), newTerm);
                var savings = curPay - newPay, costs = num(f.costs);
                var lifetime = (curPay * curTerm * 12 - bal) - (newPay * newTerm * 12 - bal) - costs;
                var amt = o.savings;
                amt.innerHTML = money(savings) + '<span>/mo</span>';
                amt.classList.toggle('is-good', savings > 0); amt.classList.toggle('is-bad', savings < 0);
                o.newPayTile.textContent = money(newPay); o.curPayTile.textContent = money(curPay);
                if (savings > 0 && costs > 0) {
                    var m = Math.ceil(costs / savings);
                    o.breakeven.textContent = m + (m === 1 ? ' month' : ' months');
                    o.breakevenNote.textContent = 'Recoup $' + Math.round(costs).toLocaleString('en-US') + ' in costs in ' + m + ' months';
                } else {
                    o.breakeven.textContent = savings > 0 ? 'Immediate' : 'No savings';
                    o.breakevenNote.textContent = savings > 0 ? 'No upfront costs to recoup' : 'New payment is higher than current';
                }
                o.lifetime.textContent = money(lifetime);
            }
            ['balance', 'curRate', 'curTerm', 'newRate', 'costs'].forEach(function (k) { on(f[k], calc); });
            onSeg(root, 'newTerm', function (t) { newTerm = t || 30; calc(); });
            calc();
        },

        'rent-vs-buy': function (root) {
            var f = fields(root), o = outs(root), term = segVal(root, 'term', 30);
            function calc() {
                var price = num(f.price), down = price * num(f.downPct) / 100, loan = Math.max(price - down, 0);
                var pi = pay(loan, num(f.rate), term);
                var years = Math.max(Math.round(num(f.years)), 1);
                var appr = num(f.appr) / 100, rentInc = num(f.rentInc) / 100, inv = num(f.inv) / 100;
                var annualOwn = pi * 12 + num(f.tax) + num(f.ins) + num(f.maint) + num(f.hoa) * 12;
                var cumBuy = 0, cumRent = 0, curRent = num(f.rent) * 12, breakEven = null, netBuy = 0, netRent = 0;
                for (var y = 1; y <= years; y++) {
                    cumBuy += annualOwn; cumRent += curRent; curRent *= (1 + rentInc);
                    var bal = balanceAfter(loan, num(f.rate), term, Math.min(y * 12, term * 12));
                    var homeVal = price * Math.pow(1 + appr, y), equity = homeVal - bal - homeVal * 0.06;
                    netBuy = down + cumBuy - equity + down * (Math.pow(1 + inv, y) - 1);
                    netRent = cumRent;
                    if (breakEven === null && netBuy <= netRent) breakEven = y;
                }
                var diff = netRent - netBuy, buyWins = diff >= 0;
                o.amount.textContent = money(Math.abs(diff));
                o.note.textContent = (buyWins ? 'Buying' : 'Renting') + ' is cheaper over ' + years + ' year' + (years === 1 ? '' : 's');
                if (o.winBuy) { o.winBuy.classList.toggle('is-win', buyWins); o.winRent.classList.toggle('is-win', !buyWins); }
                o.netBuy.textContent = money(netBuy); o.netRent.textContent = money(netRent);
                o.breakeven.textContent = breakEven ? ('Year ' + breakEven) : (buyWins ? 'Immediate' : 'Never within ' + years + ' yrs');
            }
            ['price', 'downPct', 'rate', 'tax', 'ins', 'maint', 'hoa', 'rent', 'rentInc', 'years', 'appr', 'inv'].forEach(function (k) { on(f[k], calc); });
            onSeg(root, 'term', function (t) { term = t || 30; calc(); });
            attachAddressLookup(root, f, o, calc);
            calc();
        },

        'closing-cost': function (root) {
            var f = fields(root), o = outs(root);
            function calc() {
                var price = num(f.price), loan = Math.max(price - price * num(f.downPct) / 100, 0);
                var lender = loan * num(f.lenderPct) / 100;
                var title = price * num(f.titlePct) / 100;
                var gov = price * num(f.govPct) / 100;
                var fixed = num(f.fixed), prepaids = num(f.prepaids);
                var total = lender + title + gov + fixed + prepaids;
                o.lender.textContent = money(lender); o.title.textContent = money(title);
                o.gov.textContent = money(gov); o.fixed.textContent = money(fixed); o.prepaids.textContent = money(prepaids);
                o.total.textContent = money(total);
                o.cash.textContent = money(price * num(f.downPct) / 100 + total);
                o.pctNote.textContent = (price > 0 ? (total / price * 100).toFixed(1) : '0') + '% of the purchase price';
            }
            ['price', 'downPct', 'lenderPct', 'titlePct', 'govPct', 'fixed', 'prepaids'].forEach(function (k) { on(f[k], calc); });
            attachAddressLookup(root, f, o, calc);
            calc();
        },

        'property-tax': function (root) {
            var f = fields(root), o = outs(root), sel = f.state;
            if (sel && sel.options.length === 0) {
                STATE_TAX.forEach(function (s) {
                    var op = document.createElement('option');
                    op.value = s[0]; op.textContent = s[1]; op.dataset.rate = s[2];
                    sel.appendChild(op);
                });
                var def = (root.dataset.defaultState || 'FL').toUpperCase();
                sel.value = STATE_TAX.some(function (s) { return s[0] === def; }) ? def : 'FL';
            }
            function applyStateRate() { if (sel && f.rate) { var op = sel.selectedOptions[0]; if (op) f.rate.value = op.dataset.rate; } }
            function calc() {
                var annual = num(f.value) * num(f.rate) / 100;
                o.annual.textContent = money(annual);
                o.monthly.textContent = money(annual / 12) + '/mo';
                o.rateNote.textContent = num(f.rate).toFixed(2) + '% effective rate';
                if (o.vsAvg) { var diff = num(f.rate) - US_AVG_TAX; o.vsAvg.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(2) + '% vs U.S. average'; }
            }
            if (sel) sel.addEventListener('change', function () { applyStateRate(); calc(); });
            on(f.value, calc); on(f.rate, calc);
            applyStateRate(); calc();
        },

        'home-value': function (root) {
            var f = fields(root), o = outs(root);
            function condMult() { var op = f.cond && f.cond.selectedOptions[0]; return op ? (parseFloat(op.value) || 1) : 1; }
            function calc() {
                var mid = num(f.sqft) * num(f.ppsf) * condMult();
                var low = mid * 0.92, high = mid * 1.08;
                o.value.textContent = money(mid);
                o.range.textContent = money(low) + ' – ' + money(high);
                o.ppsfNote.textContent = '$' + Math.round(num(f.ppsf) * condMult()).toLocaleString('en-US') + '/sq ft effective';
                o.low.textContent = money(low); o.high.textContent = money(high);
            }
            on(f.sqft, calc); on(f.ppsf, calc);
            if (f.cond) f.cond.addEventListener('change', calc);

            // Optional: derive local $/sq ft from nearby MLS listings by address.
            var btn = root.querySelector('[data-lookup]'), addr = f.address, status = o.lookupStatus, url = root.dataset.searchUrl;
            if (btn && addr && url) {
                btn.addEventListener('click', function () {
                    var q = addr.value.trim(); if (!q) return;
                    if (status) status.textContent = 'Finding comparable sold listings…';
                    // SOLD/closed comps drive the estimate (this block is only shown
                    // when the MLS carries sold data).
                    fetch(url + '?filters[query]=' + encodeURIComponent(q) + '&filters[statuses][]=Closed&filters[statuses][]=Sold', { headers: { 'Accept': 'application/json' } })
                        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
                        .then(function (d) {
                            var sum = 0, n = 0;
                            (d.listings || []).forEach(function (l) {
                                var p = l.price, s = parseFloat(String(l.sqft || '').replace(/[^0-9.]/g, ''));
                                if (p && s) { sum += p / s; n++; }
                            });
                            if (n > 0) {
                                var avg = sum / n; f.ppsf.value = Math.round(avg); calc();
                                if (status) status.textContent = 'Based on ' + n + ' sold comp' + (n === 1 ? '' : 's') + ' — $' + Math.round(avg).toLocaleString('en-US') + '/sq ft.';
                            } else if (status) { status.textContent = 'No sold comps found near that address — adjust the price per sq ft.'; }
                        })
                        .catch(function () { if (status) status.textContent = 'Lookup unavailable — enter a price per sq ft.'; });
                });
            }
            calc();
        }
    };

    // Optional: prefill the home price from the owner's MLS by address, reusing
    // the public property-search endpoint. Degrades gracefully to manual entry.
    function attachAddressLookup(root, f, o, calc) {
        var lookupBtn = root.querySelector('[data-lookup]'), addr = f.address, status = o.lookupStatus, url = root.dataset.searchUrl;
        if (!lookupBtn || !addr || !url) return;
        lookupBtn.addEventListener('click', function () {
            var q = addr.value.trim(); if (!q) return;
            if (status) status.textContent = 'Searching…';
            fetch(url + '?filters[query]=' + encodeURIComponent(q), { headers: { 'Accept': 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
                .then(function (d) {
                    var l = (d.listings || [])[0];
                    if (l && l.price && f.price) {
                        f.price.value = Math.round(l.price); calc();
                        if (status) status.textContent = 'Pulled ' + (l.price_formatted || money(l.price)) + (l.address ? ' — ' + l.address : '') + '.';
                    } else if (status) { status.textContent = 'No MLS match — enter the price manually.'; }
                })
                .catch(function () { if (status) status.textContent = 'Lookup unavailable — enter the price manually.'; });
        });
    }

    document.querySelectorAll('.calc-block[data-calc]').forEach(function (root) {
        var w = wirers[root.dataset.calc];
        if (w) w(root);
    });
})();
</script>
@endpush
@endonce
