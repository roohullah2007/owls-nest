{{-- FAQ accordion list — shared by both layouts. Expects $fqItems. --}}
<div class="fq-list">
    @foreach($fqItems as $fqItem)
    <div class="fq-item">
        <button type="button" class="fq-q" aria-expanded="false">
            <span>{{ $fqItem['question'] ?? '' }}</span>
            <svg class="fq-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/>
            </svg>
        </button>
        @if(!empty($fqItem['answer']))
        <div class="fq-a">
            @foreach(array_values(array_filter(array_map('trim', preg_split('/\R{2,}/', (string) $fqItem['answer'])))) as $fqPara)
            <p>{!! nl2br(e($fqPara)) !!}</p>
            @endforeach
        </div>
        @endif
    </div>
    @endforeach
</div>
