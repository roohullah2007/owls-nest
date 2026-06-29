<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Services\LicenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * WordPress Plugin API — endpoints for the IDX plugin to manage
 * license activation, verification, and retrieve configuration.
 *
 * All endpoints are stateless (no session/CSRF). Auth is via X-License-Key header
 * unless noted as public.
 */
class PluginController extends Controller
{
    public function __construct(
        private readonly LicenseService $licenseService,
    ) {}

    /**
     * Health check — public, no auth required.
     * Plugin calls this on activation to confirm backend is reachable.
     */
    public function health(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'version' => '1.0.0',
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Verify a license key and optionally check domain binding.
     *
     * POST /api/v1/plugin/verify-license
     * Body: { "license_key": "IDX-XXXX-XXXX-XXXX", "domain": "example.com" }
     */
    public function verifyLicense(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'license_key' => 'required|string|max:50',
            'domain' => 'nullable|string|max:255',
        ]);

        $license = License::where('key', $validated['license_key'])->first();

        if (!$license) {
            return $this->error('License key not found.', 404);
        }

        if (!$license->isActive()) {
            return response()->json([
                'valid' => false,
                'status' => $license->status,
                'reason' => $license->status === 'revoked'
                    ? 'License has been revoked: ' . ($license->revoked_reason ?? 'Contact support.')
                    : 'License is not active.',
            ]);
        }

        $activeDomain = $license->activeDomain;
        $domainMatch = true;

        if (!empty($validated['domain']) && $activeDomain) {
            $normalized = $this->normalizeDomain($validated['domain']);
            $domainMatch = $activeDomain->domain === $normalized
                || str_ends_with($normalized, '.' . $activeDomain->domain);
        }

        // Get user's active MLS connections for this license
        $user = $license->user;
        $connections = [];
        if ($user) {
            $connections = $user->idxConnections()
                ->connected()
                ->get(['id', 'provider', 'mls_slug', 'display_name'])
                ->toArray();
        }

        return response()->json([
            'valid' => true,
            'status' => 'active',
            'domain' => $activeDomain?->domain,
            'domain_match' => $domainMatch,
            'activated_at' => $activeDomain?->activated_at?->toIso8601String(),
            'connections' => $connections,
            'features' => [
                'search' => true,
                'listing_detail' => true,
                'embed_widgets' => true,
                'saved_searches' => false, // future
            ],
        ]);
    }

    /**
     * Activate a license on a domain.
     *
     * POST /api/v1/plugin/activate
     * Body: { "license_key": "IDX-XXXX-XXXX-XXXX", "domain": "example.com" }
     */
    public function activate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'license_key' => 'required|string|max:50',
            'domain' => 'required|string|max:255',
        ]);

        $license = License::where('key', $validated['license_key'])->first();

        if (!$license) {
            return $this->error('License key not found.', 404);
        }

        if (!$license->isActive()) {
            return $this->error('License is not active.', 403);
        }

        try {
            $domain = $this->licenseService->activate(
                $validated['license_key'],
                $validated['domain'],
                $request->ip(),
            );
        } catch (\Throwable $e) {
            return $this->error('Activation failed: ' . $e->getMessage(), 422);
        }

        return response()->json([
            'activated' => true,
            'domain' => $domain->domain,
            'activated_at' => $domain->activated_at->toIso8601String(),
            'previous_domain' => null, // deactivated by LicenseService
        ]);
    }

    /**
     * Deactivate a license from a domain.
     *
     * POST /api/v1/plugin/deactivate
     * Body: { "license_key": "IDX-XXXX-XXXX-XXXX", "domain": "example.com" }
     */
    public function deactivate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'license_key' => 'required|string|max:50',
            'domain' => 'required|string|max:255',
        ]);

        $license = License::where('key', $validated['license_key'])->first();

        if (!$license) {
            return $this->error('License key not found.', 404);
        }

        try {
            $this->licenseService->deactivate($validated['license_key'], $validated['domain']);
        } catch (\Throwable $e) {
            return $this->error('Deactivation failed: ' . $e->getMessage(), 422);
        }

        return response()->json([
            'deactivated' => true,
            'domain' => $this->normalizeDomain($validated['domain']),
        ]);
    }

    /**
     * Get plugin settings/configuration for a license.
     * Returns MLS connections, embed snippets, and feature flags.
     *
     * GET /api/v1/plugin/settings
     * Header: X-License-Key
     */
    public function settings(Request $request): JsonResponse
    {
        $licenseKey = $request->header('X-License-Key');

        if (!$licenseKey) {
            return $this->error('Missing X-License-Key header.', 401);
        }

        $license = License::where('key', $licenseKey)->where('status', 'active')->first();

        if (!$license) {
            return $this->error('Invalid or inactive license key.', 401);
        }

        $user = $license->user;
        if (!$user) {
            return $this->error('License not associated with a user.', 401);
        }

        // Active MLS connections (include constraints so WP plugin knows limits)
        $connections = $user->idxConnections()
            ->connected()
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'provider' => $c->provider,
                'mls_slug' => $c->mls_slug,
                'display_name' => $c->display_name,
                'agent_id' => $c->agent_id,
                'office_id' => $c->office_id,
                'constraints' => $c->constraints,
            ]);

        // Widgets linked to this license
        $snippets = $user->idxWidgets()
            ->where(function ($q) use ($license) {
                $q->where('license_id', $license->id)->orWhereNull('license_id');
            })
            ->where('is_active', true)
            ->get()
            ->map(fn ($w) => [
                'id' => $w->id,
                'name' => $w->name,
                'widget_type' => $w->widget_type,
                'mls_slug' => $w->mls_slug,
                'config' => $w->config,
                'appearance' => $w->appearance,
            ]);

        // Available MLS datasets
        $datasets = collect(config('idx.datasets', []))->map(fn ($d, $slug) => [
            'slug' => $slug,
            'name' => $d['name'],
            'region' => $d['region'],
            'tier' => $d['tier'],
            'provider' => $d['provider'],
        ])->values();

        return response()->json([
            'license' => [
                'key' => $license->key,
                'status' => $license->status,
                'domain' => $license->activeDomain?->domain,
            ],
            'connections' => $connections,
            'snippets' => $snippets,
            'datasets' => $datasets,
            'api' => [
                'base_url' => url('/api/v1/mls'),
                'rate_limit' => config('idx.relay.rate_limit', 100),
                'cache_ttl' => config('idx.relay.cache_ttl', 900),
            ],
        ]);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return response()->json(['error' => $message], $status);
    }

    private function normalizeDomain(string $domain): string
    {
        $domain = strtolower(trim($domain));
        $domain = preg_replace('#^https?://#', '', $domain);
        return rtrim($domain, '/');
    }
}
