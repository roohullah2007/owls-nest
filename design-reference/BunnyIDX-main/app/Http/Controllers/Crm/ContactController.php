<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\SavedContactView;
use App\Models\Tag;
use App\Models\User;
use App\Services\Ai\ContactInsightsService;
use App\Services\Ai\LeadScoringService;
use App\Notifications\NewContactNotification;
use App\Services\TimelineService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $savedViews = SavedContactView::forUser($user)->orderBy('position')->get();
        $teamEnabled = $user->isInTeamContext() && $user->team_id !== null;

        // Built-in views — always available, not stored in DB
        $builtInViews = [
            ['key' => 'all', 'label' => 'All'],
            ['key' => 'mine', 'label' => 'Mine'],
            ...($teamEnabled ? [['key' => 'team', 'label' => 'Team']] : []),
            ['key' => 'not_contacted', 'label' => 'Not Contacted'],
            ['key' => 'partial', 'label' => 'Partial Leads'],
        ];
        $builtInKeys = array_column($builtInViews, 'key');

        // Determine active view: explicit ?view= built-in wins, then ?smart_list= saved view, then default saved view, else 'all'
        $activeBuiltIn = null;
        $activeSmartList = null;

        if ($request->filled('view') && in_array($request->view, $builtInKeys, true)) {
            $activeBuiltIn = $request->view;
        } elseif ($request->has('smart_list')) {
            $activeSmartList = $request->smart_list
                ? $savedViews->firstWhere('id', (int) $request->smart_list)
                : null;
            if (! $activeSmartList && ! $request->smart_list) {
                $activeBuiltIn = 'all';
            }
        } elseif (! $request->hasAny(['search', 'type', 'status', 'source', 'tag', 'city'])) {
            $defaultSaved = $savedViews->firstWhere('is_default', true);
            if ($defaultSaved) {
                $activeSmartList = $defaultSaved;
            } else {
                $activeBuiltIn = 'all';
            }
        }

        $smartFilters = $activeSmartList?->filters ?? [];

        $sortable = ['first_name', 'email', 'phone', 'type', 'status', 'source', 'city', 'created_at', 'last_contacted_at', 'lead_score'];
        $sort = in_array($request->sort, $sortable) ? $request->sort : 'created_at';
        $direction = $request->direction === 'asc' ? 'asc' : 'desc';

        $query = Contact::forUser($user)
            ->with(['tags:id,name,color', 'assignedUsers:id,name,email']);

        $contacts = $this->applyContactFilters($query, $request, $smartFilters, $activeBuiltIn, $teamEnabled, $user)
            ->withCount(['emailLogs', 'smsLogs', 'callLogs', 'listings', 'searches'])
            ->withSum('listings as listings_total_value', 'price')
            ->with([
                'listings' => fn ($q) => $q->select(['id', 'contact_id', 'title', 'address', 'city', 'state_province', 'price', 'photos', 'status', 'bedrooms', 'bathrooms', 'sqft'])
                    ->latest()
                    ->limit(8),
                'searches' => fn ($q) => $q->select(['id', 'contact_id', 'name', 'filters'])
                    ->latest()
                    ->limit(8),
            ])
            ->orderBy($sort, $direction)
            ->paginate(25)
            ->withQueryString();

        // Compute lightweight follow-up hints (no extra queries — uses only contact model data)
        $insights = app(ContactInsightsService::class);
        $contacts->getCollection()->transform(function ($contact) use ($insights) {
            $contact->follow_up_hint = $insights->getFollowUpHint($contact);
            return $contact;
        });

        // Team members for AI assistant
        $teamMembers = [];
        if ($user->team_id) {
            $teamMembers = \App\Models\User::where('team_id', $user->team_id)
                ->select('id', 'name', 'email')
                ->get()
                ->toArray();
        }

        return Inertia::render('Crm/Contacts/Index', [
            'contacts' => $contacts,
            'filters' => $request->only(['search', 'type', 'status', 'source', 'sort', 'direction', 'view', 'smart_list', 'lead_score_min', 'lead_score_max', 'last_contacted_before', 'last_contacted_after', 'city', 'tag', 'has_email', 'has_phone']),
            'leadTypes' => $user->getLeadTypes(),
            'contactStatuses' => $user->getContactStatuses(),
            'customFields' => $user->getCustomFields(),
            'tags' => Tag::forUser($user)->get(),
            'savedViews' => $savedViews,
            'activeSmartList' => $activeSmartList,
            'builtInViews' => $builtInViews,
            'activeBuiltInView' => $activeBuiltIn,
            'teamEnabled' => $teamEnabled,
            'aiEnabled' => app(\App\Services\Ai\AiClient::class)->isConfigured(),
            'teamMembers' => $teamMembers,
            'columnPreferences' => $user->settings['contact_columns'] ?? null,
            'actionPlans' => \App\Models\ActionPlan::forUser($user)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Apply the built-in view, search, and URL-param / smart-list filters to the
     * contacts query. Extracted from index() — behaviour is unchanged.
     */
    private function applyContactFilters(Builder $query, Request $request, array $smartFilters, ?string $activeBuiltIn, bool $teamEnabled, User $user): Builder
    {
        return $query
            ->when($activeBuiltIn === 'mine', fn ($q) => $q->where('user_id', $user->id))
            ->when($activeBuiltIn === 'team' && $teamEnabled, fn ($q) => $q->where('user_id', '!=', $user->id))
            ->when($activeBuiltIn === 'not_contacted', fn ($q) => $q->where(function ($q) {
                $q->whereNull('last_contacted_at')->orWhere('last_contacted_at', '<', now()->subDays(30));
            }))
            ->when($activeBuiltIn === 'partial', fn ($q) => $q->where(function ($q) {
                $q->whereNull('first_name')->orWhere('first_name', '')
                  ->orWhereNull('last_name')->orWhere('last_name', '')
                  ->orWhereNull('email')->orWhere('email', '')
                  ->orWhereNull('phone')->orWhere('phone', '')
                  ->orWhereNull('type')->orWhere('type', '');
            }))
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%{$s}%")
                  ->orWhere('last_name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%");
            }))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t), function ($q) use ($smartFilters) {
                if (!empty($smartFilters['type'])) {
                    $q->whereIn('type', $smartFilters['type']);
                }
            })
            // URL param filters (used by AI assistant and direct links)
            ->when($request->status, fn ($q, $s) => $q->where('status', $s), function ($q) use ($smartFilters) {
                if (!empty($smartFilters['status'])) {
                    $q->whereIn('status', $smartFilters['status']);
                }
            })
            ->when($request->source, fn ($q, $s) => $q->where('source', $s), function ($q) use ($smartFilters) {
                if (!empty($smartFilters['source'])) {
                    $q->whereIn('source', $smartFilters['source']);
                }
            })
            ->when(!empty($smartFilters['tags']), function ($q) use ($smartFilters) {
                $tagIds = $smartFilters['tags'];
                $match = $smartFilters['tag_match'] ?? 'any';
                if ($match === 'all') {
                    foreach ($tagIds as $tagId) {
                        $q->whereHas('tags', fn ($tq) => $tq->where('tags.id', $tagId));
                    }
                } else {
                    $q->whereHas('tags', fn ($tq) => $tq->whereIn('tags.id', $tagIds));
                }
            })
            ->when($request->tag, function ($q, $tagName) {
                $q->whereHas('tags', fn ($tq) => $tq->where('name', 'like', $tagName));
            })
            ->when($request->city ?? (!empty($smartFilters['city']) ? $smartFilters['city'] : null), fn ($q, $c) => $q->where('city', 'like', "%{$c}%"))
            ->when(!empty($smartFilters['state_province']), fn ($q) => $q->where('state_province', $smartFilters['state_province']))
            ->when($request->lead_score_min ?? ($smartFilters['lead_score_min'] ?? null), fn ($q, $v) => $q->where('lead_score', '>=', (int) $v))
            ->when($request->lead_score_max ?? ($smartFilters['lead_score_max'] ?? null), fn ($q, $v) => $q->where('lead_score', '<=', (int) $v))
            ->when(!empty($smartFilters['created_after']), fn ($q) => $q->where('created_at', '>=', $smartFilters['created_after']))
            ->when(!empty($smartFilters['created_before']), fn ($q) => $q->where('created_at', '<=', $smartFilters['created_before']))
            ->when($request->last_contacted_after ?? ($smartFilters['last_contacted_after'] ?? null), fn ($q, $v) => $q->where('last_contacted_at', '>=', $v))
            ->when($request->last_contacted_before ?? ($smartFilters['last_contacted_before'] ?? null), fn ($q, $v) => $q->where('last_contacted_at', '<=', $v))
            ->when($request->has_email !== null ? $request->has_email : ($smartFilters['has_email'] ?? null), function ($q) use ($request, $smartFilters) {
                $val = $request->has_email !== null ? filter_var($request->has_email, FILTER_VALIDATE_BOOLEAN) : $smartFilters['has_email'];
                $val ? $q->whereNotNull('email')->where('email', '!=', '') : $q->where(fn ($q) => $q->whereNull('email')->orWhere('email', ''));
            })
            ->when($request->has_phone !== null ? $request->has_phone : ($smartFilters['has_phone'] ?? null), function ($q) use ($request, $smartFilters) {
                $val = $request->has_phone !== null ? filter_var($request->has_phone, FILTER_VALIDATE_BOOLEAN) : $smartFilters['has_phone'];
                $val ? $q->whereNotNull('phone')->where('phone', '!=', '') : $q->where(fn ($q) => $q->whereNull('phone')->orWhere('phone', ''));
            });
    }

    public function create(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Crm/Contacts/Create', [
            'companies' => Company::forUser($user)->select('id', 'name')->get(),
            'tags' => Tag::forUser($user)->get(),
            'leadTypes' => $user->getLeadTypes(),
            'contactStatuses' => $user->getContactStatuses(),
            'customFields' => $user->getCustomFields(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate(array_merge([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:20',
            'type' => ['required', 'string', 'max:50', Rule::in($user->getLeadTypes())],
            'status' => ['nullable', 'string', 'max:50'],
            'source' => 'required|in:website,referral,open_house,social_media,cold_call,idx,manual,other',
            'company_id' => 'nullable|exists:companies,id',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state_province' => 'nullable|string|max:50',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|size:2',
            'description' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
        ], $this->customFieldRules($user, enforceRequired: true)));

        $validated['custom_fields'] = $this->normalizeCustomFields($user, $validated['custom_fields'] ?? []);

        $tags = $validated['tags'] ?? [];
        unset($validated['tags']);

        $contact = $user->contacts()->create($validated);

        if (!empty($tags)) {
            $contact->tags()->sync($tags);
        }

        TimelineService::log(
            user: $user,
            eventType: 'contact_created',
            subject: "{$contact->first_name} {$contact->last_name} added",
            contact: $contact,
        );

        // Notify team members
        if ($user->team_id) {
            $teamMembers = \App\Models\User::where('team_id', $user->team_id)
                ->where('id', '!=', $user->id)
                ->get();
            foreach ($teamMembers as $member) {
                $member->notify(new NewContactNotification($contact, $user));
            }
        }

        return redirect()->route('crm.contacts.show', $contact)
            ->with('success', 'Contact created.');
    }

    public function show(Request $request, Contact $contact, ?string $tab = null): Response
    {
        $this->authorize($request, $contact);

        $initialTab = in_array($tab, ['properties', 'deals', 'searches', 'offers', 'inquiries', 'action-plans', 'files', 'tasks-appts'], true) ? $tab : 'summary';

        $contact->load([
            'tags:id,name,color',
            'deals' => fn ($q) => $q->with('pipelineStage:id,name,type,color')->latest(),
            'notes' => fn ($q) => $q->with('user:id,name')->latest(),
            'tasks' => fn ($q) => $q->latest(),
            'callLogs' => fn ($q) => $q->latest()->take(20),
            'emailLogs' => fn ($q) => $q->latest()->take(20),
            'smsLogs' => fn ($q) => $q->latest()->take(20),
            'meetings' => fn ($q) => $q->orderBy('starts_at', 'desc')->take(20),
            'timelineEvents' => fn ($q) => $q->with('user:id,name')->orderByDesc('is_pinned')->latest()->take(30),
            'assignedUsers:id,name,email',
            'relatives:id,uuid,first_name,last_name,email,phone',
            'listings' => fn ($q) => $q->latest(),
            'files' => fn ($q) => $q->with('user:id,name')->latest(),
            'searches' => fn ($q) => $q->with('user:id,name')->latest(),
            'offers' => fn ($q) => $q->with('listing:id,address,city,state_province,postal_code')->latest(),
            'inquiries' => fn ($q) => $q->with('listing:id,address,city,state_province,postal_code')->latest(),
            'actionPlanEnrollments' => fn ($q) => $q->with(['actionPlan:id,name', 'currentStep:id,step_type,position'])->latest(),
        ]);

        // The timeline only stores a truncated note snapshot; attach the full note
        // body to note_created events so they can be edited inline without losing text.
        $noteIds = $contact->timelineEvents
            ->where('event_type', 'note_created')
            ->where('loggable_type', \App\Models\Note::class)
            ->pluck('loggable_id')
            ->filter()
            ->all();
        if (! empty($noteIds)) {
            $noteBodies = \App\Models\Note::whereIn('id', $noteIds)->pluck('body', 'id');
            $contact->timelineEvents->each(function ($event) use ($noteBodies) {
                if ($event->event_type === 'note_created' && isset($noteBodies[$event->loggable_id])) {
                    $event->full_body = $noteBodies[$event->loggable_id];
                }
            });
        }

        // Auto-calculate lead score if null
        if ($contact->lead_score === null) {
            $scoring = app(LeadScoringService::class);
            $scoring->calculateAndSave($contact);
            $contact->refresh();
        }

        $user = $request->user();

        $teamMembers = [];
        if ($user->team_id) {
            $teamMembers = \App\Models\User::where('team_id', $user->team_id)
                ->select('id', 'name', 'email')
                ->get()
                ->toArray();
        }

        // Pager: order by created_at desc, id desc (matches Index default).
        // A contact appears "after" the current one when it has a newer created_at,
        // or same created_at and a higher id.
        $newerThan = function ($q) use ($contact) {
            $q->where('created_at', '>', $contact->created_at)
              ->orWhere(function ($q) use ($contact) {
                  $q->where('created_at', $contact->created_at)
                    ->where('id', '>', $contact->id);
              });
        };
        $olderThan = function ($q) use ($contact) {
            $q->where('created_at', '<', $contact->created_at)
              ->orWhere(function ($q) use ($contact) {
                  $q->where('created_at', $contact->created_at)
                    ->where('id', '<', $contact->id);
              });
        };

        $total = Contact::forUser($user)->count();
        // Position counts older contacts first — so the very first contact ever
        // added is "1 of N", matching how users intuitively number their leads.
        $olderCount = Contact::forUser($user)->where($olderThan)->count();
        $position = $olderCount + 1;

        // "Previous" (lower position number) is one position earlier — i.e. older.
        $prevContact = Contact::forUser($user)
            ->where($olderThan)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->select('uuid', 'first_name', 'last_name')
            ->first();

        // "Next" (higher position number) is one position later — i.e. newer.
        $nextContact = Contact::forUser($user)
            ->where($newerThan)
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->select('uuid', 'first_name', 'last_name')
            ->first();

        return Inertia::render('Crm/Contacts/Show', [
            'contact' => $contact,
            'contactStatuses' => $user->getContactStatuses(),
            'leadTypes' => $user->getLeadTypes(),
            'customFields' => $user->getCustomFields(),
            'allContacts' => Contact::forUser($user)->select('id', 'uuid', 'first_name', 'last_name')->get(),
            'allDeals' => Deal::forUser($user)->select('id', 'title')->get(),
            'aiEnabled' => app(\App\Services\Ai\AiClient::class)->isConfigured(),
            'teamMembers' => $teamMembers,
            'allTags' => Tag::forUser($user)->get(),
            'relationshipTypes' => \App\Models\ContactRelationship::TYPES,
            'idxConnections' => \App\Models\IdxConnection::forUser($user)->connected()->get(['id', 'provider', 'mls_slug', 'display_name', 'agent_id', 'office_id']),
            'pipelines' => \App\Models\Pipeline::forUser($user)
                ->with(['stages' => fn ($q) => $q->orderBy('position')])
                ->orderBy('position')
                ->get(['id', 'name', 'is_default', 'lead_type']),
            'dealTypes' => $user->getDealTypes(),
            'userListings' => \App\Models\Listing::forUser($user)
                ->where('is_private', false)
                ->select('id', 'title', 'address', 'city', 'state_province', 'price', 'photos', 'contact_id', 'bedrooms', 'bathrooms', 'sqft')
                ->latest()
                ->limit(200)
                ->get(),
            'pager' => [
                'position' => $position,
                'total' => $total,
                'prev' => $prevContact,
                'next' => $nextContact,
            ],
            'initialTab' => $initialTab,
            'actionPlans' => \App\Models\ActionPlan::forUser($user)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function attachListing(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize($request, $contact);
        $user = $request->user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'address' => 'nullable|string',
            'unit' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'state_province' => 'nullable|string|max:50',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|size:2',
            'price' => 'nullable|numeric|min:0',
            'bedrooms' => 'nullable|integer|min:0',
            'bathrooms' => 'nullable|numeric|min:0',
            'sqft' => 'nullable|integer|min:0',
            'lot_size' => 'nullable|numeric|min:0',
            'year_built' => 'nullable|integer|min:1800|max:2100',
            'description' => 'nullable|string',
            'mls_number' => 'nullable|string|max:50',
            'photos' => 'nullable|array',
            'photos.*' => 'string',
            'photo' => 'nullable|file|image|max:5120',
            'listing_type' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'add_to_my_listings' => 'nullable|boolean',
        ]);

        $photos = $validated['photos'] ?? [];
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store("contact-listings/{$contact->id}", 'public');
            $photos[] = \Illuminate\Support\Facades\Storage::disk('public')->url($path);
        }

        $listingTypes = $user->getListingTypes();
        $statuses = $user->getListingStatuses();
        $addToMyListings = filter_var($request->input('add_to_my_listings'), FILTER_VALIDATE_BOOLEAN);

        $contact->listings()->create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'listing_type' => $validated['listing_type'] ?? ($listingTypes[0] ?? 'residential'),
            'status' => $validated['status'] ?? ($statuses[0] ?? 'active'),
            'title' => $validated['title'],
            'address' => $validated['address'] ?? null,
            'unit' => $validated['unit'] ?? null,
            'city' => $validated['city'] ?? null,
            'state_province' => $validated['state_province'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'country' => $validated['country'] ?? null,
            'price' => $validated['price'] ?? null,
            'bedrooms' => $validated['bedrooms'] ?? null,
            'bathrooms' => $validated['bathrooms'] ?? null,
            'sqft' => $validated['sqft'] ?? null,
            'lot_size' => $validated['lot_size'] ?? null,
            'year_built' => $validated['year_built'] ?? null,
            'description' => $validated['description'] ?? null,
            'mls_number' => $validated['mls_number'] ?? null,
            'photos' => !empty($photos) ? $photos : null,
            'is_private' => ! $addToMyListings,
        ]);

        return back()->with('success', $addToMyListings ? 'Listing added to your properties and linked.' : 'Property added to this contact.');
    }

    public function detachListing(Request $request, Contact $contact, \App\Models\Listing $listing): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($listing->contact_id === $contact->id, 404);

        $listing->update(['contact_id' => null]);

        return back()->with('success', 'Listing removed from contact.');
    }

    public function linkListing(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize($request, $contact);
        $user = $request->user();

        $validated = $request->validate([
            'listing_id' => 'required|integer|exists:listings,id',
        ]);

        $listing = \App\Models\Listing::query()
            ->where('id', $validated['listing_id'])
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id);
                if ($user->team_id) {
                    $q->orWhere('team_id', $user->team_id);
                }
            })
            ->firstOrFail();

        $listing->update(['contact_id' => $contact->id]);

        return back()->with('success', 'Listing linked to contact.');
    }

    public function uploadFile(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize($request, $contact);
        $user = $request->user();

        $validated = $request->validate([
            'file' => 'required|file|max:20480',          // 20 MB
            'description' => 'nullable|string|max:255',
        ]);

        $file = $request->file('file');
        $path = $file->store("contact-files/{$contact->id}", 'public');

        $contact->files()->create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'description' => $validated['description'] ?? null,
        ]);

        return back()->with('success', 'File uploaded.');
    }

    public function destroyFile(Request $request, Contact $contact, \App\Models\ContactFile $file): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($file->contact_id === $contact->id, 404);

        \Illuminate\Support\Facades\Storage::disk('public')->delete($file->path);
        $file->delete();

        return back()->with('success', 'File deleted.');
    }

    public function updateColumnPreferences(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'order' => 'nullable|array',
            'order.*' => 'string|max:64',
            'visible' => 'nullable|array',
            'visible.*' => 'string|max:64',
            'widths' => 'nullable|array',
            'widths.*' => 'integer|min:40|max:1000',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $settings['contact_columns'] = [
            'order' => $validated['order'] ?? ($settings['contact_columns']['order'] ?? []),
            'visible' => $validated['visible'] ?? ($settings['contact_columns']['visible'] ?? []),
            'widths' => $validated['widths'] ?? ($settings['contact_columns']['widths'] ?? []),
        ];
        $user->update(['settings' => $settings]);

        return response()->json(['saved' => true]);
    }

    public function storeSearch(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize($request, $contact);
        $user = $request->user();

        $validated = $this->validateSearch($request);

        $contact->searches()->create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'name' => $validated['name'],
            'filters' => $validated['filters'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Search saved.');
    }

    public function updateSearch(Request $request, Contact $contact, \App\Models\ContactSearch $search): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($search->contact_id === $contact->id, 404);

        $validated = $this->validateSearch($request);

        $search->update([
            'name' => $validated['name'],
            'filters' => $validated['filters'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Search updated.');
    }

    public function destroySearch(Request $request, Contact $contact, \App\Models\ContactSearch $search): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($search->contact_id === $contact->id, 404);

        $search->delete();

        return back()->with('success', 'Search deleted.');
    }

    private function validateSearch(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:120',
            'notes' => 'nullable|string|max:2000',
            'filters' => 'required|array',
            'filters.city' => 'nullable|string|max:120',
            'filters.state_province' => 'nullable|string|max:50',
            'filters.postal_code' => 'nullable|string|max:20',
            'filters.property_type' => 'nullable|string|max:50',
            'filters.min_price' => 'nullable|numeric|min:0',
            'filters.max_price' => 'nullable|numeric|min:0',
            'filters.min_beds' => 'nullable|integer|min:0',
            'filters.min_baths' => 'nullable|numeric|min:0',
            'filters.min_sqft' => 'nullable|integer|min:0',
            'filters.max_sqft' => 'nullable|integer|min:0',
            'filters.year_built_min' => 'nullable|integer|min:1800|max:2100',
            'filters.features' => 'nullable|array',
            'filters.features.*' => 'string|max:50',
        ]);
    }

    public function storeOffer(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize($request, $contact);
        $user = $request->user();

        $validated = $request->validate([
            'listing_id' => 'nullable|integer|exists:listings,id',
            'listing_address' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:submitted,accepted,rejected,countered,withdrawn,expired',
            'notes' => 'nullable|string|max:5000',
            'submitted_at' => 'nullable|date',
        ]);

        $contact->offers()->create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'listing_id' => $validated['listing_id'] ?? null,
            'listing_address' => $validated['listing_address'] ?? null,
            'amount' => $validated['amount'] ?? null,
            'status' => $validated['status'] ?? 'submitted',
            'notes' => $validated['notes'] ?? null,
            'submitted_at' => $validated['submitted_at'] ?? now(),
            'source' => 'manual',
        ]);

        return back()->with('success', 'Offer saved.');
    }

    public function updateOffer(Request $request, Contact $contact, \App\Models\ContactOffer $offer): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($offer->contact_id === $contact->id, 404);

        $validated = $request->validate([
            'listing_id' => 'nullable|integer|exists:listings,id',
            'listing_address' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:submitted,accepted,rejected,countered,withdrawn,expired',
            'notes' => 'nullable|string|max:5000',
            'submitted_at' => 'nullable|date',
        ]);

        $offer->update([
            'listing_id' => $validated['listing_id'] ?? null,
            'listing_address' => $validated['listing_address'] ?? null,
            'amount' => $validated['amount'] ?? null,
            'status' => $validated['status'] ?? $offer->status,
            'notes' => $validated['notes'] ?? null,
            'submitted_at' => $validated['submitted_at'] ?? $offer->submitted_at,
        ]);

        return back()->with('success', 'Offer updated.');
    }

    public function destroyOffer(Request $request, Contact $contact, \App\Models\ContactOffer $offer): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($offer->contact_id === $contact->id, 404);

        $offer->delete();

        return back()->with('success', 'Offer deleted.');
    }

    public function replyOffer(Request $request, Contact $contact, \App\Models\ContactOffer $offer): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($offer->contact_id === $contact->id, 404);

        $validated = $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $user = $request->user();
        $replies = $offer->replies ?? [];
        $replies[] = [
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'user_name' => $user->name,
            'body' => $validated['body'],
            'created_at' => now()->toISOString(),
        ];
        $offer->replies = $replies;
        $offer->save();

        return back()->with('success', 'Reply added.');
    }

    public function storeInquiry(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize($request, $contact);
        $user = $request->user();

        $validated = $request->validate([
            'listing_id' => 'nullable|integer|exists:listings,id',
            'listing_address' => 'nullable|string|max:255',
            'subject' => 'nullable|string|max:200',
            'message' => 'nullable|string|max:10000',
            'submitted_at' => 'nullable|date',
            'status' => 'nullable|in:open,responded,closed',
        ]);

        $contact->inquiries()->create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'listing_id' => $validated['listing_id'] ?? null,
            'listing_address' => $validated['listing_address'] ?? null,
            'subject' => $validated['subject'] ?? null,
            'message' => $validated['message'] ?? null,
            'submitted_at' => $validated['submitted_at'] ?? now(),
            'source' => 'manual',
            'status' => $validated['status'] ?? 'open',
        ]);

        return back()->with('success', 'Inquiry saved.');
    }

    public function updateInquiry(Request $request, Contact $contact, \App\Models\ContactInquiry $inquiry): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($inquiry->contact_id === $contact->id, 404);

        $validated = $request->validate([
            'listing_id' => 'nullable|integer|exists:listings,id',
            'listing_address' => 'nullable|string|max:255',
            'subject' => 'nullable|string|max:200',
            'message' => 'nullable|string|max:10000',
            'submitted_at' => 'nullable|date',
            'status' => 'nullable|in:open,responded,closed',
        ]);

        $inquiry->update([
            'listing_id' => $validated['listing_id'] ?? null,
            'listing_address' => $validated['listing_address'] ?? null,
            'subject' => $validated['subject'] ?? null,
            'message' => $validated['message'] ?? null,
            'submitted_at' => $validated['submitted_at'] ?? $inquiry->submitted_at,
            'status' => $validated['status'] ?? $inquiry->status,
        ]);

        return back()->with('success', 'Inquiry updated.');
    }

    public function destroyInquiry(Request $request, Contact $contact, \App\Models\ContactInquiry $inquiry): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($inquiry->contact_id === $contact->id, 404);

        $inquiry->delete();

        return back()->with('success', 'Inquiry deleted.');
    }

    public function replyInquiry(Request $request, Contact $contact, \App\Models\ContactInquiry $inquiry): RedirectResponse
    {
        $this->authorize($request, $contact);
        abort_unless($inquiry->contact_id === $contact->id, 404);

        $validated = $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $user = $request->user();
        $replies = $inquiry->replies ?? [];
        $replies[] = [
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'user_name' => $user->name,
            'body' => $validated['body'],
            'created_at' => now()->toISOString(),
        ];
        $inquiry->replies = $replies;
        // Auto-flip status: open -> responded once the agent replies
        if ($inquiry->status === 'open') {
            $inquiry->status = 'responded';
        }
        $inquiry->save();

        return back()->with('success', 'Reply added.');
    }

    public function edit(Request $request, Contact $contact): Response
    {
        $this->authorize($request, $contact);
        $user = $request->user();

        $contact->load('tags:id');

        return Inertia::render('Crm/Contacts/Edit', [
            'contact' => $contact,
            'companies' => Company::forUser($user)->select('id', 'name')->get(),
            'tags' => Tag::forUser($user)->get(),
            'leadTypes' => $user->getLeadTypes(),
            'contactStatuses' => $user->getContactStatuses(),
            'customFields' => $user->getCustomFields(),
        ]);
    }

    public function update(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize($request, $contact);
        $user = $request->user();

        $validated = $request->validate(array_merge([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:20',
            'type' => ['required', 'string', 'max:50', Rule::in($user->getLeadTypes())],
            'status' => ['nullable', 'string', 'max:50'],
            'source' => 'required|in:website,referral,open_house,social_media,cold_call,idx,manual,other',
            'company_id' => 'nullable|exists:companies,id',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state_province' => 'nullable|string|max:50',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|size:2',
            'description' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
            'assigned_user_ids' => 'nullable|array',
            'assigned_user_ids.*' => 'exists:users,id',
        ], $this->customFieldRules($user, enforceRequired: false, ignore: $contact)));

        $tags = $validated['tags'] ?? [];
        $assignedUserIds = $validated['assigned_user_ids'] ?? null;
        unset($validated['tags'], $validated['assigned_user_ids']);

        if (array_key_exists('custom_fields', $validated)) {
            $validated['custom_fields'] = array_merge(
                $contact->custom_fields ?? [],
                $this->normalizeCustomFields($user, $validated['custom_fields'] ?? []),
            );
        }

        $oldType = $contact->type;
        $oldStatus = $contact->status;
        $contact->update($validated);
        $contact->tags()->sync($tags);

        // Assigning a contact to other users is a Team-plan feature.
        if ($assignedUserIds !== null && $user->canUseTeamFeatures()) {
            $contact->assignedUsers()->sync($assignedUserIds);
        }

        if ($oldType !== $contact->type) {
            TimelineService::log(
                user: $user,
                eventType: 'contact_type_changed',
                subject: "Type changed from {$oldType} to {$contact->type}",
                contact: $contact,
            );
        }

        // Fire the status_changed action-plan trigger when the status actually changes.
        if ($oldStatus !== $contact->status) {
            app(\App\Services\ActionPlans\ActionPlanEnroller::class)
                ->evaluateStatusChange($contact->fresh(), $oldStatus, $contact->status);
        }

        return redirect()->route('crm.contacts.show', $contact)
            ->with('success', 'Contact updated.');
    }

    public function storeLeadType(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|max:50|regex:/^[a-z0-9_]+$/',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $custom = $settings['lead_types'] ?? [];

        if (in_array($validated['type'], array_merge($user::DEFAULT_LEAD_TYPES, $custom))) {
            return back()->withErrors(['type' => 'This lead type already exists.']);
        }

        $custom[] = $validated['type'];
        $settings['lead_types'] = $custom;
        $user->update(['settings' => $settings]);

        return back()->with('success', 'Lead type added.');
    }

    public function storeContactStatus(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|max:50|regex:/^[a-z0-9_]+$/',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $custom = $settings['contact_statuses'] ?? [];

        if (in_array($validated['status'], array_merge($user::DEFAULT_CONTACT_STATUSES, $custom), true)) {
            return back()->withErrors(['status' => 'This status already exists.']);
        }

        $custom[] = $validated['status'];
        $settings['contact_statuses'] = $custom;
        $user->update(['settings' => $settings]);

        return back()->with('success', 'Status added.');
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
        $customFields = $settings['custom_fields'] ?? [];

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

        $settings['custom_fields'] = $customFields;
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
        $customFields = $settings['custom_fields'] ?? [];

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

        $settings['custom_fields'] = $customFields;
        $user->update(['settings' => $settings]);

        return back()->with('success', 'Custom field updated.');
    }

    public function destroyCustomField(Request $request, string $key): RedirectResponse
    {
        $user = $request->user();
        $settings = $user->settings ?? [];
        $customFields = $settings['custom_fields'] ?? [];

        $settings['custom_fields'] = array_values(array_filter(
            $customFields,
            fn ($f) => ($f['key'] ?? null) !== $key,
        ));

        $user->update(['settings' => $settings]);

        return back()->with('success', 'Custom field deleted.');
    }

    public function destroy(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize($request, $contact);

        $contact->delete();

        return redirect()->route('crm.contacts.index')
            ->with('success', 'Contact deleted.');
    }

    public function updateDnd(Request $request, Contact $contact): \Illuminate\Http\JsonResponse
    {
        $this->authorize($request, $contact);

        $validated = $request->validate([
            'mode' => 'required|in:none,all,sms,calls',
        ]);

        $contact->update(['dnd_mode' => $validated['mode']]);

        return response()->json(['dnd_mode' => $contact->dnd_mode]);
    }

    public function bulkDelete(Request $request): RedirectResponse
    {
        // Re-authenticate destructive bulk ops. For a single-contact delete the
        // UI enforces typing the contact's name (no extra creds needed). For 2+,
        // we require the user's password — a one-misclick destroys real data.
        $rules = [
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ];
        if (count((array) $request->input('ids')) >= 2) {
            $rules['password'] = ['required', 'current_password'];
        }
        $request->validate($rules);

        $user = $request->user();
        $ids = $request->input('ids');
        // Iterate so each contact's `deleting` event fires (cascades morph / pivot rows).
        $contacts = Contact::forUser($user)->whereIn('id', $ids)->get();
        \Illuminate\Support\Facades\DB::transaction(function () use ($contacts) {
            foreach ($contacts as $c) {
                $c->delete();
            }
        });

        return back()->with('success', $contacts->count() . ' contact(s) deleted.');
    }

    public function bulkTag(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'tag_ids' => 'required|array|min:1',
            'tag_ids.*' => 'exists:tags,id',
        ]);

        $user = $request->user();
        $contacts = Contact::forUser($user)->whereIn('id', $validated['ids'])->get();

        foreach ($contacts as $contact) {
            $contact->tags()->syncWithoutDetaching($validated['tag_ids']);
        }

        return back()->with('success', count($contacts) . ' contact(s) tagged.');
    }

    public function bulkUpdateType(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'type' => ['required', 'string', 'max:50', Rule::in($user->getLeadTypes())],
        ]);

        $count = Contact::forUser($user)
            ->whereIn('id', $validated['ids'])
            ->update(['type' => $validated['type']]);

        return back()->with('success', $count . ' contact(s) updated.');
    }

    public function storeSmartList(Request $request): RedirectResponse
    {
        // `filters` is `present|array` (not `required`) so users can save a view with
        // zero filters — that view just lists everything, which is a legitimate use case.
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'filters' => 'present|array',
        ]);

        $user = $request->user();
        $maxPosition = SavedContactView::forUser($user)->max('position') ?? 0;

        $user->savedContactViews()->create([
            'name' => $validated['name'],
            'filters' => $validated['filters'] ?: (object) [],
            'position' => $maxPosition + 1,
        ]);

        return back()->with('success', 'Smart list created.');
    }

    public function updateSmartList(Request $request, SavedContactView $savedContactView): RedirectResponse
    {
        $user = $request->user();
        abort_unless($savedContactView->user_id === $user->id || ($user->team_id && $savedContactView->team_id === $user->team_id), 403);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'filters' => 'sometimes|present|array',
        ]);

        if (array_key_exists('filters', $validated)) {
            $validated['filters'] = $validated['filters'] ?: (object) [];
        }
        $savedContactView->update($validated);

        return back()->with('success', 'Smart list updated.');
    }

    public function destroySmartList(Request $request, SavedContactView $savedContactView): RedirectResponse
    {
        $user = $request->user();
        abort_unless($savedContactView->user_id === $user->id || ($user->team_id && $savedContactView->team_id === $user->team_id), 403);

        $savedContactView->delete();

        return back()->with('success', 'Smart list deleted.');
    }

    public function setDefaultSmartList(Request $request, SavedContactView $savedContactView): RedirectResponse
    {
        $user = $request->user();
        abort_unless($savedContactView->user_id === $user->id || ($user->team_id && $savedContactView->team_id === $user->team_id), 403);

        SavedContactView::forUser($user)->update(['is_default' => false]);
        $savedContactView->update(['is_default' => !$savedContactView->is_default]);

        return back()->with('success', 'Default smart list updated.');
    }

    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        $teamEnabled = $user->isInTeamContext() && $user->team_id !== null;

        $allColumns = [
            'first_name' => 'First Name',
            'last_name' => 'Last Name',
            'email' => 'Email',
            'phone' => 'Phone',
            'mobile' => 'Mobile',
            'type' => 'Lead Type',
            'status' => 'Status',
            'source' => 'Source',
            'lead_score' => 'Lead Score',
            'address' => 'Address',
            'city' => 'City',
            'state_province' => 'State / Province',
            'postal_code' => 'Postal Code',
            'country' => 'Country',
            'description' => 'Notes',
            'last_contacted_at' => 'Last Contacted',
            'created_at' => 'Created At',
        ];

        $requestedFields = $request->input('fields', array_keys($allColumns));
        if (! is_array($requestedFields) || empty($requestedFields)) {
            $requestedFields = array_keys($allColumns);
        }
        $columns = array_intersect_key($allColumns, array_flip($requestedFields));
        if (empty($columns)) {
            $columns = $allColumns;
        }

        $ids = $request->input('ids');
        $hasIds = is_array($ids) && count($ids) > 0;

        $query = Contact::forUser($user);

        if ($hasIds) {
            $query->whereIn('id', $ids);
        } else {
            $view = $request->input('view');
            $query
                ->when($view === 'mine', fn ($q) => $q->where('user_id', $user->id))
                ->when($view === 'team' && $teamEnabled, fn ($q) => $q->where('user_id', '!=', $user->id))
                ->when($view === 'not_contacted', fn ($q) => $q->where(function ($q) {
                    $q->whereNull('last_contacted_at')->orWhere('last_contacted_at', '<', now()->subDays(30));
                }))
                ->when($view === 'partial', fn ($q) => $q->where(function ($q) {
                    $q->whereNull('first_name')->orWhere('first_name', '')
                      ->orWhereNull('last_name')->orWhere('last_name', '')
                      ->orWhereNull('email')->orWhere('email', '')
                      ->orWhereNull('phone')->orWhere('phone', '')
                      ->orWhereNull('type')->orWhere('type', '');
                }))
                ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                    $q->where('first_name', 'like', "%{$s}%")
                      ->orWhere('last_name', 'like', "%{$s}%")
                      ->orWhere('email', 'like', "%{$s}%");
                }))
                ->when($request->type, fn ($q, $t) => $q->where('type', $t))
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->source, fn ($q, $s) => $q->where('source', $s))
                ->when($request->city, fn ($q, $c) => $q->where('city', 'like', "%{$c}%"))
                ->when($request->tag, fn ($q, $t) => $q->whereHas('tags', fn ($tq) => $tq->where('name', 'like', $t)))
                ->when($request->lead_score_min, fn ($q, $v) => $q->where('lead_score', '>=', (int) $v))
                ->when($request->lead_score_max, fn ($q, $v) => $q->where('lead_score', '<=', (int) $v))
                ->when($request->has_email !== null, function ($q) use ($request) {
                    $val = filter_var($request->has_email, FILTER_VALIDATE_BOOLEAN);
                    $val
                        ? $q->whereNotNull('email')->where('email', '!=', '')
                        : $q->where(fn ($q) => $q->whereNull('email')->orWhere('email', ''));
                })
                ->when($request->has_phone !== null, function ($q) use ($request) {
                    $val = filter_var($request->has_phone, FILTER_VALIDATE_BOOLEAN);
                    $val
                        ? $q->whereNotNull('phone')->where('phone', '!=', '')
                        : $q->where(fn ($q) => $q->whereNull('phone')->orWhere('phone', ''));
                });
        }

        $query->orderBy('created_at', 'desc');

        $filename = 'contacts-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($query, $columns) {
            $out = fopen('php://output', 'w');
            fputcsv($out, array_values($columns));
            $query->chunk(500, function ($contacts) use ($out, $columns) {
                foreach ($contacts as $contact) {
                    $row = [];
                    foreach (array_keys($columns) as $field) {
                        $value = $contact->{$field};
                        if ($value instanceof \DateTimeInterface) {
                            $value = $value->format('Y-m-d H:i:s');
                        }
                        $row[] = (string) ($value ?? '');
                    }
                    fputcsv($out, $row);
                }
            });
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function authorize(Request $request, Contact $contact): void
    {
        $user = $request->user();
        abort_unless($contact->user_id === $user->id || ($user->team_id && $contact->team_id === $user->team_id), 403);
    }

    /**
     * Build per-key validation rules for the user's configured custom_fields,
     * so e.g. an email-type field actually validates as an email and a required
     * one is enforced.
     *
     * When a field is flagged unique, a closure rule rejects values already
     * stored on another contact owned by this user/team.
     */
    private function customFieldRules($user, bool $enforceRequired, ?Contact $ignore = null): array
    {
        $rules = ['custom_fields' => 'nullable|array'];

        foreach ($user->getCustomFields() as $field) {
            $key = $field['key'] ?? null;
            if (! $key) continue;

            $isRequired = $enforceRequired && ($field['required'] ?? false);
            $base = $isRequired ? 'required' : 'nullable';

            $typeRule = match ($field['type'] ?? 'text') {
                'email' => "{$base}|email|max:255",
                'url' => "{$base}|url|max:500",
                'number' => "{$base}|numeric",
                'date' => "{$base}|date",
                'checkbox' => "{$base}|boolean",
                'textarea' => "{$base}|string|max:10000",
                default => "{$base}|string|max:5000",
            };

            $fieldRules = [$typeRule];

            if (! empty($field['unique'])) {
                $fieldRules[] = $this->uniqueCustomFieldRule($user, $key, $field['label'] ?? $key, $ignore);
            }

            $rules["custom_fields.{$key}"] = $fieldRules;
        }

        return $rules;
    }

    private function uniqueCustomFieldRule($user, string $key, string $label, ?Contact $ignore): \Closure
    {
        return function ($attribute, $value, $fail) use ($user, $key, $label, $ignore) {
            if ($value === null || $value === '') return;

            $query = Contact::query()
                ->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                    if ($user->team_id) {
                        $q->orWhere('team_id', $user->team_id);
                    }
                })
                ->whereRaw("JSON_EXTRACT(custom_fields, '$.\"{$key}\"') = ?", [$value]);

            if ($ignore) {
                $query->where('id', '!=', $ignore->id);
            }

            if ($query->exists()) {
                $fail("Another contact already has this {$label}.");
            }
        };
    }

    /**
     * Cast incoming custom_field values to their declared types (booleans for
     * checkboxes, etc.) and drop any keys that aren't part of the user's
     * configured custom_fields.
     */
    private function normalizeCustomFields($user, array $incoming): array
    {
        $out = [];
        foreach ($user->getCustomFields() as $field) {
            $key = $field['key'] ?? null;
            if (! $key || ! array_key_exists($key, $incoming)) continue;

            $value = $incoming[$key];
            if ($value === '' || $value === null) {
                $out[$key] = null;
                continue;
            }

            $out[$key] = match ($field['type'] ?? 'text') {
                'checkbox' => (bool) $value,
                'number' => is_numeric($value) ? $value + 0 : null,
                default => $value,
            };
        }
        return $out;
    }
}
