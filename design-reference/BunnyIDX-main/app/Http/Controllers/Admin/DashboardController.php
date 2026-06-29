<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IdxConnection;
use App\Models\MlsConnectionRequest;
use App\Models\MlsProvider;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_users' => User::count(),
                'admin_users' => User::whereIn('role', User::ADMIN_ROLES)->count(),
                'active_connections' => IdxConnection::where('is_active', true)->count(),
                'mls_providers_visible' => MlsProvider::where('visibility', MlsProvider::VISIBILITY_VISIBLE)->count(),
                'mls_requests_pending' => MlsConnectionRequest::whereIn('status', [
                    MlsConnectionRequest::STATUS_PENDING,
                    MlsConnectionRequest::STATUS_IN_PROCESS,
                    MlsConnectionRequest::STATUS_COMPLETED,
                ])->count(),
            ],
        ]);
    }

    public function usersStub(Request $request): Response
    {
        return Inertia::render('Admin/Placeholder', [
            'active' => 'users',
            'title' => 'Users',
            'message' => 'User management ships in Phase 6 of the MLS refactor.',
        ]);
    }

    public function mlsProvidersStub(Request $request): Response
    {
        return Inertia::render('Admin/Placeholder', [
            'active' => 'mls-providers',
            'title' => 'MLS Providers',
            'message' => 'MLS catalog management ships in Phase 2 — coming next.',
        ]);
    }

    public function mlsRequestsStub(Request $request): Response
    {
        return Inertia::render('Admin/Placeholder', [
            'active' => 'mls-requests',
            'title' => 'MLS Requests',
            'message' => 'Connection request queue ships in Phase 3.',
        ]);
    }
}
