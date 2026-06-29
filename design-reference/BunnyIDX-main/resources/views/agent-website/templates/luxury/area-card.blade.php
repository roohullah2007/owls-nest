{{--
    Luxury community-page property card (theme-scoped — redesign per theme).
    Rounded image, price below, "Single Family · 5 bd · 7 ba · Pending" meta
    row, address line and the MLS® number. Pass $prop
    (FeaturedListingsResolver card shape).
--}}
@php
    $apImg = trim((string) ($prop['image'] ?? ''));
    $apImgUrl = $apImg ? (\Illuminate\Support\Str::startsWith($apImg, ['http://', 'https://']) ? $apImg : Storage::url($apImg)) : '';
    $apStatus = trim((string) ($prop['status'] ?? ''));
    $apPrice = trim((string) ($prop['price'] ?? ''));
    $apAddr = trim((string) ($prop['address'] ?? ''));
    $apBeds = trim((string) ($prop['beds'] ?? ''));
    $apBaths = trim((string) ($prop['baths'] ?? ''));
    $apSqft = trim((string) ($prop['sqft'] ?? ''));
    $apSubtype = trim((string) ($prop['property_subtype'] ?? ''));
    $apMls = trim((string) ($prop['mls_number'] ?? ''));
    $apLink = trim((string) ($prop['link'] ?? ''));
    $apTag = $apLink ? 'a' : 'div';
    $apMeta = array_filter([
        $apSubtype !== '' ? $apSubtype : null,
        $apBeds !== '' ? "{$apBeds} bd" : null,
        $apBaths !== '' ? "{$apBaths} ba" : null,
        $apSqft !== '' ? "{$apSqft} sqft" : null,
    ]);
@endphp
<{{ $apTag }} class="ap-card" @if($apLink) href="{{ $apLink }}" @endif>
    <div class="ap-card-img">
        @if($apImgUrl)
        <img src="{{ $apImgUrl }}" alt="{{ $apAddr }}" loading="lazy" decoding="async">
        @else
        <span class="ap-card-imgempty">Property Photo</span>
        @endif
    </div>
    <div class="ap-card-body">
        @if($apPrice)<p class="ap-card-price">{{ $apPrice }}</p>@endif
        @if($apMeta || $apStatus)
        <p class="ap-card-meta">
            {{ implode(' · ', $apMeta) }}@if($apMeta && $apStatus) · @endif
            @if($apStatus)<span class="ap-card-status">{{ $apStatus }}</span>@endif
        </p>
        @endif
        @if($apAddr)<p class="ap-card-addr">{{ $apAddr }}</p>@endif
        @if($apMls)<p class="ap-card-mls">MLS&reg;: {{ $apMls }}</p>@endif
    </div>
</{{ $apTag }}>
