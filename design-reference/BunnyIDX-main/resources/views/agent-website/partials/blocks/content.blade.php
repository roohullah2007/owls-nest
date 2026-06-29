{{--
    Content block — two columns: one holds an image, the other holds an eyebrow
    (subtitle heading), heading, paragraph, and up to 3 buttons. The image side
    is toggleable (left = default, right). Optional bg / font / text colours.
    Data: image_position (left|right), image, eyebrow, heading, body,
    bg_color, font_color, text_color, buttons (JSON [{label, link, style}]).
--}}
@php
    $cbPos = (($block['data']['image_position'] ?? 'left') === 'right') ? 'right' : 'left';
    $cbEyebrow = trim((string) ($block['data']['eyebrow'] ?? ''));
    $cbHeading = trim((string) ($block['data']['heading'] ?? ''));
    $cbBody = trim((string) ($block['data']['body'] ?? ''));

    $cbImg = trim((string) ($block['data']['image'] ?? ''));
    $cbImgUrl = $cbImg ? (\Illuminate\Support\Str::startsWith($cbImg, ['http://', 'https://']) ? $cbImg : Storage::url($cbImg)) : '';

    $cbBgColor = trim((string) ($block['data']['bg_color'] ?? ''));
    $cbFont = trim((string) ($block['data']['font_color'] ?? ''));
    $cbTextColor = trim((string) ($block['data']['text_color'] ?? ''));

    $cbButtons = json_decode($block['data']['buttons'] ?? '[]', true);
    $cbButtons = is_array($cbButtons) ? array_values(array_filter($cbButtons, fn ($b) => is_array($b) && trim((string) ($b['label'] ?? '')) !== '')) : [];
    $cbButtons = array_slice($cbButtons, 0, 3);

    $cbBtnClass = static fn ($style) => 'btn ' . match ($style) {
        'solid', 'accent' => 'btn-accent',
        'white-outline' => 'btn-white-outline',
        default => 'btn-outline',
    };

    // Content may hold multiple paragraphs — blank lines split into <p>, single
    // newlines become <br> within a paragraph.
    $cbParagraphs = $cbBody !== ''
        ? array_values(array_filter(array_map('trim', preg_split('/\R{2,}/', $cbBody))))
        : [];

    $cbStyle = '';
    if ($cbBgColor) { $cbStyle .= '--cb-bg: ' . $cbBgColor . ';'; }
    if ($cbFont) { $cbStyle .= ' --cb-fg: ' . $cbFont . ';'; }
    if ($cbTextColor) { $cbStyle .= ' --cb-text: ' . $cbTextColor . ';'; }
@endphp
<section class="cb-block" style="{{ $cbStyle }}">
    <div class="cb-inner">
        <div class="cb-grid cb-image-{{ $cbPos }}">
            <div class="cb-image">
                @if($cbImgUrl)
                <img src="{{ $cbImgUrl }}" alt="{{ $cbHeading }}" loading="lazy" decoding="async">
                @else
                <div class="cb-image-placeholder">Image</div>
                @endif
            </div>
            <div class="cb-content">
                @if($cbEyebrow)<p class="cb-eyebrow">{{ $cbEyebrow }}</p>@endif
                @if($cbHeading)<h2 class="cb-heading">{{ $cbHeading }}</h2>@endif
                @if(count($cbParagraphs))
                <div class="cb-body">
                    @foreach($cbParagraphs as $cbPara)
                    <p>{!! nl2br(e($cbPara)) !!}</p>
                    @endforeach
                </div>
                @endif
                @if(count($cbButtons))
                <div class="cb-buttons">
                    @foreach($cbButtons as $btn)
                    <a href="{{ trim((string) ($btn['link'] ?? '')) ?: '#' }}" class="{{ $cbBtnClass($btn['style'] ?? 'outline') }}">{{ $btn['label'] }}<span class="cb-btn-line"></span></a>
                    @endforeach
                </div>
                @endif
            </div>
        </div>
    </div>
</section>
