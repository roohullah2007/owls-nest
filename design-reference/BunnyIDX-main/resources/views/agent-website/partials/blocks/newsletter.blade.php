{{--
    Newsletter block — collect a lead into the CRM (via the contact endpoint,
    tagged as a Newsletter lead). Two variants:
      split    : content left, image right
      centered : centered content with an optional logo on top
    Data: variant, theme (light|dark), form_layout (stacked|inline), heading,
    description, image, button_text, collect_name ('1'|'0'), collect_phone
    ('1'|'0'), consent_text (optional override), bg_color. The consent line is
    built from the site's own agent name + privacy policy — never hard-coded.
--}}
@php
    $nlVariant = (($block['data']['variant'] ?? 'split') === 'centered') ? 'centered' : 'split';
    $nlTheme = (($block['data']['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';
    $nlFormLayout = (($block['data']['form_layout'] ?? 'stacked') === 'inline') ? 'inline' : 'stacked';
    // Email is always collected; name defaults on (matches the original form), phone off.
    $nlCollectName = ($block['data']['collect_name'] ?? '1') === '1';
    $nlCollectPhone = ($block['data']['collect_phone'] ?? '') === '1';
    $nlHeading = $block['data']['heading'] ?? 'Stay Updated With Exclusive Listings';
    $nlDesc = $block['data']['description'] ?? 'Be the first to know about new listings, market updates, and exclusive opportunities.';
    $nlButton = trim((string) ($block['data']['button_text'] ?? '')) ?: 'Subscribe';
    $nlBg = trim((string) ($block['data']['bg_color'] ?? ''));
    $nlImg = trim((string) ($block['data']['image'] ?? ''));
    $nlImgUrl = $nlImg ? (\Illuminate\Support\Str::startsWith($nlImg, ['http://', 'https://']) ? $nlImg : Storage::url($nlImg)) : '';
    // Image / logo is optional. Only use the two-column split when an image is set.
    $nlSplit = $nlVariant === 'split' && $nlImgUrl !== '';

    $nlContact = $site->agent_name ?: ($site->brokerage_name ?: 'us');
    $nlPrivacy = $site->page_data['_config']['privacy_url'] ?? '';
    $nlConsent = trim((string) ($block['data']['consent_text'] ?? ''))
        ?: "I agree to be contacted by {$nlContact} via call, email, and text for real estate services. To opt out, reply 'STOP' at any time or reply 'HELP' for assistance. You can also click the unsubscribe link in any email. Message and data rates may apply. Message frequency may vary.";
@endphp
<section class="nl-block nl-theme-{{ $nlTheme }}" @if($nlBg) style="--nl-bg: {{ $nlBg }};" @endif>
    <div class="nl-inner">
        <div class="{{ $nlSplit ? 'nl-split' : '' }}">
            <div class="nl-content {{ $nlVariant === 'centered' ? 'nl-centered' : '' }}">
                @if($nlVariant === 'centered' && $nlImgUrl)
                <img src="{{ $nlImgUrl }}" alt="{{ $site->agent_name }}" class="nl-logo" loading="lazy" decoding="async">
                @endif
                <h2 class="nl-title">{{ $nlHeading }}</h2>
                @if($nlDesc)<p class="nl-desc">{{ $nlDesc }}</p>@endif

                <form class="nl-form nl-form--{{ $nlFormLayout }}" method="POST" action="{{ route('agent-site.contact.submit', $site->slug) }}">
                    @csrf
                    <input type="hidden" name="interest" value="Newsletter">
                    <div class="nl-fields">
                        @if($nlCollectName)
                        <input type="text" name="name" class="nl-input" placeholder="Name" autocomplete="name">
                        @endif
                        <input type="email" name="email" class="nl-input" placeholder="Email" required autocomplete="email">
                        @if($nlCollectPhone)
                        <input type="tel" name="phone" class="nl-input" placeholder="Phone" autocomplete="tel">
                        @endif
                        @if($nlFormLayout === 'inline')
                        <button type="submit" class="nl-submit">{{ $nlButton }}<span class="nl-btn-line"></span></button>
                        @endif
                    </div>
                    <label class="nl-consent">
                        <input type="checkbox" name="sms_consent" value="1">
                        <span>{{ $nlConsent }} <a href="{{ $nlPrivacy ?: '#' }}" target="_blank" rel="noopener">Privacy Policy</a>.</span>
                    </label>
                    @if($nlFormLayout !== 'inline')
                    <button type="submit" class="nl-submit">{{ $nlButton }}<span class="nl-btn-line"></span></button>
                    @endif
                </form>
            </div>

            @if($nlSplit)
            <div class="nl-image">
                <img src="{{ $nlImgUrl }}" alt="{{ $site->agent_name }}" loading="lazy">
            </div>
            @endif
        </div>
    </div>
</section>
