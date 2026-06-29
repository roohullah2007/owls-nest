<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AccountContextController extends Controller
{
    public function switch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'context' => 'required|in:personal,team',
        ]);

        $user = $request->user();

        // Can only switch to team if user has a team
        if ($validated['context'] === 'team' && ! $user->team_id) {
            return back()->with('error', 'You are not part of a team.');
        }

        // Team workspace is a Team-plan feature. Members inherit access when the
        // team owner is on the Team plan (see User::canUseTeamFeatures()).
        if ($validated['context'] === 'team' && ! $user->canUseTeamFeatures()) {
            return back()->with('error', 'Upgrade to the Team plan to use team workspaces.');
        }

        $user->switchContext($validated['context']);

        return redirect()->route('crm.dashboard')->with('success',
            $validated['context'] === 'team' ? 'Switched to team context.' : 'Switched to personal context.'
        );
    }
}
