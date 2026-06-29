<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\Hotsheet;
use App\Services\Mls\PublicPropertySearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteController extends Controller
{
    /** Return the full site record for the editor, plus editor capabilities. */
    public function show(AgentWebsite $agentWebsite): JsonResponse
    {
        return response()->json([
            'site' => $agentWebsite,
            // Capabilities the block palette gates on (e.g. the AVM/Home Value
            // Estimator needs MLS sold comps). Cached, so cheap per load.
            'capabilities' => [
                'sold_comps' => app(PublicPropertySearch::class)->hasSoldComps($agentWebsite),
            ],
        ]);
    }

    /** Update site-level text/SEO/tracking fields and image-column paths. */
    public function update(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'agent_name' => 'nullable|string|max:255',
            'agent_title' => 'nullable|string|max:255',
            'agent_bio' => 'nullable|string|max:5000',
            'about_extended' => 'nullable|string|max:5000',
            'hero_headline' => 'nullable|string|max:255',
            'hero_subtitle' => 'nullable|string|max:255',
            'buy_headline' => 'nullable|string|max:255',
            'buy_description' => 'nullable|string|max:2000',
            'sell_headline' => 'nullable|string|max:255',
            'sell_description' => 'nullable|string|max:2000',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'og_title' => 'nullable|string|max:255',
            'og_description' => 'nullable|string|max:2000',
            'robots_txt' => 'nullable|string|max:10000',
            'llms_txt' => 'nullable|string|max:10000',
            'tracking_head' => 'nullable|string|max:10000',
            'tracking_body' => 'nullable|string|max:10000',
            'header_style' => 'nullable|string|in:solid,transparent',
            'header_sticky' => 'nullable|boolean',
            // Image columns — set to a Media Library path (or null to clear).
            'agent_photo' => 'nullable|string|max:500',
            'hero_image' => 'nullable|string|max:500',
            'site_logo_light' => 'nullable|string|max:500',
            'site_logo_dark' => 'nullable|string|max:500',
            'brokerage_logo_light' => 'nullable|string|max:500',
            'brokerage_logo_dark' => 'nullable|string|max:500',
            'favicon' => 'nullable|string|max:500',
            'og_image' => 'nullable|string|max:500',
        ]);

        $agentWebsite->update($validated);

        return response()->json(['success' => true, 'site' => $agentWebsite->fresh()]);
    }

    /** Return the pages configuration (disabled pages, nav order, custom pages, sections). */
    public function getPagesConfig(AgentWebsite $agentWebsite): JsonResponse
    {
        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];

        return response()->json([
            'disabled_pages' => $config['disabled_pages'] ?? [],
            'nav_order' => $config['nav_order'] ?? [],
            'custom_pages' => $config['custom_pages'] ?? [],
            'disabled_sections' => $config['disabled_sections'] ?? (object) [],
            // The dynamic Communities page's name (page heading + nav label).
            'areas_label' => $agentWebsite->areas_label ?: 'Communities',
        ]);
    }

    /** Save the pages configuration (disabled pages, nav order, custom pages). */
    public function updatePagesConfig(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'disabled_pages' => 'present|array',
            'disabled_pages.*' => 'string|max:50',
            'nav_order' => 'present|array',
            'nav_order.*' => 'string|max:50',
            'custom_pages' => 'present|array',
            'custom_pages.*.slug' => 'required|string|max:50|regex:/^[a-z0-9-]+$/',
            'custom_pages.*.title' => 'required|string|max:100',
            'custom_pages.*.show_in_nav' => 'boolean',
            'custom_pages.*.parent' => 'nullable|string|max:50',
        ]);

        // Never allow disabling "home"
        $validated['disabled_pages'] = array_values(array_filter(
            $validated['disabled_pages'],
            fn ($p) => $p !== 'home'
        ));

        $pageData = $agentWebsite->page_data ?? [];
        // Merge so keys this endpoint doesn't manage (e.g. disabled_sections) survive.
        $pageData['_config'] = array_merge($pageData['_config'] ?? [], [
            'disabled_pages' => $validated['disabled_pages'],
            'nav_order' => $validated['nav_order'],
            'custom_pages' => $validated['custom_pages'],
        ]);

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /** The site owner's saved hotsheets — used by the Featured Listings block. */
    public function listHotsheets(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $user = $request->user();
        $hotsheets = $user
            ? Hotsheet::visibleTo($user)->orderBy('position')->orderBy('name')->get(['id', 'name', 'scope'])
            : collect();

        return response()->json(['hotsheets' => $hotsheets]);
    }
}
