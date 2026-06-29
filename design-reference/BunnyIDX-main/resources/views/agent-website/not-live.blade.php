{{--
    Theme-agnostic "coming soon" page shown on a custom domain when its site is
    connected but NOT yet live (draft / pending DNS). Pulls the owner's own
    branding (logo, hero image, accent, names) so it reads as THEIR site — never
    the platform. Served with HTTP 503 + noindex so it isn't indexed before launch.
--}}
@php
    $accent = $site->accent_color ?: '#C9A24B';
    $logo = $site->site_logo_light ?: $site->site_logo_dark ?: $site->brokerage_logo_light ?: $site->brokerage_logo_dark ?: null;
    $hero = $site->hero_image;
    $name = $site->agent_name ?: 'Our New Website';
    $brokerage = $site->brokerage_name;
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>Coming Soon — {{ $name }}</title>
    @if($site->favicon)
    <link rel="icon" href="{{ asset('storage/' . $site->favicon) }}">
    @endif
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,300..700&display=swap" rel="stylesheet">
    <style>
        :root { --accent: {{ $accent }}; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; }
        body {
            font-family: 'Roboto Flex', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #fff;
            background: #0d0f12;
            position: relative;
            overflow: hidden;
        }
        .bg {
            position: absolute;
            inset: 0;
            transform: scale(1.06);
            @if($hero)
            background: url('{{ asset('storage/' . $hero) }}') center / cover no-repeat;
            filter: brightness(.42);
            @else
            background: radial-gradient(120% 120% at 50% 0%, #1d2530 0%, #0d0f12 70%);
            @endif
        }
        .overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(8,10,13,.45) 0%, rgba(8,10,13,.82) 100%);
        }
        .content {
            position: relative;
            z-index: 2;
            padding: 2rem;
            max-width: 640px;
            animation: rise .9s cubic-bezier(.2,.7,.2,1) both;
        }
        @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .brand-logo { max-height: 60px; max-width: 240px; margin: 0 auto 2.5rem; display: block; }
        .brand-name {
            font-size: 1rem;
            letter-spacing: .3em;
            text-transform: uppercase;
            font-weight: 500;
            margin-bottom: 2.5rem;
            color: rgba(255,255,255,.92);
        }
        .rule { width: 46px; height: 2px; background: var(--accent); margin: 0 auto 1.75rem; border-radius: 2px; }
        h1 {
            font-size: clamp(2.5rem, 7vw, 4.5rem);
            font-weight: 300;
            letter-spacing: .01em;
            line-height: 1.04;
            margin-bottom: 1.25rem;
        }
        h1 b { font-weight: 600; color: var(--accent); }
        p {
            font-size: 1.05rem;
            font-weight: 300;
            line-height: 1.75;
            color: rgba(255,255,255,.72);
            max-width: 460px;
            margin: 0 auto;
        }
        .foot {
            position: absolute;
            bottom: 1.75rem;
            left: 0; right: 0;
            z-index: 2;
            font-size: .78rem;
            letter-spacing: .08em;
            text-transform: uppercase;
            color: rgba(255,255,255,.4);
        }
    </style>
</head>
<body>
    <div class="bg"></div>
    <div class="overlay"></div>

    <div class="content">
        @if($logo)
            <img class="brand-logo" src="{{ asset('storage/' . $logo) }}" alt="{{ $name }}">
        @else
            <div class="brand-name">{{ $name }}</div>
        @endif

        <div class="rule"></div>
        <h1>Coming <b>Soon</b></h1>
        <p>{{ $name }}{{ $brokerage ? ' · ' . $brokerage : '' }} is putting the finishing touches on a brand-new website. Please check back shortly.</p>
    </div>

    @if($brokerage && $logo)
    <div class="foot">{{ $brokerage }}</div>
    @endif
</body>
</html>
