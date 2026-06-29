@extends('agent-website.templates.luxury.layout')

{{--
    Home Valuation funnel page — /site/{slug}/home-valuation.
    Step 1: BLOCK CANVAS — all hero/intro content is composed from insertable
    blocks (a dark-theme Home Valuation block is seeded by default; editable at
    /crm/websites/{uuid}/pages/home-valuation). The Home Valuation block's
    .hv-form GETs this same page with ?address=, which is also how the block
    hands off from any other page.
    Step 2 (?address= present): WHITE results section — the address on a
    keyless Google embed map + a lead-capture card posting to
    route('agent-site.contact.submit') as a seller lead.
    Styles: .hvp-* in resources/css/agent-website/templates/luxury/organisms/_home-valuation-page.css
--}}

@section('content')
@php
    $hvpHasAddress = trim((string) $address) !== '';
    $hvpPrivacyUrl = $site->page_data['_config']['privacy_url'] ?? '#';
@endphp

{{-- ── Step 1 · Editor-managed blocks (Home Valuation block seeded by default) ── --}}
@include('agent-website.partials.blocks-renderer', ['currentPage' => 'home-valuation', 'slot' => 'default'])

@if($hvpHasAddress)
{{-- ── Step 2 · Results: address on the map + lead capture (white section) ── --}}
<section class="hvp-results" id="valuation-report">
    <div class="hvp-results-inner">
        <div class="hvp-grid">
            <div class="hvp-map-col">
                <div class="hvp-address-chip">
                    <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                    <span>{{ $address }}</span>
                </div>
                <div class="hvp-map">
                    <iframe
                        src="https://www.google.com/maps?q={{ urlencode($address) }}&output=embed"
                        width="100%" height="100%" style="border:0;"
                        allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                        title="Map of {{ $address }}"></iframe>
                </div>
                <p class="hvp-map-note">Pin location is approximate, based on the address you entered.</p>
            </div>

            <div class="hvp-form-card">
                <h2 class="hvp-card-title">Get Your Full Valuation Report</h2>
                <p class="hvp-card-note">
                    We found your property. Tell us where to send the report and
                    {{ $site->agent_name ?: 'your agent' }} will follow up with a detailed,
                    data-backed valuation for <strong>{{ $address }}</strong>.
                </p>

                <form class="hvp-form" method="POST" action="{{ route('agent-site.contact.submit', $site->slug) }}">
                    @csrf
                    <input type="hidden" name="property_address" value="{{ $address }}">
                    <input type="hidden" name="lead_type" value="seller">
                    <input type="hidden" name="interest" value="Home Valuation">

                    <div class="hvp-field">
                        <label for="hvp-name">Name</label>
                        <input id="hvp-name" type="text" name="name" placeholder="Enter your full name" value="{{ old('name') }}" required>
                    </div>
                    <div class="hvp-field">
                        <label for="hvp-email">Email</label>
                        <input id="hvp-email" type="email" name="email" placeholder="you@email.com" value="{{ old('email') }}" required>
                        @error('email') <span class="hvp-field-error">{{ $message }}</span> @enderror
                    </div>
                    <div class="hvp-field">
                        <label for="hvp-phone">Phone</label>
                        <input id="hvp-phone" type="tel" name="phone" placeholder="(555) 000-0000" value="{{ old('phone') }}">
                    </div>

                    <label class="hvp-consent">
                        <input type="checkbox" name="sms_consent" value="1" required>
                        {{-- Site-wide consent disclosure — editable in the website editor (Search Design → Leads). --}}
                        <span>{{ $site->consentText() }} <a href="{{ $hvpPrivacyUrl }}" target="_blank" rel="noopener">Privacy Policy</a>.</span>
                    </label>

                    <button type="submit" class="hvp-submit">Send My Valuation Report</button>
                </form>
            </div>
        </div>
    </div>
</section>
@endif
{{-- "How it works" and other marketing sections are now editor blocks
     (process / content / faqs / cta), seeded by default — no hardcoded strip. --}}
@endsection
