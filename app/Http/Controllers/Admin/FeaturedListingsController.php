<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FeaturedListingSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin Panel → IDX Settings → Featured Listings. Edits the singleton config
 * that drives the public /featured-properties page.
 *
 * This is a single-broker, PrimeMLS-only site: the admin curates featured
 * listings by search query, specific MLS listing numbers, an agent id and an
 * office id — all resolved against PrimeMLS. There is no MLS-dataset picker.
 */
class FeaturedListingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('admin/idx-settings/featured-listings', [
            'settings' => FeaturedListingSetting::current()->toArray(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'search_query' => ['nullable', 'string', 'max:255'],
            // Free-text list of MLS listing numbers, separated by commas,
            // spaces or new lines — split into a normalized array below.
            'mls_numbers' => ['nullable', 'string', 'max:2000'],
            'agent_id' => ['nullable', 'string', 'max:255'],
            'office_id' => ['nullable', 'string', 'max:255'],
            'result_limit' => ['required', 'integer', 'min:1', 'max:60'],
            'is_active' => ['required', 'boolean'],
        ]);

        $validated['mls_numbers'] = $this->parseMlsNumbers($validated['mls_numbers'] ?? null);

        FeaturedListingSetting::current()->fill($validated)->save();

        return back()->with('success', 'Featured listings settings saved.');
    }

    /**
     * Split the admin's free-text MLS-number input (comma / whitespace / new
     * line separated) into a deduped list of trimmed MLS listing numbers.
     *
     * @return array<int, string>
     */
    private function parseMlsNumbers(?string $raw): array
    {
        if ($raw === null || trim($raw) === '') {
            return [];
        }

        $parts = preg_split('/[\s,]+/', trim($raw)) ?: [];

        return array_values(array_unique(array_filter(array_map('trim', $parts), static fn (string $s): bool => $s !== '')));
    }
}
