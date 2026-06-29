<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $site->thank_you_headline ?: 'Thank You!' }} | {{ $site->agent_name }}</title>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #F8FAFC;
            color: #0F172A;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        .card {
            max-width: 480px;
            width: 100%;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 1rem;
            padding: 3rem 2rem;
            text-align: center;
        }
        .icon {
            width: 56px;
            height: 56px;
            background: #ECFDF5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }
        .icon svg { color: #059669; }
        h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
        }
        p {
            font-size: 1rem;
            color: #64748B;
            line-height: 1.6;
            margin-bottom: 2rem;
        }
        a.btn {
            display: inline-block;
            font-size: 0.9375rem;
            font-weight: 600;
            padding: 0.75rem 2rem;
            background: #0F172A;
            color: #FFFFFF;
            border-radius: 0.5rem;
            text-decoration: none;
            transition: background 0.2s;
        }
        a.btn:hover { background: #1E293B; }
    </style>
    @include('agent-website.partials.tracking-scripts')
</head>
<body>
    <div class="card">
        <div class="icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
        </div>
        <h1>{{ $site->thank_you_headline ?: 'Thank You!' }}</h1>
        <p>{{ $site->thank_you_message ?: "We've received your message and will be in touch shortly." }}</p>
        <a href="{{ route('agent-site.home', $site->slug) }}" class="btn">Back to Home</a>
    </div>
    @if($site->tracking_body){!! $site->tracking_body !!}@endif
</body>
</html>
