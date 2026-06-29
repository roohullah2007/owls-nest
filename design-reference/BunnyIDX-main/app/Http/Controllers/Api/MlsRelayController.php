<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IdxConnection;
use App\Models\License;
use App\Services\Idx\IdxSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Unified MLS Relay API — single endpoint for WordPress plugin and embed widgets.
 *
 * All MLS data goes through this relay, so:
 * - WP plugin only talks to our API (no per-MLS API keys on client side)
 * - We can cache, rate-limit, and monitor usage
 * - Adding new MLSes requires zero WP plugin changes
 */
class MlsRelayController extends Controller
{
    /** Fields that can be requested via ?fields= parameter */
    private const ALLOWED_FIELDS = [
        'mls_id', 'mls_number', 'mls_slug', 'price', 'currency', 'price_formatted',
        'address', 'bedrooms', 'bathrooms', 'sqft', 'lot_sqft', 'year_built',
        'property_type', 'property_subtype', 'status', 'days_on_market',
        'lat', 'lng', 'photos', 'photo_count', 'virtual_tour_url',
        'list_agent_name', 'list_agent_id', 'list_office_name', 'list_office_id',
        'list_date', 'sold_date', 'modification_ts', 'description', 'features',
    ];

    public function __construct(
        private readonly IdxSearchService $searchService,
    ) {}

