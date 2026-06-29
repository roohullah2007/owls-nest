<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Crm\OnboardingController;
use App\Models\AgentWebsite;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin-side website management — lists every site with its owner, and launches
 * the SAME onboarding wizard (see {@see OnboardingController})
 * for a selected user so an admin-created site is seeded identically to a
 * self-served one. The created site is owned by the selected user, so its editor,
 * domain connection and MLS data all resolve through that user. Editing happens
 * in the existing website editor (admins are granted access there).
 */
class WebsiteController extends Controller
{
    public function index(Request $request): Response
    {
        $q = $request->input('q');

        $websites = AgentWebsite::query()
            ->with('user:id,name,email')
            ->when($q, function ($query) use ($q) {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $q);
                $query->where(function ($w) use ($escaped) {
                    $w->where('agent_name', 'like', "%{$escaped}%")
                        ->orWhere('custom_domain', 'like', "%{$escaped}%")
                        ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$escaped}%")->orWhere('email', 'like', "%{$escaped}%"));
                });
            })
            ->orderByDesc('created_at')
            ->limit(200)
            ->get(['id', 'uuid', 'user_id', 'team_id', 'agent_name', 'slug', 'is_published', 'custom_domain', 'domain_status', 'created_at']);

        return Inertia::render('Admin/Websites/Index', [
            'websites' => $websites->map(fn (AgentWebsite $site) => [
                'id' => $site->id,
                'uuid' => $site->uuid,
                'agent_name' => $site->agent_name,
                'slug' => $site->slug,
                'is_published' => $site->is_published,
                'custom_domain' => $site->custom_domain,
                'domain_status' => $site->domain_status,
                'created_at' => $site->created_at?->toDateString(),
                'owner' => $site->user ? ['name' => $site->user->name, 'email' => $site->user->email] : null,
                'is_team' => $site->team_id !== null,
            ]),
            'filters' => ['q' => $q],
            // All users — an admin may create multiple sites for any user (the
            // one-site-per-user cap applies to self-serve signups only).
            'users' => User::orderBy('name')->get(['id', 'name', 'email']),
        ]);
    }
}
