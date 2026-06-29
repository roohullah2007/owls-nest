<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\AgentWebsite;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class WebsiteOwnerMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $website = $request->route('agentWebsite');

        if (! $website instanceof AgentWebsite) {
            abort(404);
        }

        $user = $request->user();

        abort_unless(
            $website->user_id === $user->id
                || ($user->team_id && $website->team_id === $user->team_id)
                || $user->isAdmin(), // admins manage sites they created for users
            403,
            'You do not own this website.'
        );

        return $next($request);
    }
}
