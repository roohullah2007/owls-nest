<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\Billing\SeatBillingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use RuntimeException;

/**
 * Buy/adjust extra team seats beyond the plan's included_seats. Seats bill as a
 * recurring Stripe subscription-item quantity ($X/seat/month) on the team
 * owner's subscription; the webhook keeps purchased_seats authoritative.
 * Owner-only, Team plan only.
 */
class TeamSeatController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly SeatBillingService $seats,
    ) {}

    public static function middleware(): array
    {
        return [new Middleware('team.plan')];
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! $user->team_id) {
            return back()->with('error', 'You must be on a team to manage seats.');
        }

        $team = Team::findOrFail($user->team_id);

        // Only the team owner controls billing.
        if ($team->owner_id !== $user->id) {
            return back()->with('error', 'Only the team owner can change seats.');
        }

        $validated = $request->validate([
            // Extra seats beyond the plan's included allotment.
            'purchased_seats' => 'required|integer|min:0|max:495',
        ]);

        $requested = (int) $validated['purchased_seats'];

        // Never let an owner drop below seats already in use (active members +
        // pending invites) minus the plan's included seats.
        $included = (int) ($team->owner?->effectivePlan()?->included_seats ?? 1);
        $inUse = TeamMember::where('team_id', $team->id)->where('is_active', true)->count()
            + $team->invitations()->whereNull('accepted_at')->where('expires_at', '>', now())->count();
        $minRequired = max(0, $inUse - $included);

        if ($requested < $minRequired) {
            return back()->with('error', "You have {$inUse} members/invites; remove some before reducing below {$minRequired} extra seat(s).");
        }

        try {
            $this->seats->setSeatQuantity($team, $requested);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Team seats updated.');
    }
}
