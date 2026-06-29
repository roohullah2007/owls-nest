{{--
    Hero right column (luxury, two-column layout) — either a lead-capture form
    (buyer / seller / contact) or a featured-listings grid. Relies on
    $heroRightType, $heroForm* and $site from the home page's hero config block.
--}}
<div class="hero-right">
    @if($heroRightType === 'listings')
        @php $heroListings = method_exists($site, 'listings') ? $site->listings()->limit(6)->get() : collect(); @endphp
        <div class="hero-listings">
            @forelse($heroListings as $listing)
                <a href="#" class="hero-listing-card">
                    <div class="hero-listing-img" @if($listing->primary_image ?? null) style="background-image:url('{{ asset('storage/' . $listing->primary_image) }}')" @endif></div>
                    <div class="hero-listing-meta">
                        <span class="hero-listing-price">{{ isset($listing->price) ? '$' . number_format($listing->price) : '' }}</span>
                        <span class="hero-listing-addr">{{ $listing->address ?? '' }}</span>
                    </div>
                </a>
            @empty
                <div class="hero-listings-empty">Featured listings will appear here.</div>
            @endforelse
        </div>
    @else
        <div class="hero-form-card">
            @if($heroFormHeading)<h3 class="hero-form-title">{{ $heroFormHeading }}</h3>@endif
            @if($heroFormText)<p class="hero-form-text">{{ $heroFormText }}</p>@endif
            <form class="hero-form" method="POST" action="{{ route('agent-site.contact.submit', $site->slug) }}">
                @csrf
                <input type="hidden" name="lead_type" value="{{ $heroFormType === 'seller' ? 'seller' : 'buyer' }}">
                <input type="text" name="name" placeholder="Full Name" required>
                <input type="email" name="email" placeholder="Email Address" required>
                <input type="tel" name="phone" placeholder="Phone Number">

                @if($heroFormType === 'buyer')
                    <input type="text" name="city" placeholder="Preferred Area or City">
                    <div class="hero-form-row">
                        <select name="interest">
                            <option value="">Price Range</option>
                            <option>Under $300k</option>
                            <option>$300k – $500k</option>
                            <option>$500k – $750k</option>
                            <option>$750k – $1M</option>
                            <option>$1M+</option>
                        </select>
                        <select name="property_condition">
                            <option value="">Bedrooms</option>
                            <option>1+</option>
                            <option>2+</option>
                            <option>3+</option>
                            <option>4+</option>
                            <option>5+</option>
                        </select>
                    </div>
                    <textarea name="message" placeholder="Any must-haves or notes?" rows="2"></textarea>
                @elseif($heroFormType === 'seller')
                    <input type="text" name="property_address" placeholder="Property Address">
                    <input type="text" name="interest" placeholder="Property Type (e.g. Single Family, Condo)">
                    <textarea name="message" placeholder="Anything we should know?" rows="2"></textarea>
                @else
                    <textarea name="message" placeholder="How can we help?" rows="2"></textarea>
                @endif

                <label class="hero-form-consent">
                    <input type="checkbox" name="sms_consent" value="1">
                    <span>I agree to be contacted by {{ $site->agent_name }} via call, text, or email. Message &amp; data rates may apply. <a href="{{ $site->page_data['_config']['privacy_url'] ?? '#' }}" target="_blank" rel="noopener">Privacy Policy</a>.</span>
                </label>
                <button type="submit" class="hero-form-submit">{{ $heroFormSubmit }}</button>
            </form>
        </div>
    @endif
</div>
