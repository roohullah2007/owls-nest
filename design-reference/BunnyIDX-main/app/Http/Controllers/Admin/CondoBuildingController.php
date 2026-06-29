<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CondoBuilding;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin → Condo Directory. The platform-wide building catalog every agent
 * website can render at /condos (curated here, never by end users).
 */
class CondoBuildingController extends Controller
{
    public function index(): Response
    {
        $buildings = CondoBuilding::query()
            ->orderBy('area')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/CondoBuildings/Index', [
            'buildings' => $buildings,
            'areas' => $buildings->pluck('area')->unique()->sort()->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateBuilding($request);
        $validated['slug'] = CondoBuilding::generateSlug($validated['name']);

        CondoBuilding::create($validated);

        return back()->with('success', 'Building added to the Condo Directory.');
    }

    public function update(Request $request, CondoBuilding $condoBuilding): RedirectResponse
    {
        $condoBuilding->update($this->validateBuilding($request, $condoBuilding));

        return back()->with('success', 'Building updated.');
    }

    public function destroy(CondoBuilding $condoBuilding): RedirectResponse
    {
        if ($condoBuilding->image && ! str_starts_with($condoBuilding->image, 'http')) {
            Storage::disk('public')->delete($condoBuilding->image);
        }
        $condoBuilding->delete();

        return back()->with('success', 'Building removed from the directory.');
    }

    /**
     * Photo upload used by both the create and edit forms — returns the URL
     * as JSON so the form stashes it in `image` and includes it in the
     * subsequent POST/PATCH (same flow as the MLS provider pending logo).
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|file|mimes:png,jpg,jpeg,webp|max:5120',
        ]);

        $path = $request->file('image')->store('condo-buildings', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    private function validateBuilding(Request $request, ?CondoBuilding $existing = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('condo_buildings', 'name')->ignore($existing?->id)],
            'area' => 'required|string|max:120',
            'city' => 'nullable|string|max:120',
            'address' => 'nullable|string|max:255',
            'image' => 'nullable|string|max:500',
            'description' => 'nullable|string|max:10000',
            'mls_keyword' => 'nullable|string|max:160',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);
    }
}
