<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $q = $request->input('q');
        $roleFilter = $request->input('role');

        $users = User::query()
            ->when($q, function ($query) use ($q) {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $q);
                $query->where(function ($w) use ($escaped) {
                    $w->where('name', 'like', "%{$escaped}%")
                        ->orWhere('email', 'like', "%{$escaped}%");
                });
            })
            ->when($roleFilter, fn ($query) => $query->where('role', $roleFilter))
            ->withCount(['idxConnections', 'licenses'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get([
                'id', 'name', 'email', 'role', 'subscription_tier', 'team_id', 'created_at',
                'is_lifetime', 'subscription_expires_at', 'trial_plan', 'trial_ends_at', 'feature_overrides',
            ]);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => [
                'q' => $q,
                'role' => $roleFilter,
            ],
            'roleOptions' => [
                ['value' => '', 'label' => 'All roles'],
                ['value' => 'superadmin', 'label' => 'Superadmin'],
                ['value' => 'admin', 'label' => 'Admin'],
                ['value' => 'agent', 'label' => 'Agent'],
            ],
            'plans' => Plan::ordered()->get(['key', 'name', 'is_paid']),
            'featureCatalog' => Plan::featureCatalog(),
        ]);
    }

    /**
     * Admin sets a user's plan, lifetime flag, expiry and per-feature overrides.
     */
    public function updateSubscription(Request $request, User $user): RedirectResponse
    {
        $planKeys = Plan::pluck('key')->all();
        $catalogKeys = array_keys(Plan::featureCatalog());

        $validated = $request->validate([
            'subscription_tier' => ['required', 'string', Rule::in($planKeys)],
            'is_lifetime' => 'boolean',
            'subscription_expires_at' => 'nullable|date',
            'feature_overrides' => 'nullable|array',
            'clear_trial' => 'boolean',
        ]);

        // Only keep override keys that are real catalog features, cast to bool.
        $overrides = [];
        foreach (($validated['feature_overrides'] ?? []) as $key => $value) {
            if (in_array($key, $catalogKeys, true)) {
                $overrides[$key] = (bool) $value;
            }
        }

        $updates = [
            'subscription_tier' => $validated['subscription_tier'],
            'is_lifetime' => $request->boolean('is_lifetime'),
            'subscription_expires_at' => $validated['subscription_expires_at'] ?? null,
            'feature_overrides' => $overrides ?: null,
        ];

        // Lifetime grants never expire — clear any stray expiry.
        if ($updates['is_lifetime']) {
            $updates['subscription_expires_at'] = null;
        }

        if ($request->boolean('clear_trial')) {
            $updates['trial_plan'] = null;
            $updates['trial_ends_at'] = null;
        }

        $user->update($updates);

        return back()->with('success', "Updated {$user->name}'s subscription.");
    }

    public function updateRole(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['superadmin', 'admin', 'agent'])],
        ]);

        // Guardrail: don't let the last superadmin demote themselves and lock out the panel.
        if ($user->role === 'superadmin' && $validated['role'] !== 'superadmin') {
            $remainingSuperadmins = User::where('role', 'superadmin')->where('id', '!=', $user->id)->count();
            if ($remainingSuperadmins === 0) {
                return back()->with('error', 'Cannot remove superadmin role from the last superadmin.');
            }
        }

        $user->update(['role' => $validated['role']]);

        return back()->with('success', "Updated {$user->name} to {$validated['role']}.");
    }
}
