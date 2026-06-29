<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Api\WebsiteEditor\Concerns\RecordsMedia;
use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\Hotsheet;
use App\Models\WebsiteArea;
use App\Services\Ai\WebsiteCopyService;
use App\Services\Mls\MlsGateway;
use App\Services\Sites\CommunityLifestyles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AreaController extends Controller
{
    use RecordsMedia;

    /** List the site's areas/communities, plus MLS-integration state and selectable hotsheets. */
    public function listAreas(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $areas = $agentWebsite->areas()->orderBy('sort_order')->orderBy('name')->get();

        // Surface the user's connected MLS feeds so the editor can drive the
        // taxonomy-backed filters and show the "MLS not integrated" notice.
        $slugs = $request->user()->idxConnections()
            ->where('is_active', true)
            ->pluck('mls_slug')
            ->filter()
            ->unique()
            ->values()
            ->all();

        // Saved searches from the Properties tab — selectable as a community source.
        $hotsheets = Hotsheet::visibleTo($request->user())
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Hotsheet $h) => ['id' => $h->id, 'name' => $h->name])
            ->values();

        return response()->json([
            'areas' => $areas,
            'mls' => ['integrated' => count($slugs) > 0, 'slugs' => $slugs],
            'hotsheets' => $hotsheets,
            // Lifestyle-page catalog (Condos, Waterfront, 55+, …) the editor
            // offers as toggleable SEO pages per community.
            'lifestyles' => CommunityLifestyles::all(),
        ]);
    }

    /**
     * Validation for the MLS-aligned community filters. Keys mirror MlsQuery
     * (snake_case) so the stored criteria feed `/api/v1/mls/search` directly.
     */
    private function areaCriteriaRules(Request $request): array
    {
        // Property-page values must be enums the user's connected MLSes
        // actually declare (never a hardcoded list) — empty when no MLS is
        // connected, which correctly rejects any property_pages payload.
        $allowedPropertyValues = [];
        try {
            $taxonomy = app(MlsGateway::class)->taxonomy($request->user(), []);
            $allowedPropertyValues = array_map(
                static fn ($term) => $term->value,
                array_merge($taxonomy->propertyTypes, $taxonomy->propertySubtypes),
            );
        } catch (\Throwable) {
            // Gateway unavailable — fall through to the empty list.
        }

        return [
            'search_criteria' => 'nullable|array',
            'search_criteria.cities' => 'nullable|array',
            'search_criteria.cities.*' => 'string|max:120',
            'search_criteria.counties' => 'nullable|array',
            'search_criteria.counties.*' => 'string|max:120',
            'search_criteria.zips' => 'nullable|array',
            'search_criteria.zips.*' => 'string|max:12',
            'search_criteria.subdivisions' => 'nullable|array',
            'search_criteria.subdivisions.*' => 'string|max:160',
            'search_criteria.neighborhoods' => 'nullable|array',
            'search_criteria.neighborhoods.*' => 'string|max:160',
            'search_criteria.min_price' => 'nullable|numeric|min:0',
            'search_criteria.max_price' => 'nullable|numeric|min:0',
            'search_criteria.min_beds' => 'nullable|integer|min:0|max:20',
            'search_criteria.max_beds' => 'nullable|integer|min:0|max:20',
            'search_criteria.min_baths' => 'nullable|numeric|min:0|max:20',
            'search_criteria.min_sqft' => 'nullable|integer|min:0',
            'search_criteria.max_sqft' => 'nullable|integer|min:0',
            'search_criteria.min_year_built' => 'nullable|integer|min:1800|max:2100',
            'search_criteria.max_year_built' => 'nullable|integer|min:1800|max:2100',
            'search_criteria.property_types' => 'nullable|array',
            'search_criteria.property_types.*' => 'string|max:80',
            'search_criteria.statuses' => 'nullable|array',
            'search_criteria.statuses.*' => 'string|max:80',
            'search_criteria.scope' => 'nullable|in:all,office,agent',
            'search_criteria.limit' => 'nullable|integer|min:1|max:60',
            // Optional: drive the community from a saved Properties-tab hotsheet instead of manual filters.
            'search_criteria.hotsheet_id' => 'nullable|integer',
            // Sub-area SEO pages (cities / zip codes / neighborhoods within the
            // community), each rendered at /neighborhoods/{area}/{sub} with the
            // parent filters narrowed to that slice.
            'sub_areas' => 'nullable|array|max:60',
            'sub_areas.*.type' => 'required|in:zip,city,neighborhood',
            'sub_areas.*.label' => 'required|string|max:120',
            'sub_areas.*.value' => 'nullable|string|max:160',
            // Enabled lifestyle pages, each with optional owner-edited copy.
            'lifestyle_pages' => 'nullable|array|max:40',
            'lifestyle_pages.*.key' => 'required|string|in:'.implode(',', array_keys(CommunityLifestyles::CATALOG)),
            'lifestyle_pages.*.copy' => 'nullable|string|max:20000',
            // Enabled property type / sub-type pages — values are MLS enums
            // verbatim; pagesFor() hides any value no connected MLS supports,
            // so a loose string rule here is enough.
            'property_pages' => 'nullable|array|max:80',
            'property_pages.*.kind' => 'required|in:property_type,property_subtype',
            'property_pages.*.value' => ['required', 'string', 'max:80', Rule::in($allowedPropertyValues)],
            'property_pages.*.copy' => 'nullable|string|max:20000',
        ];
    }

    /**
     * Stamp stable URL slugs onto sub-area entries (deduped within the area)
     * and default `value` to the label when the editor leaves it blank.
     */
    private function normalizeSubAreas(?array $subAreas): ?array
    {
        if ($subAreas === null) {
            return null;
        }

        $seen = [];
        $out = [];
        foreach ($subAreas as $sub) {
            $label = trim((string) ($sub['label'] ?? ''));
            if ($label === '') {
                continue;
            }
            $base = Str::slug($label) ?: 'area';
            $slug = $base;
            $i = 1;
            while (isset($seen[$slug])) {
                $slug = $base.'-'.$i++;
            }
            $seen[$slug] = true;
            $out[] = [
                'type' => in_array($sub['type'] ?? '', ['zip', 'city', 'neighborhood'], true) ? $sub['type'] : 'neighborhood',
                'label' => $label,
                'value' => trim((string) ($sub['value'] ?? '')) ?: $label,
                'slug' => $slug,
            ];
        }

        return $out;
    }

    /** Create an area/community for the site. */
    public function storeArea(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate(array_merge([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:20000',
            'description_heading' => 'nullable|string|max:160',
            'is_active' => 'boolean',
            'image' => 'nullable|string|max:500',
        ], $this->areaCriteriaRules($request)));

        $validated['slug'] = WebsiteArea::generateSlug($validated['name'], $agentWebsite->id);
        $validated['agent_website_id'] = $agentWebsite->id;
        $validated['sort_order'] = $agentWebsite->areas()->count();
        if (array_key_exists('sub_areas', $validated)) {
            $validated['sub_areas'] = $this->normalizeSubAreas($validated['sub_areas']);
        }

        $area = WebsiteArea::create($validated);

        // Every new community ships with clean SEO copy: refine whatever the
        // owner typed through the AI community writer (best-effort — the
        // original text is kept on any failure). Empty descriptions stay
        // empty; the public page then renders AreaDescription's default
        // template, which already carries live counts + internal links.
        if (trim(strip_tags((string) ($validated['description'] ?? ''))) !== '') {
            if ($refined = $this->refineDescription($agentWebsite, $area)) {
                $area->update(['description' => $refined]);
            }
        }

        return response()->json(['success' => true, 'area' => $area->fresh()], 201);
    }

    /**
     * AI-refine a community description from the area's saved configuration.
     * Returns paragraph HTML, or null when AI is unconfigured / fails.
     */
    private function refineDescription(AgentWebsite $agentWebsite, WebsiteArea $area): ?string
    {
        try {
            $criteria = (array) ($area->search_criteria ?? []);

            $lifestylePages = [];
            foreach ((array) ($area->lifestyle_pages ?? []) as $row) {
                if ($def = CommunityLifestyles::find((string) ($row['key'] ?? ''))) {
                    $lifestylePages[] = ['key' => $def['key'], 'label' => $def['label']];
                }
            }

            $result = app(WebsiteCopyService::class)->generateCommunityDescription([
                'name' => $area->name,
                'cities' => (array) ($criteria['cities'] ?? []),
                'counties' => (array) ($criteria['counties'] ?? []),
                'neighborhoods' => (array) ($criteria['neighborhoods'] ?? []),
                'zips' => (array) ($criteria['zips'] ?? []),
                'property_types' => (array) ($criteria['property_types'] ?? []),
                'min_price' => $criteria['min_price'] ?? null,
                'max_price' => $criteria['max_price'] ?? null,
                'lifestyle_pages' => $lifestylePages,
                'sub_areas' => array_map(
                    fn (array $e) => ['slug' => $e['slug'], 'label' => $e['label']],
                    $area->subAreaEntries()
                ),
                'brokerage_name' => $agentWebsite->brokerage_name,
                'template' => $agentWebsite->template,
                'current_value' => trim(strip_tags((string) $area->description)),
            ]);

            $value = isset($result['value']) && is_string($result['value']) ? trim($result['value']) : '';
            if ($value === '') {
                return null;
            }

            // Plain text → paragraph HTML (the AI returns blank-line paragraphs).
            if (preg_match('/<[a-z][\s\S]*>/i', $value)) {
                return $value;
            }

            return collect(preg_split('/\n{2,}/', $value))
                ->map(fn (string $p) => '<p>'.nl2br(e(trim($p))).'</p>')
                ->implode('');
        } catch (\Throwable $e) {
            Log::warning('Community AI refine failed: '.$e->getMessage(), ['area' => $area->id]);

            return null;
        }
    }

    /** Update an area/community. */
    public function updateArea(Request $request, AgentWebsite $agentWebsite, WebsiteArea $area): JsonResponse
    {
        $validated = $request->validate(array_merge([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:20000',
            'description_heading' => 'nullable|string|max:160',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'image' => 'nullable|string|max:500',
        ], $this->areaCriteriaRules($request)));

        if (array_key_exists('sub_areas', $validated)) {
            $validated['sub_areas'] = $this->normalizeSubAreas($validated['sub_areas']);
        }

        $area->update($validated);

        return response()->json(['success' => true, 'area' => $area->fresh()]);
    }

    /** Delete an area/community and its image. */
    public function deleteArea(AgentWebsite $agentWebsite, WebsiteArea $area): JsonResponse
    {
        if ($area->image) {
            Storage::disk('public')->delete($area->image);
        }
        $area->delete();

        return response()->json(['success' => true]);
    }

    /** Upload and set an area/community image. */
    public function uploadAreaImage(Request $request, AgentWebsite $agentWebsite, WebsiteArea $area): JsonResponse
    {
        $request->validate(['image' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240']);

        $path = $request->file('image')->store('agent-websites/areas', 'public');
        $area->update(['image' => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('image'));

        return response()->json([
            'success' => true,
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** Rename the Communities page (page heading + nav label). */
    public function updateAreasLabel(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'areas_label' => 'required|string|max:50',
        ]);

        $agentWebsite->update($validated);

        return response()->json(['success' => true]);
    }

    /** Persist a drag-reorder of the communities list (sort_order = list index). */
    public function reorderAreas(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'area_ids' => 'required|array',
            'area_ids.*' => 'required|integer',
        ]);

        foreach (array_values($validated['area_ids']) as $i => $areaId) {
            $agentWebsite->areas()->where('id', $areaId)->update(['sort_order' => $i]);
        }

        return response()->json(['success' => true]);
    }
}
