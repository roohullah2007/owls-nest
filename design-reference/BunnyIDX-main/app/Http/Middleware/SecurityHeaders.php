<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds low-risk security response headers across the web stack.
 *
 * Deliberately scoped to headers that cannot break functionality:
 *  - Strict-Transport-Security (only over HTTPS — pins clients to TLS)
 *  - Referrer-Policy (stops full URLs leaking to third parties via Referer)
 *
 * X-Frame-Options / X-Content-Type-Options are already set at the nginx layer.
 *
 * NOT added here (intentionally): a blocking Content-Security-Policy and a
 * restrictive Permissions-Policy. This app uses WebRTC telephony (microphone),
 * maps (geolocation), Stripe, Google OAuth/Translate, Reverb websockets and
 * embedded third-party widgets — a CSP must be rolled out Report-Only first and
 * tuned per surface, or it will silently break those features. Track separately.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // HSTS is only meaningful (and only honoured) over HTTPS. Sent without
        // `includeSubDomains`/`preload` on purpose: customer custom domains are
        // served from this same stack and we must not assert policy over
        // subdomains we don't control.
        if ($request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }

        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        return $response;
    }
}
