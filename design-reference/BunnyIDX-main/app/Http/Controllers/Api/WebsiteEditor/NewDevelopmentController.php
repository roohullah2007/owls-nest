<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Api\WebsiteEditor\Concerns\ManagesDirectoryListings;
use App\Http\Controllers\Api\WebsiteEditor\Concerns\RecordsMedia;
use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\Developer;
use App\Models\NewDevelopment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Website editor → New Developments. Owners manage their OWN projects here
 * (full CRUD + media uploads) and curate the admin platform catalog per site
 * (hide individual projects, pick the source: platform / own / both). The
 * platform catalog itself stays admin-only (Admin\NewDevelopmentController).
 * Deliberate duplicate of CondoBuildingController — shared behavior lives in
 * ManagesDirectoryListings.
 */
class NewDevelopmentController extends Controller
{
    use ManagesDirectoryListings;
    use RecordsMedia;

    /** Everything the editor section needs: config + platform catalog + own projects. */
    public function index(AgentWebsite $agentWebsite): JsonResponse
    {
        $config = (array) data_get($agentWebsite->page_data, '_config.new_developments', []);

        $present = fn (NewDevelopment $d) => array_merge($d->toArray(), [
            'image_url' => $this->publicUrl($d->image),
            'logo_url' => $this->publicUrl($d->logo),
            'brochure_url' => $this->publicUrl($d->brochure),
        ]);

        return response()->json([
            'enabled' => (bool) ($config['enabled'] ?? false),
            'source' => (string) ($config['source'] ?? 'both'),
            'hidden' => array_values(array_map('intval', (array) ($config['hidden'] ?? []))),
            'platform' => NewDevelopment::query()->platform()->active()
                ->orderBy('area')->orderBy('sort_order')->orderBy('name')
                ->get(['id', 'name', 'slug', 'area', 'city', 'image', 'status', 'completion_year', 'price_label', 'developer'])
                ->map(fn (NewDevelopment $d) => array_merge($d->toArray(), ['image_url' => $this->publicUrl($d->image)])),
            'own' => $agentWebsite->newDevelopments()
                ->orderBy('area')->orderBy('sort_order')->orderBy('name')
                ->get()
                ->map($present),
            'statuses' => NewDevelopment::STATUSES,
            // Developer taxonomy: platform developers + this site's own.
            'developers' => Developer::query()->visibleToSite($agentWebsite)
                ->orderBy('name')
                ->get(['id', 'name', 'logo', 'info'])
                ->map(fn (Developer $d) => array_merge($d->toArray(), ['logo_url' => $this->publicUrl($d->logo)])),
            // Street-address autocomplete in the project form.
            'google_maps_key' => config('services.google.maps_key'),
        ]);
    }

    public function store(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $this->resolveDeveloper(
            $agentWebsite,
            $this->directoryRules($request, 'new_developments', NewDevelopment::STATUSES),
        );
        $validated['agent_website_id'] = $agentWebsite->id;
        $validated['slug'] = NewDevelopment::generateSlug($validated['name']);
        $validated['is_active'] = $validated['is_active'] ?? true;

        $development = NewDevelopment::create($validated);

        return response()->json(['success' => true, 'development' => $development], 201);
    }

    public function update(Request $request, AgentWebsite $agentWebsite, NewDevelopment $newDevelopment): JsonResponse
    {
        abort_unless($newDevelopment->agent_website_id === $agentWebsite->id, 404);

        $newDevelopment->update($this->resolveDeveloper(
            $agentWebsite,
            $this->directoryRules($request, 'new_developments', NewDevelopment::STATUSES, $newDevelopment->id),
        ));

        return response()->json(['success' => true, 'development' => $newDevelopment->fresh()]);
    }

    public function destroy(AgentWebsite $agentWebsite, NewDevelopment $newDevelopment): JsonResponse
    {
        abort_unless($newDevelopment->agent_website_id === $agentWebsite->id, 404);

        $this->deleteListingMedia($newDevelopment);
        $newDevelopment->delete();

        return response()->json(['success' => true]);
    }

    /** Project media upload (image | logo | gallery | floor_plan | brochure). */
    public function upload(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        return $this->handleDirectoryUpload($request, $agentWebsite, 'agent-websites/new-developments');
    }
}
