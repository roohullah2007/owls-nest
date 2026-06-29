<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Plan;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate a route behind a plan feature: `->middleware('feature:websites')` or, on a
 * controller, `feature:ai`. Per-user overrides and trials are honoured because the
 * check goes through User::hasFeature(). JSON requests get a 403; web requests are
 * redirected back with an upgrade message.
 */
class EnsureFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();

        // Platform admins bypass feature gates — they manage plans and can act
        // on behalf of users (e.g. building a site for a customer).
        if ($user && $user->isAdmin()) {
            return $next($request);
        }

        if (! $user || ! $user->hasFeature($feature)) {
            $label = Plan::featureCatalog()[$feature] ?? $feature;
            $message = "Upgrade your plan to use {$label}.";

            if ($request->expectsJson()) {
                abort(403, $message);
            }

            return back()->with('error', $message);
        }

        return $next($request);
    }
}
