<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\MlsConnectionRequest;
use App\Models\MlsProvider;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Collection;

class IdxController extends Controller implements HasMiddleware
{
    /** IDX / MLS is a paid feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:idx')];
    }

    /**
     * The IDX page moved into Settings → MLS Connections (June 2026). Old
     * /crm/idx links — including the retired per-tab URLs — land there. The
     * idx/* CRUD routes (connections, requests, widgets, …) are unchanged.
     */
    public function index(Request $request, ?string $tab = null): RedirectResponse
    {
        return redirect()->route('crm.settings.tab', 'mls');
    }

    /**
     * User-safe connection list for the MLS Connections UI — strips `provider`
     * and `api_key`. The data_source (Bridge / Realtyna / Repliers) is an
     * admin/internal concern only. Eager-loads the MlsProvider so we can
     * surface its logo + region; falls back to a slug-based lookup for legacy
     * connections that never got linked via mls_provider_id.
     */
    public static function getUserConnections(User $user): Collection
    {
        $connections = $user->idxConnections()
            ->with('mlsProvider:id,slug,logo_url,region,country')
            ->orderBy('display_name')
            ->get();

        $orphanSlugs = $connections->whereNull('mls_provider_id')->pluck('mls_slug')->filter()->unique();
        $providersBySlug = $orphanSlugs->isNotEmpty()
            ? MlsProvider::whereIn('slug', $orphanSlugs)->get(['id', 'slug', 'logo_url', 'region', 'country'])->keyBy('slug')
            : collect();

        return $connections->map(function ($c) use ($providersBySlug) {
            $p = $c->mlsProvider ?? $providersBySlug->get($c->mls_slug);

            return [
                'id' => $c->id,
                'mls_provider_id' => $c->mls_provider_id ?? $p?->id,
                'mls_slug' => $c->mls_slug,
                'display_name' => $c->display_name,
                'logo_url' => $p?->logo_url,
                'region' => $p?->region,
                'country' => $p?->country ?? 'US',
                'feed_types' => $c->feed_types ?? ['idx'],
                'agent_id' => $c->agent_id,
                'office_id' => $c->office_id,
                'constraints' => $c->constraints,
                'is_active' => $c->is_active,
                'test_status' => $c->test_status,
                'last_tested_at' => $c->last_tested_at?->toISOString(),
            ];
        });
    }

    /** The user's MLS connection requests, newest first, with provider info. */
    public static function getUserMlsRequests(User $user): Collection
    {
        return MlsConnectionRequest::query()
            ->where('user_id', $user->id)
            ->with('mlsProvider:id,slug,display_name,logo_url,region,setup_notes_user')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'status' => $r->status,
                'feed_types_requested' => $r->feed_types_requested,
                'created_at' => $r->created_at->toISOString(),
                'integrated_at' => $r->integrated_at?->toISOString(),
                'denied_reason' => $r->denied_reason,
                'mls' => $r->mlsProvider ? [
                    'id' => $r->mlsProvider->id,
                    'slug' => $r->mlsProvider->slug,
                    'name' => $r->mlsProvider->display_name,
                    'logo' => $r->mlsProvider->logo_url,
                    'region' => $r->mlsProvider->region,
                    'setup_notes' => $r->mlsProvider->setup_notes_user,
                ] : null,
            ]);
    }

    /**
     * MLSes visible to end users. Sourced from the admin-managed mls_providers
     * table. The `provider` field is intentionally NOT exposed — users don't
     * need to know which data backend (Bridge / Realtyna / Repliers) powers each.
     */
    public static function getAvailableMlses(): array
    {
        return MlsProvider::query()
            ->visible()
            ->orderBy('sort_order')
            ->orderBy('display_name')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name' => $p->display_name,
                'region' => $p->region,
                'country' => $p->country,
                'logo' => $p->logo_url,
                'has_idx_feed' => $p->has_idx_feed,
                'has_vow_feed' => $p->has_vow_feed,
                'monthly_fee_cents' => $p->monthly_fee_cents,
                'monthly_fee_label' => $p->monthly_fee_formatted,
                'setup_notes' => $p->setup_notes_user,
                'property_types' => $p->property_types,
                'statuses' => $p->statuses,
            ])
            ->toArray();
    }
}
