@extends('agent-website.templates.luxury.layout')

@section('nav-blog', 'active')

@push('meta')
@if($post->meta_title)
<title>{{ $post->meta_title }} | {{ $site->agent_name }}</title>
@else
<title>{{ $post->title }} | {{ $site->agent_name }}</title>
@endif
@if($post->meta_description)
<meta name="description" content="{{ $post->meta_description }}">
@endif
@if($post->featured_image)
<meta property="og:image" content="{{ \Illuminate\Support\Str::startsWith($post->featured_image, ['http://', 'https://']) ? $post->featured_image : Storage::url($post->featured_image) }}">
@endif
@endpush

@php
    $postUrl = route('agent-site.blog.post', [$site->slug, $post->slug]);
    $featuredImageUrl = $post->featured_image
        ? (\Illuminate\Support\Str::startsWith($post->featured_image, ['http://', 'https://']) ? $post->featured_image : Storage::url($post->featured_image))
        : null;
    $shareU = urlencode($postUrl);
    $shareT = urlencode($post->title);
@endphp

@section('content')
{{-- Hero: full-bleed featured image with dark overlay + centered title card --}}
<section class="bpost-hero @if(!$featuredImageUrl) bpost-hero--solid @endif">
    @if($featuredImageUrl)
    <img class="bpost-hero-img" src="{{ $featuredImageUrl }}" alt="{{ $post->title }}">
    <div class="bpost-hero-overlay"></div>
    @endif
    <div class="bpost-hero-content">
        <div class="bpost-hero-card">
            <p class="bpost-hero-date">{{ optional($post->published_at)->format('F j, Y') }}</p>
            <h1 class="bpost-hero-title">{{ $post->title }}</h1>
            <a href="#bpostBody" class="bpost-hero-scroll" aria-label="Read article">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7"/></svg>
            </a>
        </div>
    </div>
</section>

{{-- Article: white background, two-column with sticky sidebar --}}
<section class="bpost-body-section" id="bpostBody">
    <div class="bpost-layout">
        {{-- Main column --}}
        <div class="bpost-main">
            <a href="{{ route('agent-site.blog', $site->slug) }}" class="bpost-back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
                Back to Blog
            </a>

            <div class="bpost-content">
                {!! $post->body !!}
            </div>

            {{-- Social Share --}}
            <div class="bpost-share">
                <span class="bpost-share-label">Share this article</span>
                <div class="bpost-share-links">
                    <a class="bpost-share-btn" href="https://www.facebook.com/sharer/sharer.php?u={{ $shareU }}" target="_blank" rel="noopener" aria-label="Share on Facebook">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg>
                    </a>
                    <a class="bpost-share-btn" href="https://twitter.com/intent/tweet?url={{ $shareU }}&text={{ $shareT }}" target="_blank" rel="noopener" aria-label="Share on X">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>
                    </a>
                    <a class="bpost-share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url={{ $shareU }}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>
                    </a>
                    <a class="bpost-share-btn" href="mailto:?subject={{ $shareT }}&body={{ $shareU }}" aria-label="Share via email">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>
                    </a>
                    <button type="button" class="bpost-share-btn" data-copy-url="{{ $postUrl }}" aria-label="Copy link">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/></svg>
                    </button>
                </div>
            </div>

            {{-- Related Articles --}}
            @if($related->isNotEmpty())
            <div class="bpost-related">
                <h2 class="bpost-related-title">Related Articles</h2>
                <div class="bpost-related-grid">
                    @foreach($related as $rel)
                    <a class="bpost-related-card" href="{{ route('agent-site.blog.post', [$site->slug, $rel->slug]) }}">
                        <div class="bpost-related-imgwrap">
                            @if($rel->featured_image)
                                <img class="bpost-related-img" src="{{ \Illuminate\Support\Str::startsWith($rel->featured_image, ['http://', 'https://']) ? $rel->featured_image : Storage::url($rel->featured_image) }}" alt="{{ $rel->title }}" loading="lazy" decoding="async">
                            @else
                                <div class="bpost-related-empty">Blog Post</div>
                            @endif
                        </div>
                        <p class="bpost-related-date">{{ optional($rel->published_at)->format('F j, Y') }}</p>
                        <h3 class="bpost-related-card-title">{{ $rel->title }}</h3>
                    </a>
                    @endforeach
                </div>
            </div>
            @endif

            {{-- CTA --}}
            <div class="bpost-cta">
                <h3 class="bpost-cta-title">Ready to Make a Move?</h3>
                <p class="bpost-cta-text">Contact me today to discuss your real estate goals.</p>
                <a href="{{ route('agent-site.contact', $site->slug) }}" class="btn btn-accent">Get in Touch</a>
            </div>
        </div>

        {{-- Sticky sidebar --}}
        <aside class="bpost-sidebar">
            {{-- Agent profile card --}}
            <div class="bpost-agent-card">
                @if($site->agent_photo)
                <div class="bpost-agent-photo">
                    <img src="{{ Storage::url($site->agent_photo) }}" alt="{{ $site->agent_name }}" loading="lazy">
                </div>
                @endif
                <div class="bpost-agent-body">
                    <h3 class="bpost-agent-name">{{ $site->agent_name }}</h3>
                    @if($site->brokerage_name)
                    <p class="bpost-agent-brokerage">{{ $site->brokerage_name }}</p>
                    @endif
                    @if($site->agent_phone)
                    <a class="bpost-agent-phone" href="tel:{{ $site->agent_phone }}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>
                        {{ $site->agent_phone }}
                    </a>
                    @endif
                    @if(count($site->socialAccounts()))
                        @include('agent-website.partials.social-icons', ['items' => $site->socialAccounts(), 'class' => 'bpost-agent-social'])
                    @endif
                    <a href="{{ route('agent-site.contact', $site->slug) }}" class="bpost-agent-cta">Contact Me</a>
                </div>
            </div>

            {{-- Communities — grey card.
                 TODO: wire to real communities/areas data (the site's areas list or
                 MLS-backed community datasets). Placeholder list for now. --}}
            <div class="bpost-side-card bpost-side-card--muted">
                <h3 class="bpost-side-title">Communities</h3>
                <ul class="bpost-side-list">
                    <li><a href="#">Coming soon</a></li>
                    <li><a href="#">Coming soon</a></li>
                    <li><a href="#">Coming soon</a></li>
                </ul>
                <p class="bpost-side-note">Community links will appear here.</p>
            </div>

            {{-- Categories — card.
                 TODO: blog posts have no category field yet; add categories to the
                 BlogPost model + editor, then list real categories here. --}}
            <div class="bpost-side-card">
                <h3 class="bpost-side-title">Categories</h3>
                <ul class="bpost-side-list">
                    <li><a href="#">Coming soon</a></li>
                    <li><a href="#">Coming soon</a></li>
                    <li><a href="#">Coming soon</a></li>
                </ul>
            </div>
        </aside>
    </div>
</section>

@push('scripts')
<script>
    document.querySelectorAll('[data-copy-url]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(btn.getAttribute('data-copy-url'));
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 1600);
            } catch (e) {}
        });
    });
</script>
@endpush
@endsection
