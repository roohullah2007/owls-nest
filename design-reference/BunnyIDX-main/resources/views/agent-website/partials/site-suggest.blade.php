{{--
    Shared autocomplete core for public-site location/address inputs (hero
    search tabs, home-valuation block). Exposes window.SiteSuggest.attach().

    Two modes:
      locations : MLS-first. When the connected datasets declare a location
                  vocabulary (cities/neighborhoods/counties/zips/states), the
                  suggestions are EXCLUSIVELY those values — feed-exact
                  spellings the search can actually answer. Google Places
                  (US-only geocode) is the fallback ONLY when no MLS is
                  connected.
      address   : street-address capture (Sell / Home Value). Google Places
                  address predictions, restricted to the US.

    The Maps SDK loads lazily on first focus (and only when a mode actually
    needs Places), so pages stay fast and no Google quota is spent while an
    MLS vocabulary is serving the suggestions.
--}}
@once
@push('scripts')
<script>
window.SiteSuggest = (function () {
    var KEY = @json(config('services.google.maps_key') ?: null);
    var loading = null;

    function loadMaps() {
        if (!KEY) return Promise.reject();
        if (window.google && window.google.maps && window.google.maps.places) return Promise.resolve();
        if (loading) return loading;
        loading = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(KEY) + '&v=weekly&libraries=places';
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
        return loading;
    }

    // Word-prefix matches rank above mid-word ones ("boca" → "Boca Raton, FL" first).
    function localMatches(locations, q) {
        q = q.toLowerCase();
        var starts = [], contains = [];
        for (var i = 0; i < locations.length; i++) {
            var hay = locations[i].label.toLowerCase();
            if (hay.indexOf(q) === 0 || hay.split(/[\s,]+/).some(function (w) { return w.indexOf(q) === 0; })) starts.push(locations[i]);
            else if (hay.indexOf(q) !== -1) contains.push(locations[i]);
            if (starts.length >= 6) break;
        }
        return starts.concat(contains).slice(0, 6);
    }

    /**
     * opts: { wrap, input, panel, mode: 'locations'|'address',
     *         locations: [{label, value, type}], itemClass, hintClass,
     *         onPick(value) }
     */
    function attach(opts) {
        var input = opts.input, panel = opts.panel;
        var locations = (opts.mode === 'locations' && opts.locations) ? opts.locations : [];
        // MLS vocabulary present → MLS-only suggestions; Places never fires.
        var usePlaces = !!KEY && (opts.mode === 'address' || locations.length === 0);
        var svc = null, timer = null;

        function hide() { panel.hidden = true; panel.innerHTML = ''; }

        function addItem(label, value, hint) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = opts.itemClass;
            item.textContent = label;
            if (hint && opts.hintClass) {
                var tag = document.createElement('span');
                tag.className = opts.hintClass;
                tag.textContent = hint;
                item.appendChild(tag);
            }
            item.addEventListener('click', function () {
                hide();
                opts.onPick(value);
            });
            panel.appendChild(item);
        }

        function render(local, predictions) {
            panel.innerHTML = '';
            (local || []).forEach(function (m) { addItem(m.label, m.value, m.type); });
            (predictions || []).slice(0, Math.max(0, 5 - (local ? local.length : 0))).forEach(function (p) {
                addItem(p.description, p.description, null);
            });
            panel.hidden = panel.childElementCount === 0;
        }

        input.addEventListener('focus', function () { if (usePlaces) loadMaps().catch(function () {}); });
        input.addEventListener('input', function () {
            clearTimeout(timer);
            var q = input.value.trim();
            if (q.length < 2) { hide(); return; }
            var local = localMatches(locations, q);
            render(local, null);
            if (!usePlaces || local.length >= 5) return;
            timer = setTimeout(function () {
                loadMaps().then(function () {
                    svc = svc || new google.maps.places.AutocompleteService();
                    svc.getPlacePredictions({
                        input: q,
                        types: [opts.mode === 'address' ? 'address' : 'geocode'],
                        componentRestrictions: { country: 'us' }
                    }, function (preds, status) {
                        if (input.value.trim() !== q) return; // stale response
                        if (status !== google.maps.places.PlacesServiceStatus.OK) { render(local, null); return; }
                        render(local, preds);
                    });
                }).catch(function () {});
            }, 250);
        });
        document.addEventListener('click', function (e) {
            if (!opts.wrap.contains(e.target)) hide();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') hide();
        });
    }

    return { attach: attach };
})();
</script>
@endpush
@endonce
