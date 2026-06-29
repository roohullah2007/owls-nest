{{--
    Public listing detail page. Uses the SAME standalone layout (own dedicated
    header) and the SAME React detail UI as the result-card modal — it just
    renders in page mode. $listing is the MlsListing::toArray() shape; we map it
    to the PsListing card shape the React component expects.
--}}
@extends('agent-website.search.layout')

@php
    // Render the shared site footer under the detail content (layout reads this).
    $showSiteFooter = true;
    // Lead gating: the layout locks this page kind when configured.
    $psPageKind = 'detail';

    $addr = $listing['address'] ?? [];
    $fullAddress = $addr['full'] ?? trim(implode(', ', array_filter([$addr['street'] ?? null, $addr['city'] ?? null, $addr['state_province'] ?? null])));
    $photos = array_values(array_filter($listing['photos'] ?? []));
    $baths = $listing['bathrooms'] ?? null;
    $bathsLabel = $baths !== null ? rtrim(rtrim(number_format((float) $baths, 1), '0'), '.') : null;
    $sqftLabel = ! empty($listing['sqft']) ? number_format($listing['sqft']) : null;
    $lotLabel = ! empty($listing['lot_acres'])
        ? rtrim(rtrim(number_format((float) $listing['lot_acres'], 2), '0'), '.').' ac Lot'
        : (! empty($listing['lot_sqft']) ? number_format($listing['lot_sqft']).' sqft Lot' : null);

    $badges = [];
    if (! empty($listing['open_houses'])) { $badges[] = 'open_house'; }
    if (! empty($listing['virtual_tour_url'])) { $badges[] = 'virtual_tour'; }
    if (! empty($listing['floorplans'])) { $badges[] = 'floor_plan'; }
    if (! empty($listing['original_price']) && ! empty($listing['price']) && $listing['price'] < $listing['original_price']) {
        $badges[] = 'price_reduced';
    }

    // Map MlsListing → the PsListing shape the React <ListingDetail> consumes.
    $psListing = [
        // Same key shape the search feed uses — favorites match on it.
        'id' => ($mlsSlug ?? 'mls').':'.($mlsId ?? ($listing['mls_number'] ?? uniqid())),
        'mls_slug' => $mlsSlug ?? '',
        'mls_id' => $mlsId ?? '',
        'mls_number' => $listing['mls_number'] ?? '',
        'href' => url()->current(),
        'price' => $listing['price'] ?? null,
        'price_formatted' => $listing['price_formatted'] ?? 'Contact for price',
        // Reduction amount shown beside the "Price Reduced" badge (matches the
        // badge condition below); null unless the price actually dropped.
        'price_drop_formatted' => (! empty($listing['original_price']) && ! empty($listing['price']) && $listing['price'] < $listing['original_price'])
            ? '$'.number_format($listing['original_price'] - $listing['price'])
            : null,
        // Display label (For Sale / For Rent / Pending / Sold) — same mapping as
        // the search cards, incl. the lease-class → For Rent rule.
        'status_label' => app(\App\Services\Mls\PublicPropertySearch::class)->statusLabel((string) ($listing['status'] ?? ''), $listing['property_type'] ?? null),
        // Subtype ("Condominium") over the broad class ("Residential") — matches card().
        'property_type' => ($listing['property_subtype'] ?? null) ?: ($listing['property_type'] ?? null),
        'beds' => $listing['bedrooms'] ?? null,
        'baths' => $bathsLabel,
        'parking' => $listing['garage_spaces'] ?? null,
        'sqft' => $sqftLabel,
        'lot' => $lotLabel,
        'address' => $fullAddress,
        'office' => $listing['list_office_name'] ?? null,
        'photos' => $photos,
        'lat' => $listing['lat'] ?? null,
        'lng' => $listing['lng'] ?? null,
        'badges' => $badges,
        'virtual_tour_url' => $listing['virtual_tour_url'] ?? null,
        'open_houses' => $listing['open_houses'] ?? [],
        'floorplans' => array_values(array_filter($listing['floorplans'] ?? [])),
        // Mortgage-calculator prefill from the listing's real HOA/tax data.
        'hoa_monthly' => \App\Services\Mls\PublicPropertySearch::monthlyHoa(
            isset($listing['hoa_fee']) ? (int) $listing['hoa_fee'] : null,
            $listing['hoa_frequency'] ?? null,
        ),
        'tax_annual' => isset($listing['tax_amount']) ? (int) $listing['tax_amount'] : null,
    ];

    $psDetailConfig = [
        'leadEndpoint' => route('agent-site.contact.submit', $site->slug),
        'backHref' => route('agent-site.properties', $site->slug),
        'description' => $listing['description'] ?? null,
        // Same JSON feed the search page uses — powers the real comparables.
        'endpoint' => route('agent-site.properties.search', $site->slug),
        // MLS courtesy/attribution (office + MLS name/logo/disclaimer).
        'courtesy' => [
            'office' => $courtesy['office'] ?? null,
            'mlsName' => $courtesy['mls_name'] ?? null,
            'logo' => $courtesy['logo'] ?? null,
            'disclaimer' => $courtesy['disclaimer'] ?? null,
        ],
        // Visitor account — drives the Save button (favorites) on the page.
        'visitor' => ! empty($visitor) ? ['name' => $visitor->name] : null,
        // Marketing-consent disclosure shown on guest lead forms.
        'consentText' => $site->consentText(),
        // Sidebar agent card + tour requests.
        'agent' => [
            'name' => $site->agent_name,
            'title' => $site->agent_title,
            'phone' => $site->agent_phone,
            'photo' => $site->agent_photo ? asset('storage/'.$site->agent_photo) : null,
            'bg' => data_get($site->page_data, '_config.search.agent_card_bg') ?: null,
        ],
        'showingEndpoint' => route('agent-site.showing.submit', $site->slug),
        // Owner-authored content blocks (merge fields substituted client-side).
        'detailBlocks' => array_values((array) data_get($site->page_data, '_config.search.detail_blocks', [])),
        'detailSections' => array_values((array) data_get($site->page_data, '_config.search.detail_sections', [])),
        // Condo "About the Building" rows (only when the listing carries data).
        'building' => (function () use ($listing) {
            $typeLabel = strtolower(($listing['property_subtype'] ?? '').' '.($listing['property_type'] ?? ''));
            if (! preg_match('/condo|co-?op|apartment/', $typeLabel)) {
                return null;
            }
            $hoaMonthly = \App\Services\Mls\PublicPropertySearch::monthlyHoa(
                isset($listing['hoa_fee']) ? (int) $listing['hoa_fee'] : null,
                $listing['hoa_frequency'] ?? null,
            );
            $rows = array_filter([
                ['Building / Association', $listing['hoa_name'] ?? null],
                ['Stories', ! empty($listing['stories']) ? rtrim(rtrim(number_format((float) $listing['stories'], 1), '0'), '.') : null],
                ['Year built', $listing['year_built'] ?? null],
                ['HOA fee', $hoaMonthly ? '$'.number_format($hoaMonthly).' / month' : null],
            ], fn ($r) => $r[1] !== null && $r[1] !== '');

            return $rows ? array_values(array_map(fn ($r) => [$r[0], (string) $r[1]], $rows)) : null;
        })(),
        'account' => [
            'favorites' => route('agent-site.visitor.favorites.toggle', $site->slug),
            'favoriteIds' => route('agent-site.visitor.favorites.index', $site->slug),
            'savedSearches' => route('agent-site.visitor.searches.store', $site->slug),
            'trackView' => route('agent-site.visitor.track-view', $site->slug),
        ],
    ];
@endphp

@push('styles')
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/agent-website/search/app.css'])
@endpush

@section('content')
<div class="ps-app" id="ps-detail" style="height:auto;min-height:0;display:block;"
     data-config='@json($psDetailConfig)'
     data-listing='@json($psListing)'></div>
@endsection

@push('scripts')
    @viteReactRefresh
    @vite(['resources/js/agent-website/property-search/detail.tsx'])
@endpush
