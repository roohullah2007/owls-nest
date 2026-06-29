@extends('agent-website.templates.luxury.layout')

@section('content')

{{-- Page Header --}}
@php
    $headerImage = $site->page_data[$currentPage]['header_image'] ?? ($site->hero_image ?? null);
@endphp
<section class="page-header" style="background-image:url('{{ $headerImage ? Storage::url($headerImage) : asset('images/backgrounds/bg-2.jpg') }}');">
    <div class="page-header-overlay"></div>
    <div class="page-header-content">
        <h1 class="page-header-title">{{ $pageTitle }}</h1>
    </div>
</section>

@include('agent-website.partials.blocks-renderer', ['currentPage' => $currentPage, 'slot' => 'default'])

@endsection
