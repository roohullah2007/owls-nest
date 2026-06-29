<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\License;
use App\Models\RelayLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Logs every MLS Relay API request to the relay_logs table.
 * Runs after the response is built so we can capture HTTP status and timing.
 */
class RelayLogger
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        $response = $next($request);

        $this->log($request, $response, $start);

        return $response;
    }

    private function log(Request $request, Response $response, float $start): void
    {
        $licenseKey = $request->header('X-License-Key');
        if (!$licenseKey) {
            return; // Public endpoints (datasets) — don't log
        }

        $license = License::where('key', $licenseKey)->first();
        if (!$license) {
            return; // Invalid key — auth layer already returned 401
        }

        $responseMs = (int) round((microtime(true) - $start) * 1000);

        // Use X-Cache header set by MlsRelayController for reliable cache detection
        $wasCached = $response->headers->get('X-Cache') === 'HIT';

        $errorMessage = null;
        if ($response->getStatusCode() >= 400) {
            $data = json_decode($response->getContent(), true);
            $errorMessage = $data['error'] ?? substr($response->getContent(), 0, 500);
        }

        try {
            RelayLog::create([
                'license_id' => $license->id,
                'mls_slug' => $request->input('mls', '-'),
                'endpoint' => substr($request->path(), 0, 500),
                'params_hash' => md5(json_encode($request->except('access_token'))),
                'http_status' => $response->getStatusCode(),
                'response_ms' => $responseMs,
                'was_cached' => $wasCached,
                'error_message' => $errorMessage ? substr($errorMessage, 0, 500) : null,
                'requested_at' => now(),
            ]);
        } catch (\Throwable) {
            // Don't let logging failures break the API response
        }
    }
}
