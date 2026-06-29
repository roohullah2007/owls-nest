<section class="section" style="background:var(--bg-alt);">
    <div class="section-inner" style="text-align:center;">
        <div class="section-label" style="text-align:center;">{{ $block['data']['title'] ?? 'Areas We Serve' }}</div>
        <h2 class="section-title" style="text-align:center;">{{ $block['data']['subtitle'] ?? 'Neighborhoods I Specialize In' }}</h2>
        <div class="divider" style="margin:0 auto 40px;"></div>
        @php
            $areas = array_filter(array_map('trim', explode(',', $block['data']['areas'] ?? '')));
        @endphp
        @if(count($areas) > 0)
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:800px;margin:0 auto;">
            @foreach($areas as $area)
            <span style="display:inline-flex;align-items:center;padding:10px 24px;background:var(--bg-card);border:1px solid var(--border);font-size:14px;font-weight:500;letter-spacing:0.5px;color:var(--text);">{{ $area }}</span>
            @endforeach
        </div>
        @endif
    </div>
</section>
