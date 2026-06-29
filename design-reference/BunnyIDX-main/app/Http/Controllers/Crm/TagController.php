<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:7',
        ]);

        $tag = $request->user()->tags()->firstOrCreate(
            ['name' => $validated['name']],
            ['color' => $validated['color'] ?? '#6366f1']
        );

        if ($request->wantsJson()) {
            return response()->json(['tag' => $tag]);
        }

        return back()->with('success', 'Tag created.');
    }

    public function destroy(Request $request, Tag $tag): RedirectResponse
    {
        $user = $request->user();
        abort_unless($tag->user_id === $user->id || ($user->team_id && $tag->team_id === $user->team_id), 403);

        $tag->delete();

        return back()->with('success', 'Tag deleted.');
    }
}
