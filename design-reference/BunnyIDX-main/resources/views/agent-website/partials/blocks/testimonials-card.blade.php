{{-- A single quote card — shared by the testimonials block's slider & grid variants. --}}
@php
    $tcQuote = $item['quote'] ?? '';
    $tcAuthor = $item['author'] ?? '';
    $tcRole = $item['role'] ?? '';
    $tcLink = trim((string) ($item['link'] ?? ''));
    $tcRating = isset($item['rating']) && (int) $item['rating'] >= 1 ? min(5, (int) $item['rating']) : null;
@endphp
<div class="tb-card">
    <svg class="tb-card-quoteicon" fill="currentColor" viewBox="0 0 24 24"><path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z"/></svg>
    @if($tcRating)
    <span class="tb-card-stars" aria-label="{{ $tcRating }} out of 5 stars">
        @for($i = 1; $i <= 5; $i++)
            <svg viewBox="0 0 24 24" fill="{{ $i <= $tcRating ? 'currentColor' : 'none' }}" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>
        @endfor
    </span>
    @endif
    @if($tcQuote)<p class="tb-card-text">{{ $tcQuote }}</p>@endif
    @if($tcLink)
    <a href="{{ $tcLink }}" class="tb-card-readmore">Read More
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:12px;height:12px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    </a>
    @endif
    @if($tcAuthor)<p class="tb-card-author">{{ $tcAuthor }}</p>@endif
    @if($tcRole)<p class="tb-card-role">{{ $tcRole }}</p>@endif
</div>
