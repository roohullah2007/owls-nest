<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Jobs\SendTeamInvitationEmail;
use App\Models\EmailSendLog;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\TeamMember;
use App\Services\Teams\TeamInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TeamInvitationController extends Controller
{
    public function __construct(
        private readonly TeamInvitationService $invitations,
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! $user->team_id) {
            return back()->with('error', 'You must be on a team to invite members.');
        }

        $member = TeamMember::where('team_id', $user->team_id)->where('user_id', $user->id)->first();
        if (! $member || ! in_array($member->role, ['owner', 'admin'])) {
            abort(403, 'Only owners and admins can invite members.');
        }

        $team = Team::findOrFail($user->team_id);
        $availableRoles = $team->getAvailableRoles();

        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'role' => 'required|string|in:'.implode(',', $availableRoles),
        ]);

        $result = $this->invitations->invite($team, $user, $validated['email'], $validated['role']);

        return match ($result['status']) {
            'invited' => back()->with('success', 'Invitation sent.'),
            default => back()->with('error', match ($result['reason']) {
                'already_member' => 'This user is already a team member.',
                'already_invited' => 'An invitation is already pending for this email.',
                'seat_limit' => "Your team has reached its seat limit ({$result['limit']} members). Add seats or upgrade to invite more.",
                default => 'Invitation could not be sent.',
            }),
        };
    }

    /**
     * Re-send a pending invitation email. Accepted invitations cannot be resent;
     * an expired one has its expiry refreshed so the resent link works again.
     * A fresh idempotency key is used so the resend isn't blocked by the prior
     * email log.
     */
    public function resend(Request $request, TeamInvitation $teamInvitation): RedirectResponse
    {
        $user = $request->user();

        if ($teamInvitation->team_id !== $user->team_id) {
            abort(403);
        }

        $member = TeamMember::where('team_id', $user->team_id)->where('user_id', $user->id)->first();
        if (! $member || ! in_array($member->role, ['owner', 'admin'])) {
            abort(403, 'Only owners and admins can resend invitations.');
        }

        if ($teamInvitation->isAccepted()) {
            return back()->with('error', 'This invitation has already been accepted.');
        }

        // Refresh the expiry on an expired invite so the resent link is valid.
        if ($teamInvitation->isExpired()) {
            $teamInvitation->update(['expires_at' => now()->addDays(7)]);
        }

        $resendCount = EmailSendLog::where('idempotency_key', 'like', "team_invitation:{$teamInvitation->id}:resend:%")->count();
        $key = "team_invitation:{$teamInvitation->id}:resend:".($resendCount + 1);

        SendTeamInvitationEmail::dispatch($teamInvitation->id, $key);

        return back()->with('success', 'Invitation resent.');
    }

    public function destroy(Request $request, TeamInvitation $teamInvitation): RedirectResponse
    {
        $user = $request->user();

        if ($teamInvitation->team_id !== $user->team_id) {
            abort(403);
        }

        $member = TeamMember::where('team_id', $user->team_id)->where('user_id', $user->id)->first();
        if (! $member || ! in_array($member->role, ['owner', 'admin'])) {
            abort(403);
        }

        $teamInvitation->delete();

        return back()->with('success', 'Invitation cancelled.');
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        $invitation = TeamInvitation::where('token', $token)->whereNull('accepted_at')->firstOrFail();

        if ($invitation->isExpired()) {
            return redirect()->route('crm.team.index')->with('error', 'This invitation has expired.');
        }

        $user = $request->user();

        if (! $user) {
            // Store the token in session and redirect to login
            session(['team_invite_token' => $token]);

            return redirect()->route('login');
        }

        if (strtolower(trim($user->email)) !== strtolower(trim($invitation->email))) {
            return redirect()->route('crm.team.index')->with('error', 'This invitation was sent to a different email address.');
        }

        if ($user->team_id && $user->team_id !== $invitation->team_id) {
            return redirect()->route('crm.team.index')->with('error', 'You already belong to a team. Leave your current team first.');
        }

        // Re-check the seat cap at accept time in case seats were filled or the
        // owner downgraded while this invite was outstanding.
        $team = Team::find($invitation->team_id);
        if ($team) {
            $activeMembers = TeamMember::where('team_id', $team->id)->where('is_active', true)->count();
            if ($activeMembers >= $this->invitations->seatLimit($team)) {
                return redirect()->route('crm.team.index')->with('error', 'This team has reached its seat limit. Ask the team owner to add seats.');
            }
        }

        // Accept the invitation
        $invitation->update(['accepted_at' => now()]);

        TeamMember::create([
            'team_id' => $invitation->team_id,
            'user_id' => $user->id,
            'role' => $invitation->role,
            'invited_at' => $invitation->created_at,
            'accepted_at' => now(),
        ]);

        $user->update(['team_id' => $invitation->team_id]);

        return redirect()->route('crm.team.index')->with('success', 'You have joined the team!');
    }
}
