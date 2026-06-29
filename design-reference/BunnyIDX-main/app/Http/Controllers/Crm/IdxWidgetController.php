<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\IdxSearch;
use App\Models\IdxWidget;
use App\Services\Idx\IdxSearchService;
use App\Services\Mls\MlsDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class IdxWidgetController extends Controller implements HasMiddleware
{
    /** IDX / MLS is a paid feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:idx')];
    }

    public function __construct(
        private readonly IdxSearchService $searchService,
        private readonly MlsDataService $mlsData,
    ) {}

    public function create(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Crm/Idx/Widget/Edit', [
            'widget' => null,
            'connections' => $user->idxConnections()->where('is_active', true)->orderBy('display_name')->get(),
            'searches' => $user->idxSearches()->orderBy('name')->get(),
            'widgetDefaults' => $user->getWidgetDefaults(),
        ]);
    }

    public function edit(Request $request, IdxWidget $idxWidget): Response
    {
        abort_unless($idxWidget->user_id === $request->user()->id, 403);
        $user = $request->user();

        return Inertia::render('Crm/Idx/Widget/Edit', [
            'widget' => $idxWidget->load('search:id,name'),
            'connections' => $user->idxConnections()->where('is_active', true)->orderBy('display_name')->get(),
            'searches' => $user->idxSearches()->orderBy('name')->get(),
            'widgetDefaults' => $user->getWidgetDefaults(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'widget_type' => 'required|in:grid,carousel,map,search_form',
            'mls_slug' => 'required|string|max:50',
            'idx_search_id' => 'nullable|exists:idx_searches,id',
            'appearance' => 'nullable|array',
            'config' => 'nullable|array',
            'custom_css' => 'nullable|string|max:10000',
        ]);

        $user = $request->user();

        // Verify search belongs to user
        if ($validated['idx_search_id'] ?? null) {
            abort_unless($user->idxSearches()->where('id', $validated['idx_search_id'])->exists(), 403);
        }

        // Merge global defaults into appearance if no appearance provided
        $defaults = $user->getWidgetDefaults();
        if (empty($validated['appearance']) && ! empty($defaults)) {
            $validated['appearance'] = $defaults;
        }

        $user->idxWidgets()->create($validated);

        return redirect()->route('crm.idx.index', ['tab' => 'widgets'])->with('success', 'Widget created.');
    }

    public function update(Request $request, IdxWidget $idxWidget): RedirectResponse
    {
        abort_unless($idxWidget->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'widget_type' => 'sometimes|required|in:grid,carousel,map,search_form',
            'mls_slug' => 'sometimes|required|string|max:50',
            'idx_search_id' => 'nullable|exists:idx_searches,id',
            'appearance' => 'nullable|array',
            'config' => 'nullable|array',
            'custom_css' => 'nullable|string|max:10000',
            'is_active' => 'nullable|boolean',
        ]);

        // Verify search belongs to user
        if (array_key_exists('idx_search_id', $validated) && $validated['idx_search_id']) {
            abort_unless($request->user()->idxSearches()->where('id', $validated['idx_search_id'])->exists(), 403);
        }

        $idxWidget->update($validated);

        return redirect()->route('crm.idx.index', ['tab' => 'widgets'])->with('success', 'Widget updated.');
    }

    public function destroy(Request $request, IdxWidget $idxWidget): RedirectResponse
    {
        abort_unless($idxWidget->user_id === $request->user()->id, 403);

        $idxWidget->delete();

        return back()->with('success', 'Widget deleted.');
    }

    public function saveDefaults(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'defaults' => 'required|array',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $settings['widget_defaults'] = $validated['defaults'];
        $user->settings = $settings;
        $user->save();

        return back()->with('success', 'Widget defaults saved.');
    }

    /**
     * Preview real MLS listings for a widget configuration.
     * Session-authenticated endpoint for the widget builder preview.
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mls_slug' => 'required|string|max:50',
            'idx_search_id' => 'nullable|integer|exists:idx_searches,id',
            'filters' => 'nullable|array',
            'count' => 'nullable|integer|min:1|max:50',
        ]);

        $user = $request->user();
        $mlsSlug = $validated['mls_slug'];
        $count = $validated['count'] ?? 12;

        // Build filters
        $filters = [
            'per_page' => $count,
            'page' => 1,
        ];

        // Apply widget-level filters
        if ($validated['filters'] ?? null) {
            $widgetFilters = array_filter($validated['filters'], fn ($v) => $v !== null && $v !== '');
            $filters = array_merge($filters, $widgetFilters);
        }

        // Apply linked search filters (search overrides widget filters for same keys)
        if ($validated['idx_search_id'] ?? null) {
            $search = IdxSearch::where('id', $validated['idx_search_id'])
                ->where('user_id', $user->id)
                ->first();

            if ($search) {
                $searchFilters = $search->filters ?? [];
                $filters = array_merge($filters, array_filter($searchFilters, fn ($v) => $v !== null && $v !== ''));
                $filters['per_page'] = min($count, $search->per_page ?? $count);
            }
        }

        $connection = $user->idxConnections()
            ->where('mls_slug', $mlsSlug)
            ->active()
            ->first();

        if (! $connection) {
            return response()->json([
                'listings' => [],
                'total' => 0,
                'error' => 'No active MLS connection found for '.$mlsSlug.'.',
            ]);
        }

        try {
            // Route through the unified service so compliance metadata is attached.
            $results = $this->mlsData->search($connection, $filters);

            return response()->json($results);
        } catch (\Throwable $e) {
            return response()->json([
                'listings' => [],
                'total' => 0,
                'compliance' => null,
                'error' => 'Unable to fetch listings: '.$e->getMessage(),
            ]);
        }
    }
}
