<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\MlsConnectionRequest;
use App\Models\MlsProvider;
use App\Models\Team;
use App\Models\User;
use App\Models\WebsiteArea;
use App\Services\Ai\WebsiteCopyService;
use App\Services\Mls\MlsDatasetRegistry;
use App\Services\Teams\TeamInvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Full-screen "Create a website" wizard (/crm/onboarding).
 *
 * Deliberately separate from {@see AgentWebsiteController}: that controller owns
 * the editor + CRUD for existing sites, while this one owns the guided first-run
 * flow — domain, business description, agent/team, feature selection, MLS,
 * communities, blogging and featured listings — and turns those answers into a
 * fully seeded AgentWebsite in one shot.
 */
class OnboardingController extends Controller implements HasMiddleware
{
    /** The website create wizard is part of the paid Websites feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:websites')];
    }

    /**
     * Wizard "features" → home-page block type. Features not listed here are
     * recorded as flags under page_data._config.features (e.g. ai_chat) and read
     * by the templates/editor, but don't seed a standalone block.
     */
    private const FEATURE_BLOCKS = [
        'home_valuation' => 'home-valuation',
        'home_search' => 'areas-we-serve',
        'team_profiles' => 'team',
    ];

    public function show(Request $request): Response|RedirectResponse
    {
        $actor = $request->user();

        // Admins can run this same wizard on behalf of a user (from /admin/websites
        // → Create). Prefill + context then reflect the eventual OWNER, not the admin.
        $user = $actor;
        $adminCreating = false;
        if ($actor->isAdmin() && $request->filled('for_user')) {
            $user = User::findOrFail($request->integer('for_user'));
            $adminCreating = true;
        }

        // Self-serve accounts are capped by their plan's website_limit — if this
        // user is already at the limit, skip the wizard and open the existing site
        // for editing instead of letting them fill the whole flow only to be
        // blocked on submit. Admins may create additional sites for a user, so the
        // cap is skipped for them.
        if (! $adminCreating && ! $user->team_id) {
            $limit = $user->billingOwner()->effectivePlan()->website_limit ?? null;
            $existing = AgentWebsite::where('user_id', $user->id)->whereNull('team_id')->first();
            if ($existing && $limit !== null
                && AgentWebsite::where('user_id', $user->id)->whereNull('team_id')->count() >= $limit) {
                return redirect()->route('crm.websites.edit', $existing->uuid);
            }
        }

        $providers = MlsProvider::visible()
            ->orderBy('sort_order')
            ->orderBy('display_name')
            ->get(['id', 'slug', 'display_name', 'region', 'country', 'logo_url', 'has_idx_feed', 'has_vow_feed', 'monthly_fee_cents'])
            ->map(fn (MlsProvider $p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name' => $p->display_name,
                'region' => $p->region,
                'country' => $p->country,
                'logo' => $p->logo_url,
                'has_idx_feed' => $p->has_idx_feed,
                'has_vow_feed' => $p->has_vow_feed,
                'monthly_fee' => $p->monthly_fee_formatted,
            ]);

        // Prefill location + MLS from whatever we already know about the user: their
        // saved profile location and any existing MLS connection (whose region is the
        // state code). Profile values win; MLS-derived values fill the gaps.
        $settings = $user->settings ?? [];
        $mls = $this->connectedMlsLocation($user);

        return Inertia::render('Crm/Onboarding/Index', [
            'templates' => config('templates'),
            'mlsProviders' => $providers,
            'hasMls' => $this->userHasMls($user),
            'isTeamContext' => $user->active_context === 'team' && (bool) $user->team_id,
            'hasTeam' => (bool) $user->team_id,
            // Whether the wizard can collect real member invites (Team plan,
            // self-serve only). Drives the email field in the Team step.
            'canInviteTeam' => ! $adminCreating && $user->canUseTeamFeatures(),
            // Set whenever an admin runs the wizard via /admin (for_user present).
            // The wizard posts it back as target_user_id so store() knows this is
            // an admin-created site (skips the one-site-per-user cap, etc.).
            'forUser' => $adminCreating ? ['id' => $user->id, 'name' => $user->name] : null,
            'defaults' => [
                'agent_name' => $user->name ?? '',
                'agent_email' => $user->email ?? '',
                'agent_phone' => $user->phone ?? '',
                'brokerage_name' => $user->company ?? '',
                'agent_city' => $settings['city'] ?? '',
                'agent_state' => $settings['state'] ?? $mls['state'] ?? '',
                'agent_country' => $settings['country'] ?? $mls['country'] ?? 'US',
                'mls_provider_id' => $mls['provider_id'],
            ],
        ]);
    }

