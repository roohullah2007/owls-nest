<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewDevelopment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin → New Developments. The platform-wide pre-construction catalog every
 * agent website can render at /new-developments (curated here, never by end
 * users) — the sibling of CondoBuildingController.
 */
class NewDevelopmentController extends Controller
{
    public function index(): Response
    {
        $developments = NewDevelopment::query()
            ->orderBy('area')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/NewDevelopments/Index', [
            'developments' => $developments,
            'areas' => $developments->pluck('area')->unique()->sort()->values(),
            'statuses' => NewDevelopment::STATUSES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateDevelopment($request);
        $validated['slug'] = NewDevelopment::generateSlug($validated['name']);

        NewDevelopment::create($validated);

        return back()->with('success', 'Development added to the catalog.');
    }

    public function update(Request $request, NewDevelopment $newDevelopment): RedirectResponse
    {
        $newDevelopment->update($this->validateDevelopment($request, $newDevelopment));

        return back()->with('success', 'Development updated.');
    }

    public function destroy(NewDevelopment $newDevelopment): RedirectResponse
    {
        if ($newDevelopment->image && ! str_starts_with($newDevelopment->image, 'http')) {
            Storage::disk('public')->delete($newDevelopment->image);
        }
        $newDevelopment->delete();

        return back()->with('success', 'Development removed from the catalog.');
    }

    /** Photo upload shared by create + edit — returns the URL as JSON. */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|file|mimes:png,jpg,jpeg,webp|max:5120',
        ]);

        $path = $request->file('image')->store('new-developments', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    private function validateDevelopment(Request $request, ?NewDevelopment $existing = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('new_developments', 'name')->ignore($existing?->id)],
            'area' => 'required|string|max:120',
            'city' => 'nullable|string|max:120',
            'address' => 'nullable|string|max:255',
            'image' => 'nullable|string|max:500',
            'description' => 'nullable|string|max:20000',
            'developer' => 'nullable|string|max:160',
            'status' => ['required', Rule::in(NewDevelopment::STATUSES)],
            'completion_year' => 'nullable|string|max:12',
            'price_label' => 'nullable|string|max:64',
            'highlights' => 'nullable|array|max:30',
            'highlights.*' => 'string|max:300',
            'video_url' => 'nullable|url|max:500',
            'mls_keyword' => 'nullable|string|max:160',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);
    }
}
