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
 */
class FeaturedListingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('admin/idx-settings/featured-listings', [
            'settings' => FeaturedListingSetting::current()->toArray(),
            'availableDatasets' => $this->availableDatasets(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'search_query' => ['nullable', 'string', 'max:255'],
            'mls_slugs' => ['nullable', 'array'],
            'mls_slugs.*' => ['string'],
            'agent_id' => ['nullable', 'string', 'max:255'],
            'office_id' => ['nullable', 'string', 'max:255'],
            'result_limit' => ['required', 'integer', 'min:1', 'max:60'],
            'is_active' => ['required', 'boolean'],
        ]);

        FeaturedListingSetting::current()->fill($validated)->save();

        return back()->with('success', 'Featured listings settings saved.');
    }

    /**
     * The configurable MLS datasets, as { slug, label } pairs for the UI.
     *
     * @return array<int, array{slug: string, label: string}>
     */
    private function availableDatasets(): array
    {
        $datasets = config('idx.datasets', []);

        return array_values(array_map(static function (string $slug) use ($datasets): array {
            $entry = $datasets[$slug] ?? [];
            $name = $entry['name'] ?? $slug;
            $region = $entry['region'] ?? null;

            return [
                'slug' => $slug,
                'label' => $region ? "{$name} ({$region})" : $name,
            ];
        }, array_keys($datasets)));
    }
}
