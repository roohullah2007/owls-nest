{{--
    FAQ block — two layouts (split = heading aside + accordion, centered =
    heading on top). Click-to-expand accordion. Emits schema.org FAQPage JSON-LD.
    Data: layout (split|centered), eyebrow, heading, subtitle, bg_color,
    font_color, text_color, items (JSON [{question, answer}]).
--}}
@php
    $fqLayout = (($block['data']['layout'] ?? 'split') === 'centered') ? 'centered' : 'split';
    $fqEyebrow = trim((string) ($block['data']['eyebrow'] ?? ''));
    $fqHeading = trim((string) ($block['data']['heading'] ?? 'Frequently Asked Questions'));
    $fqSubtitle = trim((string) ($block['data']['subtitle'] ?? ''));

    $fqBgColor = trim((string) ($block['data']['bg_color'] ?? ''));
    $fqFont = trim((string) ($block['data']['font_color'] ?? ''));
    $fqTextColor = trim((string) ($block['data']['text_color'] ?? ''));

    $fqItems = json_decode($block['data']['items'] ?? '[]', true);
    $fqItems = is_array($fqItems) ? array_values(array_filter($fqItems, fn ($i) => is_array($i) && trim((string) ($i['question'] ?? '')) !== '')) : [];

    $fqStyle = '';
    if ($fqBgColor) { $fqStyle .= '--fq-bg: ' . $fqBgColor . ';'; }
    if ($fqFont) { $fqStyle .= ' --fq-fg: ' . $fqFont . ';'; }
    if ($fqTextColor) { $fqStyle .= ' --fq-text: ' . $fqTextColor . ';'; }

    $fqId = 'fq-' . ($block['id'] ?? uniqid());
@endphp
@if(count($fqItems))
@php
    // schema.org FAQPage structured data.
    $fqSchema = [
        '@context' => 'https://schema.org',
        '@type' => 'FAQPage',
        'mainEntity' => array_map(fn ($i) => [
            '@type' => 'Question',
            'name' => (string) ($i['question'] ?? ''),
            'acceptedAnswer' => ['@type' => 'Answer', 'text' => (string) ($i['answer'] ?? '')],
        ], $fqItems),
    ];
@endphp
<script type="application/ld+json">{!! json_encode($fqSchema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
<section class="fq-block fq-layout-{{ $fqLayout }}" style="{{ $fqStyle }}" id="{{ $fqId }}">
    <div class="fq-inner">
        @if($fqLayout === 'split')
        <div class="fq-split">
            <div class="fq-head">
                @if($fqEyebrow)<p class="fq-eyebrow">{{ $fqEyebrow }}</p>@endif
                <h2 class="fq-heading">{{ $fqHeading }}</h2>
                @if($fqSubtitle)<p class="fq-subtitle">{{ $fqSubtitle }}</p>@endif
            </div>
            @include('agent-website.partials.blocks.faqs-list', ['fqItems' => $fqItems])
        </div>
        @else
        <div class="fq-head">
            @if($fqEyebrow)<p class="fq-eyebrow">{{ $fqEyebrow }}</p>@endif
            <h2 class="fq-heading">{{ $fqHeading }}</h2>
            @if($fqSubtitle)<p class="fq-subtitle">{{ $fqSubtitle }}</p>@endif
        </div>
        @include('agent-website.partials.blocks.faqs-list', ['fqItems' => $fqItems])
        @endif
    </div>
</section>
<script>
    (function () {
        var root = document.getElementById('{{ $fqId }}');
        if (!root) return;
        root.querySelectorAll('.fq-q').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = btn.closest('.fq-item');
                if (!item) return;
                var open = item.classList.toggle('is-open');
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        });
    })();
</script>
@endif
