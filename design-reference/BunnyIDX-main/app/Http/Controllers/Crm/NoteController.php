<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\User;
use App\Notifications\NoteMentionNotification;
use App\Services\Ai\ContactInsightsService;
use App\Services\TimelineService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'notable_type' => 'required|in:contact,deal,company,listing',
            'notable_id' => 'required|integer',
            'body' => 'required|string',
        ]);

        $morphMap = [
            'contact' => \App\Models\Contact::class,
            'deal' => \App\Models\Deal::class,
            'company' => \App\Models\Company::class,
            'listing' => \App\Models\Listing::class,
        ];

        $notableClass = $morphMap[$validated['notable_type']];
        $notable = $notableClass::forUser($request->user())->findOrFail($validated['notable_id']);

        $mentions = Note::parseMentions($validated['body']);

        $note = $request->user()->notes()->create([
            'notable_id' => $notable->id,
            'notable_type' => $notableClass,
            'body' => $validated['body'],
            'mentions' => !empty($mentions) ? $mentions : null,
        ]);

        TimelineService::log(
            user: $request->user(),
            eventType: 'note_created',
            subject: 'Note added',
            description: \Illuminate\Support\Str::limit($validated['body'], 100),
            contact: $notable instanceof \App\Models\Contact ? $notable : null,
            deal: $notable instanceof \App\Models\Deal ? $notable : null,
            company: $notable instanceof \App\Models\Company ? $notable : null,
            listing: $notable instanceof \App\Models\Listing ? $notable : null,
            loggable: $note,
        );

        if ($notable instanceof \App\Models\Contact) {
            app(ContactInsightsService::class)->recordActivity($notable, 'note_created');
        }

        if ($notable instanceof \App\Models\Deal) {
            $notable->touchActivity();
        }

        // Notify mentioned users
        if (!empty($mentions)) {
            $mentionedUserIds = array_column($mentions, 'user_id');
            $mentionedUsers = User::whereIn('id', $mentionedUserIds)
                ->where('id', '!=', $request->user()->id)
                ->get();

            foreach ($mentionedUsers as $mentionedUser) {
                $mentionedUser->notify(new NoteMentionNotification(
                    $request->user(),
                    $validated['body'],
                    $validated['notable_type'],
                    $validated['notable_id'],
                ));
            }
        }

        return back()->with('success', 'Note added.');
    }

    public function update(Request $request, Note $note): RedirectResponse
    {
        $user = $request->user();
        abort_unless($note->user_id === $user->id || ($user->team_id && $note->team_id === $user->team_id), 403);

        $validated = $request->validate([
            'body' => 'required|string',
        ]);

        $mentions = Note::parseMentions($validated['body']);
        $validated['mentions'] = !empty($mentions) ? $mentions : null;

        $note->update($validated);

        return back()->with('success', 'Note updated.');
    }

    public function destroy(Request $request, Note $note): RedirectResponse
    {
        $user = $request->user();
        abort_unless($note->user_id === $user->id || ($user->team_id && $note->team_id === $user->team_id), 403);

        $note->delete();

        return back()->with('success', 'Note deleted.');
    }

    public function togglePin(Request $request, Note $note): RedirectResponse
    {
        $user = $request->user();
        abort_unless($note->user_id === $user->id || ($user->team_id && $note->team_id === $user->team_id), 403);

        $note->update(['is_pinned' => !$note->is_pinned]);

        return back()->with('success', $note->is_pinned ? 'Note pinned.' : 'Note unpinned.');
    }
}
