{{-- A single team member card — shared by the team block's grid and slider. --}}
@php
    $tcImg = $member['image'] ?? '';
    $tcImgSrc = $tcImg ? (\Illuminate\Support\Str::startsWith($tcImg, ['http://', 'https://']) ? $tcImg : Storage::url($tcImg)) : '';
    $tcFirst = $member['first_name'] ?? '';
    $tcLast = $member['last_name'] ?? '';
    $tcRole = $member['role'] ?? '';
    $tcName = trim($tcFirst . ' ' . $tcLast);
    // Dynamic team members carry a link to their public /team/{slug} page.
    $tcLink = trim((string) ($member['link'] ?? ''));
    $tcTag = $tcLink ? 'a' : 'div';
@endphp
<{{ $tcTag }} class="team-block-card" @if($tcLink) href="{{ $tcLink }}" style="text-decoration:none;color:inherit;" @endif>
    <div class="team-block-img">
        @if($tcImgSrc)
        <img src="{{ $tcImgSrc }}" alt="{{ $tcName }}" loading="lazy">
        @else
        <div class="team-block-img-placeholder">{{ $tcName ?: 'Team Member' }}</div>
        @endif
    </div>
    @if($tcFirst)<p class="team-block-first">{{ $tcFirst }}</p>@endif
    @if($tcLast)<h3 class="team-block-last">{{ $tcLast }}</h3>@endif
    @if($tcRole)
    <span class="team-block-role">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        {{ $tcRole }}
    </span>
    @endif
</{{ $tcTag }}>
