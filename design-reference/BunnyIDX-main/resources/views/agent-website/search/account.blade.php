{{--
    Visitor account panel — favorites + saved searches. Uses the standalone
    search layout (slim header + shared site footer), no React island: server-
    rendered from the favorites' stored snapshots, with plain forms for the
    remove actions.
--}}
@extends('agent-website.search.layout')

@php
    $showSiteFooter = true;
@endphp

@push('styles')
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/agent-website/search/app.css'])
@endpush

@section('content')
<div class="ps-account">
    <h1>My Account</h1>
    <p class="ps-account-sub">{{ $visitor->name }} · {{ $visitor->email }}</p>

    @unless($visitor->phone)
        {{-- Google sign-ups arrive without the (required) phone number. --}}
        <form method="POST" action="{{ route('agent-site.visitor.phone', $site->slug) }}" class="ps-account-search-row" style="margin-top:18px;border-color:var(--ps-theme-primary,#0f1115)">
            @csrf
            <div style="flex:1">
                <div class="ps-account-search-name">Add your phone number to finish setting up</div>
                <div class="ps-account-search-meta">Required so {{ $site->agent_name ?: 'your agent' }} can reach you about listings you love.</div>
                @error('phone')<div class="ps-account-search-meta" style="color:#dc2626">{{ $message }}</div>@enderror
            </div>
            <div class="ps-account-card-actions" style="margin-top:0">
                <input type="tel" name="phone" required placeholder="(555) 000-0000"
                       style="font:inherit;font-size:13px;padding:7px 12px;border:1px solid #d1d5db;border-radius:9px">
                <button type="submit" style="background:var(--ps-theme-primary,#0f1115);color:#fff;border-color:var(--ps-theme-primary,#0f1115)">Save</button>
            </div>
        </form>
    @endunless

    <h2>Favorite Listings</h2>
    @if($favorites->isEmpty())
        <div class="ps-account-empty">
            No favorites yet — tap the heart on any listing to save it here.
            <br><a href="{{ route('agent-site.properties', $site->slug) }}" style="font-weight:700;color:var(--ps-theme-primary,#0f1115)">Browse listings</a>
        </div>
    @else
        <div class="ps-account-grid">
            @foreach($favorites as $favorite)
                @php $snap = $favorite->snapshot ?? []; @endphp
                <div class="ps-account-card">
                    @if(!empty($snap['photo']))
                        <a href="{{ $snap['href'] ?? '#' }}"><img src="{{ $snap['photo'] }}" alt="{{ $snap['address'] ?? 'Listing photo' }}" loading="lazy"></a>
                    @endif
                    <div class="ps-account-card-body">
                        <div class="ps-account-card-price">{{ $snap['price_formatted'] ?? '—' }}</div>
                        <div class="ps-account-card-addr">{{ $snap['address'] ?? $favorite->listing_id }}</div>
                        <div class="ps-account-card-actions">
                            @if(!empty($snap['href']))<a href="{{ $snap['href'] }}">View listing</a>@endif
                            <form method="POST" action="{{ route('agent-site.visitor.favorites.destroy', [$site->slug, $favorite->id]) }}">
                                @csrf
                                @method('DELETE')
                                <button type="submit">Remove</button>
                            </form>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    @endif

    <h2>Saved Searches</h2>
    @if($savedSearches->isEmpty())
        <div class="ps-account-empty">
            No saved searches yet — set your filters on the search page and hit Save Search.
        </div>
    @else
        @foreach($savedSearches as $search)
            <div class="ps-account-search-row">
                <div>
                    <div class="ps-account-search-name">{{ $search->name }}</div>
                    <div class="ps-account-search-meta">
                        @if($search->search_text)“{{ $search->search_text }}” · @endif
                        Saved {{ $search->created_at->diffForHumans() }}
                    </div>
                </div>
                <div class="ps-account-card-actions" style="margin-top:0">
                    <a href="{{ route('agent-site.properties', $site->slug) }}">Open search</a>
                    <form method="POST" action="{{ route('agent-site.visitor.searches.destroy', [$site->slug, $search->id]) }}">
                        @csrf
                        @method('DELETE')
                        <button type="submit">Remove</button>
                    </form>
                </div>
            </div>
        @endforeach
    @endif
</div>
@endsection
