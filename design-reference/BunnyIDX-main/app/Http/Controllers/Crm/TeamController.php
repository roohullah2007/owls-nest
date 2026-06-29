<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\EmailSendLog;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\Teams\TeamInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    public function __construct(
        private readonly TeamInvitationService $teams,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->team_id ? Team::with(['members.user', 'invitations' => fn ($q) => $q->whereNull('accepted_at')])->find($user->team_id) : null;

        $teamMember = $team ? TeamMember::where('team_id', $team->id)->where('user_id', $user->id)->first() : null;
        $userRole = $teamMember?->role ?? ($team && $team->owner_id === $user->id ? 'owner' : null);

        $teamStats = ['memberCount' => 0, 'activeCount' => 0, 'pendingInvitations' => 0];

        if ($team) {
            $teamStats = [
                'memberCount' => $team->members->count(),
                'activeCount' => $team->members->where('is_active', true)->count(),
                'pendingInvitations' => $team->invitations->count(),
            ];
        }

        $rolePermissions = $team ? $team->getRolePermissions() : [];
        $availableRoles = $team ? $team->getAvailableRoles() : ['admin', 'agent'];

        // Latest invitation-email send status per invitation (for the UI badge),
        // keyed by invitation id parsed from the log's idempotency_key
        // (team_invitation:{id} or team_invitation:{id}:resend:{n}).
        $emailStatusByInvite = [];
        if ($team) {
            EmailSendLog::where('team_id', $team->id)
                ->where('template_type', 'team_invitation')
                ->orderBy('id')
                ->get(['idempotency_key', 'status'])
                ->each(function ($log) use (&$emailStatusByInvite) {
                    $invId = (int) (explode(':', (string) $log->idempotency_key)[1] ?? 0);
                    if ($invId) {
                        $emailStatusByInvite[$invId] = $log->status; // later rows win
                    }
                });
        }

        return Inertia::render('Crm/Team/Index', [
            'team' => $team ? [
                'id' => $team->id,
                'name' => $team->name,
                'owner_id' => $team->owner_id,
                'created_at' => $team->created_at?->toISOString(),
                'members' => $team->members->map(fn ($m) => [
                    'id' => $m->id,
                    'user_id' => $m->user_id,
                    'name' => $m->user->name,
                    'email' => $m->user->email,
                    'role' => $m->role,
                    'is_active' => $m->is_active,
                    'accepted_at' => $m->accepted_at?->toISOString(),
                ]),
                'invitations' => $team->invitations->map(fn ($inv) => [
                    'id' => $inv->id,
                    'email' => $inv->email,
                    'role' => $inv->role,
                    'expires_at' => $inv->expires_at->toISOString(),
                    'invited_by_name' => $inv->inviter->name ?? '',
                    'email_status' => $emailStatusByInvite[$inv->id] ?? null,
                ]),
            ] : null,
            'userRole' => $userRole,
            'rolePermissions' => $rolePermissions,
            'availableRoles' => $availableRoles,
            'teamStats' => $teamStats,
            // Drives the "Upgrade to Team" state when the user can neither found
            // a team nor use an existing one (Solo/Starter without entitlement).
            'canUseTeamFeatures' => $user->canUseTeamFeatures(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->team_id) {
            return back()->with('error', 'You already belong to a team.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $this->teams->createTeam($user, $validated['name']);

        return back()->with('success', 'Team created successfully.');
    }

    public function update(Request $request, Team $team): RedirectResponse
    {
        $user = $request->user();

        if ($team->owner_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $team->update($validated);

        return back()->with('success', 'Team updated.');
    }

    public function updateMlsOfficeId(Request $request, Team $team): RedirectResponse
    {
        $this->authorizeAdmin($request, $team);

        $validated = $request->validate([
            'mls_office_id' => 'nullable|string|max:100',
        ]);

        $settings = $team->settings ?? [];
        $settings['mls_office_id'] = $validated['mls_office_id'] ?: null;
        $team->update(['settings' => $settings]);

        return back()->with('success', 'Office ID updated.');
    }

    public function destroy(Request $request, Team $team): RedirectResponse
    {
        $user = $request->user();

        if ($team->owner_id !== $user->id) {
            abort(403);
        }

        // Remove team_id from all users
        $team->users()->update(['team_id' => null, 'active_context' => 'personal']);

        $team->delete();

        return back()->with('success', 'Team deleted.');
    }

    private function authorizeAdmin(Request $request, Team $team): void
    {
        $user = $request->user();
        $currentMember = TeamMember::where('team_id', $team->id)->where('user_id', $user->id)->first();
        $isOwnerOrAdmin = $team->owner_id === $user->id || ($currentMember && in_array($currentMember->role, ['owner', 'admin']));

        if (! $isOwnerOrAdmin) {
            abort(403, 'Only team owner or admin can perform this action.');
        }
    }

    public function updateRolePermissions(Request $request, Team $team): RedirectResponse
    {
        $this->authorizeAdmin($request, $team);

        $validated = $request->validate([
            'role' => 'required|string|max:50',
            'permissions' => 'required|array',
            'permissions.listings' => 'required|in:all,own,none',
            'permissions.contacts' => 'required|in:all,own,none',
            'permissions.contact_types' => 'present|array',
            'permissions.contact_types.*' => 'string',
            'permissions.tasks' => 'required|in:all,own',
            'permissions.calendar' => 'required|in:all,own',
            'permissions.deals' => 'required|in:all,own,none',
        ]);

        $rolePerms = $team->getRolePermissions();
        $rolePerms[$validated['role']] = $validated['permissions'];
        $team->update(['role_permissions' => $rolePerms]);

        return back()->with('success', 'Role permissions updated.');
    }

    public function addRole(Request $request, Team $team): RedirectResponse
    {
        $this->authorizeAdmin($request, $team);

        $validated = $request->validate([
            'name' => 'required|string|max:50|regex:/^[a-z][a-z0-9_]*$/',
        ]);

        $roleName = $validated['name'];

        if ($roleName === 'owner') {
            return back()->with('error', 'Cannot create a role named "owner".');
        }

        $rolePerms = $team->getRolePermissions();

        if (isset($rolePerms[$roleName])) {
            return back()->with('error', 'A role with this name already exists.');
        }

        $rolePerms[$roleName] = TeamMember::DEFAULT_PERMISSIONS;
        $team->update(['role_permissions' => $rolePerms]);

        return back()->with('success', 'Role created.');
    }

    public function removeRole(Request $request, Team $team): RedirectResponse
    {
        $this->authorizeAdmin($request, $team);

        $validated = $request->validate([
            'role' => 'required|string',
        ]);

        $roleName = $validated['role'];

        if (in_array($roleName, ['admin', 'agent'])) {
            return back()->with('error', 'Cannot delete built-in roles.');
        }

        // Check if any members have this role
        $memberCount = TeamMember::where('team_id', $team->id)->where('role', $roleName)->count();
        if ($memberCount > 0) {
            return back()->with('error', "Cannot delete role: {$memberCount} member(s) still have this role. Reassign them first.");
        }

        $rolePerms = $team->getRolePermissions();
        unset($rolePerms[$roleName]);
        $team->update(['role_permissions' => $rolePerms]);

        return back()->with('success', 'Role deleted.');
    }

    public function toggleActive(Request $request, TeamMember $teamMember): RedirectResponse
    {
        $user = $request->user();
        $team = $teamMember->team;

        $this->authorizeAdmin($request, $team);

        // Can't deactivate yourself
        if ($teamMember->user_id === $user->id) {
            return back()->with('error', 'Cannot deactivate yourself.');
        }

        // Can't deactivate the owner
        if ($teamMember->role === 'owner') {
            return back()->with('error', 'Cannot deactivate the team owner.');
        }

        $teamMember->update(['is_active' => ! $teamMember->is_active]);

        return back()->with('success', $teamMember->is_active ? 'Member activated.' : 'Member deactivated.');
    }
}
