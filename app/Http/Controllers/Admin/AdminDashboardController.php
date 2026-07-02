<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FeaturedListingSetting;
use App\Models\IdxConnection;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin landing page (/admin). A read-only overview of the IDX integration:
 * Featured Listings configuration, the broker's MLS connections, and provider
 * coverage — plus quick links into the editor and the public page.
 */
class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        $settings = FeaturedListingSetting::current();
        $owner = $this->resolveOwner();

        $connections = $owner
            ? IdxConnection::query()->where('user_id', $owner->id)->orderBy('id')->get()
            : collect();

        $connected = $connections->filter(fn (IdxConnection $c): bool => $c->isConnected())->count();

        return Inertia::render('admin/dashboard', [
            'featured' => [
                'is_active' => (bool) $settings->is_active,
                'result_limit' => (int) ($settings->result_limit ?: 12),
                'search_query' => $settings->search_query,
                'agent_id' => $settings->agent_id,
                'office_id' => $settings->office_id,
                'mls_numbers_count' => count($settings->mls_numbers ?? []),
            ],
            'mls' => [
                'connected' => $connected,
                'total_connections' => $connections->count(),
                'owner_email' => $owner?->email,
                'connections' => $connections->map(fn (IdxConnection $c): array => [
                    'id' => $c->id,
                    'display_name' => $c->display_name ?: $c->mls_slug,
                    'mls_slug' => $c->mls_slug,
                    'provider' => $c->provider,
                    'is_active' => (bool) $c->is_active,
                    'test_status' => $c->test_status,
                ])->values()->all(),
            ],
        ]);
    }

    /**
     * The broker/owner user whose IDX connections back the public site: the
     * first user with a connection, else the first user overall. Mirrors
     * FeaturedPropertiesController so the overview reflects the live page.
     */
    private function resolveOwner(): ?User
    {
        return User::query()->whereHas('idxConnections')->orderBy('id')->first()
            ?? User::query()->orderBy('id')->first();
    }
}
