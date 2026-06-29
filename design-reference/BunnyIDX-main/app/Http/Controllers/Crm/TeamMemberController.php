<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\TeamMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TeamMemberController extends Controller
{
    public function updateRole(Request $request, TeamMember $teamMember): RedirectResponse
    {
        $user = $request->user();
        $team = $teamMember->team;

        if ($team->owner_id !== $user->id) {
            abort(403, 'Only team owner can change roles.');
        }

        if ($teamMember->user_id === $user->id) {
            return back()->with('error', 'Cannot change your own role.');
        }

        $availableRoles = $team->getAvailableRoles();
        $validated = $request->validate([
            'role' => 'required|string|in:' . implode(',', $availableRoles),
        ]);

        $teamMember->update(['role' => $validated['role']]);

        return back()->with('success', 'Role updated.');
    }

    public function remove(Request $request, TeamMember $teamMember): RedirectResponse
    {
        $user = $request->user();
        $team = $teamMember->team;

        // Owner or admin can remove members; members can remove themselves
        $currentMember = TeamMember::where('team_id', $team->id)->where('user_id', $user->id)->first();
        $canRemove = $team->owner_id === $user->id
            || ($currentMember && $currentMember->role === 'admin' && $teamMember->role === 'agent')
            || $teamMember->user_id === $user->id;

        if (!$canRemove) {
            abort(403);
        }

        // Cannot remove the owner
        if ($teamMember->role === 'owner') {
            return back()->with('error', 'Cannot remove the team owner.');
        }

        $removedUser = $teamMember->user;
        $teamMember->delete();

        // Clear team_id from the removed user
        if ($removedUser) {
            $removedUser->update(['team_id' => null]);
        }

        return back()->with('success', 'Member removed from team.');
    }
}
