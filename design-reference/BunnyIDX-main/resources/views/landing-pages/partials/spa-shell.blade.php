@php
    /**
     * Public landing page — React shell (classic + video-landing designs, and the
     * full-screen lead flow). The server emits <head> SEO meta and mounts the React
     * app into #lp-root with a data-page JSON payload built from the page's stored
     * blocks + config + agent. There is NO Blade templating of page content — every
     * block is a React component (resources/js/landing-pages/public/**).
     *
     * Expects: $page, $isOwner, $submitted, and (flow mode only) $hero/$address/$owner.
     */
    use Illuminate\Support\Facades\Storage;
    use Illuminate\Support\Str;

    $defaultAccent = $page->template === 'video-landing' ? '#F0492B' : '#1693C9';
    $accent = $page->accent_color ?: $defaultAccent;
    $cfg = $page->page_data['_config'] ?? [];
    $mode = ($mode ?? 'page');

    $resolve = fn ($v) => $v ? (Str::startsWith($v, 'http') ? $v : Storage::url($v)) : null;

    $title = $page->meta_title ?: $page->name;

    $payload = [
        'template' => $page->template,
        'mode' => $mode,
        'accent' => $accent,
        'submitUrl' => route('landing.submit', $page->slug),
        'showUrl' => route('landing.show', $page->slug),
        'flowUrl' => route('landing.flow', $page->slug),
        'csrf' => csrf_token(),
        'submitted' => (bool) ($submitted ?? false),
        'isOwnerDraft' => (bool) (($isOwner ?? false) && ! $page->is_published),
        'isPublished' => (bool) $page->is_published,
        'mapsKey' => config('services.google.maps_key') ?: null,
        'assetBase' => Storage::url('/'),
        'privacyUrl' => route('privacy'),
        'termsUrl' => route('terms'),
        'page' => [
            'name' => $page->name,
            'type' => $page->type,
            'slug' => $page->slug,
        ],
        'agent' => [
            'name' => $page->agent_name,
            'email' => $page->agent_email,
            'phone' => $page->agent_phone,
            'photo' => $resolve($page->agent_photo),
        ],
        'config' => array_merge($cfg, ['logo' => $resolve($cfg['logo'] ?? null)]),
        'blocks' => collect($page->page_data['blocks'] ?? [])
            ->reject(fn ($b) => ($b['hidden'] ?? false))
            ->values()
            ->all(),
    ];

    if ($mode === 'flow') {
        $payload['flow'] = [
            'hero' => $hero ?? [],
            'address' => (string) ($address ?? ''),
            'owner' => (string) ($owner ?? ''),
        ];
    }
@endphp
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title }}</title>
    @if($page->meta_description)<meta name="description" content="{{ $page->meta_description }}">@endif
    @if($mode === 'flow' || ! $page->is_published)<meta name="robots" content="noindex, nofollow">@endif
    @include('landing-pages.partials.fonts')
    @viteReactRefresh
    @vite(['resources/css/landing-pages/app.css', 'resources/js/landing-pages/public/app.tsx'])
    <style>:root { --accent: {{ $accent }}; }</style>
</head>
<body>
    <div id="lp-root" data-page='@json($payload)'></div>
</body>
</html>
