@php
    /** Owner-branded "coming soon" placeholder for a landing page whose custom
        domain is connected but the page isn't published yet (or DNS still pending).
        Served with HTTP 503 + noindex so the real page is indexed once it goes live. */
    $accent = $page->accent_color ?: '#1693C9';
    $brand = $page->page_data['_config']['header_brand'] ?? ($page->agent_name ?: 'This page');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Coming soon</title>
    <style>
        :root { --accent: {{ $accent }}; }
        * { box-sizing: border-box; margin: 0; }
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #0c1117; color: #fff; min-height: 100vh; display: grid; place-items: center; padding: 24px; text-align: center; }
        .card { max-width: 460px; }
        .dot { width: 58px; height: 58px; border-radius: 999px; background: color-mix(in srgb, var(--accent) 26%, #0c1117); color: var(--accent); display: grid; place-items: center; margin: 0 auto 22px; }
        h1 { font-size: 26px; font-weight: 700; letter-spacing: -.02em; }
        p { color: rgba(255,255,255,.6); margin-top: 12px; font-size: 15px; line-height: 1.6; }
        .brand { margin-top: 26px; font-weight: 600; color: rgba(255,255,255,.85); }
    </style>
</head>
<body>
    <div class="card">
        <div class="dot">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </div>
        <h1>We’re almost ready</h1>
        <p>This page isn’t live just yet. Your domain is connected — check back shortly.</p>
        <div class="brand">{{ $brand }}</div>
    </div>
</body>
</html>
