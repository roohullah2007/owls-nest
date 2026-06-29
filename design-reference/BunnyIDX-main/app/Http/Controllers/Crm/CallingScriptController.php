<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\CallingScript;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * CRUD for reusable calling scripts. Used by the PowerDialerModal (picker + manager).
 */
class CallingScriptController extends Controller
{
    /**
     * All scripts the current user can see — own + team-shared.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $scripts = CallingScript::visibleTo($user)
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (CallingScript $s) => $this->payload($s, $user));

        return response()->json(['scripts' => $scripts]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $this->validatePayload($request);

        $script = CallingScript::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'name' => $validated['name'],
            'intro' => $validated['intro'] ?? null,
            'body' => $validated['body'] ?? null,
            'questions' => $validated['questions'] ?? [],
            'is_team_shared' => (bool) ($validated['is_team_shared'] ?? false),
        ]);

        return response()->json(['script' => $this->payload($script->fresh(), $user)], 201);
    }

    public function update(Request $request, CallingScript $callingScript): JsonResponse
    {
        $user = $request->user();
        abort_unless($callingScript->isEditableBy($user), 403);

        $validated = $this->validatePayload($request);

        $callingScript->update([
            'name' => $validated['name'],
            'intro' => $validated['intro'] ?? null,
            'body' => $validated['body'] ?? null,
            'questions' => $validated['questions'] ?? [],
            'is_team_shared' => (bool) ($validated['is_team_shared'] ?? false),
        ]);

        return response()->json(['script' => $this->payload($callingScript->fresh(), $user)]);
    }

    public function destroy(Request $request, CallingScript $callingScript): JsonResponse
    {
        $user = $request->user();
        abort_unless($callingScript->isEditableBy($user), 403);

        $callingScript->delete();
        return response()->json(['ok' => true]);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:120',
            'intro' => 'nullable|string|max:1000',
            'body' => 'nullable|string|max:20000',
            'questions' => 'nullable|array|max:50',
            'questions.*.id' => 'required|string|max:60',
            'questions.*.text' => 'required|string|max:500',
            'questions.*.type' => ['required', Rule::in(['text', 'yes_no', 'multi'])],
            'questions.*.options' => 'nullable|array|max:20',
            'questions.*.options.*' => 'string|max:120',
            'is_team_shared' => 'nullable|boolean',
        ]);
    }

    private function payload(CallingScript $script, \App\Models\User $user): array
    {
        return [
            'id' => $script->id,
            'name' => $script->name,
            'intro' => $script->intro,
            'body' => $script->body,
            'questions' => $script->questions ?? [],
            'is_team_shared' => $script->is_team_shared,
            'usage_count' => $script->usage_count,
            'last_used_at' => $script->last_used_at,
            'owner_id' => $script->user_id,
            'is_mine' => $script->user_id === $user->id,
            'is_editable' => $script->isEditableBy($user),
            'created_at' => $script->created_at,
            'updated_at' => $script->updated_at,
        ];
    }
}
