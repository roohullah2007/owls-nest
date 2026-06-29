<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * CORS middleware for the MLS Relay and Plugin APIs.
 *
 * Allows browser requests from any origin (the WP plugin runs on customer
 * domains that we can't predict). License-key auth + domain verification
 * in MlsRelayController handles access control.
 */
class ApiCors
{
    public function handle(Request $request, Closure $next): Response
    {
        // Handle preflight OPTIONS requests immediately
        if ($request->isMethod('OPTIONS')) {
            return response('', 204)
                ->header('Access-Control-Allow-Origin', $this->getAllowedOrigin($request))
                ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'X-License-Key, Content-Type, Accept, Origin')
                ->header('Access-Control-Max-Age', '86400');
        }

        $response = $next($request);

        $response->headers->set('Access-Control-Allow-Origin', $this->getAllowedOrigin($request));
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'X-License-Key, Content-Type, Accept, Origin');
        $response->headers->set('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');

        return $response;
    }

    private function getAllowedOrigin(Request $request): string
    {
        // Reflect the requesting origin — license-key + domain verification
        // in the controller layer handles actual access control.
        return $request->header('Origin', '*');
    }
}
