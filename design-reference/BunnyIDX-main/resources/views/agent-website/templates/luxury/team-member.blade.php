@extends('agent-website.templates.luxury.layout')

{{--
    Team member page — a light page composed from the shared block styles:
    the Page Header block as the hero (member name + role, breadcrumbs), a
    Content-block profile (photo + bio/contact/socials), the member's live
    MLS listings (active + recently sold) in the Featured-block grid, and the
    closing CTA block. No bespoke dark sections — see
    organisms/_team-member.css for the thin .tm-* layer on top.
--}}

@php
    $memberPhoto = $member->photo
        ? (Str::startsWith($member->photo, ['http://', 'https://']) ? $member->photo : Storage::url($member->photo))
        : null;
    $memberFirst = explode(' ', trim($member->name))[0] ?: $member->name;
    $memberSocials = collect((array) ($member->socials ?? []))
        ->filter(fn ($url) => trim((string) $url) !== '')
        ->map(fn ($url, $key) => ['key' => $key, 'url' => $url])
        ->values()
        ->all();
    // Bios saved from the rich-text editor are HTML; legacy bios are plain
    // text with newline paragraphs.
    $memberBioIsHtml = $member->bio && $member->bio !== strip_tags($member->bio);
    $memberBioParagraphs = (! $memberBioIsHtml && $member->bio)
        ? array_values(array_filter(array_map('trim', preg_split('/\R{2,}/', $member->bio))))
        : [];
    $contactUrl = route('agent-site.contact', $site->slug);

    // Hero backdrop mirrors the team index: team page header image → site hero
    // → the same stock fallback the /team hero uses.
    $teamPageData = $site->page_data['team'] ?? [];
    $heroImage = ! empty($teamPageData['header_image'])
        ? Storage::url($teamPageData['header_image'])
        : ($site->hero_image ? Storage::url($site->hero_image) : asset('images/backgrounds/bg-4.jpg'));
@endphp

@section('content')
{{-- Hero — the shared Page Header block: name + role over the team backdrop. --}}
@include('agent-website.partials.blocks.page-header', ['block' => [
    'id' => 'team-member-hero',
    'crumbs' => [
        ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
        ['label' => 'Team', 'url' => route('agent-site.team', $site->slug)],
        ['label' => $member->name],
    ],
    'data' => [
        'bg_type' => 'image',
        'image' => $heroImage,
        'overlay' => 'medium',
        'height' => 'compact',
        'style' => $heroImage ? 'boxed' : 'light',
        'heading' => $member->name,
        'subtitle' => $member->title ?: '',
        'show_scroll' => false,
    ],
]])

{{-- Profile — Content-block layout: portrait beside bio/contact. --}}
<section class="cb-block tm-profile">
    <div class="cb-inner">
        <div class="cb-grid cb-image-left">
            <div class="cb-image tm-photo">
                @if($memberPhoto)
                <img src="{{ $memberPhoto }}" alt="{{ $member->name }}">
                @else
                <div class="cb-image-placeholder">Photo</div>
                @endif
            </div>
            <div class="cb-content">
                <p class="cb-eyebrow">{{ $member->title ?: 'Team Member' }}</p>
                <h2 class="cb-heading tm-name">About {{ $memberFirst }}</h2>
                @if($memberBioIsHtml)
                <div class="cb-body">{!! $member->bio !!}</div>
                @elseif(count($memberBioParagraphs))
                <div class="cb-body">
                    @foreach($memberBioParagraphs as $para)
                    <p>{!! nl2br(e($para)) !!}</p>
                    @endforeach
                </div>
                @endif

                @if($member->phone || $member->email)
                <div class="tm-contact">
                    @if($member->phone)
                    <a href="tel:{{ $member->phone }}" class="tm-contact-row">
                        <span class="tm-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg></span>
                        {{ $member->phone }}
                    </a>
                    @endif
                    @if($member->email)
                    <a href="mailto:{{ $member->email }}" class="tm-contact-row">
                        <span class="tm-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg></span>
                        {{ $member->email }}
                    </a>
                    @endif
                </div>
                @endif

                @if(count($memberSocials))
                    @include('agent-website.partials.social-icons', ['items' => $memberSocials, 'class' => 'tm-social'])
                @endif

                <div class="cb-buttons">
                    <a href="{{ $contactUrl }}" class="btn">Work With {{ $memberFirst }}<span class="cb-btn-line"></span></a>
                </div>
            </div>
        </div>
    </div>
</section>

{{-- Live MLS listings (by the member's mls_agent_id) — Featured-block grid. --}}
@if(count($memberListings))
<section class="fl-block fl-grid-section tm-listings" style="--fl-bg:#F5F5F4;">
    <div class="fl-inner">
        <div class="fl-head">
            <div>
                <p class="cb-eyebrow">Active Listings</p>
                <h2 class="fl-title">{{ $memberFirst }}&rsquo;s Listings</h2>
            </div>
        </div>
        <div class="fl-grid">
            @foreach($memberListings as $prop)
                @include('agent-website.partials.blocks.featured-card', ['prop' => $prop, 'size' => 'sm'])
            @endforeach
        </div>
    </div>
</section>
@endif

@if(count($memberSold))
<section class="fl-block fl-grid-section tm-listings">
    <div class="fl-inner">
        <div class="fl-head">
            <div>
                <p class="cb-eyebrow">Past Transactions</p>
                <h2 class="fl-title">Recently Sold</h2>
            </div>
        </div>
        <div class="fl-grid">
            @foreach($memberSold as $prop)
                @include('agent-website.partials.blocks.featured-card', ['prop' => $prop, 'size' => 'sm'])
            @endforeach
        </div>
    </div>
</section>
@endif

@if(!empty($compliance))
<section class="tm-compliance">
    <div class="fl-inner">
        <p class="fl-compliance">{{ $compliance }}</p>
    </div>
</section>
@endif

{{-- Closing CTA — the shared CTA block. --}}
@include('agent-website.partials.blocks.cta', ['block' => [
    'id' => 'team-member-cta',
    'data' => [
        'image' => $heroImage,
        'eyebrow' => $member->title ?: 'Your Agent',
        'heading' => 'Ready to Make a Move?',
        'description' => 'Reach out to '.$memberFirst.' for tailored guidance — from first showing to closing day.',
        'button_label' => 'Contact '.$memberFirst,
        'button_link' => $contactUrl,
    ],
]])

@php
    $personLd = array_filter([
        '@context' => 'https://schema.org',
        '@type' => 'RealEstateAgent',
        'name' => $member->name,
        'jobTitle' => $member->title ?: null,
        'image' => $memberPhoto,
        'telephone' => $member->phone ?: null,
        'email' => $member->email ?: null,
        'url' => url()->current(),
        'worksFor' => array_filter([
            '@type' => 'Organization',
            'name' => $site->agent_name ?: null,
            'url' => route('agent-site.home', $site->slug),
        ]),
        'sameAs' => array_values(array_map(fn ($s) => $s['url'], $memberSocials)) ?: null,
    ]);
    $breadcrumbLd = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('agent-site.home', $site->slug)],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Team', 'item' => route('agent-site.team', $site->slug)],
            ['@type' => 'ListItem', 'position' => 3, 'name' => $member->name, 'item' => url()->current()],
        ],
    ];
@endphp
<script type="application/ld+json">{!! json_encode($personLd, JSON_UNESCAPED_SLASHES) !!}</script>
<script type="application/ld+json">{!! json_encode($breadcrumbLd, JSON_UNESCAPED_SLASHES) !!}</script>
@endsection
