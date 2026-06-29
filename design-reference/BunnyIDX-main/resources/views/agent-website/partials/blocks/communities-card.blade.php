{{--
    Single Communities card — a background image with the community name either
    overlaid on the image (over a dark gradient) or below it. Rendered as a link
    when the community resolves to an area page; placeholders render link-less and
    fall back to a neutral gradient so the card still looks complete.
    Expects: $card (['name','url','image']) and $cardStyle ('below'|'overlay').
--}}
<a class="cm-card cm-card-{{ $cardStyle }}" @if(!empty($card['url'])) href="{{ $card['url'] }}" @endif>
    <div class="cm-card-img" @if(!empty($card['image'])) style="background-image: url('{{ $card['image'] }}');" @endif>
        @if($cardStyle === 'overlay')
        <div class="cm-card-overlay">
            <h3 class="cm-card-title notranslate" translate="no">{{ $card['name'] }}</h3>
        </div>
        @endif
    </div>
    @if($cardStyle === 'below')
    <h3 class="cm-card-title notranslate" translate="no">{{ $card['name'] }}</h3>
    @endif
</a>
