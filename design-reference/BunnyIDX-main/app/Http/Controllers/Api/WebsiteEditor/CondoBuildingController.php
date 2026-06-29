<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Api\WebsiteEditor\Concerns\ManagesDirectoryListings;
use App\Http\Controllers\Api\WebsiteEditor\Concerns\RecordsMedia;
use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\CondoBuilding;
use App\Models\Developer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Website editor → Condo Directory. Owners manage their OWN buildings here
 * (full CRUD + media uploads) and curate the admin platform catalog per site
 * (hide individual buildings, pick the source: platform / own / both).
 * Deliberate duplicate of NewDevelopmentController — shared behavior lives in
 * ManagesDirectoryListings.
 */
class CondoBuildingController extends Controller
{
    use ManagesDirectoryListings;
    use RecordsMedia;

    /** Everything the editor section needs: config + platform catalog + own buildings. */
    public function index(AgentWebsite $agentWebsite): JsonResponse
    {
        $config = (array) data_get($agentWebsite->page_data, '_config.condo_directory', []);

        $present = fn (CondoBuilding $b) => array_merge($b->toArray(), [
            'image_url' => $this->publicUrl($b->image),
            'logo_url' => $this->publicUrl($b->logo),
            'brochure_url' => $this->publicUrl($b->brochure),
        ]);

        return response()->json([
            'enabled' => (bool) ($config['enabled'] ?? false),
            'source' => (string) ($config['source'] ?? 'both'),
            'hidden' => array_values(array_map('intval', (array) ($config['hidden'] ?? []))),
            'platform' => CondoBuilding::query()->platform()->active()
                ->orderBy('area')->orderBy('sort_order')->orderBy('name')
                ->get(['id', 'name', 'slug', 'area', 'city', 'image', 'status', 'completion_year', 'price_label', 'developer'])
                ->map(fn (CondoBuilding $b) => array_merge($b->toArray(), ['image_url' => $this->publicUrl($b->image)])),
            'own' => $agentWebsite->condoBuildings()
                ->orderBy('area')->orderBy('sort_order')->orderBy('name')
                ->get()
                ->map($present),
            'statuses' => CondoBuilding::STATUSES,
            'developers' => Developer::query()->visibleToSite($agentWebsite)
                ->orderBy('name')
                ->get(['id', 'name', 'logo', 'info'])
                ->map(fn (Developer $d) => array_merge($d->toArray(), ['logo_url' => $this->publicUrl($d->logo)])),
            'google_maps_key' => config('services.google.maps_key'),
        ]);
    }

    public function store(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $this->resolveDeveloper(
            $agentWebsite,
            $this->directoryRules($request, 'condo_buildings', CondoBuilding::STATUSES),
        );
        $validated['agent_website_id'] = $agentWebsite->id;
        $validated['slug'] = CondoBuilding::generateSlug($validated['name']);
        $validated['is_active'] = $validated['is_active'] ?? true;

        $building = CondoBuilding::create($validated);

        return response()->json(['success' => true, 'building' => $building], 201);
    }

    public function update(Request $request, AgentWebsite $agentWebsite, CondoBuilding $condoBuilding): JsonResponse
    {
        abort_unless($condoBuilding->agent_website_id === $agentWebsite->id, 404);

        $condoBuilding->update($this->resolveDeveloper(
            $agentWebsite,
            $this->directoryRules($request, 'condo_buildings', CondoBuilding::STATUSES, $condoBuilding->id),
        ));

        return response()->json(['success' => true, 'building' => $condoBuilding->fresh()]);
    }

    public function destroy(AgentWebsite $agentWebsite, CondoBuilding $condoBuilding): JsonResponse
    {
        abort_unless($condoBuilding->agent_website_id === $agentWebsite->id, 404);

        $this->deleteListingMedia($condoBuilding);
        $condoBuilding->delete();

        return response()->json(['success' => true]);
    }

    /** Building media upload (image | logo | gallery | floor_plan | brochure). */
    public function upload(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        return $this->handleDirectoryUpload($request, $agentWebsite, 'agent-websites/condo-buildings');
    }
}
