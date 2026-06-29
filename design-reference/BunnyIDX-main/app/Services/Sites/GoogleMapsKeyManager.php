<?php

declare(strict_types=1);

namespace App\Services\Sites;

use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Keeps the public browser Maps key's HTTP-referrer allowlist in sync with the
 * custom domains agents connect, via the Google Cloud API Keys v2 REST API
 * (https://cloud.google.com/api-keys/docs/reference/rest). The key stays
 * referrer-restricted in Google Cloud (so it can't be lifted and abused on a
 * stranger's site) — we just let the system manage which domains are allowed
 * instead of someone hand-editing the Cloud Console on every new customer.
 *
 * Best-effort but write-must-land: read-modify-write under the key's etag, and
 * throw on failure so the queued job retries (unlike the Cloudflare flow there
 * is no later polling step to self-heal a missed update).
 */
class GoogleMapsKeyManager
{
    /** Soft ceiling before Google's hard ~1200-referrer-per-key limit; logged, not enforced. */
    private const REFERRER_WARN_AT = 1000;

    private const KEYS_API = 'https://apikeys.googleapis.com/v2';

    private const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

    /** Whether a key resource + a usable service-account credential are configured. */
    public function configured(): bool
    {
        return filled(config('services.google.maps_key_resource'))
            && filled(config('services.google.maps_key_credentials'));
    }

    /** Add a domain (apex + all sub-domains) to the key's allowed referrers. Idempotent. */
    public function addDomain(string $domain): void
    {
        $this->sync($domain, add: true);
    }

    /** Remove a domain's referrer entries from the key. Idempotent. */
    public function removeDomain(string $domain): void
    {
        $this->sync($domain, add: false);
    }

    /**
     * The two referrer patterns we manage per domain: the bare host plus a
     * wildcard that covers www and any other sub-domain. Deterministic so removal
     * is an exact match of what addDomain() wrote.
     *
     * @return array<int, string>
     */
    public function referrersFor(string $domain): array
    {
        $host = strtolower(trim($domain));

        return [
            "https://{$host}/*",
            "https://*.{$host}/*",
        ];
    }

    private function sync(string $domain, bool $add): void
    {
        if (! $this->configured()) {
            return;
        }

        $name = (string) config('services.google.maps_key_resource');
        $token = $this->accessToken();

        $key = $this->getKey($name, $token);
        $restrictions = $key['restrictions'] ?? [];
        $current = $restrictions['browserKeyRestrictions']['allowedReferrers'] ?? [];

        $managed = $this->referrersFor($domain);
        $next = $add
            ? array_values(array_unique([...$current, ...$managed]))
            : array_values(array_filter($current, fn ($r) => ! in_array($r, $managed, true)));

        // Nothing to do — avoids a needless write (and an etag round-trip race).
        if ($next === $current) {
            return;
        }

        if ($add && count($next) >= self::REFERRER_WARN_AT) {
            Log::warning('GoogleMapsKeyManager: approaching the per-key referrer limit.', [
                'count' => count($next),
                'hard_limit' => 1200,
            ]);
        }

        // Preserve every other restriction (apiTargets, the browser-restriction type) —
        // updateMask=restrictions replaces the whole block, so we send it back intact.
        $restrictions['browserKeyRestrictions'] = array_merge(
            $restrictions['browserKeyRestrictions'] ?? [],
            ['allowedReferrers' => $next],
        );

        $this->patchRestrictions($name, $token, $restrictions, $key['etag'] ?? null);
    }

    /** @return array{restrictions?: array<string, mixed>, etag?: string} */
    private function getKey(string $name, string $token): array
    {
        $res = Http::withToken($token)->timeout(15)->get(self::KEYS_API."/{$name}");

        if (! $res->successful()) {
            Log::error('GoogleMapsKeyManager: failed to read key.', [
                'status' => $res->status(),
                'body' => $res->json(),
            ]);

            throw new RuntimeException('Unable to read Maps API key restrictions.');
        }

        return $res->json();
    }

    /** @param array<string, mixed> $restrictions */
    private function patchRestrictions(string $name, string $token, array $restrictions, ?string $etag): void
    {
        $payload = ['restrictions' => $restrictions];
        if ($etag !== null) {
            $payload['etag'] = $etag; // optimistic lock — a concurrent write 409s and we retry.
        }

        $res = Http::withToken($token)
            ->timeout(15)
            ->patch(self::KEYS_API."/{$name}?updateMask=restrictions", $payload);

        if (! $res->successful()) {
            Log::error('GoogleMapsKeyManager: failed to update key referrers.', [
                'status' => $res->status(),
                'body' => $res->json(),
            ]);

            throw new RuntimeException('Unable to update Maps API key referrers.');
        }
    }

    private function accessToken(): string
    {
        $client = new GoogleClient;
        $client->setAuthConfig((string) config('services.google.maps_key_credentials'));
        $client->addScope(self::SCOPE);

        $token = $client->fetchAccessTokenWithAssertion();

        if (! isset($token['access_token'])) {
            Log::error('GoogleMapsKeyManager: could not obtain an access token.', ['response' => $token]);

            throw new RuntimeException('Unable to authenticate to the Google API Keys API.');
        }

        return $token['access_token'];
    }
}
