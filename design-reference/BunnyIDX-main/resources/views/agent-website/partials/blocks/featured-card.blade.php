{{-- A single property card — shared by all Featured Listings variants.
     Pass $prop and $size ('big' | 'thumb' | 'sm'). --}}
@php
    $flSize = $size ?? 'sm';
    $flImg = trim((string) ($prop['image'] ?? ''));
    $flImgUrl = $flImg ? (\Illuminate\Support\Str::startsWith($flImg, ['http://', 'https://']) ? $flImg : Storage::url($flImg)) : '';
    $flStatus = trim((string) ($prop['status'] ?? ''));
    $flPrice = trim((string) ($prop['price'] ?? ''));
    $flAddr = trim((string) ($prop['address'] ?? ''));
    $flBeds = trim((string) ($prop['beds'] ?? ''));
    $flBaths = trim((string) ($prop['baths'] ?? ''));
    $flSqft = trim((string) ($prop['sqft'] ?? ''));
    $flLink = trim((string) ($prop['link'] ?? ''));
    $flShowSqft = $flSize !== 'thumb';
    $flTag = $flLink ? 'a' : 'div';
@endphp
<{{ $flTag }} class="fl-card fl-card-{{ $flSize }}" @if($flLink) href="{{ $flLink }}" @endif>
    @if($flImgUrl)
    <img src="{{ $flImgUrl }}" alt="{{ $flAddr }}" loading="lazy">
    @else
    <div class="fl-card-empty">Property Photo</div>
    @endif
    @if($flStatus)<span class="fl-status">{{ $flStatus }}</span>@endif
    @if($flPrice || $flAddr || $flBeds || $flBaths || $flSqft)
    <div class="fl-info">
        @if($flPrice)<p class="fl-price">{{ $flPrice }}</p>@endif
        @if($flAddr)<p class="fl-addr">{{ $flAddr }}</p>@endif
        @if($flBeds || $flBaths || ($flShowSqft && $flSqft))
        <div class="fl-specs">
            @if($flBeds)
            <span class="fl-spec"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M3 12v6a2 2 0 002 2h14a2 2 0 002-2v-6M3 12V6a2 2 0 012-2h14a2 2 0 012 2v6"/></svg>{{ $flBeds }} Beds</span>
            @endif
            @if($flBaths)
            <span class="fl-spec"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 10V6a2 2 0 012-2h2v6M4 10h16M4 10v8a2 2 0 002 2h12a2 2 0 002-2v-8"/></svg>{{ $flBaths }} Baths</span>
            @endif
            @if($flShowSqft && $flSqft)
            <span class="fl-spec"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>{{ $flSqft }} Sq.Ft.</span>
            @endif
        </div>
        @endif
    </div>
    @endif
</{{ $flTag }}>