    /**
     * Location + provider derived from the user's active MLS connection, if any.
     * Resolves the catalog provider when present, but falls back to the dataset
     * config (keyed by the connection slug) so it still works when no MlsProvider
     * row exists for the connected feed.
     *
     * @return array{provider_id: ?int, state: ?string, country: ?string}
     */
    private function connectedMlsLocation($user): array
    {
        $connection = $user->idxConnections()->where('is_active', true)->latest('id')->first();
        if (! $connection) {
            return ['provider_id' => null, 'state' => null, 'country' => null];
        }

        $provider = $connection->mls_provider_id
            ? MlsProvider::find($connection->mls_provider_id)
            : ($connection->mls_slug ? MlsProvider::where('slug', $connection->mls_slug)->first() : null);

        return [
            'provider_id' => $provider?->id,
            'state' => $provider->region ?? config("idx.datasets.{$connection->mls_slug}.region"),
            'country' => $provider->country ?? 'US',
        ];
    }

    /**
     * The communities/areas a selected MLS covers, for the community autocomplete.
     * Sourced from the dataset's static taxonomy (cities + neighborhoods +
     * subdivisions) so it works during onboarding before any feed is connected.
     */
    public function communities(Request $request, MlsDatasetRegistry $registry): JsonResponse
    {
        $user = $request->user();

        // Resolve which dataset(s) to pull communities from: an explicitly-selected
        // provider plus every MLS the user already has connected. Datasets key off
        // the slug (matching IdxConnection.mls_slug), so this works even when no
        // MlsProvider catalog row exists for the connected feed.
        $slugs = [];
        if ($providerId = (int) $request->query('mls_provider_id')) {
            $provider = MlsProvider::find($providerId);
            if ($provider) {
                $slugs[] = $provider->slug;
            }
        }
        foreach ($user->idxConnections()->where('is_active', true)->get() as $connection) {
            if ($connection->mls_slug) {
                $slugs[] = $connection->mls_slug;
            }
        }

        $names = [];
        foreach (array_unique($slugs) as $slug) {
            $dataset = $registry->find($slug);
            if (! $dataset) {
                continue;
            }
            $names = array_merge(
                $names,
                $dataset->getCities(),
                collect($dataset->getNeighborhoods())->flatten()->all(),
                $dataset->getSubdivisions(),
            );
        }

        $communities = collect($names)
            ->map(fn ($name) => trim((string) $name))
            ->filter()
            ->unique()
            ->sort(SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();

        return response()->json(['communities' => $communities]);
    }

    public function store(Request $request, WebsiteCopyService $copy, TeamInvitationService $teamInvitations): RedirectResponse
    {
        $user = $request->user();

        // Admins can create on behalf of another user — the created site (and its
        // MLS request) is owned by that user, not the admin. Everything below keys
        // off $user, so reassigning it here is all that's needed.
        $adminCreating = false;
        if ($user->isAdmin() && $request->filled('target_user_id')) {
            $request->validate(['target_user_id' => ['integer', 'exists:users,id']]);
            $user = User::findOrFail($request->integer('target_user_id'));
            $adminCreating = true;
        }

        $templateKeys = implode(',', array_keys(config('templates')));
        $featureKeys = implode(',', array_keys(array_merge(self::FEATURE_BLOCKS, [
            'ai_chat' => true,
            'off_market' => true,
            'new_developments' => true,
        ])));

        $validated = $request->validate([
            'template' => "required|in:{$templateKeys}",
            'custom_domain' => 'nullable|string|max:255',
            'business_description' => 'nullable|string|max:2000',
            'agent_name' => 'required|string|max:255',
            'agent_email' => 'nullable|email|max:255',
            'agent_phone' => 'nullable|string|max:50',
            'agent_whatsapp' => 'nullable|string|max:50',
            'office_address' => 'nullable|string|max:255',
            'agent_country' => 'required|in:US,CA',
            'agent_city' => 'required|string|max:100',
            'agent_state' => 'nullable|string|max:100',
            'brokerage_name' => 'required|string|max:255',
            'site_type' => 'required|in:agent,team',
            'team_members' => 'nullable|array|max:50',
            'team_members.*.first_name' => 'nullable|string|max:120',
            'team_members.*.last_name' => 'nullable|string|max:120',
            'team_members.*.role' => 'nullable|string|max:120',
            'team_members.*.email' => 'nullable|email|max:255',
            'features' => 'nullable|array',
            'features.*' => "string|in:{$featureKeys}",
            'mls_provider_id' => 'nullable|exists:mls_providers,id',
            'communities' => 'nullable|array|max:50',
            'communities.*' => 'string|max:120',
            'blogging' => 'boolean',
            'featured' => 'nullable|in:mine,office,none',
        ]);

        // Resolve the team this site belongs to. A "team" site needs a real team:
        // use the user's existing one, or — for an entitled self-serve user with
        // none yet — provision one now so the site (and the member invites below)
        // attach to it. Admin-on-behalf never auto-creates a team.
        $teamId = null;
        if ($validated['site_type'] === 'team') {
            if ($user->team_id) {
                $teamId = $user->team_id;
            } elseif (! $adminCreating && $user->canUseTeamFeatures()) {
                $team = $teamInvitations->createTeam(
                    $user,
                    trim((string) ($validated['brokerage_name'] ?? '')) ?: ($validated['agent_name'].' Team'),
                );
                $teamId = $team->id;
            }
        }

        // Personal accounts are capped by their plan's website_limit (null =
        // unlimited) — admins may create additional sites for a user, so the cap
        // applies to self-serve only.
        if (! $adminCreating && ! $teamId) {
            $limit = $user->billingOwner()->effectivePlan()->website_limit ?? null;
            if ($limit !== null
                && AgentWebsite::where('user_id', $user->id)->whereNull('team_id')->count() >= $limit) {
                return back()->withErrors(['agent_name' => $limit === 1
                    ? 'You already have a website. Edit the existing one instead.'
                    : 'Your plan’s website limit has been reached. Upgrade to add more.']);
            }
        }

        $features = $validated['features'] ?? [];
        $template = $validated['template'];

        $attributes = [
            'user_id' => $teamId ? null : $user->id,
            'team_id' => $teamId,
            'slug' => AgentWebsite::generateSlug($validated['agent_name']),
            'custom_domain' => $this->normalizeDomain($validated['custom_domain'] ?? null),
            'template' => $template,
            'agent_name' => $validated['agent_name'],
            'agent_email' => $validated['agent_email'] ?? null,
            'agent_phone' => $validated['agent_phone'] ?? null,
            'agent_whatsapp' => $validated['agent_whatsapp'] ?? null,
            'office_address' => $validated['office_address'] ?? null,
            'agent_city' => $validated['agent_city'] ?? null,
            'agent_state' => $validated['agent_state'] ?? null,
            'brokerage_name' => $validated['brokerage_name'] ?? null,
            'is_published' => false,
        ];

        // Generate copy from the business description (best-effort — a failed AI
        // call just leaves template defaults in place, it never blocks creation).
        $generated = [];
        if (! empty($validated['business_description'])) {
            $result = $copy->generateAllCopy([
                'agent_name' => $validated['agent_name'],
                'agent_city' => $validated['agent_city'] ?? null,
                'agent_state' => $validated['agent_state'] ?? null,
                'brokerage_name' => $validated['brokerage_name'] ?? null,
                'template' => $template,
                'description' => $validated['business_description'],
            ]);
            $generated = $result['copy'] ?? [];
        }

        // Promote AI copy onto the flat columns the templates read.
        foreach (['agent_tagline', 'agent_bio', 'hero_headline', 'hero_subtitle', 'buy_headline', 'buy_description', 'sell_headline', 'sell_description', 'about_extended', 'meta_title', 'meta_description'] as $field) {
            if (! empty($generated[$field])) {
                $attributes[$field] = $generated[$field];
            }
        }

        $attributes['page_data'] = $this->buildPageData(
            $template,
            $generated,
            $features,
            $validated['featured'] ?? 'none',
            (bool) ($validated['blogging'] ?? false),
            $validated['agent_country'] ?? 'US',
            $validated['team_members'] ?? [],
        );

        $website = AgentWebsite::create($attributes);

        $this->seedCommunities($website, $validated['communities'] ?? []);

        if (! empty($validated['mls_provider_id'])) {
            $this->createMlsRequest($user, (int) $validated['mls_provider_id'], $validated['brokerage_name'] ?? null);
        }

        // Send real team invitations for any member rows that include an email.
        // Display-only rows (name without email) just seed the website Team block.
        $message = 'Your website is ready — start customizing it below.';
        if ($teamId && ! $adminCreating && $user->canUseTeamFeatures()) {
            $message .= $this->inviteOnboardingMembers($teamInvitations, $teamId, $user, $validated['team_members'] ?? []);
        }

        return redirect()->route('crm.websites.edit', $website->uuid)->with('success', $message);
    }

    /**
     * Invite each onboarding team-member row that has an email (default role
     * "agent"). Returns a short summary to append to the success flash; skips
     * (dedup / seat cap) are tallied so nothing fails the website creation.
     */
    private function inviteOnboardingMembers(TeamInvitationService $service, int $teamId, User $user, array $members): string
    {
        $team = Team::find($teamId);
        if (! $team) {
            return '';
        }

        $invited = 0;
        $skipped = 0;
        foreach ($members as $member) {
            $email = trim((string) ($member['email'] ?? ''));
            if ($email === '') {
                continue;
            }

            $result = $service->invite($team, $user, $email, 'agent');
            $result['status'] === 'invited' ? $invited++ : $skipped++;
        }

        if ($invited === 0 && $skipped === 0) {
            return '';
        }

        $summary = " Invited {$invited} team member".($invited === 1 ? '' : 's').'.';
        if ($skipped > 0) {
            $summary .= " {$skipped} couldn’t be invited (already invited or seat limit).";
        }

        return $summary;
    }

    /** Whether the user already has an MLS feed wired up (skip the MLS step if so). */
    private function userHasMls($user): bool
    {
        $hasActiveConnection = $user->idxConnections()->where('is_active', true)->exists();
        $hasIntegratedRequest = MlsConnectionRequest::where('user_id', $user->id)
            ->where('status', MlsConnectionRequest::STATUS_INTEGRATED)
            ->exists();

        return $hasActiveConnection || $hasIntegratedRequest;
    }

    /** Strip scheme/path/whitespace so we store a bare host (or null for temp domains). */
    private function normalizeDomain(?string $domain): ?string
    {
        $domain = trim((string) $domain);
        if ($domain === '') {
            return null;
        }

        $domain = preg_replace('#^https?://#i', '', $domain);
        $domain = explode('/', $domain)[0];

        return strtolower(trim($domain)) ?: null;
    }

    /**
     * Assemble the page_data JSON: template defaults, AI copy overlaid onto the
     * home/buy/sell/about pages, seeded feature blocks, and a _config.features
     * record of every wizard choice.
     */
    private function buildPageData(string $template, array $generated, array $features, string $featured, bool $blogging, string $country = 'US', array $teamMembers = []): array
    {
        $pageData = config("template-defaults.{$template}", []);

        $overlay = [
            'home' => ['hero_headline' => $generated['hero_headline'] ?? null, 'hero_subtitle' => $generated['hero_subtitle'] ?? null],
            'about' => ['about_extended' => $generated['about_extended'] ?? null],
            'buy' => ['headline' => $generated['buy_headline'] ?? null, 'description' => $generated['buy_description'] ?? null],
            'sell' => ['headline' => $generated['sell_headline'] ?? null, 'description' => $generated['sell_description'] ?? null],
        ];
        foreach ($overlay as $page => $fields) {
            foreach (array_filter($fields, fn ($v) => ! empty($v)) as $key => $value) {
                $pageData[$page][$key] = $value;
            }
        }

        // Seed home-page blocks for the feature picks that have a block, plus the
        // featured-listings choice (its own wizard question).
        $blocks = [];
        foreach ($features as $feature) {
            // Team is handled below so it can carry the agents added in the wizard.
            if ($feature === 'team_profiles' || ! isset(self::FEATURE_BLOCKS[$feature])) {
                continue;
            }
            $blocks[] = $this->makeBlock(self::FEATURE_BLOCKS[$feature]);
        }

        // Team block — seeded when the team feature is selected or agents were added.
        $members = $this->normalizeTeamMembers($teamMembers);
        if (in_array('team_profiles', $features, true) || ! empty($members)) {
            $blocks[] = $this->makeBlock('team', [
                'title' => 'Meet Our Team',
                'members' => json_encode($members),
            ]);
            if (! in_array('team_profiles', $features, true)) {
                $features[] = 'team_profiles';
            }
        }

        if ($featured !== 'none') {
            $blocks[] = $this->makeBlock('featured', ['scope' => $featured === 'office' ? 'office' : 'agent']);
        }
        if (! empty($blocks)) {
            $existing = $pageData['home']['blocks'] ?? [];
            $pageData['home']['blocks'] = array_merge($existing, $blocks);
        }

        $pageData['_config'] = array_merge($pageData['_config'] ?? [], [
            'features' => array_values($features),
            'featured_listings' => $featured,
            'blogging_enabled' => $blogging,
            'country' => $country,
        ]);

        return $pageData;
    }

    /**
     * Map wizard team members to the Team block's member shape
     * ({image, first_name, last_name, role}), dropping fully-empty rows.
     *
     * @return array<int, array{image:string, first_name:string, last_name:string, role:string}>
     */
    private function normalizeTeamMembers(array $members): array
    {
        return collect($members)
            ->map(fn ($m) => [
                'image' => '',
                'first_name' => trim((string) ($m['first_name'] ?? '')),
                'last_name' => trim((string) ($m['last_name'] ?? '')),
                'role' => trim((string) ($m['role'] ?? '')),
            ])
            ->filter(fn ($m) => $m['first_name'] !== '' || $m['last_name'] !== '' || $m['role'] !== '')
            ->values()
            ->all();
    }

    /** Build a single block record matching the page_data block shape ({id,type,slot,data}). */
    private function makeBlock(string $type, array $data = []): array
    {
        return [
            'id' => (string) Str::uuid(),
            'type' => $type,
            'slot' => 'default',
            'data' => $data,
        ];
    }

    /** Turn the entered community names into WebsiteArea rows. */
    private function seedCommunities(AgentWebsite $website, array $communities): void
    {
        $order = 0;
        foreach ($communities as $name) {
            $name = trim((string) $name);
            if ($name === '') {
                continue;
            }
            WebsiteArea::create([
                'agent_website_id' => $website->id,
                'name' => $name,
                'slug' => Str::slug($name),
                'sort_order' => $order++,
                'is_active' => true,
            ]);
        }
    }

    /**
     * File a pending MLS connection request for the chosen provider. Mirrors the
     * duplicate-guard in {@see MlsConnectionRequestController::store()}; the agent
     * completes the broker/license details later from the IDX page.
     */
    private function createMlsRequest($user, int $providerId, ?string $brokerageName): void
    {
        $provider = MlsProvider::find($providerId);
        if (! $provider || $provider->visibility !== MlsProvider::VISIBILITY_VISIBLE) {
            return;
        }

        $existing = MlsConnectionRequest::where('user_id', $user->id)
            ->where('mls_provider_id', $provider->id)
            ->whereIn('status', [
                MlsConnectionRequest::STATUS_PENDING,
                MlsConnectionRequest::STATUS_IN_PROCESS,
                MlsConnectionRequest::STATUS_COMPLETED,
                MlsConnectionRequest::STATUS_INTEGRATED,
            ])
            ->exists();
        if ($existing) {
            return;
        }

        $feeds = array_values(array_filter([
            $provider->has_idx_feed ? 'idx' : null,
            $provider->has_vow_feed ? 'vow' : null,
        ])) ?: ['idx'];

        MlsConnectionRequest::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'mls_provider_id' => $provider->id,
            'status' => MlsConnectionRequest::STATUS_PENDING,
            'feed_types_requested' => $feeds,
            'brokerage_name' => $brokerageName,
            'user_notes' => 'Requested during website onboarding.',
        ]);
    }
}
