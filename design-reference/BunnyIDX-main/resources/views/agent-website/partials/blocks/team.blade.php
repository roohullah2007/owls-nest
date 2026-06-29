{{--
    Team block — agent team members. Slider layout mirrors the reference design
    (left heading / "View All" / arrows column beside a horizontal scroll of
    cards); grid layout lays the cards out in a 4-up grid. Optional social row
    pulls from the site's social accounts. Data: title, view_all_label,
    view_all_link, layout (grid|slider), align, show_social, members (JSON
    string of [{image, first_name, last_name, role}]).
--}}
@php
    $teamTitle = $block['data']['title'] ?? 'Meet Our Team';
    $teamViewLabel = trim((string) ($block['data']['view_all_label'] ?? '')) ?: 'View All';
    $teamViewLink = trim((string) ($block['data']['view_all_link'] ?? ''));
    $teamAlign = in_array(($block['data']['align'] ?? 'left'), ['left', 'center', 'right'], true) ? ($block['data']['align'] ?? 'left') : 'left';
    $teamLayout = (($block['data']['layout'] ?? 'slider') === 'grid') ? 'grid' : 'slider';
    $teamShowSocial = ! empty($block['data']['show_social']);
    $teamSocial = $teamShowSocial ? $site->socialAccounts() : [];
    $teamMembers = json_decode($block['data']['members'] ?? '[]', true);
    $teamMembers = is_array($teamMembers) ? array_values(array_filter($teamMembers, fn ($m) => is_array($m))) : [];

    // Source: 'team' pulls from the site's dynamic team (website settings →
    // Team); 'manual' uses the block's own repeater. Legacy blocks (no source
    // saved) keep the old behavior: manual members if any, else the dynamic team.
    $teamSource = $block['data']['source'] ?? null;
    if ($teamSource === 'team') {
        $teamMembers = [];
    }

    // Cards link to each member's public page, and "View All" defaults to /team
    // (except on the team page itself, where it would link to the current page).
    if (empty($teamMembers) && $teamSource !== 'manual') {
        $dynamicTeam = $site->teamMembers()->active()->orderBy('sort_order')->orderBy('name')->get();
        if ($dynamicTeam->isNotEmpty()) {
            $teamMembers = $dynamicTeam->map(function ($m) use ($site) {
                $parts = preg_split('/\s+/', trim($m->name), 2);

                return [
                    'image' => $m->photo ?? '',
                    'first_name' => $parts[0] ?? $m->name,
                    'last_name' => $parts[1] ?? '',
                    'role' => $m->title ?? '',
                    'link' => route('agent-site.team.member', [$site->slug, $m->slug]),
                ];
            })->all();
            if ($teamViewLink === '' && ($currentPage ?? '') !== 'team') {
                $teamViewLink = route('agent-site.team', $site->slug);
            }
        }
    }
    $teamBg = trim((string) ($block['data']['bg_color'] ?? '')) ?: '#FFFFFF';
    $teamText = trim((string) ($block['data']['text_color'] ?? ''));
    $teamStyle = 'background-color: ' . $teamBg . ';' . ($teamText ? ' --team-fg: ' . $teamText . ';' : '');
    $teamId = 'team-' . ($block['id'] ?? uniqid());
@endphp
@if(count($teamMembers))
<section class="team-block" style="{{ $teamStyle }}">
    <div class="team-block-inner">
        @if($teamShowSocial && count($teamSocial))
            @include('agent-website.partials.social-icons', ['items' => $teamSocial, 'class' => 'team-block-social'])
        @endif

        @if($teamLayout === 'slider')
        <div class="team-block-slider" id="{{ $teamId }}">
            <div class="team-block-aside">
                <div>
                    <h2 class="team-block-title">{!! nl2br(e($teamTitle)) !!}</h2>
                    @if($teamViewLink)
                    <a href="{{ $teamViewLink }}" class="team-block-viewall">{{ $teamViewLabel }} <span class="team-block-viewall-line"></span></a>
                    @endif
                </div>
                <div class="team-block-arrows">
                    <button type="button" class="team-block-arrow team-block-prev" aria-label="Previous team members">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button type="button" class="team-block-arrow team-block-next" aria-label="Next team members">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
            <div class="team-block-track">
                @foreach($teamMembers as $member)
                    @include('agent-website.partials.blocks.team-card', ['member' => $member])
                @endforeach
            </div>
            @if($teamViewLink)
            {{-- Mobile-only: the View All pill re-renders under the track (the aside copy hides). --}}
            <div class="slider-viewall-m"><a href="{{ $teamViewLink }}" class="team-block-viewall">{{ $teamViewLabel }} <span class="team-block-viewall-line"></span></a></div>
            @endif
        </div>
        @else
        @if($teamTitle !== '' || $teamViewLink)
        <div class="team-block-head team-block-head-{{ $teamAlign }}">
            @if($teamTitle !== '')<h2 class="team-block-title">{!! nl2br(e($teamTitle)) !!}</h2>@endif
            @if($teamViewLink)
            <a href="{{ $teamViewLink }}" class="team-block-viewall">{{ $teamViewLabel }} <span class="team-block-viewall-line"></span></a>
            @endif
        </div>
        @endif
        <div class="team-block-grid team-block-grid-cards">
            @foreach($teamMembers as $member)
                @include('agent-website.partials.blocks.team-card', ['member' => $member])
            @endforeach
        </div>
        @endif
    </div>
</section>

@if($teamLayout === 'slider')
<script>
    (function () {
        var root = document.getElementById('{{ $teamId }}');
        if (!root) return;
        var track = root.querySelector('.team-block-track');
        var prev = root.querySelector('.team-block-prev');
        var next = root.querySelector('.team-block-next');
        if (!track) return;
        prev && prev.addEventListener('click', function () { track.scrollBy({ left: -320, behavior: 'smooth' }); });
        next && next.addEventListener('click', function () { track.scrollBy({ left: 320, behavior: 'smooth' }); });
    })();
</script>
@endif
@endif
