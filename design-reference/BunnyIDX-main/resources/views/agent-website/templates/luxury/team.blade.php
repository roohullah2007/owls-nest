@extends('agent-website.templates.luxury.layout')

{{--
    Public team page — a block-builder page like the Communities index: the
    hero is the Page Header block (built-in boxed render until the owner adds
    their own page-header block) and the members grid is the insertable Team
    block in grid layout pulling the site's dynamic team. Owners can add any
    other block (content, CTA, testimonials, …) around it in the page editor.
    Sites saved before the conversion render the same default composition inline.
--}}

@php
    $pageData = $site->page_data['team'] ?? [];
    $teamBlocks = $pageData['blocks'] ?? [];
    $teamHasHeader = collect($teamBlocks)->contains(fn ($b) => ($b['type'] ?? '') === 'page-header');

    $headerTitle = $pageData['header_title'] ?? 'Meet the Team';
    $headerSubtitle = $pageData['header_subtitle'] ?? 'The people behind every successful move.';
    $headerImage = ! empty($pageData['header_image'])
        ? Storage::url($pageData['header_image'])
        : ($site->hero_image ? Storage::url($site->hero_image) : asset('images/backgrounds/bg-4.jpg'));

    // Default composition for sites saved before the block conversion — the
    // exact blocks config/template-defaults.php seeds for new sites.
    $teamDefaultBlocks = [
        [
            'id' => 'team-grid',
            'type' => 'team',
            'slot' => 'default',
            'data' => ['title' => '', 'source' => 'team', 'layout' => 'grid', 'align' => 'left', 'view_all_label' => '', 'view_all_link' => ''],
        ],
        [
            'id' => 'team-cta',
            'type' => 'cta',
            'slot' => 'default',
            'data' => [
                'image' => $headerImage,
                'eyebrow' => 'Work With Us',
                'heading' => 'Let\'s Find Your Place Together',
                'description' => 'Buying, selling or just exploring the market — our team is ready to put local expertise to work for you.',
                'button_label' => 'Contact '.($site->agent_name ?: 'Us'),
                'button_link' => route('agent-site.contact', $site->slug),
            ],
        ],
    ];
@endphp

@section('content')
@unless($teamHasHeader)
@include('agent-website.partials.section-edit-btn', ['section' => 'page-header', 'label' => 'Edit Header'])
@include('agent-website.partials.blocks.page-header', ['block' => [
    'id' => 'team-index-hero',
    'crumbs' => [
        ['label' => 'Home', 'url' => route('agent-site.home', $site->slug)],
        ['label' => 'Team'],
    ],
    'data' => [
        'bg_type' => 'image',
        'image' => $headerImage,
        'overlay' => 'medium',
        'height' => 'compact',
        'style' => $headerImage ? 'boxed' : 'light',
        'heading' => $headerTitle,
        'subtitle' => $headerSubtitle,
        'show_scroll' => false,
    ],
]])
@endunless

@if($members->isEmpty())
    {{-- Owner-only preview state (visitors get a 404 from the controller). --}}
    <section class="section" style="background:#FFFFFF;">
        <div class="section-inner" style="text-align:center;padding:60px 24px;">
            <p style="margin:0 auto;max-width:520px;font-size:15px;line-height:1.7;color:#5F656D;">
                No team members yet — add them from your website settings (Team section). Only you can see this page until then.
            </p>
        </div>
    </section>
@elseif(! empty($teamBlocks))
    @include('agent-website.partials.blocks-renderer', ['currentPage' => 'team', 'slot' => 'default'])
@else
    {{-- Pre-conversion sites: render the default composition directly. --}}
    @foreach($teamDefaultBlocks as $teamBlock)
        @include("agent-website.partials.blocks.{$teamBlock['type']}", ['block' => $teamBlock])
    @endforeach
@endif

@php
    $breadcrumbLd = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('agent-site.home', $site->slug)],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Team', 'item' => route('agent-site.team', $site->slug)],
        ],
    ];
@endphp
<script type="application/ld+json">{!! json_encode($breadcrumbLd, JSON_UNESCAPED_SLASHES) !!}</script>
@endsection
