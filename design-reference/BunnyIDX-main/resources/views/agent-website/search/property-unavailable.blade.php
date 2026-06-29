{{--
    Friendly fallback for a listing detail URL that no longer resolves —
    either the listing left the MLS (sold/withdrawn, served as 410) or the
    slug was never known (404). Explains what happened and shows alternative
    listings (same-ZIP first, the site's featured listings as fallback).
    Uses the standalone search layout like the detail page it replaces.
--}}
@extends('agent-website.search.layout')

@php
    $showSiteFooter = true;
    $searchUrl = route('agent-site.properties', $site->slug);
    $contactUrl = route('agent-site.contact', $site->slug);
@endphp

{{-- The search bundle CSS styles the layout's header + the shared footer
     (the layout itself loads no assets — pages push what they need). --}}
@push('styles')
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/agent-website/search/app.css'])
@endpush

@section('content')
<div class="pu-page">
    <div class="pu-notice">
        <div class="pu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12 11.204 3.045c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" /></svg>
        </div>
        <h1>This listing is no longer available</h1>
        @if($addressGuess)
        <p class="pu-address">{{ $addressGuess }}</p>
        @endif
        <p class="pu-copy">
            It looks like this property is no longer on the MLS — it may have been sold, gone under
            contract, or been withdrawn by the seller. Similar homes are below, or start a fresh search.
        </p>
        <div class="pu-actions">
            <a class="pu-btn pu-btn-primary" href="{{ $searchUrl }}">Search Homes</a>
            <a class="pu-btn" href="{{ $contactUrl }}">Contact {{ $site->agent_name ?: 'Us' }}</a>
        </div>
    </div>

    @if(! empty($alternatives))
    <div class="pu-alts">
        <h2>You May Also Like</h2>
        <div class="pu-grid">
            @foreach($alternatives as $prop)
            <a class="pu-card" @if(! empty($prop['link'])) href="{{ $prop['link'] }}" @else href="{{ $searchUrl }}" @endif>
                <span class="pu-card-media">
                    <img src="{{ $prop['image'] }}" alt="{{ $prop['address'] }}" loading="lazy">
                </span>
                <span class="pu-card-body">
                    @if(! empty($prop['price']))<span class="pu-card-price">{{ $prop['price'] }}</span>@endif
                    <span class="pu-card-addr">{{ $prop['address'] }}</span>
                    @php
                        $specs = array_filter([
                            $prop['beds'] !== '' ? $prop['beds'] . ' bd' : null,
                            $prop['baths'] !== '' ? $prop['baths'] . ' ba' : null,
                            $prop['sqft'] !== '' ? $prop['sqft'] . ' sqft' : null,
                        ]);
                    @endphp
                    @if($specs)<span class="pu-card-specs">{{ implode(' · ', $specs) }}</span>@endif
                </span>
            </a>
            @endforeach
        </div>
    </div>
    @endif
</div>

<style>
.pu-page { max-width: 1200px; margin: 0 auto; padding: 56px 24px 72px; }
.pu-notice { max-width: 620px; margin: 0 auto; text-align: center; }
.pu-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 64px; height: 64px; border-radius: 999px;
    background: #F3F4F6; color: #8B9096; margin-bottom: 18px;
}
.pu-icon svg { width: 28px; height: 28px; }
.pu-notice h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.25; font-weight: 600; color: #111315; }
.pu-address { margin: 0 0 14px; font-size: 15px; font-weight: 500; color: #5F656D; }
.pu-copy { margin: 0 0 22px; font-size: 14.5px; line-height: 1.65; color: #5F656D; }
.pu-actions { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
.pu-btn {
    display: inline-flex; align-items: center; padding: 11px 22px;
    border: 1px solid #C8CCD1; border-radius: 999px;
    background: #FFFFFF; color: #111315;
    font-size: 13px; font-weight: 600; text-decoration: none;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.pu-btn:hover { border-color: #111315; }
.pu-btn-primary { background: #111315; border-color: #111315; color: #FFFFFF; }
.pu-btn-primary:hover { background: #FFFFFF; color: #111315; }
.pu-alts { margin-top: 56px; }
.pu-alts h2 { margin: 0 0 18px; font-size: 20px; font-weight: 600; color: #111315; }
.pu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
.pu-card {
    display: block; border: 1px solid #E4E7EB; border-radius: 12px; overflow: hidden;
    background: #FFFFFF; text-decoration: none; color: inherit;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.pu-card:hover { border-color: #C8CCD1; box-shadow: 0 10px 30px rgba(17,19,21,0.10); transform: translateY(-2px); }
.pu-card-media { display: block; aspect-ratio: 16 / 10; background: #F2F3F5; }
.pu-card-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pu-card-body { display: block; padding: 13px 15px 15px; }
.pu-card-price { display: block; font-size: 17px; font-weight: 600; color: #111315; margin-bottom: 2px; }
.pu-card-addr { display: block; font-size: 13px; color: #5F656D; }
.pu-card-specs { display: block; margin-top: 4px; font-size: 12px; color: #8B9096; }
@media (max-width: 640px) {
    .pu-page { padding: 40px 18px 56px; }
    .pu-notice h1 { font-size: 23px; }
}
</style>
@endsection
