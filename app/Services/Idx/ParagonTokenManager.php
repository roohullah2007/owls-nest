<?php

declare(strict_types=1);

namespace App\Services\Idx;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Fetches + caches Paragon OData Bearer tokens (OAuth2 client_credentials flow,
 * IdentityServer at {service root}/identity/connect/token, scope `OData`).
 *
 * Paragon tokens are short-lived (expires_in ~7200s / 2h) — we cache per
 * (server, account) and refresh ~60s before expiry so we never serve a dying
 * token. A connection's login/password are its client_id/client_secret.
 */
class ParagonTokenManager
{
    private const CACHE_KEY = 'paragon_access_token';

    public function getToken(ParagonCredentials $credentials): ?string
    {
        $cacheKey = self::CACHE_KEY.':'.$credentials->cacheKey();
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        if (! $credentials->hasClientPair()) {
            Log::warning('Paragon: missing client_id/client_secret on connection');

            return null;
        }

        $response = Http::asForm()
            ->timeout((int) config('idx.paragon.timeout', 20))
            ->post($credentials->tokenUrl(), [
                'grant_type' => 'client_credentials',
                'client_id' => $credentials->clientId,
                'client_secret' => $credentials->clientSecret,
                'scope' => 'OData',
            ]);

        if ($response->failed()) {
            Log::error('Paragon: token request failed', ['status' => $response->status(), 'body' => $response->body()]);

            return null;
        }

        $token = $response->json('access_token');
        $expiresIn = (int) $response->json('expires_in', 7200);
        if (! $token) {
            return null;
        }

        $ttl = min((int) config('idx.paragon.token_cache_ttl', 7140), max(60, $expiresIn - 60));
        Cache::put($cacheKey, $token, $ttl);

        return $token;
    }

    /** Force-fetch a new token (used after a 401/403 on a downstream call). */
    public function refresh(ParagonCredentials $credentials): ?string
    {
        Cache::forget(self::CACHE_KEY.':'.$credentials->cacheKey());

        return $this->getToken($credentials);
    }
}
