@php
    /**
     * IDX Squeeze — public shell. Server emits <head> meta (SEO) and mounts the
     * React "Villa Serena" template into #idx-squeeze-root with a data-page JSON
     * payload built from the property snapshot (_listing) + copy config (_config)
     * + agent. No blocks — the template is a fixed, data-driven React component.
     */
    use Illuminate\Support\Facades\Storage;
    use Illuminate\Support\Str;

    $accent = $page->accent_color ?: '#2a5d8f';
    $title = $page->meta_title ?: $page->name;
    $L = $page->page_data['_listing'] ?? [];
    $c = $page->page_data['_config'] ?? [];

    $resolve = fn ($v) => $v ? (Str::startsWith($v, 'http') ? $v : Storage::url($v)) : null;

    $payload = [
        'template' => $c['design'] ?? 'villa-serena',
        'accent' => $accent,
        'submitUrl' => route('landing.submit', $page->slug),
        'csrf' => csrf_token(),
        'submitted' => (bool) $submitted,
        'gate' => (bool) ($c['gate'] ?? true),
        'page' => ['name' => $page->name, 'type' => $page->type, 'slug' => $page->slug],
        'agent' => [
            'name' => $page->agent_name,
            'email' => $page->agent_email,
            'phone' => $page->agent_phone,
            'photo' => $resolve($page->agent_photo),
        ],
        'config' => array_merge($c, ['logo' => $resolve($c['logo'] ?? null)]),
        'listing' => $L,
    ];
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    {{-- IDX landing pages are private lead-capture funnels — not SEO surfaces. --}}
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $title }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    @viteReactRefresh
    @vite(['resources/css/landing-pages/app.css', 'resources/js/landing-pages/idx-squeeze/app.tsx'])
    <style>
        :root { --accent: {{ $accent }}; }
        html { scroll-behavior: smooth; }
        body { margin: 0; font-family: 'Open Sans', system-ui, sans-serif; background: #fff; }
        ::selection { background: var(--accent); color: #fff; }
        section { scroll-margin-top: 84px; }
    </style>
</head>
<body>
    @unless($page->is_published)
        <div style="background:#1c1c1e">
            <div class="mx-auto max-w-[1240px] px-6 py-2 text-center text-[13px] font-semibold tracking-[0.02em] text-white">Draft preview — this page is not published yet.</div>
        </div>
    @endunless
    <div id="idx-squeeze-root" data-page='@json($payload)'></div>
</body>
</html>
