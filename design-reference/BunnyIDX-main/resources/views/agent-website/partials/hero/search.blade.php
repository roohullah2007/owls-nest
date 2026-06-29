{{--
    Hero tabbed search (luxury). One data-driven form per enabled tab (buy / rent
    / sell / value) — collapses what used to be four near-identical form blocks.
    Relies on $heroTabs, $tabAlign and $site from the home page's hero config block.

    Buy/Rent feed straight into the property-search app (/properties?q=…) in
    'locations' mode: when an MLS is connected the autocomplete is EXCLUSIVELY
    the datasets' declared vocabulary (cities / neighborhoods / counties / zips
    / states, feed-exact spellings — see MlsDataset::getCities() etc.); Google
    Places (US-only) only fills in when no MLS is connected. Sell/Value capture
    a street address via Places 'address' mode (US-only). See site-suggest.
--}}
@php
    // Dataset-declared locations (1h-cached per owner via PublicPropertySearch).
    $heroLocations = app(\App\Services\Mls\PublicPropertySearch::class)->locationSuggestions($site);
    $heroSearchForms = [
        'buy'   => ['action' => route('agent-site.properties', $site->slug), 'name' => 'q',       'placeholder' => 'Search address or city',          'submit' => 'Search',       'suggest' => 'locations'],
        'rent'  => ['action' => route('agent-site.properties', $site->slug), 'name' => 'q',       'placeholder' => 'Search rentals by location',      'submit' => 'Search',       'suggest' => 'locations', 'extra' => ['transaction' => 'rent']],
        'sell'  => ['action' => route('agent-site.sell', $site->slug),       'name' => 'address', 'placeholder' => 'Enter your property address',     'submit' => 'Get Started',  'suggest' => 'address'],
        'value' => ['action' => route('agent-site.sell', $site->slug),       'name' => 'address', 'placeholder' => 'Enter your home address',         'submit' => 'Get Estimate', 'suggest' => 'address'],
    ];
@endphp
<div class="hero-search hero-search-{{ $tabAlign }}" id="heroSearch">
    <div class="hero-search-tabs">
        @foreach($heroTabs as $i => $tab)
        <button type="button" class="hero-search-tab{{ $i === 0 ? ' active' : '' }}" data-tab="{{ $tab['key'] }}">{{ $tab['label'] }}</button>
        @endforeach
    </div>
    @foreach($heroTabs as $i => $tab)
        @php
            $f = $heroSearchForms[$tab['key']] ?? null;
            // Buy/Rent feed the property search, so per-tab default filters apply.
            $isSearchTab = in_array($tab['key'], ['buy', 'rent'], true);
            $aiOn = $isSearchTab && ! empty($tab['ai']);
            $placeholder = $aiOn ? 'Describe your ideal home…' : ($f['placeholder'] ?? '');
            $prefill = $isSearchTab ? ($tab['loc'] ?? '') : '';
        @endphp
        @if($f)
        <form class="hero-search-bar{{ $i === 0 ? ' active' : '' }}{{ $aiOn ? ' is-ai' : '' }}" data-panel="{{ $tab['key'] }}" action="{{ $f['action'] }}" method="GET">
            <div class="hero-search-field js-hero-suggest" data-mode="{{ $aiOn ? 'off' : $f['suggest'] }}">
                <input type="text" name="{{ $f['name'] }}" value="{{ $prefill }}" placeholder="{{ $placeholder }}" autocomplete="off">
                <div class="hero-search-suggest" hidden></div>
            </div>
            @foreach($f['extra'] ?? [] as $k => $v)
            <input type="hidden" name="{{ $k }}" value="{{ $v }}">
            @endforeach
            @if($aiOn)
            <input type="hidden" name="ai" value="1">
            @endif
            @if($isSearchTab)
                @if(! empty($tab['ptype']))<input type="hidden" name="property_type" value="{{ $tab['ptype'] }}">@endif
                @foreach($tab['subtypes'] ?? [] as $st)<input type="hidden" name="property_subtypes" value="{{ $st }}">@endforeach
                @if(! empty($tab['status']))<input type="hidden" name="status" value="{{ $tab['status'] }}">@endif
                @if(! empty($tab['min_price']))<input type="hidden" name="min_price" value="{{ $tab['min_price'] }}">@endif
                @if(! empty($tab['max_price']))<input type="hidden" name="max_price" value="{{ $tab['max_price'] }}">@endif
            @endif
            <button type="submit">{{ $aiOn ? 'Search' : $f['submit'] }}</button>
        </form>
        @endif
    @endforeach
</div>

@include('agent-website.partials.site-suggest')
@push('scripts')
<script>
(function () {
    var LOCATIONS = @json($heroLocations);
    document.querySelectorAll('#heroSearch .js-hero-suggest').forEach(function (wrap) {
        var input = wrap.querySelector('input');
        // AI tabs take free-form natural language — no location/address autocomplete.
        if ((wrap.dataset.mode || '') === 'off') return;
        window.SiteSuggest.attach({
            wrap: wrap,
            input: input,
            panel: wrap.querySelector('.hero-search-suggest'),
            mode: wrap.dataset.mode || 'locations',
            locations: LOCATIONS,
            itemClass: 'hero-search-suggest-item',
            hintClass: 'hero-search-suggest-hint',
            onPick: function (value) {
                input.value = value;
                input.closest('form').submit();
            }
        });
    });
})();
</script>
@endpush
