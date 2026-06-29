@php
    $currentPage = $currentPage ?? 'home';
    $slot = $slot ?? 'default';
    $allBlocks = $site->page_data[$currentPage]['blocks'] ?? [];
    $blocks = array_values(array_filter($allBlocks, fn($b) => ($b['slot'] ?? 'default') === $slot));
    $allowedTypes = ['services', 'team', 'logo-marquee', 'testimonials', 'featured', 'communities', 'areas-we-serve', 'newsletter', 'home-valuation', 'content', 'faqs', 'process', 'cta', 'videos', 'html', 'latest-blog-posts', 'page-header', 'contact', 'mortgage-calculator', 'affordability-calculator', 'refinance-calculator', 'rent-vs-buy-calculator', 'closing-cost-calculator', 'property-tax-calculator', 'home-value-estimator'];
@endphp

@foreach($blocks as $index => $block)
    @if(in_array($block['type'] ?? '', $allowedTypes))
    <div class="we-editable-section we-block" data-block-id="{{ $block['id'] }}">
        @include("agent-website.partials.blocks.{$block['type']}", ['block' => $block])
    </div>
    @endif
@endforeach
