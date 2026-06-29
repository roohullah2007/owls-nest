<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\Listing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Website settings → Featured Listings / Sold Listings manager.
 * The CRM /properties table is the single store: flagging a listing here
 * (listings.website_section) surfaces it on the public Featured Properties /
 * Past Transactions pages. The MLS side (agent/office/listing ids) is saved
 * to page_data._config.listings.
 */
class WebsiteListingsController extends Controller
{
    /** Owner's CRM listings with their section flags + the section MLS config. */
    public function index(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $user = $request->user();

        $listings = $this->ownerListings($agentWebsite)
            ->orderByDesc('created_at')
            ->limit(300)
            ->get()
            ->map(fn (Listing $l) => [
                'id' => $l->id,
                'title' => $l->title,
                'address' => trim(implode(', ', array_filter([$l->address, $l->city, $l->state_province]))),
                'price' => $l->price !== null ? '$'.number_format((float) $l->price) : null,
                'status' => $l->status,
                'photo' => $this->firstPhoto($l->photos),
                'website_section' => $l->website_section,
                'from_mls' => $l->mls_listing_id !== null,
            ]);

        return response()->json([
            'listings' => $listings,
            'config' => (array) data_get($agentWebsite->page_data, '_config.listings', []),
            // Everything the embedded CRM "add property" modal needs.
            'meta' => [
                'listing_types' => $user->getListingTypes(),
                'listing_statuses' => $user->getListingStatuses(),
                'maps_key' => config('services.google.maps_key'),
            ],
        ]);
    }

    /**
     * Flag / unflag a listing for a website section. `mark_sold` (with
     * section=sold) also closes the listing itself — status becomes sold and
     * sold_at is stamped — so "Mark Sold" on the Featured tab moves it to
     * Sold Listings as a genuinely sold property, in the CRM too.
     */
    public function setSection(Request $request, AgentWebsite $agentWebsite, Listing $listing): JsonResponse
    {
        $validated = $request->validate([
            'section' => 'nullable|string|in:featured,sold',
            'mark_sold' => 'sometimes|boolean',
        ]);

        // The listing must belong to the same owner scope as the site.
        $owns = $agentWebsite->team_id
            ? $listing->team_id === $agentWebsite->team_id
            : $listing->user_id === $agentWebsite->user_id;
        abort_unless($owns, 403);

        $updates = ['website_section' => $validated['section'] ?? null];
        if (($validated['section'] ?? null) === 'sold' && ($validated['mark_sold'] ?? false)) {
            $updates['status'] = 'sold';
            $updates['sold_at'] = $listing->sold_at ?? now();
        }

        $listing->update($updates);

        return response()->json([
            'success' => true,
            'website_section' => $listing->website_section,
            'status' => $listing->status,
        ]);
    }

    /** Save the MLS pull config for both sections + the search toggle. */
    public function updateConfig(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'featured' => 'sometimes|array',
            'featured.agent_ids' => 'nullable|string|max:500',
            'featured.office_ids' => 'nullable|string|max:500',
            'featured.mls_numbers' => 'nullable|string|max:1000',
            'sold' => 'sometimes|array',
            'sold.agent_ids' => 'nullable|string|max:500',
            'sold.office_ids' => 'nullable|string|max:500',
            'sold.mls_numbers' => 'nullable|string|max:1000',
            'featured_in_search' => 'sometimes|boolean',
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $cfg = (array) data_get($pageData, '_config.listings', []);

        foreach (['featured', 'sold'] as $section) {
            if (array_key_exists($section, $validated)) {
                $cfg[$section] = array_map(
                    static fn ($v) => trim((string) $v),
                    array_intersect_key((array) $validated[$section], array_flip(['agent_ids', 'office_ids', 'mls_numbers'])),
                );
            }
        }
        if (array_key_exists('featured_in_search', $validated)) {
            $cfg['featured_in_search'] = (bool) $validated['featured_in_search'];
        }

        data_set($pageData, '_config.listings', $cfg);
        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true, 'config' => $cfg]);
    }

    private function ownerListings(AgentWebsite $site)
    {
        return Listing::query()
            ->where('is_private', false)
            ->where(fn ($q) => $site->team_id
                ? $q->where('team_id', $site->team_id)
                : $q->where('user_id', $site->user_id));
    }

    private function firstPhoto(mixed $photos): ?string
    {
        foreach ((array) $photos as $p) {
            $url = is_string($p) ? $p : (is_array($p) ? (string) ($p['url'] ?? $p['path'] ?? $p['src'] ?? '') : '');
            $url = trim($url);
            if ($url !== '') {
                return Str::startsWith($url, ['http://', 'https://']) ? $url : Storage::disk('public')->url($url);
            }
        }

        return null;
    }
}
