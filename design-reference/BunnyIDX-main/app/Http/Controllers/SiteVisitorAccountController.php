<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AgentWebsite;
use App\Models\SiteVisitor;
use App\Services\Sites\VisitorAuth;
use App\Services\Sites\VisitorCrm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Visitor account panel + favorites and saved searches for agent websites.
 * Every action requires a logged-in site visitor (per-site session) and syncs
 * engagement to the visitor's CRM contact timeline.
 */
class SiteVisitorAccountController extends Controller
{
    public function __construct(
        private readonly VisitorAuth $auth,
        private readonly VisitorCrm $crm,
    ) {}

    /** The account panel page (favorites grid + saved searches). */
    public function show(string $slug)
    {
        $site = $this->site($slug);
        $visitor = $this->auth->current($site);

        if (! $visitor) {
            return redirect()->route('agent-site.properties', $site->slug);
        }

        $site->resolvePageData();

        return view('agent-website.search.account', [
            'site' => $site,
            'isOwner' => false,
            'currentPage' => 'account',
            'visitor' => $visitor,
            'favorites' => $visitor->favorites()->latest()->get(),
            'savedSearches' => $visitor->savedSearches()->latest()->get(),
        ]);
    }

    /** Favorited listing keys ("mls_slug:listing_id") — seeds the React UI. */
    public function favoriteIds(string $slug): JsonResponse
    {
        [$site, $visitor] = $this->requireVisitor($slug);

        $ids = $visitor->favorites()
            ->get(['mls_slug', 'listing_id'])
            ->map(fn ($f) => $f->mls_slug.':'.$f->listing_id)
            ->values();

        return response()->json(['ids' => $ids]);
    }

    /** Toggle a favorite; snapshot keeps the panel renderable without MLS calls. */
    public function toggleFavorite(Request $request, string $slug): JsonResponse
    {
        [$site, $visitor] = $this->requireVisitor($slug);

        $validated = $request->validate([
            'mls_slug' => 'required|string|max:64',
            'listing_id' => 'required|string|max:128',
            'snapshot' => 'nullable|array',
            'snapshot.address' => 'nullable|string|max:500',
            'snapshot.price_formatted' => 'nullable|string|max:50',
            'snapshot.photo' => 'nullable|string|max:2000',
            'snapshot.href' => 'nullable|string|max:2000',
            'snapshot.beds' => 'nullable',
            'snapshot.baths' => 'nullable|string|max:20',
            'snapshot.sqft' => 'nullable|string|max:20',
        ]);

        $existing = $visitor->favorites()
            ->where('mls_slug', $validated['mls_slug'])
            ->where('listing_id', $validated['listing_id'])
            ->first();

        if ($existing) {
            $existing->delete();

            return response()->json(['favorited' => false]);
        }

        $visitor->favorites()->create($validated);

        $address = $validated['snapshot']['address'] ?? $validated['listing_id'];
        $this->crm->logActivity($site, $visitor, 'listing_favorited', "Favorited a listing: {$address}", [
            'mls_slug' => $validated['mls_slug'],
            'listing_id' => $validated['listing_id'],
            'price' => $validated['snapshot']['price_formatted'] ?? null,
        ]);

        return response()->json(['favorited' => true]);
    }

    public function destroyFavorite(string $slug, int $favorite)
    {
        [, $visitor] = $this->requireVisitor($slug);
        $visitor->favorites()->whereKey($favorite)->delete();

        return back();
    }

    /** Save the current search (filters payload + free text) to the account. */
    public function storeSearch(Request $request, string $slug): JsonResponse
    {
        [$site, $visitor] = $this->requireVisitor($slug);

        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'filters' => 'nullable|array',
            'search_text' => 'nullable|string|max:255',
        ]);

        $visitor->savedSearches()->create($validated);

        $this->crm->logActivity($site, $visitor, 'search_saved', "Saved a search: {$validated['name']}", [
            'search_text' => $validated['search_text'] ?? null,
        ]);

        return response()->json(['success' => true]);
    }

    public function destroySearch(string $slug, int $savedSearch)
    {
        [, $visitor] = $this->requireVisitor($slug);
        $visitor->savedSearches()->whereKey($savedSearch)->delete();

        return back();
    }

    /**
     * Required-phone completion for Google sign-ups (Google provides no phone).
     * Also syncs the number onto the linked CRM contact.
     */
    public function updatePhone(Request $request, string $slug)
    {
        [, $visitor] = $this->requireVisitor($slug);

        $validated = $request->validate(['phone' => 'required|string|max:50']);

        $visitor->update(['phone' => $validated['phone']]);
        if ($visitor->contact && ! $visitor->contact->phone) {
            $visitor->contact->update(['phone' => $validated['phone']]);
        }

        return back();
    }

    /** Listing-view tracking from the search modal (detail PAGE views log server-side). */
    public function trackView(Request $request, string $slug): JsonResponse
    {
        [$site, $visitor] = $this->requireVisitor($slug);

        $validated = $request->validate([
            'mls_slug' => 'required|string|max:64',
            'listing_id' => 'required|string|max:128',
            'address' => 'nullable|string|max:500',
        ]);

        $label = $validated['address'] ?: $validated['listing_id'];
        $this->crm->logActivity($site, $visitor, 'listing_viewed', "Viewed a listing: {$label}", [
            'mls_slug' => $validated['mls_slug'],
            'listing_id' => $validated['listing_id'],
        ], 60);

        return response()->json(['success' => true]);
    }

    private function site(string $slug): AgentWebsite
    {
        $site = AgentWebsite::where('slug', $slug)->firstOrFail();

        // Published sites only — except the owner previewing a draft.
        $user = auth()->user();
        $isOwner = $user && ($site->user_id === $user->id || ($user->team_id && $site->team_id === $user->team_id));
        abort_unless($site->is_published || $isOwner, 404);

        return $site;
    }

    /** @return array{0: AgentWebsite, 1: SiteVisitor} */
    private function requireVisitor(string $slug): array
    {
        $site = $this->site($slug);
        $visitor = $this->auth->current($site);
        abort_unless($visitor, 401);

        return [$site, $visitor];
    }
}
