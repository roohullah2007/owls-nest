{{--
    CTA block — full-bleed background image with a muted overlay and a centered
    frosted card: eyebrow label, divider, heading, description, and a pill button
    with a trailing line. Data: image, eyebrow, heading, description,
    button_label, button_link.
--}}
@php
    $ctaImg = trim((string) ($block['data']['image'] ?? ''));
    $ctaImgUrl = $ctaImg ? (\Illuminate\Support\Str::startsWith($ctaImg, ['http://', 'https://']) ? $ctaImg : Storage::url($ctaImg)) : '';
    $ctaEyebrow = trim((string) ($block['data']['eyebrow'] ?? ''));
    $ctaHeading = trim((string) ($block['data']['heading'] ?? ''));
    $ctaDesc = trim((string) ($block['data']['description'] ?? ''));
    $ctaBtnLabel = trim((string) ($block['data']['button_label'] ?? ''));
    $ctaBtnLink = trim((string) ($block['data']['button_link'] ?? '')) ?: '#';
@endphp
<section class="cta-block"@if($ctaImgUrl) style="background-image: url('{{ $ctaImgUrl }}');"@endif>
    <div class="cta-overlay"></div>
    <div class="cta-card">
        @if($ctaEyebrow)<p class="cta-eyebrow">{{ $ctaEyebrow }}</p>@endif
        <div class="cta-divider"></div>
        @if($ctaHeading)<h2 class="cta-heading">{{ $ctaHeading }}</h2>@endif
        @if($ctaDesc)<p class="cta-desc">{{ $ctaDesc }}</p>@endif
        @if($ctaBtnLabel)
        <a href="{{ $ctaBtnLink }}" class="cta-btn">{{ $ctaBtnLabel }}<span class="cta-btn-line"></span></a>
        @endif
    </div>
</section>
