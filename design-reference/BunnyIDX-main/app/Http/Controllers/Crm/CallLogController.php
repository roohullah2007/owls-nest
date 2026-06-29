<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\CallLog;
use App\Services\Ai\ContactInsightsService;
use App\Services\TimelineService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CallLogController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'contact_id' => 'nullable|exists:contacts,id',
            'deal_id' => 'nullable|exists:deals,id',
            'direction' => 'required|in:inbound,outbound',
            'outcome' => 'required|in:connected,no_answer,left_voicemail,busy,wrong_number',
            'phone_number' => 'nullable|string|max:20',
            'duration_seconds' => 'nullable|integer|min:0',
            'started_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $callLog = $request->user()->callLogs()->create($validated);

        // Update contact's last_contacted_at
        if ($callLog->contact_id) {
            $callLog->contact->update(['last_contacted_at' => now()]);
        }

        TimelineService::log(
            user: $request->user(),
            eventType: 'call_logged',
            subject: ucfirst($validated['direction']) . ' call — ' . $validated['outcome'],
            contact: $callLog->contact,
            deal: $callLog->deal,
            loggable: $callLog,
            metadata: [
                'direction' => $validated['direction'],
                'outcome' => $validated['outcome'],
                'duration_seconds' => $validated['duration_seconds'] ?? null,
            ],
        );

        if ($callLog->contact_id) {
            app(ContactInsightsService::class)->recordActivity($callLog->contact, 'call_logged');
        }

        if ($callLog->deal_id) {
            $callLog->deal->touchActivity();
        }

        return back()->with('success', 'Call logged.');
    }

    public function update(Request $request, CallLog $callLog): RedirectResponse
    {
        $user = $request->user();
        abort_unless($callLog->user_id === $user->id || ($user->team_id && $callLog->team_id === $user->team_id), 403);

        $validated = $request->validate([
            'direction' => 'sometimes|required|in:inbound,outbound',
            'outcome' => 'sometimes|required|in:connected,no_answer,left_voicemail,busy,wrong_number',
            'phone_number' => 'nullable|string|max:20',
            'duration_seconds' => 'nullable|integer|min:0',
            'started_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $callLog->update($validated);

        return back()->with('success', 'Call log updated.');
    }

    public function destroy(Request $request, CallLog $callLog): RedirectResponse
    {
        $user = $request->user();
        abort_unless($callLog->user_id === $user->id || ($user->team_id && $callLog->team_id === $user->team_id), 403);

        $callLog->delete();

        return back()->with('success', 'Call log deleted.');
    }
}
