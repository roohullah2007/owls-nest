@extends('agent-website.templates.luxury.layout')

@section('nav-about', 'active')

{{-- Block-builder page — all content is composed from insertable blocks. --}}
@section('content')
@include('agent-website.partials.blocks-renderer', ['currentPage' => 'about', 'slot' => 'default'])
@endsection
