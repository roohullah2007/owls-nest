<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Services\Sites\GoogleReviews;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Connects a Google Business Profile to a website's testimonials.
 *
 * Google-sourced testimonials are tagged with `source: 'google'` and a stable
 * `google_id`; each sync replaces the google-tagged entries wholesale while
 * leaving manually-added testimonials untouched.
 */
class GoogleReviewsController extends Controller
{
    public function __construct(private readonly GoogleReviews $google) {}

    /** Search Google Places for business candidates matching a free-text query. */
    public function search(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'query' => 'required|string|max:255',
        ]);

        return response()->json([
            'candidates' => $this->google->search($validated['query']),
        ]);
    }

    /** Store the chosen place on the site config and import its reviews immediately. */
    public function connect(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'place_id' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        $details = $this->google->reviews($validated['place_id']);
        if ($details === null) {
            return response()->json(['error' => 'Could not fetch reviews from Google. Please try again.'], 422);
        }

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        $config['google_reviews'] = [
            'place_id' => $validated['place_id'],
            'name' => $validated['name'],
            'address' => $validated['address'] ?? null,
            'connected_at' => now()->toIso8601String(),
        ];
        $pageData['_config'] = $config;
        $agentWebsite->update(['page_data' => $pageData]);

        [$imported, $testimonials] = $this->mergeGoogleReviews($agentWebsite, $details['reviews']);

        return response()->json(['success' => true, 'imported' => $imported, 'testimonials' => $testimonials]);
    }

    /** Re-fetch reviews for the connected place and refresh the google-tagged testimonials. */
    public function sync(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $placeId = $agentWebsite->page_data['_config']['google_reviews']['place_id'] ?? null;
        if (! is_string($placeId) || $placeId === '') {
            return response()->json(['error' => 'No Google Business Profile is connected.'], 422);
        }

        $details = $this->google->reviews($placeId);
        if ($details === null) {
            return response()->json(['error' => 'Could not fetch reviews from Google. Please try again.'], 422);
        }

        [$imported, $testimonials] = $this->mergeGoogleReviews($agentWebsite, $details['reviews']);

        return response()->json(['success' => true, 'imported' => $imported, 'testimonials' => $testimonials]);
    }

    /** Disconnect the business profile. Already-imported testimonials are kept. */
    public function disconnect(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        unset($config['google_reviews']);
        $pageData['_config'] = $config;
        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /**
     * Replace google-tagged testimonials with the freshly fetched reviews,
     * preserving manually-added entries (no `source` tag).
     *
     * @param  array<int, array{author_name: string, rating: ?int, text: string, time: ?int, profile_photo_url: ?string}>  $reviews
     * @return array{0: int, 1: array<int, array<string, mixed>>}
     */
    private function mergeGoogleReviews(AgentWebsite $agentWebsite, array $reviews): array
    {
        $manual = array_values(array_filter(
            $agentWebsite->testimonials ?? [],
            fn (array $t) => ($t['source'] ?? null) !== 'google'
        ));

        // Dedup against manually-added testimonials: same author + matching
        // text prefix means the agent already entered this review by hand.
        $isDuplicateOfManual = function (string $name, string $text) use ($manual): bool {
            $needle = mb_strtolower(mb_substr(trim($text), 0, 40));
            foreach ($manual as $t) {
                if (mb_strtolower(trim($t['name'] ?? '')) === mb_strtolower(trim($name))
                    && ($needle === '' || str_starts_with(mb_strtolower(trim($t['text'] ?? '')), $needle))) {
                    return true;
                }
            }

            return false;
        };

        $google = collect($reviews)
            ->map(fn (array $review) => [
                'text' => trim($review['text']),
                'name' => trim($review['author_name']),
                'role' => '',
                'rating' => isset($review['rating']) ? max(1, min(5, (int) $review['rating'])) : null,
                'source' => 'google',
                'google_id' => sha1($review['author_name'].'|'.($review['time'] ?? '')),
            ])
            ->filter(fn (array $t) => $t['text'] !== '' && $t['name'] !== '')
            ->reject(fn (array $t) => $isDuplicateOfManual($t['name'], $t['text']))
            ->values()
            ->all();

        $merged = array_merge($manual, $google);
        $agentWebsite->update(['testimonials' => $merged]);

        return [count($google), $merged];
    }
}
