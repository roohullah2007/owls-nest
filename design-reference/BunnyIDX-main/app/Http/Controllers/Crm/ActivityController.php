<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Note;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ActivityController extends Controller
{
    public function togglePin(Request $request, Activity $activity): RedirectResponse
    {
        $this->authorize($request, $activity);

        $activity->update(['is_pinned' => ! $activity->is_pinned]);

        return back();
    }

    /**
     * Edit a note from the timeline. Only note entries are editable — the body is
     * stored on the underlying Note (the source of truth) and the activity keeps a
     * truncated snapshot for the feed, so we update both to stay in sync.
     */
    public function update(Request $request, Activity $activity): RedirectResponse
    {
        $this->authorize($request, $activity);
        abort_unless($activity->event_type === 'note_created', 422, 'Only notes can be edited from the timeline.');

        $validated = $request->validate([
            'body' => 'required|string',
        ]);

        $note = $activity->loggable;
        if ($note instanceof Note) {
            $mentions = Note::parseMentions($validated['body']);
            $note->update([
                'body' => $validated['body'],
                'mentions' => ! empty($mentions) ? $mentions : null,
            ]);
        }

        $activity->update(['description' => Str::limit($validated['body'], 100)]);

        return back()->with('success', 'Note updated.');
    }

    public function destroy(Request $request, Activity $activity): RedirectResponse
    {
        $this->authorize($request, $activity);

        // If this activity points to an underlying record (Note, CallLog, etc.),
        // remove that too so the entry doesn't reappear via the loggable's own timeline emission.
        if ($activity->loggable_type && $activity->loggable_id) {
            $loggable = $activity->loggable;
            if ($loggable) {
                $loggable->delete();
            }
        }

        $activity->delete();

        return back();
    }

    private function authorize(Request $request, Activity $activity): void
    {
        $user = $request->user();
        $sameUser = $activity->user_id === $user->id;
        $sameTeam = $user->team_id && $activity->team_id === $user->team_id;

        abort_unless($sameUser || $sameTeam, 403);
    }
}
