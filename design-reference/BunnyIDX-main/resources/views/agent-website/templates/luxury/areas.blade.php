@extends('agent-website.templates.luxury.layout')

@section('nav-areas', 'active')

{{--
    Communities index (/neighborhoods) — a block-builder page: the grid is the
    insertable Communities block and the bottom CTA is the regular CTA block,
    both editable in the page editor (and owners can add any other block).
    Pages without their own Page Header block get the boxed hero below; sites
    saved before the conversion render the same default composition inline.
--}}

@php
    $areasLabel = $site->areas_label ?: 'Areas';
    $pageData = $site->page_data['areas'] ?? [];
    $areasBlocks = $pageData['blocks'] ?? [];
    $areasHasHeader = collect($areasBlocks)->contains(fn ($b) => ($b['type'] ?? '') === 'page-header');

    $headerTitle = $pageData['header_title'] ?? "Explore {$areasLabel}";
    $headerSubtitle = $pageData['header_subtitle'] ?? 'Discover the best neighborhoods and communities in the area.';

    // Hero backdrop: owner-set header image → site hero → the first community
    // photo → the white "light" head.
    $firstAreaImage = isset($areas) ? optional($areas->first(fn ($a) => $a->image))->image : null;
    $headerImage = ! empty($pageData['header_image'])
        ? Storage::url($pageData['header_image'])
        : ($site->hero_image
            ? Storage::url($site->hero_image)
            : ($firstAreaImage
                ? (\Illuminate\Support\Str::startsWith($firstAreaImage, ['http://', 'https://']) ? $firstAreaImage : asset('storage/'.$firstAreaImage))
                : ''));

    // Default composition for sites saved before the block conversion — the
    // exact blocks config/template-defaults.php seeds for new sites.
    $areasDefaultBlocks = [
        [
            'id' => 'areas-grid',
            'type' => 'communities',
            'slot' => 'default',
            'data' => ['title' => '', 'theme' => 'light', 'layout' => 'grid', 'card_style' => 'below', 'columns' => '3', 'source' => 'all'],
        ],
        [
            'id' => 'areas-cta',
            'type' => 'cta',
            'slot' => 'default',
            'data' => [
                'image' => $headerImage,
                'eyebrow' => $areasLabel,
                'heading' => 'Not Sure Which Neighborhood Fits?',
                'description' => 'Tell us how you live — commute, schools, lifestyle, budget — and we\'ll point you to the communities worth your shortlist, with private tours when you\'re ready.',
                'button_label' => 'Contact '.($site->agent_name ?: 'Us'),
                'button_link' => route('agent-site.contact', $site->slug),
            ],
        ],
    ];
@endphp

@section('content')
@unless($areasHasHeader)
@include('agent-website.partials.section-edit-btn', ['section' => 'page-header', 'label' => 'Edit Header'])
@include('agent-website.partials.blocks.page-header', ['block' => [
    'id' => 'areas-index-hero',
    'crumbs' => [
        ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
        ['label' => $areasLabel],
    ],
    'data' => [
        'bg_type' => 'image',
        'image' => $headerImage,
        'overlay' => 'medium',
        'height' => 'compact',
        'style' => $headerImage ? 'boxed' : 'light',
        'heading' => $headerTitle,
        'subtitle' => $headerSubtitle,
        'show_scroll' => false,
    ],
]])
@endunless

@if(! empty($areasBlocks))
    @include('agent-website.partials.blocks-renderer', ['currentPage' => 'areas', 'slot' => 'default'])
@else
    {{-- Pre-conversion sites: render the default composition directly. --}}
    @foreach($areasDefaultBlocks as $areasBlock)
        @include("agent-website.partials.blocks.{$areasBlock['type']}", ['block' => $areasBlock])
    @endforeach
@endif

@php
    $breadcrumbLd = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('agent-site.home', $site->slug)],
            ['@type' => 'ListItem', 'position' => 2, 'name' => $areasLabel, 'item' => route('agent-site.areas', $site->slug)],
        ],
    ];
@endphp
<script type="application/ld+json">{!! json_encode($breadcrumbLd, JSON_UNESCAPED_SLASHES) !!}</script>
@endsection
