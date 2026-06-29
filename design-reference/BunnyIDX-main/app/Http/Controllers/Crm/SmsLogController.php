<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\SmsLog;
use App\Services\Ai\ContactInsightsService;
use App\Services\TimelineService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SmsLogController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'contact_id' => 'nullable|exists:contacts,id',
            'deal_id' => 'nullable|exists:deals,id',
            'direction' => 'required|in:inbound,outbound',
            'phone_number' => 'nullable|string|max:20',
            'body' => 'required|string',
            'sent_at' => 'nullable|date',
        ]);

        $smsLog = $request->user()->smsLogs()->create($validated);

        if ($smsLog->contact_id) {
            $smsLog->contact->update(['last_contacted_at' => now()]);
        }

        TimelineService::log(
            user: $request->user(),
            eventType: 'sms_logged',
            subject: ucfirst($validated['direction']) . ' SMS',
            description: \Illuminate\Support\Str::limit($validated['body'], 100),
            contact: $smsLog->contact,
            deal: $smsLog->deal,
            loggable: $smsLog,
            metadata: ['direction' => $validated['direction']],
        );

        if ($smsLog->contact_id) {
            app(ContactInsightsService::class)->recordActivity($smsLog->contact, 'sms_logged');
        }

        if ($smsLog->deal_id) {
            $smsLog->deal->touchActivity();
        }

        return back()->with('success', 'SMS logged.');
    }

    public function update(Request $request, SmsLog $smsLog): RedirectResponse
    {
        $user = $request->user();
        abort_unless($smsLog->user_id === $user->id || ($user->team_id && $smsLog->team_id === $user->team_id), 403);

        $validated = $request->validate([
            'body' => 'sometimes|required|string',
            'sent_at' => 'nullable|date',
            'delivered_at' => 'nullable|date',
        ]);

        $smsLog->update($validated);

        return back()->with('success', 'SMS log updated.');
    }

    public function destroy(Request $request, SmsLog $smsLog): RedirectResponse
    {
        $user = $request->user();
        abort_unless($smsLog->user_id === $user->id || ($user->team_id && $smsLog->team_id === $user->team_id), 403);

        $smsLog->delete();

        return back()->with('success', 'SMS log deleted.');
    }
}
