{{--
    Contact block — contact details + social + a location map (left column) and a
    lead-capture form (right column), on a WHITE background in 1400px content
    width. Contact details pull live from the site; the only editable field is an
    optional map-address override. No heading (add a Page Header block for that).
--}}
@php
    $d = $block['data'] ?? [];
    $ctcMap = trim((string) ($d['map_address'] ?? ''))
        ?: ($site->office_address ?: trim(implode(', ', array_filter([$site->agent_city, $site->agent_state]))));
    $socialAccounts = $site->socialAccounts();
    $privacyUrl = $site->page_data['_config']['privacy_url'] ?? '#';
@endphp
<section class="ctc-section">
    <div class="ctc-inner">
        <div class="ctc-grid">
            {{-- LEFT: details + social + map --}}
            <div class="ctc-info">
                <div class="ctc-details">
                    <div class="ctc-detail-col">
                        <p class="ctc-group">{{ $site->agent_name }}</p>
                        @if($site->agent_phone)
                        <a class="ctc-link" href="tel:{{ $site->agent_phone }}">{{ $site->agent_phone }}</a>
                        @endif
                        @if($site->agent_whatsapp)
                        <a class="ctc-link" href="https://wa.me/{{ preg_replace('/\D/', '', $site->agent_whatsapp) }}" target="_blank" rel="noopener">{{ $site->agent_whatsapp }}</a>
                        @endif
                        @if($site->agent_email)
                        <a class="ctc-link" href="mailto:{{ $site->agent_email }}">{{ $site->agent_email }}</a>
                        @endif
                    </div>
                    @if($site->office_address || ($site->agent_city && $site->agent_state) || $site->brokerage_name)
                    <div class="ctc-detail-col">
                        @if($site->office_address)
                            <p class="ctc-addr">{!! nl2br(e($site->office_address)) !!}</p>
                        @elseif($site->agent_city && $site->agent_state)
                            <p class="ctc-addr">{{ $site->agent_city }} {{ $site->agent_state }}</p>
                        @endif
                        @if($site->brokerage_name)
                            <p class="ctc-addr">{{ $site->brokerage_name }}</p>
                        @endif
                    </div>
                    @endif
                </div>

                @if(count($socialAccounts))
                    @include('agent-website.partials.social-icons', ['items' => $socialAccounts, 'class' => 'ctc-socials'])
                @endif

                @if($ctcMap)
                <div class="ctc-map">
                    <iframe
                        src="https://www.google.com/maps?q={{ urlencode($ctcMap) }}&output=embed"
                        width="100%" height="100%" style="border:0;"
                        allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                        title="Office location map"></iframe>
                </div>
                @endif
            </div>

            {{-- RIGHT: Form card --}}
            <div class="ctc-form-card">
                <form class="ctc-form" action="{{ route('agent-site.contact.submit', $site->slug) }}" method="POST">
                    @csrf
                    <div class="ctc-form-row">
                        <div class="ctc-field">
                            <label>Name</label>
                            <input type="text" name="name" placeholder="Enter your full name" value="{{ old('name') }}" required>
                        </div>
                        <div class="ctc-field">
                            <label>Phone</label>
                            <input type="tel" name="phone" placeholder="Your phone" value="{{ old('phone') }}">
                        </div>
                    </div>
                    <div class="ctc-field">
                        <label>Email</label>
                        <input type="email" name="email" placeholder="you@email.com" value="{{ old('email') }}" required>
                        @error('email') <span class="ctc-field-error">{{ $message }}</span> @enderror
                    </div>
                    <div class="ctc-field">
                        <label>Your Message</label>
                        <textarea name="message" rows="7" placeholder="Type your message" required>{{ old('message') }}</textarea>
                    </div>

                    <label class="ctc-consent">
                        <input type="checkbox" name="sms_consent" value="1" required>
                        {{-- Site-wide consent disclosure — editable in the website editor (Search Design → Leads). --}}
                        <span>{{ $site->consentText() }} <a href="{{ $privacyUrl }}" target="_blank" rel="noopener">Privacy Policy</a>.</span>
                    </label>

                    <button type="submit" class="ctc-submit">
                        Send Message
                        <span class="ctc-submit-line"></span>
                    </button>
                </form>
            </div>
        </div>
    </div>
</section>
