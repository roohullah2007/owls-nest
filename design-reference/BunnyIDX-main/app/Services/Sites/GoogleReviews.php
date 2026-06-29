<?php

declare(strict_types=1);

namespace App\Services\Sites;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin Google Places client used to connect a Google Business Profile to an
 * agent website and pull its reviews into the site's testimonials.
 *
 * Uses the classic Places Web Service endpoints (Text Search + Place Details)
 * with the server-side key `services.google.places_key`.
 */
class GoogleReviews
{
    private const SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

    private const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

    /**
     * Find business candidates for a free-text query ("name + city or address").
     *
     * Returns up to 5 candidates; an empty array (with a logged warning) on
     * failure or when no API key is configured.
     *
     * @return array<int, array{place_id: string, name: string, formatted_address: ?string, rating: ?float, user_ratings_total: ?int}>
     */
    public function search(string $query): array
    {
        $key = $this->apiKey();
        if ($key === null) {
            return [];
        }

        try {
            $response = Http::timeout(10)->get(self::SEARCH_URL, [
                'query' => $query,
                'key' => $key,
            ]);

            $body = $response->json();
            $status = $body['status'] ?? null;

            if (! $response->successful() || ! in_array($status, ['OK', 'ZERO_RESULTS'], true)) {
                Log::warning('GoogleReviews: text search failed.', [
                    'http_status' => $response->status(),
                    'status' => $status,
                    'error_message' => $body['error_message'] ?? null,
                ]);

                return [];
            }

            return collect($body['results'] ?? [])
                ->take(5)
                ->map(fn (array $result) => [
                    'place_id' => (string) ($result['place_id'] ?? ''),
                    'name' => (string) ($result['name'] ?? ''),
                    'formatted_address' => $result['formatted_address'] ?? null,
                    'rating' => isset($result['rating']) ? (float) $result['rating'] : null,
                    'user_ratings_total' => isset($result['user_ratings_total']) ? (int) $result['user_ratings_total'] : null,
                ])
                ->filter(fn (array $candidate) => $candidate['place_id'] !== '')
                ->values()
                ->all();
        } catch (\Throwable $e) {
            Log::warning('GoogleReviews: text search threw.', ['message' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Fetch a place's rating summary and reviews.
     *
     * NOTE: the Place Details API returns at most ~5 of the business's "most
     * relevant" reviews — Google does not expose the full review history, so
     * each sync imports up to 5 reviews.
     *
     * Returns null (with a logged warning) on failure or missing API key.
     *
     * @return array{name: string, rating: ?float, total: int, reviews: array<int, array{author_name: string, rating: ?int, text: string, time: ?int, profile_photo_url: ?string}>}|null
     */
    public function reviews(string $placeId): ?array
    {
        $key = $this->apiKey();
        if ($key === null) {
            return null;
        }

        try {
            $response = Http::timeout(10)->get(self::DETAILS_URL, [
                'place_id' => $placeId,
                'fields' => 'name,rating,user_ratings_total,reviews',
                'key' => $key,
            ]);

            $body = $response->json();
            $status = $body['status'] ?? null;

            if (! $response->successful() || $status !== 'OK') {
                Log::warning('GoogleReviews: place details failed.', [
                    'http_status' => $response->status(),
                    'status' => $status,
                    'error_message' => $body['error_message'] ?? null,
                ]);

                return null;
            }

            $result = $body['result'] ?? [];

            return [
                'name' => (string) ($result['name'] ?? ''),
                'rating' => isset($result['rating']) ? (float) $result['rating'] : null,
                'total' => (int) ($result['user_ratings_total'] ?? 0),
                'reviews' => collect($result['reviews'] ?? [])
                    ->map(fn (array $review) => [
                        'author_name' => (string) ($review['author_name'] ?? ''),
                        'rating' => isset($review['rating']) ? (int) $review['rating'] : null,
                        'text' => (string) ($review['text'] ?? ''),
                        'time' => isset($review['time']) ? (int) $review['time'] : null,
                        'profile_photo_url' => $review['profile_photo_url'] ?? null,
                    ])
                    ->values()
                    ->all(),
            ];
        } catch (\Throwable $e) {
            Log::warning('GoogleReviews: place details threw.', ['message' => $e->getMessage()]);

            return null;
        }
    }

    private function apiKey(): ?string
    {
        $key = config('services.google.places_key');

        if (! is_string($key) || $key === '') {
            Log::warning('GoogleReviews: no API key configured (GOOGLE_PLACES_API_KEY / GOOGLE_MAPS_API_KEY).');

            return null;
        }

        return $key;
    }
}
