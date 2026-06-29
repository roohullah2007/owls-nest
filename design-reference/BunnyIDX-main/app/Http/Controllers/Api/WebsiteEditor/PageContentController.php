<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PageContentController extends Controller
{
    private function validPage(string $page, ?AgentWebsite $agentWebsite = null): bool
    {
        $builtIn = ['home', 'about', 'buy', 'sell', 'contact', 'blog', 'areas', 'home-valuation', 'properties', 'team', 'featured', 'sold', 'condos', 'new-developments', 'mortgage-calculator', 'market-trends'];
        if (in_array($page, $builtIn)) {
            return true;
        }

        // Allow custom page slugs
        if ($agentWebsite) {
            $customPages = $agentWebsite->page_data['_config']['custom_pages'] ?? [];
            foreach ($customPages as $cp) {
                if (($cp['slug'] ?? '') === $page) {
                    return true;
                }
            }
        }

        return false;
    }

    /** Update text/image fields on a page (page_data), plus a few agent-identity columns. */
    public function updatePageData(Request $request, AgentWebsite $agentWebsite, string $page): JsonResponse
    {
        if (! $this->validPage($page, $agentWebsite)) {
            return response()->json(['error' => 'Invalid page.'], 422);
        }

        $validated = $request->validate([
            '*' => 'nullable|string|max:5000',
        ]);

        // Some fields are agent-identity columns, not page_data
        $columnFields = ['agent_bio', 'agent_name', 'agent_title', 'agent_tagline'];
        $columnUpdates = [];
        $pageFields = [];

        foreach ($validated as $key => $value) {
            if (in_array($key, $columnFields)) {
                $columnUpdates[$key] = $value;
            } else {
                $pageFields[$key] = $value;
            }
        }

        if (! empty($columnUpdates)) {
            $agentWebsite->update($columnUpdates);
        }

        if (! empty($pageFields)) {
            $pageData = $agentWebsite->page_data ?? [];
            $oldPageData = $pageData[$page] ?? [];

            // Clean up replaced images
            foreach ($pageFields as $key => $newValue) {
                $oldValue = $oldPageData[$key] ?? null;
                if ($oldValue && $oldValue !== $newValue &&
                    is_string($oldValue) && str_starts_with($oldValue, 'agent-websites/')) {
                    Storage::disk('public')->delete($oldValue);
                }
            }

            $pageData[$page] = array_merge($oldPageData, $pageFields);
            $agentWebsite->update(['page_data' => $pageData]);
        }

        return response()->json(['success' => true, 'site' => $agentWebsite->fresh()]);
    }

    // ── Block CRUD ──────────────────────────────────────────────

    /** Insert a new content block into a page at a slot-relative position. */
    public function addBlock(Request $request, AgentWebsite $agentWebsite, string $page): JsonResponse
    {
        if (! $this->validPage($page, $agentWebsite)) {
            return response()->json(['error' => 'Invalid page.'], 422);
        }

        $validated = $request->validate([
            'id' => 'required|string|max:20',
            'type' => 'required|string|max:50',
            'position' => 'required|integer|min:0',
            'slot' => 'nullable|string|max:50',
            'data' => 'nullable|array',
            'data.*' => 'nullable|string|max:10000',
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $blocks = $pageData[$page]['blocks'] ?? [];
        $slot = $validated['slot'] ?? 'default';

        $block = [
            'id' => $validated['id'],
            'type' => $validated['type'],
            'slot' => $slot,
            'data' => $validated['data'] ?? [],
        ];

        // Insert at position relative to blocks in the same slot, preserving interleaving
        $slotCount = 0;
        $pos = min($validated['position'], count(array_filter($blocks, fn ($b) => ($b['slot'] ?? 'default') === $slot)));
        $insertIdx = count($blocks); // default: append at end
        foreach ($blocks as $i => $b) {
            if (($b['slot'] ?? 'default') === $slot) {
                if ($slotCount === $pos) {
                    $insertIdx = $i;
                    break;
                }
                $slotCount++;
            }
        }
        array_splice($blocks, $insertIdx, 0, [$block]);

        $pageData[$page] = array_merge($pageData[$page] ?? [], ['blocks' => $blocks]);
        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true, 'block' => $block]);
    }

    /** Replace a block's data payload. */
    public function updateBlock(Request $request, AgentWebsite $agentWebsite, string $page, string $blockId): JsonResponse
    {
        if (! $this->validPage($page, $agentWebsite)) {
            return response()->json(['error' => 'Invalid page.'], 422);
        }

        $validated = $request->validate([
            'data' => 'required|array',
            'data.*' => 'nullable|string|max:10000',
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $blocks = $pageData[$page]['blocks'] ?? [];

        $found = false;
        foreach ($blocks as &$block) {
            if ($block['id'] === $blockId) {
                $block['data'] = $validated['data'];
                $found = true;
                break;
            }
        }
        unset($block);

        if (! $found) {
            return response()->json(['error' => 'Block not found.'], 404);
        }

        $pageData[$page]['blocks'] = $blocks;
        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /** Remove a block from a page and delete any images it referenced. */
    public function deleteBlock(AgentWebsite $agentWebsite, string $page, string $blockId): JsonResponse
    {
        if (! $this->validPage($page, $agentWebsite)) {
            return response()->json(['error' => 'Invalid page.'], 422);
        }

        $pageData = $agentWebsite->page_data ?? [];
        $blocks = $pageData[$page]['blocks'] ?? [];

        // Clean up images referenced by the deleted block
        foreach ($blocks as $b) {
            if ($b['id'] === $blockId) {
                foreach ($b['data'] ?? [] as $val) {
                    if (is_string($val) && str_starts_with($val, 'agent-websites/')) {
                        Storage::disk('public')->delete($val);
                    }
                }
                break;
            }
        }

        $blocks = array_values(array_filter($blocks, fn ($b) => $b['id'] !== $blockId));

        $pageData[$page]['blocks'] = $blocks;
        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /** Persist a drag-reorder of a page's blocks, with optional cross-slot moves. */
    public function reorderBlocks(Request $request, AgentWebsite $agentWebsite, string $page): JsonResponse
    {
        if (! $this->validPage($page, $agentWebsite)) {
            return response()->json(['error' => 'Invalid page.'], 422);
        }

        $validated = $request->validate([
            'block_ids' => 'required|array',
            'block_ids.*' => 'required|string|max:20',
            // Optional id → slot reassignments, for drags that cross slot groups.
            'slots' => 'sometimes|array',
            'slots.*' => 'string|max:50',
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $blocks = $pageData[$page]['blocks'] ?? [];

        $indexed = [];
        foreach ($blocks as $block) {
            $indexed[$block['id']] = $block;
        }

        $reordered = [];
        foreach ($validated['block_ids'] as $id) {
            if (isset($indexed[$id])) {
                $block = $indexed[$id];
                if (isset($validated['slots'][$id])) {
                    $block['slot'] = $validated['slots'][$id];
                }
                $reordered[] = $block;
            }
        }

        $pageData[$page]['blocks'] = $reordered;
        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    // ── Testimonials ─────────────────────────────────────────

    /** Replace the site's testimonials list. */
    public function updateTestimonials(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'testimonials' => 'present|array|max:20',
            'testimonials.*.text' => 'required|string|max:2000',
            'testimonials.*.name' => 'required|string|max:255',
            'testimonials.*.role' => 'nullable|string|max:255',
            // Google-reviews import tags — must survive manual edits so syncs
            // can keep replacing google-sourced entries without duplicating.
            'testimonials.*.source' => 'nullable|string|in:google',
            'testimonials.*.rating' => 'nullable|integer|min:1|max:5',
            'testimonials.*.google_id' => 'nullable|string|max:64',
        ]);

        $agentWebsite->update(['testimonials' => $validated['testimonials']]);

        return response()->json(['success' => true, 'site' => $agentWebsite->fresh()]);
    }

    // ── Sections ─────────────────────────────────────────────

    /**
     * Show/hide template sections on a page. Stored as
     * page_data._config.disabled_sections[page] = [sectionId, ...].
     */
    public function updateSectionVisibility(Request $request, AgentWebsite $agentWebsite, string $page): JsonResponse
    {
        if (! $this->validPage($page, $agentWebsite)) {
            return response()->json(['error' => 'Invalid page.'], 422);
        }

        $validated = $request->validate([
            'disabled_sections' => 'present|array',
            'disabled_sections.*' => 'string|max:50',
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        $disabled = $config['disabled_sections'] ?? [];
        $disabled[$page] = array_values($validated['disabled_sections']);
        $config['disabled_sections'] = $disabled;
        $pageData['_config'] = $config;

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /**
     * Re-order template sections on a page. Stored as
     * page_data._config.section_order[page] = [sectionId, ...].
     */
    public function updateSectionOrder(Request $request, AgentWebsite $agentWebsite, string $page): JsonResponse
    {
        if (! $this->validPage($page, $agentWebsite)) {
            return response()->json(['error' => 'Invalid page.'], 422);
        }

        $validated = $request->validate([
            'section_order' => 'present|array',
            'section_order.*' => 'string|max:50',
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        $order = $config['section_order'] ?? [];
        $order[$page] = array_values($validated['section_order']);
        $config['section_order'] = $order;
        $pageData['_config'] = $config;

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }
}
