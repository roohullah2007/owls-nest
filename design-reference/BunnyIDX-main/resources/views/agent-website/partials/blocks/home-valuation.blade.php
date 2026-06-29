{{--
    Home Valuation block — centered headline / divider / description and an inline
    address bar. Submitting the address starts the valuation flow: it GETs the
    valuation results page (address on a map; automatic valuation figure to
    follow). Data: headline, description, cta_text, placeholder,
    theme (light|dark, default light), bg_image (optional, theme-tinted overlay),
    bg_color / font_color (dark theme only — override the palette).
--}}
@php
    $hvHeadline = trim((string) ($block['data']['headline'] ?? '')) ?: "WHAT'S YOUR HOME WORTH?";
    $hvDesc = trim((string) ($block['data']['description'] ?? ''))
        ?: 'Get a free, no-obligation home valuation from a local expert. Enter your address to see your property and what it could sell for in today’s market.';
    $hvCta = trim((string) ($block['data']['cta_text'] ?? '')) ?: 'Get Valuation';
    $hvPlaceholder = trim((string) ($block['data']['placeholder'] ?? '')) ?: 'Enter your home address';
    $hvTheme = (($block['data']['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';

    $hvImg = trim((string) ($block['data']['bg_image'] ?? ''));
    $hvImgUrl = $hvImg ? (\Illuminate\Support\Str::startsWith($hvImg, ['http://', 'https://']) ? $hvImg : Storage::url($hvImg)) : '';

    // Custom colors apply on the dark theme only (the light theme is the fixed
    // default). bg_color retints the section + image overlay; font_color drives
    // the heading and (at 72%) the secondary text.
    $hvBg = $hvTheme === 'dark' ? trim((string) ($block['data']['bg_color'] ?? '')) : '';
    $hvFont = $hvTheme === 'dark' ? trim((string) ($block['data']['font_color'] ?? '')) : '';
    $hvStyle = ($hvImgUrl ? "background-image: url('{$hvImgUrl}');" : '')
        . ($hvBg ? " --hv-bg: {$hvBg}; --hv-overlay: color-mix(in srgb, {$hvBg} 62%, transparent);" : '')
        . ($hvFont ? " --hv-fg: {$hvFont}; --hv-text: color-mix(in srgb, {$hvFont} 72%, transparent);" : '');
    $hvStyle = trim($hvStyle);
@endphp
<section class="hv-block hv-theme-{{ $hvTheme }}{{ $hvImgUrl ? ' hv-has-image' : '' }}"@if($hvStyle) style="{{ $hvStyle }}"@endif>
    @if($hvImgUrl)<div class="hv-overlay"></div>@endif
    <div class="hv-inner">
        {{-- Hero headline is the page's H1 (this block is always a page hero). --}}
        <h1 class="hv-title">{{ $hvHeadline }}</h1>
        <div class="hv-divider"></div>
        <p class="hv-desc">{{ $hvDesc }}</p>
        <form class="hv-form" method="GET" action="{{ route('agent-site.home-valuation', $site->slug) }}">
            <div class="hv-field js-hv-suggest">
                <input type="text" name="address" class="hv-input" placeholder="{{ $hvPlaceholder }}" required autocomplete="off">
                <div class="hv-suggest" hidden></div>
            </div>
            <button type="submit" class="hv-submit">{{ $hvCta }}</button>
        </form>
    </div>
</section>

@include('agent-website.partials.site-suggest')
@once
@push('scripts')
<script>
(function () {
    // US-only street-address autocomplete on the valuation address bar.
    document.querySelectorAll('.js-hv-suggest').forEach(function (wrap) {
        var input = wrap.querySelector('input');
        window.SiteSuggest.attach({
            wrap: wrap,
            input: input,
            panel: wrap.querySelector('.hv-suggest'),
            mode: 'address',
            itemClass: 'hv-suggest-item',
            onPick: function (value) { input.value = value; }
        });
    });
})();
</script>
@endpush
@endonce
