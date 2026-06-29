<?php

declare(strict_types=1);

namespace App\Services\Teams;

use App\Jobs\SendTeamInvitationEmail;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\TeamMember;
use App\Models\User;

/**
 * Single source of truth for team provisioning and the member-invitation rules
 * (email normalization, case-insensitive dedup, seat cap, email dispatch). Used
 * by TeamController, TeamInvitationController and the onboarding wizard so every
 * entry point applies the same guards.
 */
class TeamInvitationService
{
    /**
     * Create a team owned by $owner, seat them as owner, and switch them into
     * team context. Caller must ensure the user isn't already on a team.
     */
    public function createTeam(User $owner, string $name): Team
    {
        $team = Team::create([
            'name' => $name,
            'owner_id' => $owner->id,
        ]);

        TeamMember::create([
            'team_id' => $team->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'permissions' => TeamMember::DEFAULT_PERMISSIONS,
            'accepted_at' => now(),
        ]);

        $owner->update(['team_id' => $team->id, 'active_context' => 'team']);

        return $team;
    }

    /**
     * Invite a member to the team, applying every guard. Returns a status array
     * the caller maps to its own response:
     *   ['status' => 'invited',  'invitation' => TeamInvitation]
     *   ['status' => 'skipped',  'reason' => 'already_member'|'already_invited'|'seat_limit', 'limit'? => int]
     */
    public function invite(Team $team, User $inviter, string $email, string $role): array
    {
        $email = strtolower(trim($email));

        // Already an active/invited member of this team.
        $existingUser = User::whereRaw('lower(email) = ?', [$email])->first();
        if ($existingUser && TeamMember::where('team_id', $team->id)->where('user_id', $existingUser->id)->exists()) {
            return ['status' => 'skipped', 'reason' => 'already_member'];
        }

        // Pending (unaccepted) invitation already exists (case-insensitive).
        if (TeamInvitation::where('team_id', $team->id)->whereRaw('lower(email) = ?', [$email])->whereNull('accepted_at')->exists()) {
            return ['status' => 'skipped', 'reason' => 'already_invited'];
        }

        // Seat cap: active members + outstanding invites ≤ included + purchased.
        $limit = $this->seatLimit($team);
        if ($this->seatsUsed($team) >= $limit) {
            return ['status' => 'skipped', 'reason' => 'seat_limit', 'limit' => $limit];
        }

        $invitation = TeamInvitation::create([
            'team_id' => $team->id,
            'email' => $email,
            'role' => $role,
            'invited_by' => $inviter->id,
        ]);

        // Deliver via Resend (platform sender); idempotency key blocks a retried
        // job from double-sending this initial invite.
        SendTeamInvitationEmail::dispatch($invitation->id, "team_invitation:{$invitation->id}");

        return ['status' => 'invited', 'invitation' => $invitation];
    }

    /**
     * Total seats a team may fill: the owner's plan included_seats plus any
     * purchased extra seats.
     */
    public function seatLimit(Team $team): int
    {
        $included = (int) ($team->owner?->effectivePlan()?->included_seats ?? 1);

        return $included + (int) $team->purchased_seats;
    }

    /**
     * Seats currently consumed: active members plus outstanding (unaccepted,
     * unexpired) invitations.
     */
    public function seatsUsed(Team $team): int
    {
        $members = TeamMember::where('team_id', $team->id)->where('is_active', true)->count();
        $pending = TeamInvitation::where('team_id', $team->id)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->count();

        return $members + $pending;
    }
}
