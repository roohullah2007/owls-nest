<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\IdxConnection;
use App\Models\Listing;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Tag;
use App\Models\User;
use App\Notifications\DealCreatedNotification;
use App\Services\Ai\AiClient;
use App\Services\PipelineService;
use App\Services\TimelineService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DealController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $leadTypes = $user->getLeadTypes();

        // All of the user's pipelines — the right-hand switcher lists them all
        // (Buyer, Seller, …), so the active pipeline must resolve across every
        // lead type rather than being pre-filtered to one.
        $pipelines = Pipeline::forUser($user)
            ->with('stages')
            ->orderBy('position')
            ->get();

        $activePipelineId = $request->pipeline_id
            ?? $pipelines->first()?->id
            ?? $user->getDefaultPipeline($leadTypes[0] ?? null)?->id;

        $activePipeline = $pipelines->firstWhere('id', $activePipelineId)
            ?? $pipelines->first();

        // Derive the active lead type from the selected pipeline (used by the
        // empty-state "Create Pipeline" CTA when the user has no pipelines yet).
        $activeLeadType = $activePipeline?->lead_type ?? $request->lead_type ?? $leadTypes[0] ?? null;

        $status = $request->status ?? 'open';

        $dealsQuery = Deal::forUser($user)
            ->with(['contacts:id,uuid,first_name,last_name', 'company:id,name', 'pipelineStage:id,name,type,color', 'user:id,name'])
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($activePipeline && $status !== 'all', fn ($q) => $q->where('pipeline_id', $activePipeline->id))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->value_min, fn ($q, $v) => $q->where('value', '>=', $v))
            ->when($request->value_max, fn ($q, $v) => $q->where('value', '<=', $v))
            ->when($request->closing_after, fn ($q, $d) => $q->where('expected_close_date', '>=', $d))
            ->when($request->closing_before, fn ($q, $d) => $q->where('expected_close_date', '<=', $d))
            ->when($request->pipeline_stage, fn ($q, $s) => $q->whereHas('pipelineStage', fn ($sq) => $sq->where('name', 'like', "%{$s}%")));

        match ($status) {
            'won' => $dealsQuery->whereNotNull('won_at'),
            'lost' => $dealsQuery->whereNotNull('lost_at'),
            'all' => null,
            default => $dealsQuery->whereNull('won_at')->whereNull('lost_at'),
        };

        $sortField = $request->sort;
        $sortDir = $request->direction ?? 'desc';
        $allowedSorts = ['title', 'value', 'expected_close_date', 'created_at', 'won_at', 'lost_at'];
        if ($sortField && in_array($sortField, $allowedSorts)) {
            $deals = $dealsQuery->orderBy($sortField, $sortDir)->paginate(25)->withQueryString();
        } else {
            $deals = $dealsQuery->latest()->paginate(25)->withQueryString();
        }

        $pipelineDeals = Deal::forUser($user)
            ->with(['contacts:id,uuid,first_name,last_name', 'pipelineStage:id,name,type,color,position', 'user:id,name'])
            ->when($activePipeline, fn ($q) => $q->where('pipeline_id', $activePipeline->id))
            ->whereHas('pipelineStage', fn ($q) => $q->where('type', 'open'))
            ->orderBy('position')
            ->get()
            ->groupBy('pipeline_stage_id');

        $teamMembers = [];
        if ($user->team_id) {
            $teamMembers = User::where('team_id', $user->team_id)
                ->select('id', 'name', 'email')
                ->get()
                ->toArray();
        }

        return Inertia::render('Crm/Deals/Index', [
            'deals' => $deals,
            'pipelineDeals' => $pipelineDeals,
            'pipelines' => $pipelines,
            'activePipeline' => $activePipeline,
            'leadTypes' => $leadTypes,
            'activeLeadType' => $activeLeadType,
            'filters' => $request->only(['search', 'pipeline_id', 'lead_type', 'status', 'type', 'sort', 'direction', 'value_min', 'value_max', 'closing_before', 'closing_after', 'pipeline_stage']),
            'contacts' => Contact::forUser($user)->select('id', 'uuid', 'first_name', 'last_name')->get(),
            'tags' => Tag::forUser($user)->get(),
            'aiEnabled' => app(AiClient::class)->isConfigured(),
            'teamMembers' => $teamMembers,
            'dealTypes' => $user->getDealTypes(),
            'userListings' => Listing::forUser($user)
                ->where('is_private', false)
                ->select('id', 'title', 'address', 'city', 'state_province', 'price', 'mls_number', 'photos')
                ->latest()
                ->limit(200)
                ->get(),
            'idxConnections' => IdxConnection::forUser($user)->connected()->get(['id', 'display_name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'contacts' => 'nullable|array',
            'contacts.*' => 'exists:contacts,id',
            'company_id' => 'nullable|exists:companies,id',
            'pipeline_id' => 'required|exists:pipelines,id',
            'pipeline_stage_id' => 'required|exists:pipeline_stages,id',
            'value' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'type' => ['required', 'string', 'max:50', Rule::in($user->getDealTypes())],
            'property_address' => 'nullable|string|max:255',
            'mls_number' => 'nullable|string|max:255',
            'expected_close_date' => 'nullable|date',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'commission_amount' => 'nullable|numeric|min:0',
            'arv' => 'nullable|numeric|min:0',
            'repair_cost' => 'nullable|numeric|min:0',
            'assignment_fee' => 'nullable|numeric|min:0',
            'inspection_date' => 'nullable|date',
            'walkthrough_date' => 'nullable|date',
            'possession_date' => 'nullable|date',
            'earnest_money_due_date' => 'nullable|date',
            'due_diligence_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'custom_fields' => 'nullable|array',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
        ]);

        $contacts = $validated['contacts'] ?? [];
        $tags = $validated['tags'] ?? [];
        unset($validated['contacts'], $validated['tags']);

        $validated['last_activity_at'] = now();

        $deal = $request->user()->deals()->create($validated);

        if (! empty($contacts)) {
            $deal->contacts()->sync($contacts);
        }

        if (! empty($tags)) {
            $deal->tags()->sync($tags);
        }

        // Notify team members
        $user = $request->user();
        if ($user->team_id) {
            $teamMembers = User::where('team_id', $user->team_id)
                ->where('id', '!=', $user->id)
                ->get();
            foreach ($teamMembers as $member) {
                $member->notify(new DealCreatedNotification($deal, $user));
            }
        }

        return redirect()->route('crm.deals.show', $deal)
            ->with('success', 'Deal created.');
    }

    public function show(Request $request, Deal $deal): Response
    {
        $this->authorize($request, $deal);
        $user = $request->user();

        $deal->load([
            'contacts:id,uuid,first_name,last_name,email,phone',
            'company:id,name',
            'pipeline.stages',
            'pipelineStage',
            'tags:id,name,color',
            'assignedUsers:id,name,email',
            'notes' => fn ($q) => $q->with('user:id,name')->latest(),
            'timelineEvents' => fn ($q) => $q->latest()->take(20),
        ]);

        $teamMembers = [];
        if ($user->team_id) {
            $teamMembers = User::where('team_id', $user->team_id)
                ->select('id', 'name', 'email')
                ->get()
                ->toArray();
        }

        return Inertia::render('Crm/Deals/Show', [
            'deal' => $deal,
            'allContacts' => Contact::forUser($user)->select('id', 'uuid', 'first_name', 'last_name', 'email', 'phone')->get(),
            'companies' => Company::forUser($user)->select('id', 'name')->get(),
            'tags' => Tag::forUser($user)->get(),
            'teamMembers' => $teamMembers,
        ]);
    }

    public function edit(Request $request, Deal $deal): Response
    {
        $this->authorize($request, $deal);
        $user = $request->user();

        $deal->load(['tags:id', 'contacts:id']);

        return Inertia::render('Crm/Deals/Edit', [
            'deal' => $deal,
            'contacts' => Contact::forUser($user)->select('id', 'uuid', 'first_name', 'last_name')->get(),
            'companies' => Company::forUser($user)->select('id', 'name')->get(),
            'pipelines' => Pipeline::forUser($user)->with('stages')->orderBy('position')->get(),
            'tags' => Tag::forUser($user)->get(),
            'dealTypes' => $user->getDealTypes(),
        ]);
    }

    public function update(Request $request, Deal $deal): RedirectResponse
    {
        $this->authorize($request, $deal);
        $user = $request->user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'contacts' => 'nullable|array',
            'contacts.*' => 'exists:contacts,id',
            'company_id' => 'nullable|exists:companies,id',
            'pipeline_id' => 'required|exists:pipelines,id',
            'pipeline_stage_id' => 'required|exists:pipeline_stages,id',
            'value' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'type' => ['required', 'string', 'max:50', Rule::in($user->getDealTypes())],
            'property_address' => 'nullable|string|max:255',
            'mls_number' => 'nullable|string|max:255',
            'expected_close_date' => 'nullable|date',
            'actual_close_date' => 'nullable|date',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'commission_amount' => 'nullable|numeric|min:0',
            'arv' => 'nullable|numeric|min:0',
            'repair_cost' => 'nullable|numeric|min:0',
            'assignment_fee' => 'nullable|numeric|min:0',
            'inspection_date' => 'nullable|date',
            'walkthrough_date' => 'nullable|date',
            'possession_date' => 'nullable|date',
            'earnest_money_due_date' => 'nullable|date',
            'due_diligence_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'custom_fields' => 'nullable|array',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
            'assigned_user_ids' => 'nullable|array',
            'assigned_user_ids.*' => 'exists:users,id',
        ]);

        $contacts = $validated['contacts'] ?? [];
        $tags = $validated['tags'] ?? [];
        $assignedUserIds = $validated['assigned_user_ids'] ?? null;
        unset($validated['contacts'], $validated['tags'], $validated['assigned_user_ids']);

        $oldStageId = $deal->pipeline_stage_id;

        $deal->update($validated);
        $deal->contacts()->sync($contacts);
        $deal->tags()->sync($tags);

        // Assigning a deal to other users is a Team-plan feature.
        if ($assignedUserIds !== null && $user->canUseTeamFeatures()) {
            $deal->assignedUsers()->sync($assignedUserIds);
        }

        // Stage change detection
        if ((int) $oldStageId !== (int) $deal->pipeline_stage_id) {
            $oldStage = PipelineStage::find($oldStageId);
            $newStage = $deal->pipelineStage;

            TimelineService::log(
                user: $request->user(),
                eventType: 'deal_stage_changed',
                subject: "Stage changed from {$oldStage?->name} to {$newStage?->name}",
                deal: $deal,
                contact: $deal->contacts->first(),
                metadata: [
                    'old_stage_id' => $oldStageId,
                    'old_stage_name' => $oldStage?->name,
                    'new_stage_id' => $deal->pipeline_stage_id,
                    'new_stage_name' => $newStage?->name,
                ],
            );

            $deal->touchActivity();
        }

        return redirect()->route('crm.deals.show', $deal)
            ->with('success', 'Deal updated.');
    }

    public function updateStage(Request $request, Deal $deal): RedirectResponse
    {
        $this->authorize($request, $deal);

        $validated = $request->validate([
            'pipeline_stage_id' => 'required|exists:pipeline_stages,id',
            'lost_reason' => 'nullable|string|max:255',
            'position' => 'nullable|integer|min:0',
        ]);

        $newStage = PipelineStage::findOrFail($validated['pipeline_stage_id']);

        PipelineService::moveDealToStage($deal, $newStage, $validated['lost_reason'] ?? null);

        if (isset($validated['position'])) {
            $deal->update(['position' => $validated['position']]);
        }

        return back()->with('success', 'Deal stage updated.');
    }

    public function destroy(Request $request, Deal $deal): RedirectResponse
    {
        $this->authorize($request, $deal);

        $deal->delete();

        return redirect()->route('crm.deals.index')
            ->with('success', 'Deal deleted.');
    }

    public function storeDealType(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|max:50|regex:/^[a-z0-9_]+$/',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $custom = $settings['deal_types'] ?? [];

        if (in_array($validated['type'], array_merge(User::DEFAULT_DEAL_TYPES, $custom), true)) {
            return back()->withErrors(['type' => 'This deal type already exists.']);
        }

        $custom[] = $validated['type'];
        $settings['deal_types'] = $custom;
        $user->update(['settings' => $settings]);

        return back()->with('success', 'Deal type added.');
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
        $customFields = $settings['custom_fields_deals'] ?? [];

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

        $settings['custom_fields_deals'] = $customFields;
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
        $customFields = $settings['custom_fields_deals'] ?? [];

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

        $settings['custom_fields_deals'] = $customFields;
        $user->update(['settings' => $settings]);

        return back()->with('success', 'Custom field updated.');
    }

    public function destroyCustomField(Request $request, string $key): RedirectResponse
    {
        $user = $request->user();
        $settings = $user->settings ?? [];
        $customFields = $settings['custom_fields_deals'] ?? [];

        $settings['custom_fields_deals'] = array_values(array_filter(
            $customFields,
            fn ($f) => ($f['key'] ?? null) !== $key,
        ));

        $user->update(['settings' => $settings]);

        return back()->with('success', 'Custom field deleted.');
    }

    private function authorize(Request $request, Deal $deal): void
    {
        $user = $request->user();
        abort_unless($deal->user_id === $user->id || ($user->team_id && $deal->team_id === $user->team_id), 403);
    }
}
