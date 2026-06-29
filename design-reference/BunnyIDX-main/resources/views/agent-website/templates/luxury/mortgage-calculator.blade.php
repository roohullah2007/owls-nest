@extends('agent-website.templates.luxury.layout')

@section('nav-mortgage-calculator', 'active')

{{--
    Mortgage Calculator page — a standalone light page (dark page-header hero,
    white body) that reuses the Mortgage Calculator BLOCK partial so the page and
    the insertable block share one implementation. Owner overrides live in
    page_data['mortgage-calculator'] (heading/subtitle + default assumptions).
--}}

@php
    $mcData = $site->page_data['mortgage-calculator'] ?? [];
    $mcHeroImage = $site->hero_image ? asset('storage/' . ltrim($site->hero_image, '/')) : asset('images/backgrounds/bg-6.jpg');
    // Any blocks the owner added to this page live in the default slot. When none
    // exist we fall back to the built-in Mortgage Calculator so the page is never
    // empty (same default-then-blocks pattern as the other feature pages).
    $mcUserBlocks = array_filter($site->page_data['mortgage-calculator']['blocks'] ?? [], fn ($b) => ($b['slot'] ?? 'default') === 'default');
    $mcBlock = ['id' => 'mortgage-page', 'data' => array_merge($mcData, ['heading' => '', 'subtitle' => ''])];
@endphp

@section('content')
@include('agent-website.partials.blocks.page-header', ['block' => [
    'id' => 'mortgage-calculator-hero',
    'crumbs' => [
        ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
        ['label' => 'Mortgage Calculator'],
    ],
    'data' => [
        'bg_type' => 'image',
        'image' => $mcHeroImage,
        'overlay' => 'medium',
        'height' => 'compact',
        'style' => 'boxed',
        'heading' => $mcData['header_title'] ?? 'Mortgage Calculator',
        'subtitle' => $mcData['header_subtitle'] ?? 'Estimate your monthly payment in seconds.',
        'show_scroll' => false,
    ],
]])

@if(count($mcUserBlocks))
    @include('agent-website.partials.blocks-renderer', ['currentPage' => 'mortgage-calculator', 'slot' => 'default'])
@else
    @include('agent-website.partials.blocks.mortgage-calculator', ['block' => $mcBlock])
@endif
@endsection
