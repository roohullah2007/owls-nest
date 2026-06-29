<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\IdxSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class IdxSearchController extends Controller implements HasMiddleware
{
    /** IDX / MLS is a paid feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:idx')];
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'mls_slug' => 'required|string|max:50',
            'filters' => 'required|array',
            'filters.city' => 'nullable|string|max:100',
            'filters.cities' => 'nullable|array',
            'filters.cities.*' => 'string|max:100',
            'filters.postal_code' => 'nullable|string|max:20',
            'filters.state_province' => 'nullable|string|max:10',
            'filters.min_price' => 'nullable|integer|min:0',
            'filters.max_price' => 'nullable|integer|min:0',
            'filters.min_beds' => 'nullable|integer|min:0|max:20',
            'filters.min_baths' => 'nullable|integer|min:0|max:20',
            'filters.min_sqft' => 'nullable|integer|min:0',
            'filters.max_sqft' => 'nullable|integer|min:0',
            'filters.property_type' => 'nullable|string|max:50',
            'filters.property_types' => 'nullable|array',
            'filters.property_types.*' => 'string|max:50',
            'filters.status' => 'nullable|string|max:30',
            'filters.statuses' => 'nullable|array',
            'filters.statuses.*' => 'string|max:30',
            'filters.agent_id' => 'nullable|string|max:100',
            'filters.office_id' => 'nullable|string|max:100',
            'filters.query' => 'nullable|string|max:255',
            'sort_by' => 'nullable|string|max:50',
            'sort_dir' => 'nullable|in:asc,desc',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        // Verify user has an MLS connection for this slug
        abort_unless(
            $request->user()->idxConnections()->where('mls_slug', $validated['mls_slug'])->exists(),
            422,
            'No MLS connection found for this slug.',
        );

        $request->user()->idxSearches()->create($validated);

        return back()->with('success', 'Search saved.');
    }

    public function update(Request $request, IdxSearch $idxSearch): RedirectResponse
    {
        abort_unless($idxSearch->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'mls_slug' => 'required|string|max:50',
            'filters' => 'required|array',
            'filters.city' => 'nullable|string|max:100',
            'filters.cities' => 'nullable|array',
            'filters.cities.*' => 'string|max:100',
            'filters.postal_code' => 'nullable|string|max:20',
            'filters.state_province' => 'nullable|string|max:10',
            'filters.min_price' => 'nullable|integer|min:0',
            'filters.max_price' => 'nullable|integer|min:0',
            'filters.min_beds' => 'nullable|integer|min:0|max:20',
            'filters.min_baths' => 'nullable|integer|min:0|max:20',
            'filters.min_sqft' => 'nullable|integer|min:0',
            'filters.max_sqft' => 'nullable|integer|min:0',
            'filters.property_type' => 'nullable|string|max:50',
            'filters.property_types' => 'nullable|array',
            'filters.property_types.*' => 'string|max:50',
            'filters.status' => 'nullable|string|max:30',
            'filters.statuses' => 'nullable|array',
            'filters.statuses.*' => 'string|max:30',
            'filters.agent_id' => 'nullable|string|max:100',
            'filters.office_id' => 'nullable|string|max:100',
            'filters.query' => 'nullable|string|max:255',
            'sort_by' => 'nullable|string|max:50',
            'sort_dir' => 'nullable|in:asc,desc',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $idxSearch->update($validated);

        return back()->with('success', 'Search updated.');
    }

    public function destroy(Request $request, IdxSearch $idxSearch): RedirectResponse
    {
        abort_unless($idxSearch->user_id === $request->user()->id, 403);

        $idxSearch->delete();

        return back()->with('success', 'Search deleted.');
    }
}
