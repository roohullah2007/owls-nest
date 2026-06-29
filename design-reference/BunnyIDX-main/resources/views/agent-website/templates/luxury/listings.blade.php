@extends('agent-website.templates.luxury.layout')

{{--
    Curated listings page — Featured Properties ($section 'featured') and Past
    Transactions ($section 'sold'). Cards come pre-resolved from
    FeaturedListingsResolver::resolveSection() (manual CRM + MLS config).
    Deliberately a WHITE page like /blog: an (editable) Page Header block in the
    'header' slot acts as the hero; the body uses the light blog-head styles —
    no dark theme tokens here.
--}}

@php
    use Illuminate\Support\Str;

    $pageData = $site->page_data[$section] ?? [];
    $defaultSubtitle = $section === 'sold'
        ? 'A track record of successful closings.'
        : 'Hand-picked properties — explore our current portfolio.';
    $headerTitle = $pageData['header_title'] ?? $sectionTitle;
    $headerSubtitle = $pageData['header_subtitle'] ?? $defaultSubtitle;
    // Page Header block(s) in the top "header" slot act as the page hero. When
    // one exists it provides the top spacing and the default header is skipped.
    $lsHasHeader = collect($pageData['blocks'] ?? [])->contains(fn ($b) => ($b['slot'] ?? 'default') === 'header');

    // Hero backdrop — the first listing photo (same pattern as New Developments),
    // falling back to the site hero and then a default backdrop so the page header
    // is always the boxed image hero (identical to New Developments), even before
    // any listings are configured.
    $heroImage = collect($cards)->firstWhere('image')['image'] ?? '';
    $heroImageUrl = $heroImage
        ? (Str::startsWith($heroImage, ['http://', 'https://']) ? $heroImage : asset('storage/' . ltrim($heroImage, '/')))
        : ($site->hero_image
            ? Storage::url($site->hero_image)
            : asset('images/backgrounds/' . ($section === 'sold' ? 'bg-7.jpg' : 'bg-3.jpg')));
@endphp

@section('content')
@if($lsHasHeader)
    @include('agent-website.partials.blocks-renderer', ['currentPage' => $section, 'slot' => 'header'])
@else
    @include('agent-website.partials.blocks.page-header', ['block' => [
        'id' => $section . '-hero',
        'crumbs' => [
            ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
            ['label' => $sectionTitle],
        ],
        'data' => [
            'bg_type' => 'image',
            'image' => $heroImageUrl,
            'overlay' => 'medium',
            'height' => 'compact',
            'style' => $heroImageUrl ? 'boxed' : 'light',
            'heading' => $headerTitle,
            'subtitle' => $headerSubtitle,
            'show_scroll' => false,
        ],
    ]])
@endif

<section class="lbp-block">
    <div class="lbp-inner">
        @if(count($cards))
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;">
            @foreach($cards as $prop)
                @include('agent-website.partials.blocks.featured-card', ['prop' => $prop, 'size' => 'sm'])
            @endforeach
        </div>
        @if($compliance)
        <p style="margin-top:40px;font-size:12px;color:#8B9096;line-height:1.6;">{{ $compliance }}</p>
        @endif
        @else
        <div style="text-align:center;padding:60px 20px;">
            <p style="margin:0 auto;max-width:560px;font-size:15px;line-height:1.7;color:#5F656D;">
                @if($isOwner)
                    No {{ strtolower($sectionTitle) }} yet — add properties from your website settings
                    (Website Listings → {{ $sectionTitle }}), or connect listings by MLS, agent or office ID.
                @else
                    New properties are coming soon. Please check back shortly.
                @endif
            </p>
        </div>
        @endif
    </div>
</section>

{{-- CTA — light grey band, consistent with the white page above. --}}
<section class="lbp-block" style="--lbp-bg:#F3F4F6;text-align:center;">
    <div class="lbp-inner">
        <h2 class="blog-title" style="font-size:34px;line-height:40px;">Interested in a Property?</h2>
        <p style="margin:14px auto 32px;max-width:520px;font-size:15px;line-height:1.7;color:#5F656D;">Reach out and we'll get you the full details, schedule a tour, or talk strategy.</p>
        <a href="{{ route('agent-site.contact', $site->slug) }}" class="btn" style="border:1px solid #111315;color:#111315;background:transparent;">Contact {{ $site->agent_name }}</a>
    </div>
</section>
@endsection
