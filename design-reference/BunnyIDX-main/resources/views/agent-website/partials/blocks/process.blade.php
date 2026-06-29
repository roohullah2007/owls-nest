{{--
    How It Works (process) block — a numbered, step-by-step process shown either
    as a row of cards or a vertical timeline. Each step has a title, description,
    and optionally a curated icon or an uploaded image. Numbers (1, 2, 3…) are
    optional. Data: title, description, layout (row|vertical), align, show_numbers,
    media_type (icon|image|none), accent_color, bg_color, text_color, items (JSON
    string of [{title, description, icon, image}]).
--}}
@php
    $prTitle = trim((string) ($block['data']['title'] ?? ''));
    $prDesc = trim((string) ($block['data']['description'] ?? ''));
    $prLayout = (($block['data']['layout'] ?? 'row') === 'vertical') ? 'vertical' : 'row';
    $prAlign = in_array(($block['data']['align'] ?? 'center'), ['left', 'center', 'right'], true) ? ($block['data']['align'] ?? 'center') : 'center';
    $prShowNumbers = ($block['data']['show_numbers'] ?? '1') === '1';
    $prMedia = in_array(($block['data']['media_type'] ?? 'icon'), ['icon', 'image', 'none'], true) ? ($block['data']['media_type'] ?? 'icon') : 'icon';
    $prItems = json_decode($block['data']['items'] ?? '[]', true);
    $prItems = is_array($prItems) ? array_values(array_filter($prItems, fn ($i) => is_array($i))) : [];
    $prAccent = trim((string) ($block['data']['accent_color'] ?? ''));
    $prBg = trim((string) ($block['data']['bg_color'] ?? ''));
    $prText = trim((string) ($block['data']['text_color'] ?? ''));
    $prStyle = ($prBg ? 'background-color: ' . $prBg . ';' : '')
        . ($prText ? ' --pr-fg: ' . $prText . ';' : '')
        . ($prAccent ? ' --pr-accent: ' . $prAccent . ';' : '');
    $prCount = min(count($prItems), 4);
@endphp
@if(count($prItems))
<section class="pr-block pr-block-{{ $prLayout }}" @if($prStyle) style="{{ $prStyle }}" @endif>
    <div class="pr-inner">
        @if($prTitle || $prDesc)
        <div class="pr-head pr-head-{{ $prAlign }}">
            @if($prTitle)<h2 class="pr-title">{{ $prTitle }}</h2>@endif
            @if($prDesc)<p class="pr-desc">{{ $prDesc }}</p>@endif
        </div>
        @endif

        <div class="pr-steps pr-steps-{{ $prCount }}">
            @foreach($prItems as $i => $step)
            @php
                $sTitle = $step['title'] ?? '';
                $sDesc = $step['description'] ?? '';
                $sIcon = $step['icon'] ?? '';
                $sImg = $step['image'] ?? '';
                $sImgSrc = $sImg ? (\Illuminate\Support\Str::startsWith($sImg, ['http://', 'https://']) ? $sImg : Storage::url($sImg)) : '';
                $hasMedia = ($prMedia === 'image' && $sImgSrc) || ($prMedia === 'icon' && $sIcon);
            @endphp
            <div class="pr-step">
                @if($hasMedia || $prShowNumbers)
                <div class="pr-step-head">
                    @if($hasMedia)
                        @if($prMedia === 'image')
                        <div class="pr-media pr-media-image"><img src="{{ $sImgSrc }}" alt="{{ $sTitle }}" loading="lazy"></div>
                        @else
                        <div class="pr-media pr-media-icon">@include('agent-website.partials.blocks.process-icon', ['icon' => $sIcon])</div>
                        @endif
                        @if($prShowNumbers)<span class="pr-num pr-num-badge">{{ $i + 1 }}</span>@endif
                    @elseif($prShowNumbers)
                        <span class="pr-num pr-num-big">{{ $i + 1 }}</span>
                    @endif
                </div>
                @endif
                <div class="pr-step-body">
                    @if($sTitle)<h3 class="pr-step-title">{{ $sTitle }}</h3>@endif
                    @if($sDesc)<p class="pr-step-desc">{{ $sDesc }}</p>@endif
                </div>
            </div>
            @endforeach
        </div>
    </div>
</section>
@endif
