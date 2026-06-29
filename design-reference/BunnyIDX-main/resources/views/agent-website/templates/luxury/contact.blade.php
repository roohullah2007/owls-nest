@extends('agent-website.templates.luxury.layout')

@section('nav-contact', 'active')

{{-- Block-builder page — all content is composed from insertable blocks
     (Page Header + Contact). Pages without their own Page Header block get
     the same boxed hero the community pages use, so the page never renders
     headerless; adding a Page Header block in the editor replaces it. --}}
@section('content')
@php
    $contactBlocks = $site->page_data['contact']['blocks'] ?? [];
    $contactHasHeader = collect($contactBlocks)->contains(fn ($b) => ($b['type'] ?? '') === 'page-header');
    $contactHeroImage = $site->hero_image ? Storage::url($site->hero_image) : '';
@endphp

@unless($contactHasHeader)
@include('agent-website.partials.blocks.page-header', ['block' => [
    'id' => 'contact-hero',
    'crumbs' => [
        ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
        ['label' => 'Contact'],
    ],
    'data' => [
        'bg_type' => 'image',
        'image' => $contactHeroImage,
        'overlay' => 'medium',
        'height' => 'compact',
        'style' => $contactHeroImage ? 'boxed' : 'light',
        'heading' => 'Contact ' . ($site->agent_name ?: 'Us'),
        'subtitle' => '',
        'show_scroll' => false,
    ],
]])
@endunless

@include('agent-website.partials.blocks-renderer', ['currentPage' => 'contact', 'slot' => 'default'])
@endsection
