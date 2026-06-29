<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Services\Ai\WebsiteCopyService;
use App\Services\Mls\FeaturedListingsResolver;
use App\Services\Sites\CommunityLifestyles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AiController extends Controller
{
    /** Generate AI copy for a single editable website field. */
    public function aiGenerateField(
        Request $request,
        AgentWebsite $agentWebsite,
        WebsiteCopyService $service,
    ): JsonResponse {
        $validated = $request->validate([
            'field' => 'required|string|max:50',
            'current_value' => 'nullable|string|max:5000',
        ]);

        $context = [
            'agent_name' => $agentWebsite->agent_name,
            'agent_city' => $agentWebsite->agent_city,
            'template' => $agentWebsite->template,
            'current_value' => $validated['current_value'] ?? '',
        ];

        $result = $service->generateField($validated['field'], $context);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * "About the Project" copy for a New Development (editor's Write with AI)
     * — grounded in the project facts the form currently holds.
     */
    public function generateDevelopmentDescription(Request $request, AgentWebsite $agentWebsite, WebsiteCopyService $service): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'area' => 'nullable|string|max:120',
            'city' => 'nullable|string|max:120',
            'developer' => 'nullable|string|max:160',
            'architect' => 'nullable|string|max:160',
            'interior_design' => 'nullable|string|max:160',
            'status' => 'nullable|string|max:40',
            'completion_year' => 'nullable|string|max:12',
            'price_label' => 'nullable|string|max:64',
            'highlights' => 'nullable|array|max:30',
            'highlights.*' => 'string|max:300',
            'key_details' => 'nullable|array|max:20',
            'key_details.*.label' => 'required|string|max:80',
            'key_details.*.value' => 'required|string|max:300',
            'current_value' => 'nullable|string|max:12000',
        ]);

        $validated['template'] = $agentWebsite->template;

        $result = $service->generateDevelopmentDescription($validated);

        return isset($result['error']) ? response()->json($result, 422) : response()->json($result);
    }

    /**
     * Generate a community SEO description via AI (the editor's "Write with
     * AI"). The editor sends the community's full configuration — location
     * filters, property types, price band, enabled lifestyle pages and SEO
     * sub-pages — so the copy is grounded in real data and can weave in the
     * merge variables AreaDescription resolves at render time.
     */
    public function generateAreaDescription(Request $request, AgentWebsite $agentWebsite, WebsiteCopyService $service): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'current_value' => 'nullable|string|max:8000',
            'criteria' => 'nullable|array',
            'criteria.cities' => 'nullable|array',
            'criteria.cities.*' => 'string|max:120',
            'criteria.counties' => 'nullable|array',
            'criteria.counties.*' => 'string|max:120',
            'criteria.neighborhoods' => 'nullable|array',
            'criteria.neighborhoods.*' => 'string|max:160',
            'criteria.zips' => 'nullable|array',
            'criteria.zips.*' => 'string|max:12',
            'criteria.property_types' => 'nullable|array',
            'criteria.property_types.*' => 'string|max:80',
            'criteria.min_price' => 'nullable|numeric|min:0',
            'criteria.max_price' => 'nullable|numeric|min:0',
            'lifestyle_keys' => 'nullable|array|max:40',
            'lifestyle_keys.*' => 'string|max:60',
            'sub_area_labels' => 'nullable|array|max:60',
            'sub_area_labels.*' => 'string|max:120',
        ]);

        $criteria = (array) ($validated['criteria'] ?? []);

        // Live active-listing count grounds the market paragraph (8h-cached,
        // count-only pull). Best-effort — copy still generates without it.
        $listingsCount = null;
        if (array_filter($criteria) !== []) {
            try {
                $res = FeaturedListingsResolver::resolveForArea($agentWebsite, $criteria + ['limit' => 1], 1);
                if ($res['integrated']) {
                    $listingsCount = (int) $res['total'];
                }
            } catch (\Throwable) {
                // Count stays unknown; the {listings_count} variable still renders live.
            }
        }

        // Lifestyle keys → {key, label}; sub-area labels → {slug, label}. The
        // slug here mirrors AreaController::normalizeSubAreas (Str::slug of the
        // label), so the AI's #sub:<slug> links resolve once the area is saved.
        $lifestylePages = [];
        foreach ((array) ($validated['lifestyle_keys'] ?? []) as $key) {
            if ($def = CommunityLifestyles::find((string) $key)) {
                $lifestylePages[] = ['key' => $def['key'], 'label' => $def['label']];
            }
        }
        $subAreas = [];
        foreach ((array) ($validated['sub_area_labels'] ?? []) as $label) {
            $label = trim((string) $label);
            if ($label !== '') {
                $subAreas[] = ['slug' => Str::slug($label) ?: 'area', 'label' => $label];
            }
        }

        $result = $service->generateCommunityDescription([
            'name' => $validated['name'],
            'location' => $validated['location'] ?? null,
            'cities' => (array) ($criteria['cities'] ?? []),
            'counties' => (array) ($criteria['counties'] ?? []),
            'neighborhoods' => (array) ($criteria['neighborhoods'] ?? []),
            'zips' => (array) ($criteria['zips'] ?? []),
            'property_types' => (array) ($criteria['property_types'] ?? []),
            'min_price' => $criteria['min_price'] ?? null,
            'max_price' => $criteria['max_price'] ?? null,
            'listings_count' => $listingsCount,
            'lifestyle_pages' => $lifestylePages,
            'sub_areas' => $subAreas,
            'brokerage_name' => $agentWebsite->brokerage_name,
            'template' => $agentWebsite->template,
            'current_value' => trim(strip_tags((string) ($validated['current_value'] ?? ''))),
        ]);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * Generate intro copy for one of a community's lifestyle pages
     * ("Waterfront Homes", "55+ Communities", …) or property type / sub-type
     * pages ("Condominium", "Land", …) — grounded with the live listing count
     * for that exact slice when an MLS is connected.
     */
    public function generateLifestyleCopy(Request $request, AgentWebsite $agentWebsite, WebsiteCopyService $service): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'lifestyle_key' => 'required_without:property_value|string|in:'.implode(',', array_keys(CommunityLifestyles::CATALOG)),
            // Property type/subtype page variant — value is the MLS enum verbatim.
            'property_kind' => 'required_with:property_value|in:property_type,property_subtype',
            'property_value' => 'nullable|string|max:80',
            'property_label' => 'nullable|string|max:120',
            'current_value' => 'nullable|string|max:8000',
            'criteria' => 'nullable|array',
            'criteria.cities' => 'nullable|array',
            'criteria.cities.*' => 'string|max:120',
            'criteria.counties' => 'nullable|array',
            'criteria.counties.*' => 'string|max:120',
            'criteria.neighborhoods' => 'nullable|array',
            'criteria.neighborhoods.*' => 'string|max:160',
            'criteria.zips' => 'nullable|array',
            'criteria.zips.*' => 'string|max:12',
            'criteria.min_price' => 'nullable|numeric|min:0',
            'criteria.max_price' => 'nullable|numeric|min:0',
        ]);

        $criteria = (array) ($validated['criteria'] ?? []);

        // Page label + the filter overlay that defines this slice.
        if (($validated['property_value'] ?? null) !== null) {
            $pageLabel = (string) ($validated['property_label'] ?? $validated['property_value']);
            $overlay = $validated['property_kind'] === 'property_subtype'
                ? ['property_subtypes' => [$validated['property_value']]]
                : ['property_types' => [$validated['property_value']]];
        } else {
            $lifestyle = CommunityLifestyles::find($validated['lifestyle_key']);
            $pageLabel = $lifestyle['label'];
            $overlay = ['lifestyles' => [$lifestyle['lifestyle']]];
        }

        // Live count for this exact slice (community filters + page overlay).
        $listingsCount = null;
        if (array_filter($criteria) !== []) {
            try {
                $slice = array_merge($criteria, $overlay, ['limit' => 1]);
                unset($slice['hotsheet_id']);
                $res = FeaturedListingsResolver::resolveForArea($agentWebsite, $slice, 1);
                if ($res['integrated']) {
                    $listingsCount = (int) $res['total'];
                }
            } catch (\Throwable) {
                // Count stays unknown; {listings_count} still renders live.
            }
        }

        $location = implode(', ', array_merge(
            (array) ($criteria['cities'] ?? []),
            (array) ($criteria['counties'] ?? []),
        ));

        $result = $service->generateLifestyleCopy([
            'community' => $validated['name'],
            'lifestyle' => $pageLabel,
            'location' => $location ?: null,
            'listings_count' => $listingsCount,
            'brokerage_name' => $agentWebsite->brokerage_name,
            'template' => $agentWebsite->template,
            'current_value' => trim(strip_tags((string) ($validated['current_value'] ?? ''))),
        ]);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * Generate a team member's bio (the Team manager's "Write with AI") —
     * grounded in the member's name/role and the site's market, refining any
     * draft the owner already typed.
     */
    public function generateTeamBio(Request $request, AgentWebsite $agentWebsite, WebsiteCopyService $service): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
            'current_value' => 'nullable|string|max:20000',
        ]);

        // Drafts arrive as rich-text HTML — keep the paragraph breaks when
        // flattening to plain text for the prompt.
        $draft = (string) ($validated['current_value'] ?? '');
        $draft = trim(strip_tags(preg_replace('/<\/(p|div|li|h[1-6])>|<br\s*\/?>/i', "\n\n", $draft)));

        $result = $service->generateTeamBio([
            'name' => $validated['name'],
            'title' => $validated['title'] ?? null,
            'agent_city' => $agentWebsite->agent_city,
            'brokerage_name' => $agentWebsite->brokerage_name,
            'areas' => $agentWebsite->areas()->where('is_active', true)->orderBy('sort_order')->limit(8)->pluck('name')->implode(', ') ?: null,
            'site_about' => Str::limit(trim(strip_tags((string) $agentWebsite->agent_bio)), 600) ?: null,
            'template' => $agentWebsite->template,
            'current_value' => $draft,
        ]);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * AI-generated custom CSS for the property cards / listing-detail page.
     * The user describes the look; the model returns CSS scoped to the stable
     * ps-* classes the public search bundle exposes.
     */
    public function aiGenerateSearchCss(Request $request, AgentWebsite $agentWebsite, WebsiteCopyService $copy): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => 'required|string|max:1000',
            'current_css' => 'nullable|string|max:20000',
        ]);

        $result = $copy->generateCustomCss($validated['prompt'], $validated['current_css'] ?? null);

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 422);
        }

        return response()->json(['value' => $result['value'], 'success' => true]);
    }

    /**
     * SEO Blog AI Writer — generates a complete post (title, slug, excerpt,
     * HTML body, meta) from a topic, localised to the agent's market.
     */
    public function aiGenerateBlogPost(Request $request, AgentWebsite $agentWebsite, WebsiteCopyService $copy): JsonResponse
    {
        $validated = $request->validate([
            'topic' => 'required|string|max:500',
            'keywords' => 'nullable|string|max:300',
            'current_body' => 'nullable|string|max:30000',
        ]);

        $result = $copy->generateBlogPost([
            'topic' => $validated['topic'],
            'keywords' => $validated['keywords'] ?? null,
            'agent_name' => $agentWebsite->agent_name,
            'agent_city' => $agentWebsite->agent_city,
            'template' => $agentWebsite->template,
            'current_body' => $validated['current_body'] ?? null,
        ]);

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 422);
        }

        return response()->json(['post' => $result['post'], 'success' => true]);
    }
}
