<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\LandingPage;
use App\Models\Listing;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\MlsGateway;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/**
 * IDX Squeeze / Listing Lead Pages — a separate product from Landing Pages that
 * shares the landing_pages table (partitioned by kind='listing'). No block
 * editor: content lives in page_data._config (+ _listing when a property is
 * attached) and is edited via the simple settings form.
 */
class ListingPageController extends Controller implements HasMiddleware
{
    /**
     * IDX squeeze pages are part of the paid Websites feature. The index list
     * stays open (read-only + upgrade prompt); create/edit/publish are gated.
     */
    public static function middleware(): array
    {
        return [new Middleware('feature:websites', except: ['index'])];
    }

    public function index(Request $request): Response
    {
        $pages = $this->scopedQuery($request)
            ->orderByDesc('created_at')
            ->get(['id', 'uuid', 'slug', 'name', 'type', 'accent_color', 'is_published', 'submissions_count', 'created_at']);

        return Inertia::render('Crm/ListingPages/Index', [
            'pages' => $pages,
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Crm/ListingPages/Create', [
            'presets' => $this->presetOptions(),
            'myListings' => $this->ownListings($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $presetKeys = array_keys(config('listing-page-presets'));

        $validated = $request->validate([
            'preset' => ['required', 'string', 'in:'.implode(',', $presetKeys)],
            'source' => ['nullable', 'string', 'in:none,own,mls'],
            'listing_id' => ['nullable', 'integer'],
            'mls_slug' => ['nullable', 'string', 'max:100'],
            'mls_id' => ['nullable', 'string', 'max:191'],
        ]);

        $preset = config("listing-page-presets.{$validated['preset']}");
        $config = $preset['config'] ?? [];
        $config['design'] = $preset['design'] ?? 'villa-serena';
        $config['gate'] = $config['gate'] ?? true;
        $listing = [];

        $source = $validated['source'] ?? 'none';
        if ($source === 'own' && ! empty($validated['listing_id'])) {
            $own = Listing::forUser($user)->find($validated['listing_id']);
            if ($own) {
                $listing = $this->snapshotFromListing($own);
            }
        } elseif ($source === 'mls' && ! empty($validated['mls_slug']) && ! empty($validated['mls_id'])) {
            $gateway = app(MlsGateway::class);
            $mls = $gateway->get($user, $validated['mls_slug'], $validated['mls_id']);
            if ($mls) {
                $compliance = $gateway->complianceForSlug($user, $validated['mls_slug']);
                $listing = $this->snapshotFromMls($mls, $compliance);
            }
        }

        $name = $preset['name'];
        $teamId = $user->active_context === 'team' ? $user->team_id : null;

        $page = LandingPage::create([
            'user_id' => $user->id,
            'team_id' => $teamId,
            'kind' => 'listing',
            'slug' => LandingPage::generateSlug($listing['address']['street'] ?? $name),
            'name' => $listing['address']['street'] ?? $name,
            'type' => $preset['type'] ?? 'buyer',
            'template' => 'idx-squeeze',
            'accent_color' => $preset['accent'] ?? '#F0563F',
            'agent_name' => $user->name,
            'agent_email' => $user->email,
            'agent_phone' => $user->phone,
            'meta_title' => $listing['address']['full'] ?? $name,
            'page_data' => ['_config' => $config, '_listing' => $listing],
            'is_published' => false,
        ]);

        return redirect()->route('crm.listing-pages.edit', $page->uuid);
    }

    public function edit(Request $request, LandingPage $listingPage): Response
    {
        $this->authorizeAccess($request, $listingPage);

        return Inertia::render('Crm/ListingPages/Edit', [
            'page' => [
                'uuid' => $listingPage->uuid,
                'slug' => $listingPage->slug,
                'name' => $listingPage->name,
                'type' => $listingPage->type,
                'accent_color' => $listingPage->accent_color,
                'agent_name' => $listingPage->agent_name,
                'agent_email' => $listingPage->agent_email,
                'agent_phone' => $listingPage->agent_phone,
                'agent_photo' => $listingPage->agent_photo,
                'meta_title' => $listingPage->meta_title,
                'meta_description' => $listingPage->meta_description,
                'is_published' => $listingPage->is_published,
                'config' => $listingPage->page_data['_config'] ?? [],
                'listing' => $listingPage->page_data['_listing'] ?? [],
                'submissions_count' => $listingPage->submissions_count,
            ],
            'publicUrl' => url("/l/{$listingPage->slug}"),
            'fonts' => array_column(config('landing-page-fonts.options', []), 'name'),
            'designs' => $this->templateDesigns(),
        ]);
    }

    public function update(Request $request, LandingPage $listingPage): RedirectResponse
    {
        $this->authorizeAccess($request, $listingPage);

        $designIds = array_column($this->templateDesigns(), 'id');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'accent_color' => ['required', 'string', 'max:9'],
            'agent_name' => ['nullable', 'string', 'max:255'],
            'agent_email' => ['nullable', 'email', 'max:255'],
            'agent_phone' => ['nullable', 'string', 'max:50'],
            'agent_photo' => ['nullable', 'string', 'max:2048'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'is_published' => ['boolean'],
            'config' => ['present', 'array'],
            'config.design' => ['nullable', 'string', 'in:'.implode(',', $designIds)],
            'config.font' => ['nullable', 'string', 'max:60'],
            'config.logo' => ['nullable', 'string', 'max:2048'],
            'config.header_brand' => ['nullable', 'string', 'max:120'],
            'config.brand_eyebrow' => ['nullable', 'string', 'max:80'],
            'config.gate' => ['nullable', 'boolean'],
            'config.eyebrow' => ['nullable', 'string', 'max:80'],
            'config.headline' => ['nullable', 'string', 'max:160'],
            'config.tagline' => ['nullable', 'string', 'max:400'],
            'config.cta_button' => ['nullable', 'string', 'max:60'],
            'config.agent_role' => ['nullable', 'string', 'max:120'],
            'config.office' => ['nullable', 'string', 'max:160'],
            'config.pricing_note' => ['nullable', 'string', 'max:600'],
            'config.video_url' => ['nullable', 'string', 'max:2048'],
            'config.why_buy_title' => ['nullable', 'string', 'max:120'],
            'config.why_buy' => ['nullable', 'string', 'max:1200'],
        ]);

        // Merge submitted config over stored config (keeps keys the form doesn't
        // manage, e.g. compliance); always preserve the property snapshot.
        $pageData = $listingPage->page_data ?? [];
        $config = array_merge($pageData['_config'] ?? [], $validated['config']);
        $config['gate'] = (bool) ($validated['config']['gate'] ?? false);
        $pageData['_config'] = $config;

        $listingPage->update([
            'name' => $validated['name'],
            'accent_color' => $validated['accent_color'],
            'agent_name' => $validated['agent_name'] ?? null,
            'agent_email' => $validated['agent_email'] ?? null,
            'agent_phone' => $validated['agent_phone'] ?? null,
            'agent_photo' => $validated['agent_photo'] ?? null,
            'meta_title' => $validated['meta_title'] ?? null,
            'meta_description' => $validated['meta_description'] ?? null,
            'is_published' => $validated['is_published'] ?? false,
            'page_data' => $pageData,
        ]);

        return back()->with('success', 'Listing page saved.');
    }

    public function publish(Request $request, LandingPage $listingPage): RedirectResponse
    {
        $this->authorizeAccess($request, $listingPage);
        $listingPage->update(['is_published' => ! $listingPage->is_published]);

        return back()->with('success', $listingPage->is_published ? 'Page published.' : 'Page unpublished.');
    }

    public function destroy(Request $request, LandingPage $listingPage): RedirectResponse
    {
        $this->authorizeAccess($request, $listingPage);
        $listingPage->delete();

        return redirect()->route('crm.listing-pages.index')->with('success', 'Listing page deleted.');
    }

    /* ----------------------------------------------------------------- */

    /**
     * The React listing templates a page can render (selected via _config.design;
     * keys must match the registry in resources/js/landing-pages/idx-squeeze/registry.ts).
     *
     * @return array<int, array<string, string>>
     */
    private function templateDesigns(): array
    {
        return [
            ['id' => 'villa-serena', 'name' => 'Villa Serena', 'description' => 'Luxury editorial — light, minimal, full-bleed hero, refined typography.'],
        ];
    }

    /** @return array<string, mixed> Normalized _listing snapshot from an own Listing. */
    private function snapshotFromListing(Listing $l): array
    {
        $photos = array_values(array_filter((array) ($l->photos ?? [])));

        return [
            'source' => 'own',
            'status' => $l->status ?: 'Active',
            'price' => $l->price !== null ? (int) $l->price : null,
            'beds' => $l->bedrooms,
            'baths' => $l->bathrooms !== null ? (float) $l->bathrooms : null,
            'sqft' => $l->sqft,
            'property_type' => $l->listing_type,
            'year_built' => $l->year_built,
            'mls_number' => $l->mls_number,
            'address' => [
                'street' => trim((string) ($l->address.' '.($l->unit ?? ''))),
                'city' => $l->city,
                'state' => $l->state_province,
                'zip' => $l->postal_code,
                'full' => trim(implode(', ', array_filter([$l->address, $l->city, trim(($l->state_province ?? '').' '.($l->postal_code ?? ''))]))),
            ],
            'photos' => $photos,
            'description' => $l->description,
        ];
    }

    /** @return array<string, mixed> Normalized _listing snapshot from an MLS DTO. */
    private function snapshotFromMls(MlsListing $m, ?array $compliance): array
    {
        $addr = $m->address;

        return [
            'source' => 'mls',
            'status' => $m->status ?: 'Active',
            'price' => $m->price,
            'beds' => $m->bedrooms,
            'baths' => $m->bathrooms,
            'sqft' => $m->sqft,
            'property_type' => $m->propertyType,
            'year_built' => $m->yearBuilt,
            'lot' => $m->lotAcres ? rtrim(rtrim(number_format($m->lotAcres, 2), '0'), '.').' ac' : null,
            'mls_number' => $m->mlsNumber,
            'mls_slug' => $m->mlsSlug,
            'mls_id' => $m->mlsId,
            'address' => [
                'street' => $addr?->street,
                'city' => $addr?->city,
                'state' => $addr?->stateProvince,
                'zip' => $addr?->postalCode,
                'full' => $addr?->full,
            ],
            'photos' => array_values(array_filter($m->photos)),
            'floorplans' => array_values(array_filter($m->floorplans ?? [])),
            'description' => $m->description,
            'video_url' => $m->videoUrl ?: $m->virtualTourUrl,
            'compliance' => $compliance['disclaimer'] ?? ($compliance['attribution'] ?? null),
        ];
    }

    /** Lightweight list of the user's own listings for the property picker. */
    private function ownListings(Request $request): array
    {
        return Listing::forUser($request->user())
            ->orderByDesc('created_at')
            ->limit(100)
            ->get(['id', 'title', 'address', 'city', 'state_province', 'postal_code', 'price', 'bedrooms', 'bathrooms', 'sqft', 'photos', 'status'])
            ->map(fn (Listing $l) => [
                'id' => $l->id,
                'title' => $l->title,
                'address' => trim(implode(', ', array_filter([$l->address, $l->city]))),
                'price' => $l->price !== null ? (int) $l->price : null,
                'beds' => $l->bedrooms,
                'baths' => $l->bathrooms !== null ? (float) $l->bathrooms : null,
                'sqft' => $l->sqft,
                'status' => $l->status,
                'photo' => is_array($l->photos) && ! empty($l->photos) ? $l->photos[0] : null,
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function presetOptions(): array
    {
        return collect(config('listing-page-presets'))
            ->map(fn ($p, $key) => [
                'key' => $key,
                'name' => $p['name'],
                'description' => $p['description'],
                'type' => $p['type'],
                'accent' => $p['accent'],
                'requires_property' => (bool) ($p['requires_property'] ?? false),
            ])
            ->values()
            ->all();
    }

    private function scopedQuery(Request $request)
    {
        $user = $request->user();
        $teamId = $user->active_context === 'team' ? $user->team_id : null;

        return LandingPage::query()
            ->where('kind', 'listing')
            ->where(function ($q) use ($user, $teamId) {
                if ($teamId) {
                    $q->where('team_id', $teamId);
                } else {
                    $q->where('user_id', $user->id)->whereNull('team_id');
                }
            });
    }

    private function authorizeAccess(Request $request, LandingPage $page): void
    {
        abort_unless($page->kind === 'listing', 404);

        $user = $request->user();
        $teamId = $user->active_context === 'team' ? $user->team_id : null;

        $owns = $teamId
            ? $page->team_id === $teamId
            : ($page->user_id === $user->id && $page->team_id === null);

        abort_unless($owns, 403);
    }
}
