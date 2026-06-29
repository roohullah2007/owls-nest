<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MlsProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MlsProviderController extends Controller
{
    public function index(Request $request): Response
    {
        $providers = MlsProvider::query()
            ->orderBy('visibility')      // visible first (alphabetical: draft, visible — but we want visible first)
            ->orderBy('sort_order')
            ->orderBy('display_name')
            ->get();

        // Surface "visible" rows first explicitly.
        $visible = $providers->where('visibility', MlsProvider::VISIBILITY_VISIBLE)->values();
        $draft = $providers->where('visibility', MlsProvider::VISIBILITY_DRAFT)->values();

        return Inertia::render('Admin/MlsProviders/Index', [
            'visible' => $visible,
            'draft' => $draft,
            'sources' => [
                ['value' => MlsProvider::SOURCE_BRIDGE, 'label' => 'Bridge Data Output'],
                ['value' => MlsProvider::SOURCE_REALTYNA, 'label' => 'Realtyna'],
                ['value' => MlsProvider::SOURCE_REPLIERS, 'label' => 'Repliers'],
                ['value' => MlsProvider::SOURCE_PARAGON, 'label' => 'Paragon'],
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateProvider($request);
        MlsProvider::create($validated);

        return back()->with('success', 'MLS provider created (draft).');
    }

    public function update(Request $request, MlsProvider $mlsProvider): RedirectResponse
    {
        $validated = $this->validateProvider($request, $mlsProvider);
        $mlsProvider->update($validated);

        return back()->with('success', 'MLS provider updated.');
    }

    public function uploadLogo(Request $request, MlsProvider $mlsProvider): RedirectResponse
    {
        $request->validate([
            'logo' => 'required|file|mimes:png,jpg,jpeg,svg,webp|max:1024',  // 1MB cap
        ]);

        $file = $request->file('logo');
        $path = $file->store('mls-logos', 'public');
        $url = Storage::disk('public')->url($path);

        // Delete the previous file if it was a local upload (not an external URL).
        if ($mlsProvider->logo_url && str_starts_with($mlsProvider->logo_url, Storage::disk('public')->url(''))) {
            $oldPath = str_replace(Storage::disk('public')->url(''), '', $mlsProvider->logo_url);
            Storage::disk('public')->delete($oldPath);
        }

        $mlsProvider->update(['logo_url' => $url]);

        return back()->with('success', 'Logo updated.');
    }

    /**
     * Upload a logo BEFORE the MlsProvider exists (i.e. during the create flow).
     * Returns the URL as JSON so the create form can stash it in `logo_url` and
     * include it in the subsequent POST. Used for both brand + compliance logos
     * — `kind` decides the storage subdirectory.
     */
    public function uploadLogoPending(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logo' => 'required|file|mimes:png,jpg,jpeg,svg,webp|max:1024',
            'kind' => 'sometimes|in:brand,compliance',
        ]);

        $dir = ($validated['kind'] ?? 'brand') === 'compliance' ? 'mls-compliance-logos' : 'mls-logos';
        $path = $request->file('logo')->store($dir, 'public');
        $url = Storage::disk('public')->url($path);

        return response()->json(['url' => $url]);
    }

    public function toggleVisibility(Request $request, MlsProvider $mlsProvider): RedirectResponse
    {
        $mlsProvider->update([
            'visibility' => $mlsProvider->visibility === MlsProvider::VISIBILITY_VISIBLE
                ? MlsProvider::VISIBILITY_DRAFT
                : MlsProvider::VISIBILITY_VISIBLE,
        ]);

        return back()->with('success', "{$mlsProvider->display_name} is now {$mlsProvider->visibility}.");
    }

    public function destroy(MlsProvider $mlsProvider): RedirectResponse
    {
        if ($mlsProvider->connections()->exists()) {
            return back()->with('error', 'Cannot delete — providers with active connections must be archived (set visibility=draft).');
        }
        $mlsProvider->delete();

        return back()->with('success', 'MLS provider deleted.');
    }

    private function validateProvider(Request $request, ?MlsProvider $existing = null): array
    {
        return $request->validate([
            'slug' => ['required', 'string', 'max:64', Rule::unique('mls_providers', 'slug')->ignore($existing?->id)],
            'display_name' => 'required|string|max:255',
            'region' => 'nullable|string|max:32',
            'country' => 'required|string|size:2',
            'logo_url' => 'nullable|url|max:500',
            'data_source' => ['required', Rule::in([MlsProvider::SOURCE_BRIDGE, MlsProvider::SOURCE_REALTYNA, MlsProvider::SOURCE_REPLIERS, MlsProvider::SOURCE_PARAGON])],
            'data_source_config' => 'nullable|array',
            'has_idx_feed' => 'boolean',
            'has_vow_feed' => 'boolean',
            'monthly_fee_cents' => 'integer|min:0|max:1000000',
            'visibility' => ['required', Rule::in([MlsProvider::VISIBILITY_DRAFT, MlsProvider::VISIBILITY_VISIBLE])],
            'property_types' => 'nullable|array',
            'statuses' => 'nullable|array',
            'sort_order' => 'integer',
            // Compliance fields
            'disclaimer' => 'nullable|string|max:5000',
            'attribution_template' => 'nullable|string|max:500',
            'compliance_logo_url' => 'nullable|url|max:500',
            'terms_url' => 'nullable|url|max:500',
            'setup_notes_user' => 'nullable|string|max:2000',
            'compliance_rules' => 'nullable|array',
            'compliance_rules.show_updated_at' => 'sometimes|boolean',
            'compliance_rules.link_back_required' => 'sometimes|boolean',
            'compliance_rules.fair_housing_required' => 'sometimes|boolean',
            'compliance_rules.refresh_minutes' => 'sometimes|integer|min:1|max:1440',
        ]);
    }

    public function uploadComplianceLogo(Request $request, MlsProvider $mlsProvider): RedirectResponse
    {
        $request->validate([
            'logo' => 'required|file|mimes:png,jpg,jpeg,svg,webp|max:1024',
        ]);

        $file = $request->file('logo');
        $path = $file->store('mls-compliance-logos', 'public');
        $url = Storage::disk('public')->url($path);

        if ($mlsProvider->compliance_logo_url && str_starts_with($mlsProvider->compliance_logo_url, Storage::disk('public')->url(''))) {
            $oldPath = str_replace(Storage::disk('public')->url(''), '', $mlsProvider->compliance_logo_url);
            Storage::disk('public')->delete($oldPath);
        }

        $mlsProvider->update(['compliance_logo_url' => $url]);

        return back()->with('success', 'Compliance logo updated.');
    }
}
