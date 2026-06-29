{{--
    Logo marquee — a seamless scrolling row of partner/brand logos. The logo set
    is rendered twice so the -50% keyframe loops without a seam. Data: logos
    (JSON string of [{image, link}]), bg_color, monochrome ('1'/'0'), speed (s).
--}}
@php
    $lmLogos = json_decode($block['data']['logos'] ?? '[]', true);
    $lmLogos = is_array($lmLogos) ? array_values(array_filter($lmLogos, fn ($l) => is_array($l) && ! empty($l['image']))) : [];
    $lmBg = trim((string) ($block['data']['bg_color'] ?? '')) ?: '#FFFFFF';
    $lmMono = ($block['data']['monochrome'] ?? '1') === '1';
    $lmSpeed = (int) ($block['data']['speed'] ?? 30);
    $lmSpeed = $lmSpeed >= 5 && $lmSpeed <= 120 ? $lmSpeed : 30;
    // No logos added yet → show dummy placeholders so the marquee still reads as
    // a logo strip (and previews correctly in the editor).
    $lmDummy = count($lmLogos) === 0;
    $lmRender = $lmDummy ? array_fill(0, 6, ['image' => '', 'link' => '']) : $lmLogos;
    $lmTitle = trim((string) ($block['data']['title'] ?? ''));
@endphp
<section class="logo-marquee{{ $lmMono ? ' logo-marquee-mono' : '' }}" style="background-color: {{ $lmBg }}; --logo-speed: {{ $lmSpeed }}s;">
    @if($lmTitle)<p class="logo-marquee-title">{{ $lmTitle }}</p>@endif
    <div class="logo-marquee-track">
        @foreach(array_merge($lmRender, $lmRender) as $logo)
            <div class="logo-marquee-item">
                @if($lmDummy)
                    <div class="logo-marquee-item-placeholder">Your Logo</div>
                @else
                    @php
                        $img = $logo['image'] ?? '';
                        $imgSrc = \Illuminate\Support\Str::startsWith($img, ['http://', 'https://']) ? $img : Storage::url($img);
                        $link = trim((string) ($logo['link'] ?? ''));
                    @endphp
                    @if($link)
                    <a href="{{ $link }}" target="_blank" rel="noopener"><img src="{{ $imgSrc }}" alt="" loading="lazy"></a>
                    @else
                    <img src="{{ $imgSrc }}" alt="" loading="lazy">
                    @endif
                @endif
            </div>
        @endforeach
    </div>
</section>