    /**
     * Search listings through the unified relay.
     * Auth: license key in header `X-License-Key`
     */
    public function search(Request $request): JsonResponse
    {
        $auth = $this->authenticate($request);
        if ($auth instanceof JsonResponse) {
            return $auth;
        }

        [$license, $user, $rateLimitHeaders] = $auth;

        $validated = $request->validate([
            'mls' => 'required|string|max:50',
            'query' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'min_beds' => 'nullable|integer|min:0',
            'min_baths' => 'nullable|integer|min:0',
            'property_type' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'agent_id' => 'nullable|string|max:100',
            'office_id' => 'nullable|string|max:100',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:50',
            'fields' => 'nullable|string|max:500',
        ]);

        $mlsSlug = $validated['mls'];
        $dataset = config("idx.datasets.{$mlsSlug}");

        if (!$dataset) {
            return $this->error('Unknown MLS dataset.', 400, $rateLimitHeaders);
        }

        $connection = $user->idxConnections()
            ->where('mls_slug', $mlsSlug)
            ->active()
            ->first();

        if (!$connection) {
            return $this->error('No active connection for this MLS. Connect it in your CRM dashboard first.', 403, $rateLimitHeaders);
        }

        // Build filters from request
        $filters = array_filter([
            'query' => $validated['query'] ?? null,
            'city' => $validated['city'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'min_price' => $validated['min_price'] ?? null,
            'max_price' => $validated['max_price'] ?? null,
            'min_beds' => $validated['min_beds'] ?? null,
            'min_baths' => $validated['min_baths'] ?? null,
            'property_type' => $validated['property_type'] ?? null,
            'status' => $validated['status'] ?? null,
            'agent_id' => $validated['agent_id'] ?? null,
            'office_id' => $validated['office_id'] ?? null,
            'page' => $validated['page'] ?? 1,
            'per_page' => $validated['per_page'] ?? 20,
        ], fn ($v) => $v !== null && $v !== '');

        // Cache key includes filters (constraints applied inside IdxSearchService)
        $cacheKey = "relay:search:{$license->id}:{$mlsSlug}:" . md5(json_encode($filters));
        $cacheTtl = config('idx.relay.cache_ttl', 900);
        $cacheHit = Cache::has($cacheKey);

        $results = Cache::remember($cacheKey, $cacheTtl, function () use ($connection, $filters) {
            return $this->searchService->search($connection, $filters);
        });

        // Strip internal fields, apply field selection
        $results['listings'] = $this->filterListingFields(
            $results['listings'] ?? [],
            $this->parseFields($validated['fields'] ?? null),
        );

        $response = response()->json($results);
        $response->header('X-Cache', $cacheHit ? 'HIT' : 'MISS');

        return $this->withHeaders($response, $rateLimitHeaders);
    }

    /**
     * Get a single listing by MLS listing key.
     */
    public function listing(Request $request): JsonResponse
    {
        $auth = $this->authenticate($request);
        if ($auth instanceof JsonResponse) {
            return $auth;
        }

        [$license, $user, $rateLimitHeaders] = $auth;

        $validated = $request->validate([
            'mls' => 'required|string|max:50',
            'id' => 'required|string|max:100',
            'fields' => 'nullable|string|max:500',
        ]);

        $mlsSlug = $validated['mls'];
        $dataset = config("idx.datasets.{$mlsSlug}");

        if (!$dataset) {
            return $this->error('Unknown MLS dataset.', 400, $rateLimitHeaders);
        }

        $connection = $user->idxConnections()
            ->where('mls_slug', $mlsSlug)
            ->active()
            ->first();

        if (!$connection) {
            return $this->error('No active connection for this MLS.', 403, $rateLimitHeaders);
        }

        $cacheKey = "relay:listing:{$license->id}:{$mlsSlug}:{$validated['id']}";
        $cacheTtl = config('idx.relay.cache_ttl', 900);
        $cacheHit = Cache::has($cacheKey);

        $listing = Cache::remember($cacheKey, $cacheTtl, function () use ($connection, $validated) {
            return $this->searchService->getListing($connection, $validated['id']);
        });

        if (!$listing) {
            return $this->error('Listing not found.', 404, $rateLimitHeaders);
        }

        $requestedFields = $this->parseFields($validated['fields'] ?? null);
        if ($requestedFields) {
            $listing = array_intersect_key($listing, array_flip($requestedFields));
        }

        $response = response()->json(['listing' => $listing]);
        $response->header('X-Cache', $cacheHit ? 'HIT' : 'MISS');

        // ETag for client-side caching
        $etag = '"' . md5(json_encode($listing)) . '"';
        $response->header('ETag', $etag);

        if ($request->header('If-None-Match') === $etag) {
            return response()->json(null, 304)->withHeaders($rateLimitHeaders);
        }

        return $this->withHeaders($response, $rateLimitHeaders);
    }

    /**
     * List available MLS datasets (public, no auth required).
     */
    public function datasets(): JsonResponse
    {
        $datasets = config('idx.datasets', []);
        $result = [];

        foreach ($datasets as $slug => $dataset) {
            $result[] = [
                'slug' => $slug,
                'name' => $dataset['name'],
                'region' => $dataset['region'],
                'provider' => $dataset['provider'],
                'tier' => $dataset['tier'],
            ];
        }

        return response()->json(['datasets' => $result]);
    }

    // ─── Private helpers ─────────────────────────────────────────

    /**
     * Authenticate via license key header.
     * Returns [License, User, rateLimitHeaders] or a JsonResponse error.
     */
    private function authenticate(Request $request): array|JsonResponse
    {
        $licenseKey = $request->header('X-License-Key');

        if (!$licenseKey) {
            return $this->error('Missing X-License-Key header.', 401);
        }

        $license = License::where('key', $licenseKey)
            ->where('status', 'active')
            ->first();

        if (!$license) {
            return $this->error('Invalid or inactive license key.', 401);
        }

        // Domain check (informational — server-side WP calls won't have Origin)
        $activeDomain = $license->activeDomain;
        if ($activeDomain) {
            $origin = $request->header('Origin') ?? $request->header('Referer') ?? '';
            $requestDomain = parse_url($origin, PHP_URL_HOST) ?? '';

            if ($requestDomain && $requestDomain !== $activeDomain->domain && !str_ends_with($requestDomain, '.' . $activeDomain->domain)) {
                Log::info('MLS relay domain mismatch', [
                    'license' => $licenseKey,
                    'expected' => $activeDomain->domain,
                    'got' => $requestDomain,
                ]);
            }
        }

        // Rate limiting
        $rateLimit = config('idx.relay.rate_limit', 100);
        $rateLimitKey = "relay_rate:{$license->id}";

        if (RateLimiter::tooManyAttempts($rateLimitKey, $rateLimit)) {
            $retryAfter = RateLimiter::availableIn($rateLimitKey);
            return $this->error('Rate limit exceeded. Try again in a minute.', 429, [
                'X-RateLimit-Limit' => $rateLimit,
                'X-RateLimit-Remaining' => 0,
                'X-RateLimit-Reset' => now()->addSeconds($retryAfter)->getTimestamp(),
                'Retry-After' => $retryAfter,
            ]);
        }

        RateLimiter::hit($rateLimitKey, 60);

        $remaining = max(0, $rateLimit - RateLimiter::attempts($rateLimitKey));
        $rateLimitHeaders = [
            'X-RateLimit-Limit' => $rateLimit,
            'X-RateLimit-Remaining' => $remaining,
            'X-RateLimit-Reset' => now()->addSeconds(60)->getTimestamp(),
        ];

        $user = $license->user;
        if (!$user) {
            return $this->error('License not associated with a user.', 401);
        }

        return [$license, $user, $rateLimitHeaders];
    }

    /**
     * Strip internal fields and apply field selection to listing results.
     */
    private function filterListingFields(array $listings, ?array $requestedFields): array
    {
        return array_map(function ($listing) use ($requestedFields) {
            unset($listing['_raw']);
            if ($requestedFields) {
                $listing = array_intersect_key($listing, array_flip($requestedFields));
            }
            return $listing;
        }, $listings);
    }

    /**
     * Parse ?fields= CSV into validated field names.
     */
    private function parseFields(?string $fields): ?array
    {
        if (!$fields) {
            return null;
        }

        $requested = array_map('trim', explode(',', $fields));
        $allowed = array_intersect($requested, self::ALLOWED_FIELDS);

        return !empty($allowed) ? $allowed : null;
    }

    private function error(string $message, int $status, array $headers = []): JsonResponse
    {
        return $this->withHeaders(response()->json(['error' => $message], $status), $headers);
    }

    private function withHeaders(JsonResponse $response, array $headers): JsonResponse
    {
        foreach ($headers as $key => $value) {
            $response->header($key, (string) $value);
        }

        return $response;
    }
}
