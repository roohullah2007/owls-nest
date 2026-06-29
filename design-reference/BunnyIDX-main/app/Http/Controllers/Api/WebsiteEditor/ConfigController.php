<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\CondoBuilding;
use App\Models\NewDevelopment;
use App\Services\Sites\SiteTranslations;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfigController extends Controller
{
    /**
     * Condo Directory state for the editor — the platform catalog size plus
     * whether this site has the directory switched on.
     */
    public function condoDirectory(AgentWebsite $agentWebsite): JsonResponse
    {
        $active = CondoBuilding::query()->active();

        return response()->json([
            'enabled' => (bool) data_get($agentWebsite->page_data, '_config.condo_directory.enabled', false),
            'buildings' => (clone $active)->count(),
            'areas' => $active->distinct()->count('area'),
        ]);
    }

    /**
     * Save the site's Condo Directory settings: the page toggle, the catalog
     * source (platform / own / both) and which platform buildings to hide.
     * Stored as page_data._config.condo_directory — mirrors New Developments.
     */
    public function updateCondoDirectoryConfig(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => 'sometimes|required|boolean',
            'source' => 'sometimes|required|string|in:platform,own,both',
            'hidden' => 'sometimes|array|max:500',
            'hidden.*' => 'integer',
        ]);

        // Hidden ids only make sense for platform-catalog buildings.
        if (array_key_exists('hidden', $validated)) {
            $validated['hidden'] = CondoBuilding::query()->platform()
                ->whereIn('id', $validated['hidden'])
                ->pluck('id')
                ->all();
        }

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        $config['condo_directory'] = array_merge($config['condo_directory'] ?? [], $validated);
        $pageData['_config'] = $config;

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /** New Developments state for the editor — catalog size + per-site toggle. */
    public function newDevelopments(AgentWebsite $agentWebsite): JsonResponse
    {
        $active = NewDevelopment::query()->active();

        return response()->json([
            'enabled' => (bool) data_get($agentWebsite->page_data, '_config.new_developments.enabled', false),
            'buildings' => (clone $active)->count(),
            'areas' => $active->distinct()->count('area'),
        ]);
    }

    /**
     * Save the site's New Developments settings: the page toggle, the catalog
     * source (admin platform list / the owner's own projects / both) and which
     * platform projects to hide. Stored as page_data._config.new_developments.
     */
    public function updateNewDevelopmentsConfig(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => 'sometimes|required|boolean',
            'source' => 'sometimes|required|string|in:platform,own,both',
            'hidden' => 'sometimes|array|max:500',
            'hidden.*' => 'integer',
        ]);

        // Hidden ids only make sense for platform-catalog projects.
        if (array_key_exists('hidden', $validated)) {
            $validated['hidden'] = NewDevelopment::query()->platform()
                ->whereIn('id', $validated['hidden'])
                ->pluck('id')
                ->all();
        }

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        $config['new_developments'] = array_merge($config['new_developments'] ?? [], $validated);
        $pageData['_config'] = $config;

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /** Translations state for the editor — the language catalog + this site's picks. */
    public function translations(AgentWebsite $agentWebsite): JsonResponse
    {
        return response()->json([
            'enabled' => (bool) data_get($agentWebsite->page_data, '_config.translations.enabled', false),
            'languages' => (array) data_get($agentWebsite->page_data, '_config.translations.languages', []),
            'catalog' => SiteTranslations::all(),
        ]);
    }

    /**
     * Save the site's translation settings (Google Translate widget behind the
     * themed language modal). Stored as page_data._config.translations.
     */
    public function updateTranslationsConfig(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'languages' => 'nullable|array|max:40',
            'languages.*' => 'string|in:'.implode(',', array_keys(SiteTranslations::CATALOG)),
        ]);
        $validated['languages'] = array_values(array_unique($validated['languages'] ?? []));

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        $config['translations'] = $validated;
        $pageData['_config'] = $config;

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /**
     * Global header feature toggles (phone, social, auth, more-menu, top bar).
     * Stored as page_data._config.header.
     */
    public function updateHeaderConfig(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            // Feature toggles
            'phone' => 'nullable|boolean',
            'social' => 'nullable|boolean',
            'show_facebook' => 'nullable|boolean',
            'show_instagram' => 'nullable|boolean',
            'show_linkedin' => 'nullable|boolean',
            'show_youtube' => 'nullable|boolean',
            'show_tiktok' => 'nullable|boolean',
            'auth' => 'nullable|boolean',
            'menu_modal' => 'nullable|boolean',
            'menu_align' => 'nullable|string|in:left,center,right',
            // Configurable dropdowns: map of nav-item key => list of child links.
            'nav_dropdowns' => 'nullable|array',
            'nav_dropdowns.*' => 'nullable|array',
            'nav_dropdowns.*.*.label' => 'nullable|string|max:80',
            'nav_dropdowns.*.*.url' => 'nullable|string|max:500',
            // Nav nesting (Menus editor): map of nav-item key => parent key.
            // Items in the map render as that parent's dropdown child in
            // navTree() — one level deep, validated there.
            'nav_parents' => 'nullable|array',
            'nav_parents.*' => 'string|max:80',
            // Styles (hex colors; blank = theme default)
            'styles_enabled' => 'nullable|boolean',
            'bg' => 'nullable|string|max:32',
            'font_color' => 'nullable|string|max:32',
            'dropdown_enabled' => 'nullable|boolean',
            'dropdown_bg' => 'nullable|string|max:32',
            'dropdown_font_color' => 'nullable|string|max:32',
            'btn_bg' => 'nullable|string|max:32',
            'btn_text' => 'nullable|string|max:32',
            // CTA button (right side)
            'cta_enabled' => 'nullable|boolean',
            'cta_text' => 'nullable|string|max:60',
            'cta_link' => 'nullable|string|max:500',
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        $config['header'] = array_merge($config['header'] ?? [], $validated);
        $pageData['_config'] = $config;

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /**
     * Footer settings — brand/brokerage/MLS logos, the disclaimer text, copyright
     * line and the Equal Housing logo toggle. Stored at page_data._config.footer.
     */
    public function updateFooterConfig(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'logo' => 'nullable|string|max:1000',          // footer brand logo (path or URL)
            'brokerage_logo' => 'nullable|string|max:1000',
            'mls_logo' => 'nullable|string|max:1000',
            'disclaimer' => 'nullable|string|max:5000',
            'copyright' => 'nullable|string|max:300',
            'show_eho' => 'nullable|boolean',
            // Footer menu: nav-item keys to show (empty = mirror the header nav).
            'menu' => 'nullable|array',
            'menu.*' => 'string|max:50',
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        $config['footer'] = array_merge($config['footer'] ?? [], $validated);
        $pageData['_config'] = $config;

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /**
     * Structured analytics/tracking IDs — Google Analytics 4, Google Tag
     * Manager and the Meta (Facebook) Pixel. Stored at page_data._config.tracking;
     * the public layouts render the official snippets from these IDs (see
     * resources/views/agent-website/partials/tracking-scripts.blade.php).
     * IDs are validated strictly so they can never carry markup.
     */
    public function updateTrackingConfig(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'ga4_id' => ['nullable', 'string', 'max:32', 'regex:/^G-[A-Z0-9]{4,}$/i'],
            'gtm_id' => ['nullable', 'string', 'max:32', 'regex:/^GTM-[A-Z0-9]{4,}$/i'],
            'fb_pixel_id' => ['nullable', 'string', 'max:32', 'regex:/^\d{5,20}$/'],
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];
        $config['tracking'] = array_merge($config['tracking'] ?? [], $validated);
        $pageData['_config'] = $config;

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }

    /**
     * Property-search design settings — fonts (page / header / footer / cards),
     * header logo height, card border radius and free-form custom CSS for the
     * search + listing-detail pages. Stored at page_data._config.search; the
     * site-wide theme font is stored at page_data._config.design.font.
     */
    public function updateSearchConfig(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $fonts = implode(',', config('fonts.families', []));

        $validated = $request->validate([
            'header_theme' => 'nullable|string|in:dark,light',
            'theme_font' => 'nullable|string|in:'.$fonts,
            'font' => 'nullable|string|in:'.$fonts,
            'header_font' => 'nullable|string|in:'.$fonts,
            'footer_font' => 'nullable|string|in:'.$fonts,
            'card_font' => 'nullable|string|in:'.$fonts,
            'logo_height' => 'nullable|integer|min:20|max:80',
            'card_radius' => 'nullable|integer|min:0|max:32',
            'custom_css' => 'nullable|string|max:20000',
            // Listing restrictions — what the public search may show. Values
            // are the connected MLSes' taxonomy enums verbatim (exclusion
            // lists, so new feed terms appear by default).
            'allowed_transactions' => 'nullable|array|max:2',
            'allowed_transactions.*' => 'string|in:sale,rent',
            'excluded_property_types' => 'nullable|array|max:100',
            'excluded_property_types.*' => 'string|max:120',
            'excluded_property_subtypes' => 'nullable|array|max:200',
            'excluded_property_subtypes.*' => 'string|max:120',
            // Lead gating — lock pages behind the visitor login modal.
            'require_login_search' => 'nullable|boolean',
            'require_login_detail' => 'nullable|boolean',
            // Site-wide marketing-consent disclosure (all lead forms).
            'consent_text' => 'nullable|string|max:2000',
            // Agent card on the listing detail sidebar.
            'agent_card_bg' => 'nullable|string|max:32',
            // Built-in detail-page sections — order (array order), rename, toggle.
            'detail_sections' => 'nullable|array|max:12',
            'detail_sections.*.key' => 'required|string|in:description,building,details,rooms,bathrooms,amenities,history,location,calculator,comparables',
            'detail_sections.*.label' => 'nullable|string|max:80',
            'detail_sections.*.enabled' => 'nullable|boolean',
            // Custom detail-page blocks — merge fields ({{address}}, {{price}}, …)
            // substituted client-side; body is plain text (rendered with line
            // breaks, never raw HTML).
            'detail_blocks' => 'nullable|array|max:12',
            'detail_blocks.*.id' => 'required|string|max:40',
            'detail_blocks.*.enabled' => 'nullable|boolean',
            'detail_blocks.*.title' => 'nullable|string|max:160',
            'detail_blocks.*.body' => 'nullable|string|max:3000',
            'detail_blocks.*.cta_text' => 'nullable|string|max:80',
            'detail_blocks.*.cta_url' => 'nullable|string|max:500',
            'detail_blocks.*.position' => 'nullable|string|in:after_gallery,after_description,before_comparables,sidebar',
            'detail_blocks.*.statuses' => 'nullable|array',
            'detail_blocks.*.statuses.*' => 'string|in:active,pending,sold',
            // Marketing CTA cards mixed into the results grid (Sierra-style).
            'grid_cards' => 'nullable|array|max:6',
            'grid_cards.*.id' => 'required|string|max:40',
            'grid_cards.*.enabled' => 'nullable|boolean',
            'grid_cards.*.title' => 'nullable|string|max:120',
            'grid_cards.*.body' => 'nullable|string|max:500',
            'grid_cards.*.cta_text' => 'nullable|string|max:60',
            'grid_cards.*.cta_url' => 'nullable|string|max:500',
            'grid_cards.*.image' => 'nullable|string|max:2000',
            'grid_cards.*.slot' => 'nullable|integer|min:1|max:40',
        ]);

        $pageData = $agentWebsite->page_data ?? [];
        $config = $pageData['_config'] ?? [];

        // Form consent text is site-wide (every lead form), not search-only.
        if (array_key_exists('consent_text', $validated)) {
            $config['forms'] = array_merge($config['forms'] ?? [], ['consent_text' => $validated['consent_text']]);
            unset($validated['consent_text']);
        }

        // Site-wide theme font lives under _config.design (it isn't search-only).
        if (array_key_exists('theme_font', $validated)) {
            $config['design'] = array_merge($config['design'] ?? [], ['font' => $validated['theme_font']]);
            unset($validated['theme_font']);
        }

        $config['search'] = array_merge($config['search'] ?? [], $validated);
        $pageData['_config'] = $config;

        $agentWebsite->update(['page_data' => $pageData]);

        return response()->json(['success' => true]);
    }
}
