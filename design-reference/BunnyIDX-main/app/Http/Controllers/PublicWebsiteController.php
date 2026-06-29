<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Jobs\SendLeadNotificationEmail;
use App\Models\Activity;
use App\Models\AgentWebsite;
use App\Models\AgentWebsiteListingSlug;
use App\Models\CondoBuilding;
use App\Models\Contact;
use App\Models\NewDevelopment;
use App\Models\Task;
use App\Models\User;
use App\Models\WebsiteArea;
use App\Services\Mls\FeaturedListingsResolver;
use App\Services\Mls\ListingSlugResolver;
use App\Services\Mls\MlsGateway;
use App\Services\Mls\PublicPropertySearch;
use App\Services\Sites\AreaDescription;
use App\Services\Sites\CommunityLifestyles;
use App\Services\Sites\CommunityPropertyPages;
use App\Services\Sites\VisitorAuth;
use App\Services\Sites\VisitorCrm;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PublicWebsiteController extends Controller
{
    /**
     * Resolve a site for public viewing. Published sites are visible to
     * everyone; an unpublished (draft) site is visible only to its owner — so
     * "View Live Site" works as a preview instead of returning 404.
     *
     * @return array{0: AgentWebsite, 1: bool} [site, isOwner]
     */
    private function resolveViewableSite(string $slug): array
    {
        $site = AgentWebsite::where('slug', $slug)->firstOrFail();

        $isOwner = false;
        if ($user = auth()->user()) {
            $isOwner = $site->user_id === $user->id
                || ($user->team_id && $site->team_id === $user->team_id);
        }

        abort_unless($site->is_published || $isOwner, 404);

        return [$site, $isOwner];
    }

    public function show(string $slug, string $page = 'home')
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        // Block disabled pages (except for owners)
        $disabledPages = $site->page_data['_config']['disabled_pages'] ?? [];
        if (in_array($page, $disabledPages) && ! $isOwner) {
            abort(404);
        }

        $viewPath = "agent-website.templates.{$site->template}.{$page}";

        abort_unless(view()->exists($viewPath), 404);

        $site->resolvePageData();

        $data = ['site' => $site, 'isOwner' => $isOwner, 'currentPage' => $page];

        // Pass paginated blog posts for the blog listing page
        if ($page === 'blog') {
            $data['posts'] = $site->blogPosts()->published()->orderByDesc('published_at')->paginate(9);
        }

        // Pass areas for the areas listing page
        if ($page === 'areas') {
            $data['areas'] = $site->areas()->active()->orderBy('sort_order')->orderBy('name')->get();
        }

        return view($viewPath, $data);
    }

    /**
     * Shared, theme-agnostic property-search page (map + grid). Single
     * implementation rendered for every template — it extends the active
     * theme's layout for the header/footer but ships its own self-contained
     * search experience (Inter, Google Maps, own asset bundle). Listings are
     * loaded client-side from {@see searchProperties()}.
     */
    public function properties(string $slug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $disabledPages = $site->page_data['_config']['disabled_pages'] ?? [];
        if (in_array('properties', $disabledPages, true) && ! $isOwner) {
            abort(404);
        }

        $site->resolvePageData();

        return view('agent-website.search.index', [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'properties',
            'googleMapsKey' => config('services.google.maps_key'),
            // Live active-listing total (2h-cached count query) — SEO title/meta.
            'listingsTotal' => app(PublicPropertySearch::class)->totalActiveCount($site),
        ]);
    }

    /**
     * JSON listings feed for the public search page. Scoped to the site owner's
     * MLS connection(s) — the visitor is never authenticated and never hits an
     * upstream MLS directly. Read-only; safe to expose publicly.
     */
    public function searchProperties(Request $request, string $slug, PublicPropertySearch $search)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        // Lead gating: when the search is locked, guests get no data either —
        // the page UI is already blurred behind the forced login modal.
        if (data_get($site->page_data, '_config.search.require_login_search')
            && ! $isOwner
            && ! app(VisitorAuth::class)->current($site)) {
            return response()->json([
                'integrated' => true,
                'listings' => [],
                'total' => 0,
                'page' => 1,
                'per_page' => 20,
                'compliance' => [],
                'error' => 'Sign up or log in to view listings.',
            ], 401);
        }

        $filters = $request->input('filters', []);
        if (! is_array($filters)) {
            $filters = [];
        }

        return response()->json(
            $search->search($site, $filters, (int) $request->input('page', 1))
        );
    }

    /**
     * Public listing detail page — the SEO address-slug URL. The slug maps back
     * to the (mls_slug, listing_id) pair via agent_website_listing_slugs, then
     * the listing is resolved through the gateway using the site owner's
     * connection. Theme-agnostic, shares the search page's asset bundle.
     */
    /**
     * Curated listings pages — Featured Properties ('featured') and Past
     * Transactions ('sold'). Manual CRM listings + the section's saved MLS
     * config, rendered by the active template's `listings` view.
     */
    public function listingsSection(string $slug, string $section)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);
        $section = $section === 'sold' ? 'sold' : 'featured';
        $page = $section === 'sold' ? 'sold' : 'featured';

        $disabledPages = $site->page_data['_config']['disabled_pages'] ?? [];
        if (in_array($page, $disabledPages, true) && ! $isOwner) {
            abort(404);
        }

        $viewPath = "agent-website.templates.{$site->template}.listings";
        abort_unless(view()->exists($viewPath), 404);

        $resolved = FeaturedListingsResolver::resolveSection($site, $section);

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => $page,
            'section' => $section,
            'sectionTitle' => $section === 'sold' ? 'Past Transactions' : 'Featured Properties',
            'cards' => $resolved['listings'],
            'compliance' => $resolved['compliance'],
        ]);
    }

    /** Standalone mortgage calculator page (client-side estimator). */
    public function mortgageCalculator(string $slug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $disabledPages = $site->page_data['_config']['disabled_pages'] ?? [];
        if (in_array('mortgage-calculator', $disabledPages, true) && ! $isOwner) {
            abort(404);
        }

        $viewPath = "agent-website.templates.{$site->template}.mortgage-calculator";
        abort_unless(view()->exists($viewPath), 404);

        $site->resolvePageData();

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'mortgage-calculator',
        ]);
    }

    /**
     * Standalone Market Trends dashboard — a theme-agnostic system page (like
     * the property search) that charts the owner's local market from live MLS
     * sold/active data. Area picker via ?area=; stats are 6h-cached server-side.
     */
    public function marketTrends(Request $request, string $slug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $disabledPages = $site->page_data['_config']['disabled_pages'] ?? [];
        if (in_array('market-trends', $disabledPages, true) && ! $isOwner) {
            abort(404);
        }

        $site->resolvePageData();

        $area = trim((string) $request->query('area')) ?: null;
        $market = app(PublicPropertySearch::class)->marketStats($site, $area);

        // Area-aware SEO defaults. Owner per-page overrides (page_data.
        // market-trends.meta_*) and site-wide meta still win — same precedence as
        // seoTitle()/seoDescription(); we replicate it here only to fold in the
        // resolved area, and pass the result to the template layout.
        $resolvedArea = $market['area'] ?? null;
        $name = $site->agent_name ?: ($site->brokerage_name ?: 'Real Estate');
        $metaTitle = trim((string) data_get($site->page_data, 'market-trends.meta_title'))
            ?: (trim((string) $site->meta_title)
                ?: (($resolvedArea ? "{$resolvedArea} Market Trends" : 'Market Trends')." | {$name}"));
        $metaDescription = trim((string) data_get($site->page_data, 'market-trends.meta_description'))
            ?: (trim((string) $site->meta_description)
                ?: ('Local real estate market trends'.($resolvedArea ? " for {$resolvedArea}" : '')
                    .' — median sale price, price per sq ft, days on market and inventory from live MLS data, by '.$name.'.'));

        return view('agent-website.market-trends.index', [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'market-trends',
            'market' => $market,
            'metaTitle' => $metaTitle,
            'metaDescription' => $metaDescription,
        ]);
    }

    /** Public team page — active members grid (auto-available once members exist). */
    public function teamIndex(string $slug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $disabledPages = $site->page_data['_config']['disabled_pages'] ?? [];
        if (in_array('team', $disabledPages, true) && ! $isOwner) {
            abort(404);
        }

        $viewPath = "agent-website.templates.{$site->template}.team";
        abort_unless(view()->exists($viewPath), 404);

        $members = $site->teamMembers()->active()->orderBy('sort_order')->orderBy('name')->get();
        abort_unless($members->isNotEmpty() || $isOwner, 404);

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'team',
            'members' => $members,
        ]);
    }

    /** A team member's page — bio, contact and their listings (MLS agent id). */
    public function teamMember(string $slug, string $memberSlug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $viewPath = "agent-website.templates.{$site->template}.team-member";
        abort_unless(view()->exists($viewPath), 404);

        $member = $site->teamMembers()->active()->where('slug', $memberSlug)->firstOrFail();

        $listings = ['listings' => [], 'compliance' => null];
        $sold = ['listings' => [], 'compliance' => null];
        if ($member->mls_agent_id) {
            $listings = FeaturedListingsResolver::resolveForAgentId($site, $member->mls_agent_id);
            $sold = FeaturedListingsResolver::resolveForAgentId($site, $member->mls_agent_id, sold: true);
        }

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'team',
            'member' => $member,
            'memberListings' => $listings['listings'],
            'memberSold' => $sold['listings'],
            'compliance' => $listings['compliance'] ?: $sold['compliance'],
        ]);
    }

    public function propertyDetail(string $slug, string $propertySlug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        // Unknown slug (404) or a known listing the MLS no longer returns
        // (sold/withdrawn → 410): both render a friendly "no longer available"
        // page with alternative listings instead of a bare error.
        $ref = app(ListingSlugResolver::class)->find($site, $propertySlug);
        if (! $ref) {
            return $this->unavailableListing($site, $isOwner, $propertySlug, 404);
        }

        $listing = $this->resolveListing($site, $ref->mls_slug, $ref->listing_id);
        if (! $listing) {
            return $this->unavailableListing($site, $isOwner, $propertySlug, 410);
        }

        // Upcoming open houses (RESO OpenHouse resource, best-effort + cached).
        $owner = $this->ownerUser($site);
        $openHouses = $owner
            ? app(MlsGateway::class)->openHousesFor($owner, $ref->mls_slug, [$ref->listing_id])[$ref->listing_id] ?? []
            : [];
        $listing['open_houses'] = PublicPropertySearch::formatOpenHouses($openHouses);

        // Logged-in visitors leave a "viewed this listing" entry on their CRM
        // contact timeline (deduped — refreshes don't spam the agent).
        $visitor = app(VisitorAuth::class)->current($site);
        if ($visitor) {
            $address = data_get($listing, 'address.full') ?: $ref->listing_id;
            app(VisitorCrm::class)->logActivity(
                $site, $visitor, 'listing_viewed', "Viewed a listing: {$address}",
                ['mls_slug' => $ref->mls_slug, 'listing_id' => $ref->listing_id], 60,
            );
        }

        return view('agent-website.search.property', [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'properties',
            'listing' => $listing,
            'mlsId' => $ref->listing_id,
            'mlsSlug' => $ref->mls_slug,
            'visitor' => $visitor,
            'courtesy' => $this->courtesyBlock($site, $ref->mls_slug, $listing),
            'googleMapsKey' => config('services.google.maps_key'),
        ]);
    }

    /**
     * Friendly page for a listing that 404s or has left the MLS: explains the
     * listing is gone and shows alternative listings — nearby ones first (the
     * ZIP parsed off the address slug), the site's featured listings as the
     * fallback. 410 for known-but-gone listings tells search engines to drop
     * the URL; 404 for slugs we never knew.
     */
    private function unavailableListing(AgentWebsite $site, bool $isOwner, string $propertySlug, int $status)
    {
        // "734-michigan-ave-7-miami-beach-fl-33139" → a readable address line.
        $addressGuess = Str::of($propertySlug)->replace('-', ' ')->title()
            ->replaceMatches('/\b(Fl|Ca|Ny|Tx|Ga|Nc|Sc|Az|Nv|Wa|Or|Co|Il|Nj|Pa|Oh|Mi|Va|Tn|Mo|Md|Ma|Mn|Wi|Al|La|Ky|Ok|Ct|Ut|Ia|Ar|Ms|Ks|Nm|Ne|Id|Hi|Nh|Me|Mt|Ri|De|Sd|Nd|Ak|Vt|Wy|Wv|Dc)\b/', fn ($m) => strtoupper($m[0]))
            ->toString();

        // Alternatives, best location match first. Slug shape is
        // "street…-city…-st-zip", so: exact-ZIP segment → city guess (the one
        // or two words before the state code — covers "Florida City") →
        // newest active listings feed-wide → the site's featured listings.
        $parts = array_values(array_filter(explode('-', $propertySlug)));
        $zip = preg_match('/^\d{5}$/', (string) end($parts)) ? end($parts) : null;

        $trimmed = $parts;
        if (preg_match('/^\d+$/', (string) end($trimmed))) {
            array_pop($trimmed); // zip (even malformed)
        }
        if (preg_match('/^[a-z]{2}$/i', (string) end($trimmed))) {
            array_pop($trimmed); // state code
        }
        $n = count($trimmed);
        $cityGuesses = array_values(array_unique(array_filter([
            $n >= 2 ? ucwords($trimmed[$n - 2].' '.$trimmed[$n - 1]) : null,
            $n >= 1 ? ucwords((string) $trimmed[$n - 1]) : null,
        ])));

        $attempts = array_values(array_filter([
            $zip ? ['zips' => [$zip]] : null,
            ...array_map(fn ($city) => ['cities' => [$city]], $cityGuesses),
            [], // no location filter → the feed's newest active listings
        ]));

        $alternatives = [];
        foreach ($attempts as $criteria) {
            $res = FeaturedListingsResolver::resolveForArea($site, $criteria + ['limit' => 6]);
            if (! ($res['integrated'] ?? false)) {
                break; // no MLS connected — only the featured fallback can help
            }
            if (! empty($res['listings'])) {
                $alternatives = $res['listings'];
                break;
            }
        }
        if ($alternatives === []) {
            $featured = FeaturedListingsResolver::resolveSection($site, 'featured');
            $alternatives = array_slice($featured['listings'] ?? [], 0, 6);
        }

        return response()->view('agent-website.search.property-unavailable', [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'properties',
            'addressGuess' => $addressGuess,
            'alternatives' => $alternatives,
        ], $status);
    }

    /**
     * MLS courtesy/attribution for a listing-detail page — listing office plus
     * the MLS name, logo and disclaimer (required wherever MLS data is shown).
     *
     * @param  array<string, mixed>  $listing
     * @return array{office: ?string, mls_name: ?string, logo: ?string, disclaimer: ?string}
     */
    private function courtesyBlock(AgentWebsite $site, string $mlsSlug, array $listing): array
    {
        $office = $listing['list_office_name'] ?? null;

        // Manual listings carry no MLS attribution — just the listing office.
        if ($mlsSlug === 'manual') {
            return ['office' => $office, 'mls_name' => null, 'logo' => null, 'disclaimer' => null];
        }

        if (config('services.property_search.mock')) {
            return [
                'office' => $office,
                'mls_name' => 'Sample MLS',
                'logo' => null,
                'disclaimer' => 'Sample data shown for layout preview only — these are not real MLS listings.',
            ];
        }

        $owner = $this->ownerUser($site);
        $c = $owner ? app(MlsGateway::class)->complianceForSlug($owner, $mlsSlug) : null;

        return [
            'office' => $office,
            'mls_name' => $c['mls_name'] ?? null,
            'logo' => $c['compliance_logo_url'] ?? $c['mls_logo_url'] ?? null,
            'disclaimer' => $c['disclaimer'] ?? $c['attribution_template'] ?? null,
        ];
    }

    /**
     * Legacy pre-SEO detail URLs (/property/{mls}/{listingKey}) — resolve the
     * listing, mint its address slug if needed, and 301 to the SEO URL so old
     * indexed/shared links keep working.
     */
    public function propertyDetailLegacy(string $slug, string $mlsSlug, string $mlsId)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $resolver = app(ListingSlugResolver::class);
        $ref = AgentWebsiteListingSlug::where('agent_website_id', $site->id)
            ->where('mls_slug', $mlsSlug)
            ->where('listing_id', $mlsId)
            ->first();

        if (! $ref) {
            $listing = $this->resolveListing($site, $mlsSlug, $mlsId);
            if (! $listing) {
                return $this->unavailableListing($site, $isOwner, '', 410);
            }

            $address = data_get($listing, 'address.full')
                ?? trim(implode(', ', array_filter([
                    data_get($listing, 'address.street'),
                    data_get($listing, 'address.city'),
                    data_get($listing, 'address.state_province'),
                ])));
            $propertySlug = $resolver->slugFor($site, $mlsSlug, $mlsId, (string) $address);
        } else {
            $propertySlug = $ref->slug;
        }

        return redirect()->route('agent-site.property', [$site->slug, $propertySlug], 301);
    }

    /**
     * Resolve a single listing payload (MlsListing::toArray shape) for the
     * detail page — mock sample in PROPERTY_SEARCH_MOCK mode, gateway otherwise.
     *
     * @return array<string, mixed>|null
     */
    private function resolveListing(AgentWebsite $site, string $mlsSlug, string $mlsId): ?array
    {
        // Manual (off-MLS) listings curated from the CRM — same detail template.
        if ($mlsSlug === 'manual') {
            $manual = FeaturedListingsResolver::manualListing($site, (int) $mlsId);

            return $manual ? FeaturedListingsResolver::manualDetail($site, $manual) : null;
        }

        if (config('services.property_search.mock')) {
            return app(PublicPropertySearch::class)->mockDetail($mlsId);
        }

        $owner = $this->ownerUser($site);

        return ($owner ? app(MlsGateway::class)->get($owner, $mlsSlug, $mlsId) : null)?->toArray();
    }

    /** The user whose MLS connections power a site's listing lookups (handles team sites). */
    private function ownerUser(AgentWebsite $site): ?User
    {
        if ($site->user_id) {
            return User::find($site->user_id);
        }
        if ($site->team_id) {
            return User::where('team_id', $site->team_id)
                ->whereHas('idxConnections', fn ($q) => $q->where('is_active', true))
                ->first()
                ?? User::where('team_id', $site->team_id)->first();
        }

        return null;
    }

    /**
     * Condo Directory — the platform-curated building catalog (admin-managed),
     * grouped by area with a client-side name search. 404 unless the owner
     * switched the directory on in the editor.
     */
    public function condosIndex(string $slug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        abort_unless($site->condoDirectoryEnabled() || $isOwner, 404);

        $viewPath = "agent-website.templates.{$site->template}.condos";
        abort_unless(view()->exists($viewPath), 404);

        $buildings = CondoBuilding::query()->active()
            ->visibleToSite($site)
            ->orderBy('area')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $siteName = $site->agent_name ?: ($site->brokerage_name ?: 'Real Estate');

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'condos',
            'directoryEnabled' => $site->condoDirectoryEnabled(),
            'groups' => $buildings->groupBy('area'),
            'totalBuildings' => $buildings->count(),
            // Owner's per-page SEO (editor → SEO → Per-Page) wins over the default.
            'metaTitle' => data_get($site->page_data, 'condos.meta_title') ?: "Condo Directory | {$siteName}",
            'metaDescription' => data_get($site->page_data, 'condos.meta_description') ?: 'Browse condo buildings by area — find your perfect condo for sale in any neighborhood.',
        ]);
    }

    /** One condo building's page — curated info + its live MLS listings. */
    public function condoBuilding(Request $request, string $slug, string $buildingSlug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        abort_unless($site->condoDirectoryEnabled() || $isOwner, 404);

        $viewPath = "agent-website.templates.{$site->template}.condo-building";
        abort_unless(view()->exists($viewPath), 404);

        $building = CondoBuilding::query()->active()->visibleToSite($site)->where('slug', $buildingSlug)->firstOrFail();

        // Live listings in this building — matched by the building's street
        // address when we have one (UnparsedAddress contains), falling back
        // to the MLS subdivision/condo keyword. Cached; visits never block on
        // the MLS.
        $street = $building->streetAddress();
        $criteria = array_filter([
            'query' => $street,
            'subdivisions' => $street ? null : [$building->listingKeyword()],
            'cities' => $building->city ? [$building->city] : null,
            'limit' => 12,
        ]);
        $page = max(1, (int) $request->query('page', 1));
        $mls = FeaturedListingsResolver::resolveForArea($site, $criteria, $page);

        $siteName = $site->agent_name ?: ($site->brokerage_name ?: 'Real Estate');

        // Other visible buildings by the same developer ("More by ..." section).
        $moreByDeveloper = $building->developer
            ? CondoBuilding::query()->active()->visibleToSite($site)
                ->where('developer', $building->developer)
                ->where('id', '!=', $building->id)
                ->orderBy('sort_order')->orderBy('name')
                ->limit(8)
                ->get()
            : collect();

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'condos',
            'building' => $building,
            'moreByDeveloper' => $moreByDeveloper,
            'buildingListings' => $mls['listings'],
            'mlsIntegrated' => $mls['integrated'],
            'listingsTotal' => (int) ($mls['total'] ?? 0),
            'listingsPage' => (int) ($mls['page'] ?? $page),
            'listingsPerPage' => (int) ($mls['per_page'] ?? 12),
            'metaTitle' => "{$building->name} Condos for Sale | {$building->area} | {$siteName}",
            'metaDescription' => "View condos for sale at {$building->name} in {$building->area}".($building->address ? " — {$building->address}" : '').'. Live MLS listings, photos and prices.',
        ]);
    }

    /**
     * New Developments — the platform-curated pre-construction catalog,
     * grouped by area with a client-side name search (the Condo Directory's
     * sibling). 404 unless the owner switched it on in the editor.
     */
    public function newDevelopmentsIndex(string $slug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        abort_unless($site->newDevelopmentsEnabled() || $isOwner, 404);

        $viewPath = "agent-website.templates.{$site->template}.new-developments";
        abort_unless(view()->exists($viewPath), 404);

        $developments = NewDevelopment::query()->active()
            ->visibleToSite($site)
            ->orderBy('area')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $siteName = $site->agent_name ?: ($site->brokerage_name ?: 'Real Estate');

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'new-developments',
            'directoryEnabled' => $site->newDevelopmentsEnabled(),
            'groups' => $developments->groupBy('area'),
            'totalDevelopments' => $developments->count(),
            // Owner's per-page SEO (editor → SEO → Per-Page) wins over the default.
            'metaTitle' => data_get($site->page_data, 'new-developments.meta_title') ?: "New Developments & Pre-Construction Condos | {$siteName}",
            'metaDescription' => data_get($site->page_data, 'new-developments.meta_description') ?: 'Discover new pre-construction developments. Browse upcoming projects by area, developer and amenities.',
        ]);
    }

    /** One development's page — curated project info + its live MLS listings. */
    public function newDevelopmentShow(Request $request, string $slug, string $devSlug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        abort_unless($site->newDevelopmentsEnabled() || $isOwner, 404);

        $viewPath = "agent-website.templates.{$site->template}.new-development";
        abort_unless(view()->exists($viewPath), 404);

        $development = NewDevelopment::query()->active()->visibleToSite($site)->where('slug', $devSlug)->firstOrFail();

        // Live listings in the project — matched by the building's street
        // address when we have one (UnparsedAddress contains), falling back to
        // the subdivision-keyword search the Condo Directory uses. Cached;
        // visits never block on the MLS.
        $street = $development->streetAddress();
        $criteria = array_filter([
            'query' => $street,
            'subdivisions' => $street ? null : [$development->listingKeyword()],
            'cities' => $development->city ? [$development->city] : null,
            'limit' => 12,
        ]);
        $page = max(1, (int) $request->query('page', 1));
        $mls = FeaturedListingsResolver::resolveForArea($site, $criteria, $page);

        $siteName = $site->agent_name ?: ($site->brokerage_name ?: 'Real Estate');

        // Other visible projects by the same developer ("More by …" section).
        $moreByDeveloper = $development->developer
            ? NewDevelopment::query()->active()->visibleToSite($site)
                ->where('developer', $development->developer)
                ->where('id', '!=', $development->id)
                ->orderBy('sort_order')->orderBy('name')
                ->limit(8)
                ->get()
            : collect();

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'new-developments',
            'development' => $development,
            'moreByDeveloper' => $moreByDeveloper,
            'developmentListings' => $mls['listings'],
            'mlsIntegrated' => $mls['integrated'],
            'listingsTotal' => (int) ($mls['total'] ?? 0),
            'metaTitle' => "{$development->name} | New Development in {$development->area} | {$siteName}",
            'metaDescription' => "Explore {$development->name}, a ".strtolower($development->statusLabel())." development in {$development->area}".($development->developer ? " by {$development->developer}" : '').'. Photos, highlights and live listings.',
        ]);
    }

    public function areaShow(Request $request, string $slug, string $areaSlug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $area = $site->areas()->active()->where('slug', $areaSlug)->firstOrFail();

        return $this->renderAreaPage($request, $site, $isOwner, $area, null);
    }

    /**
     * A community's SEO sub-page — either a configured sub-area (city / zip /
     * neighborhood within the community) or an enabled lifestyle page
     * (Condos, Waterfront, 55+, …). Both render the community template with
     * the parent's filters narrowed to the slice.
     */
    public function areaSubShow(Request $request, string $slug, string $areaSlug, string $subSlug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $area = $site->areas()->active()->where('slug', $areaSlug)->firstOrFail();

        if ($sub = $area->findSubArea($subSlug)) {
            return $this->renderAreaPage($request, $site, $isOwner, $area, [
                'kind' => $sub['type'],
                'key' => $sub['slug'],
                'label' => $sub['label'],
                'copy' => null,
                'criteria' => $area->criteriaForSubArea($sub),
            ]);
        }

        $supported = CommunityLifestyles::supportedKeywordsFor($site);
        foreach (CommunityLifestyles::pagesFor($area, $supported) as $pageDef) {
            if ($pageDef['key'] === $subSlug) {
                return $this->renderAreaPage($request, $site, $isOwner, $area, [
                    'kind' => 'lifestyle',
                    'key' => $pageDef['key'],
                    'label' => $pageDef['label'],
                    'copy' => $pageDef['copy'],
                    'criteria' => CommunityLifestyles::criteriaFor($area, $subSlug),
                ]);
            }
        }

        // Enabled property type / sub-type pages (taxonomy-driven slices).
        foreach (CommunityPropertyPages::pagesFor($site, $area) as $pageDef) {
            if ($pageDef['key'] === $subSlug) {
                return $this->renderAreaPage($request, $site, $isOwner, $area, [
                    'kind' => $pageDef['kind'], // property_type | property_subtype
                    'key' => $pageDef['key'],
                    'label' => $pageDef['label'],
                    // Search-intent display phrase ("Condos for Sale") — H1/meta/links.
                    'seo_label' => $pageDef['seo_label'] ?? $pageDef['label'],
                    'copy' => $pageDef['copy'],
                    'criteria' => CommunityPropertyPages::criteriaFor($area, $pageDef),
                ]);
            }
        }

        // Auto-discovered ZIP pages — any ZIP seen in the community's live MLS
        // listings resolves even when not configured as a sub-area.
        if (preg_match('/^\d{5}$/', $subSlug)
            && in_array($subSlug, FeaturedListingsResolver::zipsForArea($site, (array) ($area->search_criteria ?? [])), true)) {
            return $this->renderAreaPage($request, $site, $isOwner, $area, [
                'kind' => 'zip',
                'key' => $subSlug,
                'label' => $subSlug,
                'copy' => null,
                'criteria' => $area->criteriaForSubArea(['type' => 'zip', 'label' => $subSlug, 'value' => $subSlug, 'slug' => $subSlug]),
            ]);
        }

        abort(404);
    }

    /**
     * Shared renderer for a community page and its sub-pages. $sub (null on
     * the community page itself): {kind: city|zip|neighborhood|lifestyle,
     * key, label, copy, criteria}.
     */
    private function renderAreaPage(Request $request, AgentWebsite $site, bool $isOwner, WebsiteArea $area, ?array $sub)
    {
        $viewPath = "agent-website.templates.{$site->template}.area";
        if (! view()->exists($viewPath)) {
            abort(404);
        }

        $page = max(1, (int) $request->query('page', 1));
        $criteria = $sub['criteria'] ?? ($area->search_criteria ?? []);
        $mls = FeaturedListingsResolver::resolveForArea($site, $criteria, $page);

        $supported = CommunityLifestyles::supportedKeywordsFor($site);
        $lifestylePages = CommunityLifestyles::pagesFor($area, $supported);
        $propertyPages = CommunityPropertyPages::pagesFor($site, $area);

        // Description with merge variables ({listings_count}, {property_links},
        // …) resolved to live MLS data + internal links; falls back to the
        // written-for-you SEO template when the owner left it empty.
        $listingsTotal = (int) ($mls['total'] ?? 0);

        // Secondary "Homes for Rent" grid — community page + place sub-pages
        // (city/zip/neighborhood). Concept slices (property type / lifestyle)
        // keep their single focused grid.
        $isPlacePage = ! $sub || in_array($sub['kind'], ['city', 'zip', 'neighborhood'], true);
        $rentals = $isPlacePage
            ? FeaturedListingsResolver::resolveRentalsForArea($site, $criteria, 6)
            : ['listings' => [], 'total' => 0];

        $descriptionHtml = $sub
            ? AreaDescription::subPageHtml($site, $area, $sub, $lifestylePages, $propertyPages, $listingsTotal, (bool) $mls['integrated'])
            : AreaDescription::communityHtml($site, $area, $lifestylePages, $propertyPages, $listingsTotal, (bool) $mls['integrated']);

        // SEO: distinct title/description per page in the structure.
        // Lifestyle and property type/subtype pages are concept slices of the
        // community; city/zip/neighborhood sub-pages are places of their own.
        $isConceptSub = $sub && in_array($sub['kind'], ['lifestyle', 'property_type', 'property_subtype'], true);
        $siteName = $site->agent_name ?: ($site->brokerage_name ?: 'Real Estate');
        // Concept pages carry a search-intent phrase ("Condos for Sale").
        $subDisplay = $sub ? ($sub['seo_label'] ?? $sub['label']) : null;
        $headline = $sub ? "{$subDisplay} in {$area->name}" : $area->name;
        $metaTitle = match (true) {
            $isConceptSub => "{$subDisplay} in {$area->name} | {$siteName}",
            $sub && $sub['kind'] === 'zip' => "{$area->name} {$sub['label']} Homes for Sale | {$siteName}",
            (bool) $sub => "{$sub['label']} Homes for Sale | {$area->name} | {$siteName}",
            default => "{$area->name} Homes for Sale & Community Guide | {$siteName}",
        };
        $plainDescription = trim(preg_replace('/\s+/', ' ', strip_tags((string) $descriptionHtml)) ?? '');
        $metaDescription = match (true) {
            $plainDescription !== '' => Str::limit($plainDescription, 158),
            (bool) $sub => "Browse {$sub['label']} real estate in {$area->name}. View photos, prices and details for every current listing.",
            default => "Explore {$area->name} homes for sale, neighborhoods and market insights.",
        };

        return view($viewPath, [
            'site' => $site,
            'area' => $area,
            'sub' => $sub,
            'isOwner' => $isOwner,
            'currentPage' => 'areas',
            'areaListings' => $mls['listings'],
            'mlsIntegrated' => $mls['integrated'],
            'listingsTotal' => (int) ($mls['total'] ?? 0),
            'listingsPage' => (int) ($mls['page'] ?? $page),
            'listingsPerPage' => (int) ($mls['per_page'] ?? 12),
            'rentalListings' => $rentals['listings'],
            'rentalsTotal' => (int) ($rentals['total'] ?? 0),
            'lifestylePages' => $lifestylePages,
            'propertyPages' => $propertyPages,
            'subAreaEntries' => $area->subAreaEntries(),
            // MLS-discovered ZIPs (community page only) extend the configured ZIP links.
            'autoZips' => $sub ? [] : FeaturedListingsResolver::zipsForArea($site, (array) ($area->search_criteria ?? [])),
            'descriptionHtml' => $descriptionHtml,
            'metaTitle' => $metaTitle,
            'metaDescription' => $metaDescription,
        ]);
    }

    public function blogPost(string $slug, string $postSlug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $post = $site->blogPosts()->published()->where('slug', $postSlug)->firstOrFail();

        // Related articles for the post sidebar/footer — latest other published posts.
        $related = $site->blogPosts()->published()
            ->where('id', '!=', $post->id)
            ->orderByDesc('published_at')
            ->limit(4)
            ->get();

        $viewPath = "agent-website.templates.{$site->template}.blog-post";
        if (! view()->exists($viewPath)) {
            abort(404);
        }

        return view($viewPath, ['site' => $site, 'post' => $post, 'related' => $related, 'isOwner' => $isOwner, 'currentPage' => 'blog']);
    }

    public function customPage(string $slug, string $customPage)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        // Verify this custom page exists in config
        $customPages = collect($site->page_data['_config']['custom_pages'] ?? []);
        $pageConfig = $customPages->firstWhere('slug', $customPage);

        abort_unless($pageConfig, 404);

        // Check disabled
        $disabledPages = $site->page_data['_config']['disabled_pages'] ?? [];
        if (in_array($customPage, $disabledPages) && ! $isOwner) {
            abort(404);
        }

        // Use the generic custom page template
        $viewPath = "agent-website.templates.{$site->template}.custom-page";
        if (! view()->exists($viewPath)) {
            abort(404);
        }

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => $customPage,
            'pageTitle' => $pageConfig['title'],
        ]);
    }

    /**
     * Home valuation flow — step 1 of the funnel. The visitor submits their
     * address from the Home Valuation block; this renders the results page that
     * plots the address on a map and captures the lead. Automatic valuation
     * figures will be layered in later.
     */
    public function homeValuation(Request $request, string $slug)
    {
        [$site, $isOwner] = $this->resolveViewableSite($slug);

        $address = trim((string) $request->query('address', ''));

        $viewPath = "agent-website.templates.{$site->template}.home-valuation";
        abort_unless(view()->exists($viewPath), 404);

        $site->resolvePageData();

        return view($viewPath, [
            'site' => $site,
            'isOwner' => $isOwner,
            'currentPage' => 'home-valuation',
            'address' => $address,
        ]);
    }

    public function submitContact(Request $request, string $slug)
    {
        $site = AgentWebsite::where('slug', $slug)->where('is_published', true)->firstOrFail();

        $validated = $request->validate([
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'name' => 'nullable|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'interest' => 'nullable|string|max:100',
            'message' => 'nullable|string|max:5000',
            'lead_type' => 'nullable|in:buyer,seller',
            'property_address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'property_condition' => 'nullable|string|max:255',
            'sms_consent' => 'nullable|boolean',
            'consent' => 'nullable|boolean',
        ]);

        // Marketing consent — checkbox from any of the site's lead forms.
        $consented = (bool) ($validated['sms_consent'] ?? $validated['consent'] ?? false);

        // Resolve first/last name — accept either split fields or single "name" field
        $firstName = $validated['first_name'] ?? null;
        $lastName = $validated['last_name'] ?? null;
        if (! $firstName && ! empty($validated['name'])) {
            $parts = explode(' ', trim($validated['name']), 2);
            $firstName = $parts[0];
            $lastName = $parts[1] ?? '';
        }

        // Build description from available fields
        $descriptionParts = array_filter([
            ! empty($validated['interest']) ? 'Interest: '.$validated['interest'] : null,
            ! empty($validated['property_condition']) ? 'Condition: '.$validated['property_condition'] : null,
            $validated['message'] ?? null,
        ]);

        $contact = Contact::create([
            'user_id' => $site->user_id,
            'team_id' => $site->team_id,
            'first_name' => $firstName ?: 'Unknown',
            'last_name' => $lastName ?: '',
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'type' => $validated['lead_type'] ?? 'buyer',
            'source' => 'Website',
            'address' => $validated['property_address'] ?? null,
            'city' => $validated['city'] ?? null,
            'state_province' => $validated['state'] ?? null,
            'description' => trim(implode("\n", $descriptionParts)),
            'sms_consent' => $consented,
            'sms_consent_at' => $consented ? now() : null,
        ]);

        // Notify the site owner of the new lead via Resend (branded key if set,
        // platform key otherwise). Per-contact idempotency key prevents dupes.
        SendLeadNotificationEmail::dispatch(
            $contact->id,
            $site->user_id,
            'Website',
            'lead:contact:'.$contact->id,
        );

        return redirect()->route('agent-site.thank-you', $slug);
    }

    /**
     * Tour/showing request from the listing detail UI. Creates (or reuses) the
     * CRM lead, logs a timeline activity, and schedules a high-priority task on
     * the site owner's calendar for the requested date/time.
     */
    public function submitShowingRequest(Request $request, string $slug)
    {
        [$site] = $this->resolveViewableSite($slug);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'tour_type' => 'nullable|in:in_person,virtual',
            'date' => 'required|date|after_or_equal:today',
            'time' => 'nullable|date_format:H:i',
            'message' => 'nullable|string|max:2000',
            'property_address' => 'required|string|max:500',
            'consent' => 'nullable|boolean',
        ]);

        $consented = (bool) ($validated['consent'] ?? false);
        $tourType = ($validated['tour_type'] ?? 'in_person') === 'virtual' ? 'Virtual' : 'In person';
        $dueAt = Carbon::parse($validated['date'].' '.($validated['time'] ?? '09:00'));

        // Lead: reuse the visitor's linked contact when logged in, else
        // find-or-create by email under the site owner.
        $visitor = app(VisitorAuth::class)->current($site);
        $contact = $visitor?->contact;
        if (! $contact) {
            $parts = explode(' ', trim($validated['name']), 2);
            $contact = Contact::query()
                ->where('email', $validated['email'])
                ->when($site->team_id, fn ($q) => $q->where('team_id', $site->team_id))
                ->when(! $site->team_id, fn ($q) => $q->where('user_id', $site->user_id))
                ->first()
                ?? Contact::create([
                    'user_id' => $site->user_id,
                    'team_id' => $site->team_id,
                    'first_name' => $parts[0] ?: 'Unknown',
                    'last_name' => $parts[1] ?? '',
                    'email' => $validated['email'],
                    'phone' => $validated['phone'] ?? null,
                    'type' => 'buyer',
                    'source' => 'Showing Request',
                    'sms_consent' => $consented,
                    'sms_consent_at' => $consented ? now() : null,
                ]);
        }

        // Calendar: a task on the owner's CRM calendar at the requested slot.
        Task::create([
            'user_id' => $site->user_id,
            'team_id' => $site->team_id,
            'taskable_id' => $contact->id,
            'taskable_type' => Contact::class,
            'title' => "Tour request ({$tourType}) — {$validated['property_address']}",
            'description' => trim(implode("\n", array_filter([
                "Requested by {$validated['name']} ({$validated['email']}".(! empty($validated['phone']) ? ', '.$validated['phone'] : '').')',
                "Preferred: {$dueAt->format('D, M j Y g:i A')} · {$tourType}",
                $validated['message'] ?? null,
            ]))),
            'priority' => 'high',
            'due_at' => $dueAt,
            'due_date' => $dueAt->toDateString(),
        ]);

        // Timeline activity so the agent sees the request on the contact.
        Activity::create([
            'user_id' => $site->user_id,
            'team_id' => $site->team_id,
            'contact_id' => $contact->id,
            'event_type' => 'showing_requested',
            'subject' => "Requested a {$tourType} tour: {$validated['property_address']}",
            'description' => "Preferred {$dueAt->format('D, M j Y g:i A')}".(! empty($validated['message']) ? ' — '.$validated['message'] : ''),
            'metadata' => ['site_slug' => $site->slug, 'tour_type' => $tourType],
        ]);

        return response()->json(['success' => true]);
    }

    public function thankYou(string $slug)
    {
        $site = AgentWebsite::where('slug', $slug)->where('is_published', true)->firstOrFail();

        $viewPath = "agent-website.templates.{$site->template}.thank-you";

        if (! view()->exists($viewPath)) {
            $viewPath = 'agent-website.thank-you';
        }

        return view($viewPath, ['site' => $site]);
    }

    public function robotsTxt(string $slug)
    {
        $site = AgentWebsite::where('slug', $slug)->where('is_published', true)->firstOrFail();

        $content = $site->robots_txt;
        if (empty($content)) {
            $siteUrl = url("site/{$slug}");
            $content = "User-agent: *\nAllow: /\nSitemap: {$siteUrl}/sitemap.xml";
        }

        return response($content, 200)->header('Content-Type', 'text/plain');
    }

    public function llmsTxt(string $slug)
    {
        $site = AgentWebsite::where('slug', $slug)->where('is_published', true)->firstOrFail();

        $content = $site->llms_txt ?: '';

        return response($content, 200)->header('Content-Type', 'text/plain');
    }

    /**
     * Global, system-level sitemap. Theme-agnostic: it enumerates every public
     * URL the site actually exposes — built-in pages the active template ships,
     * custom pages, community/area pages, and the blog index + posts — rather
     * than a hard-coded page list. Works for any template without changes.
     */
    /** Section keys for the split sitemaps (/sitemap-{section}.xml). */
    private const SITEMAP_SECTIONS = ['pages', 'neighborhoods', 'condos', 'new-developments', 'posts'];

    /**
     * /sitemap.xml — a sitemap INDEX pointing at the per-section child
     * sitemaps (pages / neighborhoods / listings / posts). Only non-empty
     * sections are listed.
     */
    public function sitemap(string $slug)
    {
        // Owner-previewable on drafts (like every page); guests need published.
        [$site] = $this->resolveViewableSite($slug);

        $children = [];
        foreach (self::SITEMAP_SECTIONS as $section) {
            $urls = $this->sitemapSectionUrls($site, $section);
            if ($urls === []) {
                continue;
            }
            $children[] = [
                'loc' => url("site/{$site->slug}/sitemap-{$section}.xml"),
                'lastmod' => collect($urls)->pluck('lastmod')->filter()->max(),
            ];
        }

        return response()->view('agent-website.sitemap-index', ['sitemaps' => $children])
            ->header('Content-Type', 'application/xml');
    }

    /** One child sitemap (/sitemap-pages.xml etc.) — a plain urlset. */
    public function sitemapSection(string $slug, string $section)
    {
        abort_unless(in_array($section, self::SITEMAP_SECTIONS, true), 404);

        [$site] = $this->resolveViewableSite($slug);

        $urls = $this->sitemapSectionUrls($site, $section);
        abort_if($urls === [], 404);

        return response()->view('agent-website.sitemap', ['urls' => $urls])
            ->header('Content-Type', 'application/xml');
    }

    /**
     * URLs for one sitemap section.
     *
     * @return array<int, array{loc: string, lastmod: ?string, priority: string}>
     */
    private function sitemapSectionUrls(AgentWebsite $site, string $section): array
    {
        return array_values(array_filter(
            $this->buildSitemapUrls($site),
            fn ($u) => ($u['section'] ?? 'pages') === $section,
        ));
    }

    /**
     * Build the full set of sitemap URLs for a site, each tagged with its
     * sitemap section (pages / neighborhoods / listings / posts).
     *
     * @return array<int, array{loc: string, lastmod: ?string, priority: string, section: string}>
     */
    private function buildSitemapUrls(AgentWebsite $site): array
    {
        $base = url("site/{$site->slug}");
        $template = $site->template;
        $config = $site->page_data['_config'] ?? [];
        $disabled = $config['disabled_pages'] ?? [];
        $siteLastmod = $site->updated_at?->toW3cString();
        $hasView = fn (string $page) => view()->exists("agent-website.templates.{$template}.{$page}");

        $urls = [];
        $add = function (string $path, ?string $lastmod, string $priority, string $section = 'pages') use (&$urls, $base, $siteLastmod) {
            $urls[] = ['loc' => $base.$path, 'lastmod' => $lastmod ?: $siteLastmod, 'priority' => $priority, 'section' => $section];
        };

        $add('', $siteLastmod, '1.0');

        // Built-in pages — only those the active theme provides and aren't disabled.
        foreach (['about', 'buy', 'sell', 'areas', 'contact', 'home-valuation'] as $page) {
            if (! in_array($page, $disabled, true) && $hasView($page)) {
                // Communities live under /neighborhoods (the page key stays 'areas').
                $add($page === 'areas' ? '/neighborhoods' : "/{$page}", $siteLastmod, '0.8', $page === 'areas' ? 'neighborhoods' : 'pages');
            }
        }

        // Property search — theme-agnostic system page (not a template view).
        if (! in_array('properties', $disabled, true)) {
            $add('/properties', $siteLastmod, '0.8');
        }

        // Curated listings pages (Featured Properties / Past Transactions).
        if ($hasView('listings')) {
            if (! in_array('featured', $disabled, true) && $site->hasListingsSection('featured')) {
                $add('/featured-properties', $siteLastmod, '0.8');
            }
            if (! in_array('sold', $disabled, true) && $site->hasListingsSection('sold')) {
                $add('/past-transactions', $siteLastmod, '0.7');
            }
        }

        // Mortgage calculator — standalone client-side page.
        if ($hasView('mortgage-calculator') && ! in_array('mortgage-calculator', $disabled, true)) {
            $add('/mortgage-calculator', $siteLastmod, '0.6');
        }

        // Market Trends — theme-agnostic system page (not a template view).
        if (! in_array('market-trends', $disabled, true)) {
            $add('/market-trends', $siteLastmod, '0.6');
        }

        // Team index + member pages.
        if ($hasView('team') && ! in_array('team', $disabled, true)) {
            $members = $site->teamMembers()->active()->orderBy('sort_order')->get();
            if ($members->isNotEmpty()) {
                $add('/team', $siteLastmod, '0.7');
                if ($hasView('team-member')) {
                    foreach ($members as $member) {
                        $add("/team/{$member->slug}", $member->updated_at?->toW3cString(), '0.6');
                    }
                }
            }
        }

        // Condo Directory + building pages (platform-curated catalog, opt-in).
        if ($hasView('condos') && $site->condoDirectoryEnabled() && ! in_array('condos', $disabled, true)) {
            $buildings = CondoBuilding::query()->active()->visibleToSite($site)->orderBy('area')->orderBy('sort_order')->orderBy('name')->get();
            if ($buildings->isNotEmpty()) {
                $add('/condos', $siteLastmod, '0.8', 'condos');
                if ($hasView('condo-building')) {
                    foreach ($buildings as $building) {
                        $add("/condos/{$building->slug}", $building->updated_at?->toW3cString(), '0.6', 'condos');
                    }
                }
            }
        }

        // New Developments + project pages (platform catalog and/or the
        // site's own projects, per the owner's source setting; opt-in).
        if ($hasView('new-developments') && $site->newDevelopmentsEnabled() && ! in_array('new-developments', $disabled, true)) {
            $developments = NewDevelopment::query()->active()->visibleToSite($site)->orderBy('area')->orderBy('sort_order')->orderBy('name')->get();
            if ($developments->isNotEmpty()) {
                $add('/new-developments', $siteLastmod, '0.8', 'new-developments');
                if ($hasView('new-development')) {
                    foreach ($developments as $development) {
                        $add("/new-developments/{$development->slug}", $development->updated_at?->toW3cString(), '0.6', 'new-developments');
                    }
                }
            }
        }

        // Custom (test) pages defined in the site config.
        if ($hasView('custom-page')) {
            foreach ($config['custom_pages'] ?? [] as $custom) {
                $pageSlug = $custom['slug'] ?? null;
                if ($pageSlug && ! in_array($pageSlug, $disabled, true)) {
                    $add("/{$pageSlug}", $siteLastmod, '0.7');
                }
            }
        }

        // Community pages + their SEO sub-pages (cities / zips / neighborhoods
        // / lifestyle pages) — the /neighborhoods structure.
        if ($hasView('area')) {
            $supportedLifestyles = CommunityLifestyles::supportedKeywordsFor($site);
            foreach ($site->areas()->active()->orderBy('sort_order')->orderBy('name')->get() as $area) {
                $lastmod = $area->updated_at?->toW3cString();
                $add("/neighborhoods/{$area->slug}", $lastmod, '0.7', 'neighborhoods');
                $subSlugs = [];
                foreach ($area->subAreaEntries() as $subEntry) {
                    $subSlugs[] = $subEntry['slug'];
                    $add("/neighborhoods/{$area->slug}/{$subEntry['slug']}", $lastmod, '0.6', 'neighborhoods');
                }
                // MLS-discovered ZIP sub-pages (cached pull) beyond the configured ones.
                foreach (FeaturedListingsResolver::zipsForArea($site, (array) ($area->search_criteria ?? [])) as $zip) {
                    if (! in_array($zip, $subSlugs, true)) {
                        $add("/neighborhoods/{$area->slug}/{$zip}", $lastmod, '0.6', 'neighborhoods');
                    }
                }
                foreach (CommunityLifestyles::pagesFor($area, $supportedLifestyles) as $lp) {
                    $add("/neighborhoods/{$area->slug}/{$lp['key']}", $lastmod, '0.6', 'neighborhoods');
                }
                foreach (CommunityPropertyPages::pagesFor($site, $area) as $pp) {
                    $add("/neighborhoods/{$area->slug}/{$pp['key']}", $lastmod, '0.6', 'neighborhoods');
                }
            }
        }

        // Blog index + posts, when the theme has the views and there are posts.
        if (! in_array('blog', $disabled, true) && $hasView('blog')) {
            $posts = $site->blogPosts()->published()->orderByDesc('published_at')->get();
            if ($posts->isNotEmpty()) {
                $add('/blog', $siteLastmod, '0.8', 'posts');
                if ($hasView('blog-post')) {
                    foreach ($posts as $post) {
                        $add("/blog/{$post->slug}", $post->updated_at?->toW3cString(), '0.6', 'posts');
                    }
                }
            }
        }

        return $urls;
    }
}
