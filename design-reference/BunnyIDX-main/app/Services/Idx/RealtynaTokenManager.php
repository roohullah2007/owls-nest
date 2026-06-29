<?php

declare(strict_types=1);

namespace App\Services\Idx;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Fetches + caches RealtyFeed Bearer tokens (OAuth2 client_credentials flow).
 * Tokens are valid for 24h; we cache for 23h to refresh before expiry.
 *
 * Tokens are cached PER Realtyna account (client_id) — connections integrated
 * with their own credentials don't share tokens with the platform account.
 */
class RealtynaTokenManager
{
    private const CACHE_KEY = 'realtyna_access_token';

    public function getToken(?RealtynaCredentials $credentials = null): ?string
    {
        $credentials ??= RealtynaCredentials::fromConfig();

        $cacheKey = self::CACHE_KEY.':'.$credentials->cacheKey();
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        if (! $credentials->hasClientPair()) {
            Log::warning('Realtyna: missing client_id/client_secret (no connection credentials, no config fallback)');

            return null;
        }

        $base = rtrim(config('idx.realtyna.base_url'), '/');
        $response = Http::asForm()->post("{$base}/v1/auth/token", [
            'client_id' => $credentials->clientId,
            'client_secret' => $credentials->clientSecret,
        ]);

        if ($response->failed()) {
            Log::error('Realtyna: token request failed', ['status' => $response->status(), 'body' => $response->body()]);

            return null;
        }

        $token = $response->json('access_token');
        $expiresIn = (int) $response->json('expires_in', 86400);
        if (! $token) {
            return null;
        }

        // Cache 60s before stated expiry so we never serve a dying token.
        $ttl = min((int) config('idx.realtyna.token_cache_ttl', 82800), max(60, $expiresIn - 60));
        Cache::put($cacheKey, $token, $ttl);

        return $token;
    }

    /** Force-fetch a new token (used after a 401/403 on a downstream call). */
    public function refresh(?RealtynaCredentials $credentials = null): ?string
    {
        $credentials ??= RealtynaCredentials::fromConfig();
        Cache::forget(self::CACHE_KEY.':'.$credentials->cacheKey());

        return $this->getToken($credentials);
    }
}
