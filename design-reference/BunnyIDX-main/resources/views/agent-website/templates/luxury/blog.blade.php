@extends('agent-website.templates.luxury.layout')

@section('nav-blog', 'active')

@section('content')
@php
    // Page Header block(s) placed in the top "header" slot act as the page hero.
    // When one exists it provides the top spacing, so drop the nav-clearance pad.
    $blogHasHeader = collect($site->page_data['blog']['blocks'] ?? [])->contains(fn ($b) => ($b['slot'] ?? 'default') === 'header');
@endphp
@include('agent-website.partials.blocks-renderer', ['currentPage' => 'blog', 'slot' => 'header'])

<section class="lbp-block"@unless($blogHasHeader) style="padding-top:140px;"@endunless>
    <div class="lbp-inner">
        <div class="blog-head">
            @if($blogHasHeader)
                <h2 class="blog-title">Latest Articles</h2>
            @else
                <h1 class="blog-title">Latest Articles</h1>
            @endif
        </div>

        @if($posts->isEmpty())
            <p class="blog-empty">No blog posts yet. Check back soon!</p>
        @else
            @php
                // Lead with a large featured hero (newest post) on the first page;
                // the rest fall into the grid below. Subsequent pages are all grid.
                $featured = $posts->onFirstPage() ? $posts->first() : null;
            @endphp

            @if($featured)
            <article class="blog-featured">
                <a class="blog-feat-link" href="{{ route('agent-site.blog.post', [$site->slug, $featured->slug]) }}">
                    @if($featured->featured_image)
                        <img class="blog-feat-img" src="{{ \Illuminate\Support\Str::startsWith($featured->featured_image, ['http://', 'https://']) ? $featured->featured_image : Storage::url($featured->featured_image) }}" alt="{{ $featured->title }}" loading="lazy" decoding="async">
                    @else
                        <div class="blog-feat-empty">Blog Post</div>
                    @endif
                </a>
                <p class="blog-feat-date">{{ optional($featured->published_at)->format('F j, Y') }}</p>
                <a class="blog-feat-titlelink" href="{{ route('agent-site.blog.post', [$site->slug, $featured->slug]) }}"><h2 class="blog-feat-title">{{ $featured->title }}</h2></a>
                @if($featured->excerpt)
                    <p class="blog-feat-excerpt">{{ Str::limit($featured->excerpt, 200) }}</p>
                @endif
            </article>
            @endif

            <div class="blog-grid">
                @foreach($posts as $post)
                    @if($featured && $loop->first) @continue @endif
                <a class="blog-card" href="{{ route('agent-site.blog.post', [$site->slug, $post->slug]) }}">
                    <div class="blog-card-imgwrap">
                        @if($post->featured_image)
                            <img class="blog-card-img" src="{{ \Illuminate\Support\Str::startsWith($post->featured_image, ['http://', 'https://']) ? $post->featured_image : Storage::url($post->featured_image) }}" alt="{{ $post->title }}" loading="lazy" decoding="async">
                        @else
                            <div class="blog-card-empty">Blog Post</div>
                        @endif
                    </div>
                    <p class="blog-card-date">{{ optional($post->published_at)->format('F j, Y') }}</p>
                    <h3 class="blog-card-title">{{ $post->title }}</h3>
                    @if($post->excerpt)
                        <p class="blog-card-excerpt">{{ Str::limit($post->excerpt, 120) }}</p>
                    @endif
                </a>
                @endforeach
            </div>

            @if($posts->hasMorePages())
            <div class="blog-loadmore-row">
                <a class="team-block-viewall" href="{{ $posts->nextPageUrl() }}">Load More <span class="team-block-viewall-line"></span></a>
            </div>
            @endif
        @endif
    </div>
</section>

@include('agent-website.partials.blocks-renderer', ['currentPage' => 'blog', 'slot' => 'default'])
@endsection
