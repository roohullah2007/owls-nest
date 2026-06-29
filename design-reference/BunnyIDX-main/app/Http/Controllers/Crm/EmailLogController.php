<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\EmailLog;
use App\Services\Ai\ContactInsightsService;
use App\Services\TimelineService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailLogController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'contact_id' => 'nullable|exists:contacts,id',
            'deal_id' => 'nullable|exists:deals,id',
            'direction' => 'required|in:inbound,outbound',
            'from_address' => 'required|email|max:255',
            'to_address' => 'required|email|max:255',
            'cc' => 'nullable|string|max:1000',
            'bcc' => 'nullable|string|max:1000',
            'subject' => 'required|string|max:255',
            'body_preview' => 'nullable|string',
            'thread_id' => 'nullable|string|max:255',
            'sent_at' => 'nullable|date',
        ]);

        $emailLog = $request->user()->emailLogs()->create($validated);

        if ($emailLog->contact_id) {
            $emailLog->contact->update(['last_contacted_at' => now()]);
        }

        TimelineService::log(
            user: $request->user(),
            eventType: 'email_logged',
            subject: ucfirst($validated['direction']) . ' email: ' . $validated['subject'],
            contact: $emailLog->contact,
            deal: $emailLog->deal,
            loggable: $emailLog,
            metadata: [
                'direction' => $validated['direction'],
                'subject' => $validated['subject'],
            ],
        );

        if ($emailLog->contact_id) {
            app(ContactInsightsService::class)->recordActivity($emailLog->contact, 'email_logged');
        }

        if ($emailLog->deal_id) {
            $emailLog->deal->touchActivity();
        }

        return back()->with('success', 'Email logged.');
    }

    public function update(Request $request, EmailLog $emailLog): RedirectResponse
    {
        $user = $request->user();
        abort_unless($emailLog->user_id === $user->id || ($user->team_id && $emailLog->team_id === $user->team_id), 403);

        $validated = $request->validate([
            'subject' => 'sometimes|required|string|max:255',
            'body_preview' => 'nullable|string',
            'sent_at' => 'nullable|date',
            'opened_at' => 'nullable|date',
        ]);

        $emailLog->update($validated);

        return back()->with('success', 'Email log updated.');
    }

    public function destroy(Request $request, EmailLog $emailLog): RedirectResponse
    {
        $user = $request->user();
        abort_unless($emailLog->user_id === $user->id || ($user->team_id && $emailLog->team_id === $user->team_id), 403);

        $emailLog->delete();

        return back()->with('success', 'Email log deleted.');
    }
}
