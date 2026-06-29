<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IdxConnection;
use App\Models\MlsProvider;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsDataService;
use App\Services\Mls\MlsDatasetRegistry;
use App\Services\Mls\MlsGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Unified MLS API. Single surface used by CRM, agent websites, IDX widgets
 * (and later the WP relay). Routes are mounted in bootstrap/app.php under
 * `/api/v1/mls/*` (canonical) and `/api/mls/*` (legacy, kept until callers
 * migrate).
 *
 * Architecture: requests resolve through MlsGateway → MlsDriver → MlsDataset
 * (see memory: mls-architecture.md). DTO-typed, IDX-by-default, VOW per-feed.
 */
class MlsDataController extends Controller
{
    public function __construct(
        private readonly MlsDataService $mls,
        private readonly MlsGateway $gateway,
        private readonly MlsDatasetRegistry $datasets,
    ) {}

    // ─── Unified gateway endpoints (/api/v1/mls/*) ──────────────────────

    /**
     * POST /api/v1/mls/search
     * Body: {
     *   filters: {...MlsQuery shape...},
     *   dataset_slugs?: string[],   // empty = fan-out across every connected MLS
     *   apply_constraints?: bool,
     * }
     *
     * Returns AggregatedSearchResult — listings tagged with mls_slug, plus per-
     * MLS totals and per-MLS errors so one bad MLS doesn't blank the response.
     */
    public function aggregatedSearch(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        $validated = $request->validate([
            'filters' => 'sometimes|array',
            'dataset_slugs' => 'sometimes|array',
            'dataset_slugs.*' => 'string|max:64',
            'apply_constraints' => 'sometimes|boolean',
        ]);

        $query = MlsQuery::fromArray($validated['filters'] ?? []);
        $result = $this->gateway->search(
            $user,
            $query,
            $validated['dataset_slugs'] ?? [],
        );

        return response()->json($result->toArray());
    }

    /**
     * GET /api/v1/mls/datasets
     * Returns the datasets visible to the calling user — i.e. those they have
     * an active IdxConnection for AND we have a registered MlsDataset class for.
     */
    public function listDatasets(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        return response()->json([
            'datasets' => $this->gateway->listAvailableDatasets($user),
        ]);
    }

    /**
     * GET /api/v1/mls/{slug}/taxonomy
     * Returns the dataset's property types, subtypes, statuses, custom fields.
     * What the frontend taxonomy pickers consume in place of hardcoded constants.
     */
    public function taxonomy(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        if (!$this->datasets->find($slug)) {
            abort(404, "No dataset registered for slug [$slug].");
        }

        $taxonomy = $this->gateway->taxonomy($user, [$slug]);
        return response()->json($taxonomy->toArray());
    }

    /**
     * GET /api/v1/mls/taxonomy?slugs=miamire,bright
     * Merged union of taxonomies across multiple datasets — for filter UIs
     * that span every MLS the user has connected.
     */
    public function mergedTaxonomy(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        $slugs = array_filter(array_map('trim', explode(',', (string) $request->query('slugs', ''))));
        if (empty($slugs)) {
            // Default to every dataset the user has — same default as aggregated search.
            $slugs = array_map(static fn ($d) => $d['slug'], $this->gateway->listAvailableDatasets($user));
        }

        $taxonomy = $this->gateway->taxonomy($user, $slugs);
        return response()->json($taxonomy->toArray());
    }

    /**
     * GET /api/v1/mls/{slug}/lifestyles
     * Returns the lifestyle vocabulary this MLS can answer (`beachfront`,
     * `55-plus`, `luxury`, …). Powers the website templates' lifestyle
     * collection pages and the search-UI lifestyle picker.
     */
    public function lifestyles(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }
        $dataset = $this->datasets->find($slug);
        if (!$dataset) {
            abort(404, "No dataset registered for slug [$slug].");
        }
        return response()->json([
            'slug' => $dataset->getSlug(),
            'lifestyles' => $dataset->getSupportedLifestyles(),
        ]);
    }

    /**
     * GET /api/v1/mls/{slug}/listings/{listingId}
     * Single listing lookup by dataset slug + MLS id. Uses the gateway's
     * scoped resolution so authorization works the same as fan-out search.
     */
    public function aggregatedListing(Request $request, string $slug, string $listingId): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        $listing = $this->gateway->get($user, $slug, $listingId);
        if (!$listing) {
            abort(404);
        }

        return response()->json([
            'listing' => $listing->toArray(),
            'fetched_at' => now()->toIso8601String(),
        ]);
    }

    // ─── Legacy connection-scoped endpoints (/api/mls/*) ─────────────────

    /**
     * POST /api/mls/{connection}/search
     * Legacy single-connection search. Prefer POST /api/v1/mls/search.
     */
    public function search(Request $request, IdxConnection $connection): JsonResponse
    {
        $this->authorizeAccess($request, $connection);

        $validated = $request->validate([
            'filters' => 'sometimes|array',
            'apply_constraints' => 'sometimes|boolean',
        ]);

        return response()->json($this->mls->search(
            $connection,
            $validated['filters'] ?? [],
            $validated['apply_constraints'] ?? true,
        ));
    }

    /**
     * GET /api/mls/{connection}/listing/{listingId}
     * Legacy single-connection listing fetch. Prefer GET /api/v1/mls/{slug}/listings/{id}.
     */
    public function listing(Request $request, IdxConnection $connection, string $listingId): JsonResponse
    {
        $this->authorizeAccess($request, $connection);

        return response()->json($this->mls->getListing($connection, $listingId));
    }

    /**
     * GET /api/mls/compliance/{mlsProvider}
     * Public — embedded widgets and public website footers need it.
     */
    public function compliance(MlsProvider $mlsProvider): JsonResponse
    {
        abort_unless($mlsProvider->visibility === MlsProvider::VISIBILITY_VISIBLE, 404);
        return response()->json($this->mls->compliance($mlsProvider));
    }

    private function authorizeAccess(Request $request, IdxConnection $connection): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }
        $allowed = $connection->user_id === $user->id
            || ($connection->team_id && $connection->team_id === $user->team_id);
        abort_unless($allowed, 403);
    }
}
