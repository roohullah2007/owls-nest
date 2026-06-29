<?php

declare(strict_types=1);

namespace App\Services\Sites;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper over the Cloudflare for SaaS "Custom Hostnames" API
 * (https://developers.cloudflare.com/api/resources/custom_hostnames/). Lets the
 * app register a customer domain so Cloudflare issues + renews its SSL
 * automatically (DV cert, HTTP validation). All methods are best-effort and log
 * failures rather than throwing, so the domain flow never hard-breaks.
 */
class CloudflareSaaSClient
{
    private const API = 'https://api.cloudflare.com/client/v4';

    /** Whether a token + zone are configured (else the app uses the DNS-only flow). */
    public function configured(): bool
    {
        return filled(config('sites.cloudflare.api_token')) && filled(config('sites.cloudflare.zone_id'));
    }

    /**
     * Ensure a custom hostname exists for the domain (idempotent), returning its
     * normalized status. Returns null if the API call fails.
     *
     * @return array{id: ?string, status: ?string, ssl_status: ?string}|null
     */
    public function ensureHostname(string $hostname): ?array
    {
        if ($existing = $this->findByHostname($hostname)) {
            return $existing;
        }

        $res = $this->client()->post('/custom_hostnames', [
            'hostname' => $hostname,
            'ssl' => [
                // NOTE: 'certificate_authority' is Enterprise-only — omitting it lets
                // Cloudflare pick the default CA (works on all plans).
                'method' => 'http',
                'type' => 'dv',
                'bundle_method' => 'ubiquitous',
                'settings' => ['min_tls_version' => '1.2'],
            ],
        ]);

        if (! $res->successful()) {
            Log::error('Cloudflare: create custom hostname failed', ['hostname' => $hostname, 'response' => $res->json()]);

            return null;
        }

        return $this->shape($res->json('result'));
    }

    /** @return array{id: ?string, status: ?string, ssl_status: ?string}|null */
    public function findByHostname(string $hostname): ?array
    {
        $res = $this->client()->get('/custom_hostnames', ['hostname' => $hostname]);
        if (! $res->successful()) {
            return null;
        }

        $first = $res->json('result.0');

        return $first ? $this->shape($first) : null;
    }

    /** @return array{id: ?string, status: ?string, ssl_status: ?string}|null */
    public function status(string $id): ?array
    {
        $res = $this->client()->get("/custom_hostnames/{$id}");

        return $res->successful() ? $this->shape($res->json('result')) : null;
    }

    public function delete(string $id): void
    {
        $res = $this->client()->delete("/custom_hostnames/{$id}");
        if (! $res->successful()) {
            Log::warning('Cloudflare: delete custom hostname failed', ['id' => $id, 'response' => $res->json()]);
        }
    }

    private function client(): PendingRequest
    {
        // 10s hard cap per call so synchronous paths (verify) never approach the
        // 20s budget; transient retries are handled at the queued-job level.
        return Http::withToken((string) config('sites.cloudflare.api_token'))
            ->acceptJson()
            ->timeout(10)
            ->baseUrl(self::API . '/zones/' . config('sites.cloudflare.zone_id'));
    }

    /**
     * @param  array<string, mixed>|null  $result
     * @return array{id: ?string, status: ?string, ssl_status: ?string}
     */
    private function shape(?array $result): array
    {
        return [
            'id' => $result['id'] ?? null,
            'status' => $result['status'] ?? null,          // pending | active | ...
            'ssl_status' => $result['ssl']['status'] ?? null, // pending_validation | active | ...
        ];
    }
}
