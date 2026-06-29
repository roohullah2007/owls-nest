<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate a route behind the Team-plan entitlement: `->middleware('team.plan')`.
 *
 * Unlike {@see EnsureFeature} (which checks the user's own plan), this honours
 * team membership — an invited Solo/free member of a Team-plan team passes,
 * because the team owner pays. See User::canUseTeamFeatures(). Platform admins
 * bypass. JSON requests get a 403; web requests are redirected back with an
 * upgrade message.
 */
class EnsureTeamPlan
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->isAdmin()) {
            return $next($request);
        }

        if (! $user || ! $user->canUseTeamFeatures()) {
            $message = 'Upgrade to the Team plan to use team collaboration features.';

            if ($request->expectsJson()) {
                abort(403, $message);
            }

            return back()->with('error', $message);
        }

        return $next($request);
    }
}
