<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Hotsheet;
use App\Models\IdxConnection;
use App\Models\Listing;
use App\Models\SavedListingView;
use App\Models\Tag;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsGateway;
use App\Services\TimelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ListingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $sortable = ['title', 'listing_type', 'status', 'price', 'city', 'mls_number', 'listed_at', 'created_at'];
        $sort = in_array($request->sort, $sortable) ? $request->sort : 'created_at';
        $direction = $request->direction === 'asc' ? 'asc' : 'desc';

        $tab = in_array($request->tab, ['mine', 'office', 'all']) ? $request->tab : 'mine';

        $team = $user->team_id ? Team::find($user->team_id) : null;
        $teamMember = $team ? TeamMember::where('team_id', $team->id)->where('user_id', $user->id)->first() : null;
        $userRole = $teamMember?->role ?? ($team && $team->owner_id === $user->id ? 'owner' : null);
        $isTeamAdmin = in_array($userRole, ['owner', 'admin'], true);
        $teamOfficeId = $team?->settings['mls_office_id'] ?? null;

        // Unified office config — covers both team accounts (team setting, admin-only edit)
        // and single-user accounts (user.idx_office_id, always editable by the user).
        $officeConfig = $team
            ? ['office_id' => $teamOfficeId, 'can_edit' => $isTeamAdmin, 'scope' => 'team']
            : ['office_id' => $user->idx_office_id, 'can_edit' => true, 'scope' => 'personal'];

        $query = Listing::query()
            ->where('is_private', false)
            ->with(['contact:id,uuid,first_name,last_name', 'deal:id,title', 'tags:id,name,color', 'user:id,name']);

        if ($tab === 'mine') {
            $query->where('user_id', $user->id);
        } elseif ($tab === 'office') {
            // Other team members' manually-added listings only — the current
            // user's own uploads live under My Listings, and MLS office feed
            // renders in the separate MLS section below.
            if ($team) {
                $query->where('team_id', $team->id)
                    ->where('user_id', '!=', $user->id);
            } else {
                $query->whereRaw('0 = 1');
            }
        } else {
            // 'all' — everything visible to the user via standard team-or-user scope.
            $query->forUser($user);
        }

        $listings = $query
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                    ->orWhere('address', 'like', "%{$s}%")
                    ->orWhere('mls_number', 'like', "%{$s}%")
                    ->orWhere('city', 'like', "%{$s}%");
            }))
            ->when($request->listing_type, fn ($q, $t) => $q->where('listing_type', $t))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->orderBy($sort, $direction)
            ->paginate(25)
            ->withQueryString();

        $idxConnections = IdxConnection::forUser($user)->connected()->get();

        $hotsheets = Hotsheet::visibleTo($user)
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        return Inertia::render('Crm/Listings/Index', [
            'listings' => $listings,
            'filters' => $request->only(['search', 'listing_type', 'status', 'sort', 'direction']),
            'tab' => $tab,
            'listingTypes' => $user->getListingTypes(),
            'listingStatuses' => $user->getListingStatuses(),
            'customFields' => $user->getListingCustomFields(),
            'idxConnections' => $idxConnections,
            'savedViews' => SavedListingView::forUser($user)->orderBy('position')->get(),
            'hotsheets' => $hotsheets,
            'team' => $team ? [
                'id' => $team->id,
                'name' => $team->name,
                'mls_office_id' => $teamOfficeId,
            ] : null,
            'isTeamAdmin' => $isTeamAdmin,
            'officeConfig' => $officeConfig,
            'activeHotsheetId' => $request->integer('hotsheet') ?: null,
            // For the New Listing modal
            'newListingOptions' => [
                'contacts' => Contact::forUser($user)->orderBy('first_name')->select('id', 'first_name', 'last_name')->get(),
                'deals' => Deal::forUser($user)->orderBy('title')->select('id', 'title')->get(),
                'tags' => Tag::forUser($user)->orderBy('name')->select('id', 'name', 'color')->get(),
                // Same source as the website editor's embedded modal — config (not
                // env()) so the key survives config:cache in production.
                'googleMapsApiKey' => config('services.google.maps_key'),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Crm/Listings/Create', [
            'contacts' => Contact::forUser($user)->select('id', 'uuid', 'first_name', 'last_name')->get(),
            'deals' => Deal::forUser($user)->select('id', 'title')->get(),
            'tags' => Tag::forUser($user)->get(),
            'listingTypes' => $user->getListingTypes(),
            'listingStatuses' => $user->getListingStatuses(),
            'customFields' => $user->getListingCustomFields(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validate($this->listingValidationRules($user));
        $validated = $this->normalizeBathrooms($validated);
        $validated = $this->normalizeFeatures($validated);

        $tags = $validated['tags'] ?? [];
        unset($validated['tags']);

        $listing = $user->listings()->create($validated);

        if (! empty($tags)) {
            $listing->tags()->sync($tags);
        }

        TimelineService::log(
            user: $user,
            eventType: 'listing_created',
            subject: "Listing created: {$listing->title}",
            listing: $listing,
            contact: $listing->contact,
        );

        // Embedded callers (e.g. the website editor's Featured/Sold manager)
        // stay on their page instead of jumping to the listing detail.
        if ($request->boolean('stay')) {
            return back()->with('success', 'Listing created.');
        }

        return redirect()->route('crm.listings.show', $listing)
            ->with('success', 'Listing created.');
    }

    public function show(Request $request, Listing $listing): Response
    {
        $this->authorize($request, $listing);

        $listing->load([
            'contact:id,uuid,first_name,last_name,email,phone',
            'deal:id,title',
            'tags:id,name,color',
            'notes' => fn ($q) => $q->with('user:id,name')->latest(),
            'tasks' => fn ($q) => $q->latest(),
            'timelineEvents' => fn ($q) => $q->latest()->take(30),
        ]);

        return Inertia::render('Crm/Listings/Show', [
            'listing' => $listing,
        ]);
    }

    public function edit(Request $request, Listing $listing): Response
    {
        $this->authorize($request, $listing);
        $user = $request->user();

        $listing->load('tags:id');

        return Inertia::render('Crm/Listings/Edit', [
            'listing' => $listing,
            'contacts' => Contact::forUser($user)->select('id', 'uuid', 'first_name', 'last_name')->get(),
            'deals' => Deal::forUser($user)->select('id', 'title')->get(),
            'tags' => Tag::forUser($user)->get(),
            'listingTypes' => $user->getListingTypes(),
            'listingStatuses' => $user->getListingStatuses(),
            'customFields' => $user->getListingCustomFields(),
        ]);
    }

    public function update(Request $request, Listing $listing): RedirectResponse
    {
        $this->authorize($request, $listing);
        $user = $request->user();

        $rules = $this->listingValidationRules($user) + [
            'sold_at' => 'nullable|date',
            'expired_at' => 'nullable|date',
        ];
        $validated = $request->validate($rules);
        $validated = $this->normalizeBathrooms($validated);
        $validated = $this->normalizeFeatures($validated);

        $tags = $validated['tags'] ?? [];
        unset($validated['tags']);

        $oldStatus = $listing->status;
        $listing->update($validated);
        $listing->tags()->sync($tags);

        if ($oldStatus !== $listing->status) {
            TimelineService::log(
                user: $user,
                eventType: 'listing_status_changed',
                subject: "Listing status changed to {$listing->status}",
                listing: $listing,
                contact: $listing->contact,
                metadata: ['old_status' => $oldStatus, 'new_status' => $listing->status],
            );
        }

        return redirect()->route('crm.listings.show', $listing)
            ->with('success', 'Listing updated.');
    }

    public function destroy(Request $request, Listing $listing): RedirectResponse
    {
        $this->authorize($request, $listing);

        $listing->delete();

        return redirect()->route('crm.listings.index')
            ->with('success', 'Listing deleted.');
    }

    public function storeListingType(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|max:50|regex:/^[a-z0-9_]+$/',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $custom = $settings['listing_types'] ?? [];

        if (in_array($validated['type'], array_merge($user::DEFAULT_LISTING_TYPES, $custom))) {
            if ($request->wantsJson()) {
                return response()->json(['error' => 'This listing type already exists.'], 422);
            }

            return back()->withErrors(['type' => 'This listing type already exists.']);
        }

        $custom[] = $validated['type'];
        $settings['listing_types'] = $custom;
        $user->update(['settings' => $settings]);

        if ($request->wantsJson()) {
            return response()->json(['type' => $validated['type'], 'types' => $user->getListingTypes()]);
        }

        return back()->with('success', 'Listing type added.');
    }

    public function storeListingStatus(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|max:50|regex:/^[a-z0-9_]+$/',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $custom = $settings['listing_statuses'] ?? [];

        if (in_array($validated['status'], array_merge($user::DEFAULT_LISTING_STATUSES, $custom))) {
            if ($request->wantsJson()) {
                return response()->json(['error' => 'This listing status already exists.'], 422);
            }

            return back()->withErrors(['status' => 'This listing status already exists.']);
        }

        $custom[] = $validated['status'];
        $settings['listing_statuses'] = $custom;
        $user->update(['settings' => $settings]);

        if ($request->wantsJson()) {
            return response()->json(['status' => $validated['status'], 'statuses' => $user->getListingStatuses()]);
        }

        return back()->with('success', 'Listing status added.');
    }

    public function destroyListingType(Request $request, string $type): RedirectResponse
    {
        if (in_array($type, User::DEFAULT_LISTING_TYPES, true)) {
            return back()->withErrors(['type' => 'Built-in listing types cannot be removed.']);
        }

        $user = $request->user();
        $settings = $user->settings ?? [];
        $custom = $settings['listing_types'] ?? [];
        $settings['listing_types'] = array_values(array_filter($custom, fn ($t) => $t !== $type));
        $user->update(['settings' => $settings]);

        return back()->with('success', 'Listing type removed.');
    }

    public function destroyListingStatus(Request $request, string $status): RedirectResponse
    {
        if (in_array($status, User::DEFAULT_LISTING_STATUSES, true)) {
            return back()->withErrors(['status' => 'Built-in listing statuses cannot be removed.']);
        }

        $user = $request->user();
        $settings = $user->settings ?? [];
        $custom = $settings['listing_statuses'] ?? [];
        $settings['listing_statuses'] = array_values(array_filter($custom, fn ($s) => $s !== $status));
        $user->update(['settings' => $settings]);

        return back()->with('success', 'Listing status removed.');
    }

    public function storeCustomField(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'key' => 'required|string|max:50|regex:/^[a-z0-9_]+$/',
            'label' => 'required|string|max:100',
            'type' => 'required|in:text,number,date,select,email,url,textarea,checkbox',
            'section' => 'nullable|string|max:50',
            'required' => 'nullable|boolean',
            'searchable' => 'nullable|boolean',
            'api' => 'nullable|boolean',
            'quick_create' => 'nullable|boolean',
            'unique' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $customFields = $settings['custom_fields_listings'] ?? [];

        foreach ($customFields as $field) {
            if ($field['key'] === $validated['key']) {
                return back()->withErrors(['key' => 'A custom field with this key already exists.']);
            }
        }

        $customFields[] = [
            'key' => $validated['key'],
            'label' => $validated['label'],
            'type' => $validated['type'],
            'section' => $validated['section'] ?? 'General',
            'required' => (bool) ($validated['required'] ?? false),
            'searchable' => (bool) ($validated['searchable'] ?? false),
            'api' => (bool) ($validated['api'] ?? true),
            'quick_create' => (bool) ($validated['quick_create'] ?? true),
            'unique' => (bool) ($validated['unique'] ?? false),
        ];

        $settings['custom_fields_listings'] = $customFields;
        $user->update(['settings' => $settings]);

        return back()->with('success', 'Custom field added.');
    }

    public function updateCustomField(Request $request, string $key): RedirectResponse
    {
        $validated = $request->validate([
            'label' => 'sometimes|string|max:100',
            'type' => 'sometimes|in:text,number,date,select,email,url,textarea,checkbox',
            'section' => 'sometimes|nullable|string|max:50',
            'required' => 'sometimes|boolean',
            'searchable' => 'sometimes|boolean',
            'api' => 'sometimes|boolean',
            'quick_create' => 'sometimes|boolean',
            'unique' => 'sometimes|boolean',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $customFields = $settings['custom_fields_listings'] ?? [];

        $found = false;
        foreach ($customFields as $i => $field) {
            if ($field['key'] === $key) {
                $customFields[$i] = array_merge($field, $validated);
                $found = true;
                break;
            }
        }

        if (! $found) {
            return back()->withErrors(['key' => 'Custom field not found.']);
        }

        $settings['custom_fields_listings'] = $customFields;
        $user->update(['settings' => $settings]);

        return back()->with('success', 'Custom field updated.');
    }

    public function destroyCustomField(Request $request, string $key): RedirectResponse
    {
        $user = $request->user();
        $settings = $user->settings ?? [];
        $customFields = $settings['custom_fields_listings'] ?? [];

        $settings['custom_fields_listings'] = array_values(array_filter(
            $customFields,
            fn ($f) => ($f['key'] ?? null) !== $key,
        ));

        $user->update(['settings' => $settings]);

        return back()->with('success', 'Custom field deleted.');
    }

    public function searchMls(Request $request, MlsGateway $gateway): JsonResponse
    {
        $validated = $request->validate([
            // Optional: scope to one connection's MLS. Without it the gateway
            // fans out across every active connection (the /properties/all tab).
            'connection_id' => 'nullable|exists:idx_connections,id',
            'query' => 'nullable|string|max:255',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'city' => 'nullable|string|max:100',
            // County + neighborhood come from MlsTaxonomy dataset lists. MlsQuery
            // normalizes the singular keys into the `counties[]` / `neighborhoods[]`
            // arrays Bridge expects.
            'county' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:120',
            'subdivision' => 'nullable|string|max:100',
            'property_type' => 'nullable|string|max:50',
            'property_subtype' => 'nullable|string|max:100',
            'status' => 'nullable|string|max:50',
            'min_beds' => 'nullable|integer|min:0',
            'min_baths' => 'nullable|integer|min:0',
            'min_sqft' => 'nullable|integer|min:0',
            'max_sqft' => 'nullable|integer|min:0',
            'min_lot_acres' => 'nullable|numeric|min:0',
            'max_lot_acres' => 'nullable|numeric|min:0',
            'min_year_built' => 'nullable|integer|min:1800|max:2100',
            'max_year_built' => 'nullable|integer|min:1800|max:2100',
            // Accept comma-separated lists for multi-ID filtering. Bridge driver
            // expands the array into an OData OR-group (`ListAgentMlsId eq '..' or ..`).
            'agent_id' => 'nullable|string|max:2000',
            'office_id' => 'nullable|string|max:2000',
            // Polygon search — GeoJSON-style ring of [lng, lat] pairs.
            // BridgeApiClient translates this to `geo.intersects(Coordinates, ...)`.
            'geo' => 'nullable|array',
            'geo.polygon' => 'nullable|array|min:3|max:200',
            'geo.polygon.*' => 'array|size:2',
            'geo.polygon.*.*' => 'numeric',
            'geo.bounds' => 'nullable|array',
            'geo.bounds.ne_lat' => 'required_with:geo.bounds|numeric',
            'geo.bounds.ne_lng' => 'required_with:geo.bounds|numeric',
            'geo.bounds.sw_lat' => 'required_with:geo.bounds|numeric',
            'geo.bounds.sw_lng' => 'required_with:geo.bounds|numeric',
            'geo.near' => 'nullable|array',
            'geo.near.lat' => 'required_with:geo.near|numeric',
            'geo.near.lng' => 'required_with:geo.near|numeric',
            'geo.near.radius_miles' => 'required_with:geo.near|numeric|min:0.01|max:500',
            'page' => 'nullable|integer|min:1',
            // Map view needs more pins per page than the grid/list does. Cap
            // generously to protect both us and the upstream MLS feed.
            'per_page' => 'nullable|integer|min:1|max:200',
            // `lite` projection asks Bridge for a trimmed SELECT — much smaller
            // payload per listing, ideal for bulk map fetches.
            'projection' => 'nullable|in:detail,lite,count',
            // Price-reduced toggle. BridgeApiClient::appendPrice() expects this
            // shape: { within_days: N } + adds `ListPrice lt OriginalListPrice`.
            'recently_reduced' => 'nullable|array',
            'recently_reduced.within_days' => 'required_with:recently_reduced|integer|min:1|max:365',
            // Has-open-house-within-N-days. Bridge clause is added below.
            'has_open_house_within_days' => 'nullable|integer|min:1|max:365',
            // Cap monthly HOA / maintenance fee.
            'max_hoa_fee' => 'nullable|integer|min:0',
        ]);

        $user = $request->user();

        // All MLS access goes through MlsGateway (the unified /api/v1 path —
        // same engine as the public property-search page). A connection_id
        // narrows the fan-out to that connection's dataset and supplies its
        // agent/office defaults; otherwise every active connection answers.
        $connection = null;
        $datasetSlugs = [];
        if (! empty($validated['connection_id'])) {
            $connection = IdxConnection::forUser($user)
                ->where('id', $validated['connection_id'])
                ->connected()
                ->firstOrFail();
            $datasetSlugs = $connection->mls_slug ? [$connection->mls_slug] : [];
        }

        $agentInput = $validated['agent_id'] ?? $connection?->agent_id;
        $officeInput = $validated['office_id'] ?? $connection?->office_id;
        [$agentSingle, $agentMany] = $this->splitIdFilter($agentInput);
        [$officeSingle, $officeMany] = $this->splitIdFilter($officeInput);

        $filters = array_filter([
            'query' => $validated['query'] ?? null,
            'min_price' => $validated['min_price'] ?? null,
            'max_price' => $validated['max_price'] ?? null,
            'city' => $validated['city'] ?? null,
            'county' => $validated['county'] ?? null,
            'neighborhood' => $validated['neighborhood'] ?? null,
            'subdivision' => $validated['subdivision'] ?? null,
            'property_type' => $validated['property_type'] ?? null,
            'property_subtype' => $validated['property_subtype'] ?? null,
            'status' => $validated['status'] ?? null,
            'min_beds' => $validated['min_beds'] ?? null,
            'min_baths' => $validated['min_baths'] ?? null,
            'min_sqft' => $validated['min_sqft'] ?? null,
            'max_sqft' => $validated['max_sqft'] ?? null,
            'min_lot_acres' => $validated['min_lot_acres'] ?? null,
            'max_lot_acres' => $validated['max_lot_acres'] ?? null,
            'min_year_built' => $validated['min_year_built'] ?? null,
            'max_year_built' => $validated['max_year_built'] ?? null,
            'agent_id' => $agentSingle,
            'agent_ids' => $agentMany,
            'office_id' => $officeSingle,
            'office_ids' => $officeMany,
            'geo' => $validated['geo'] ?? null,
            'recently_reduced' => $validated['recently_reduced'] ?? null,
            'has_open_house_within_days' => $validated['has_open_house_within_days'] ?? null,
            'max_hoa_fee' => $validated['max_hoa_fee'] ?? null,
            'projection' => $validated['projection'] ?? null,
            'page' => $validated['page'] ?? 1,
            'per_page' => $validated['per_page'] ?? 20,
        ], fn ($v) => $v !== null && $v !== '' && $v !== []);

        $result = $gateway->search($user, MlsQuery::fromArray($filters), $datasetSlugs);

        return response()->json($result->toArray());
    }

    public function storeSavedView(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'filters' => 'required|array',
        ]);

        $user = $request->user();
        $maxPosition = SavedListingView::forUser($user)->max('position') ?? 0;

        $user->savedListingViews()->create([
            'name' => $validated['name'],
            'filters' => $validated['filters'],
            'position' => $maxPosition + 1,
        ]);

        return back()->with('success', 'View saved.');
    }

    public function destroySavedView(Request $request, SavedListingView $savedListingView): RedirectResponse
    {
        $user = $request->user();
        abort_unless($savedListingView->user_id === $user->id || ($user->team_id && $savedListingView->team_id === $user->team_id), 403);

        $savedListingView->delete();

        return back()->with('success', 'View deleted.');
    }

    private function authorize(Request $request, Listing $listing): void
    {
        $user = $request->user();
        abort_unless($listing->user_id === $user->id || ($user->team_id && $listing->team_id === $user->team_id), 403);
    }

    private function listingValidationRules($user): array
    {
        return [
            'listing_type' => ['required', 'string', 'max:50', Rule::in($user->getListingTypes())],
            'status' => ['required', 'string', 'max:50', Rule::in($user->getListingStatuses())],
            'title' => 'required|string|max:255',
            'address' => 'nullable|string',
            'unit' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'state_province' => 'nullable|string|max:50',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|size:2',
            'mls_number' => 'nullable|string|max:50',
            'price' => 'nullable|numeric|min:0',
            'bedrooms' => 'nullable|integer|min:0|max:255',
            'bathrooms' => 'nullable|numeric|min:0|max:99',
            'sqft' => 'nullable|integer|min:0',
            'lot_size' => 'nullable|numeric|min:0',
            'year_built' => 'nullable|integer|min:1800|max:2100',
            'description' => 'nullable|string',
            'features' => 'nullable|array',
            'features.property_subtype' => 'nullable|string|max:50',
            'features.listing_category' => 'nullable|string|max:50',
            'features.full_baths' => 'nullable|integer|min:0|max:50',
            'features.half_baths' => 'nullable|integer|min:0|max:50',
            'features.stories' => 'nullable|integer|min:0|max:99',
            'features.parking_spaces' => 'nullable|integer|min:0|max:99',
            'features.garage_spaces' => 'nullable|integer|min:0|max:99',
            'features.hoa_fee' => 'nullable|numeric|min:0',
            'features.virtual_tour_url' => 'nullable|url|max:500',
            'features.lat' => 'nullable|numeric|between:-90,90',
            'features.lng' => 'nullable|numeric|between:-180,180',
            'features.open_houses' => 'nullable|array|max:20',
            'features.open_houses.*.date' => 'required_with:features.open_houses|date',
            'features.open_houses.*.start' => 'nullable|string|max:8',
            'features.open_houses.*.end' => 'nullable|string|max:8',
            'features.open_houses.*.notes' => 'nullable|string|max:255',
            // Community & financials (MLS-aligned)
            'features.subdivision' => 'nullable|string|max:120',
            'features.mls_area' => 'nullable|string|max:120',
            'features.hoa_name' => 'nullable|string|max:120',
            'features.hoa_frequency' => 'nullable|string|max:30',
            'features.tax_annual_amount' => 'nullable|numeric|min:0',
            'features.tax_year' => 'nullable|integer|min:1800|max:2100',
            // Features & amenities — structured chip groups + highlights
            'features.furnished' => 'nullable|string|max:40',
            'features.pool' => 'nullable|boolean',
            'features.waterfront' => 'nullable|boolean',
            'features.new_construction' => 'nullable|boolean',
            'features.view' => 'nullable|array',
            'features.view.*' => 'string|max:60',
            'features.appliances' => 'nullable|array',
            'features.appliances.*' => 'string|max:60',
            'features.heating' => 'nullable|array',
            'features.heating.*' => 'string|max:60',
            'features.cooling' => 'nullable|array',
            'features.cooling.*' => 'string|max:60',
            'features.flooring' => 'nullable|array',
            'features.flooring.*' => 'string|max:60',
            'features.exterior_features' => 'nullable|array',
            'features.exterior_features.*' => 'string|max:60',
            'features.security_features' => 'nullable|array',
            'features.security_features.*' => 'string|max:60',
            'features.custom_features' => 'nullable|array|max:50',
            'features.custom_features.*' => 'string|max:80',
            // Flat, deduped display list derived on the client from the above.
            'features.amenities' => 'nullable|array|max:200',
            'features.amenities.*' => 'string|max:100',
            'contact_id' => 'nullable|exists:contacts,id',
            'deal_id' => 'nullable|exists:deals,id',
            'listed_at' => 'nullable|date',
            'custom_fields' => 'nullable|array',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
            // Agent-website curation: show this listing on the site's Featured
            // Properties / Past Transactions pages.
            'website_section' => 'nullable|string|in:featured,sold',
        ];
    }

    /**
     * Keep the combined bathrooms column in sync with the split
     * features.full_baths / features.half_baths inputs.
     */
    private function normalizeBathrooms(array $validated): array
    {
        $features = $validated['features'] ?? [];
        $full = isset($features['full_baths']) ? (int) $features['full_baths'] : null;
        $half = isset($features['half_baths']) ? (int) $features['half_baths'] : null;
        if ($full !== null || $half !== null) {
            $validated['bathrooms'] = ($full ?? 0) + 0.5 * ($half ?? 0);
        }

        return $validated;
    }

    /**
     * Cast the boolean amenity highlights (sent as "1" over multipart form data)
     * to real booleans so they round-trip cleanly out of the features JSON.
     */
    private function normalizeFeatures(array $validated): array
    {
        if (! isset($validated['features']) || ! is_array($validated['features'])) {
            return $validated;
        }
        foreach (['pool', 'waterfront', 'new_construction'] as $key) {
            if (array_key_exists($key, $validated['features'])) {
                $validated['features'][$key] = filter_var($validated['features'][$key], FILTER_VALIDATE_BOOLEAN);
            }
        }

        return $validated;
    }

    public function updateOfficeId(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'office_id' => 'nullable|string|max:100',
        ]);

        $user = $request->user();
        $value = $validated['office_id'] ? trim($validated['office_id']) : null;

        if ($user->team_id) {
            $team = Team::find($user->team_id);
            $teamMember = TeamMember::where('team_id', $team->id)->where('user_id', $user->id)->first();
            $userRole = $teamMember?->role ?? ($team->owner_id === $user->id ? 'owner' : null);

            if (! in_array($userRole, ['owner', 'admin'], true)) {
                abort(403, 'Only team admins can configure the office MLS ID.');
            }

            $settings = $team->settings ?? [];
            $settings['mls_office_id'] = $value;
            $team->update(['settings' => $settings]);
        } else {
            $user->update(['idx_office_id' => $value]);
        }

        return back()->with('success', 'Office ID updated.');
    }

    public function storeHotsheet(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'scope' => 'required|in:personal,team',
            'filters' => 'required|array',
        ]);

        $user = $request->user();

        if ($validated['scope'] === 'team' && ! $user->team_id) {
            return back()->withErrors(['scope' => 'You must be in a team to create a team hotsheet.']);
        }

        $maxPosition = Hotsheet::visibleTo($user)->max('position') ?? 0;

        Hotsheet::create([
            'user_id' => $user->id,
            'team_id' => $validated['scope'] === 'team' ? $user->team_id : null,
            'name' => $validated['name'],
            'scope' => $validated['scope'],
            'filters' => $validated['filters'],
            'position' => $maxPosition + 1,
        ]);

        return back()->with('success', 'Hotsheet saved.');
    }

    public function updateHotsheet(Request $request, Hotsheet $hotsheet): RedirectResponse
    {
        $this->authorizeHotsheet($request, $hotsheet);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'filters' => 'sometimes|array',
            'position' => 'sometimes|integer|min:0',
        ]);

        $hotsheet->update($validated);

        return back()->with('success', 'Hotsheet updated.');
    }

    public function destroyHotsheet(Request $request, Hotsheet $hotsheet): RedirectResponse
    {
        $this->authorizeHotsheet($request, $hotsheet);

        $hotsheet->delete();

        return back()->with('success', 'Hotsheet deleted.');
    }

    private function authorizeHotsheet(Request $request, Hotsheet $hotsheet): void
    {
        $user = $request->user();
        $owns = $hotsheet->user_id === $user->id;
        $sameTeam = $hotsheet->scope === 'team' && $user->team_id && $hotsheet->team_id === $user->team_id;
        abort_unless($owns || $sameTeam, 403);
    }

    /**
     * Split a comma-separated ID filter into [single, array] for the Bridge
     * filter map. Single-value input goes to `agent_id` / `office_id` for the
     * cheaper `eq` clause; multi-value goes to `agent_ids` / `office_ids` for
     * the OR-group. Returns nulls when input is empty.
     *
     * @return array{0: ?string, 1: ?array<int,string>}
     */
    private function splitIdFilter(?string $raw): array
    {
        if ($raw === null || $raw === '') {
            return [null, null];
        }
        $tokens = array_values(array_filter(array_map('trim', explode(',', $raw)), static fn ($v) => $v !== ''));
        if (count($tokens) === 0) {
            return [null, null];
        }
        if (count($tokens) === 1) {
            return [$tokens[0], null];
        }

        return [null, $tokens];
    }
}
