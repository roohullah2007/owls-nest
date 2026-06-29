<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\CallRecord;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\PhoneNumber;
use App\Models\Voicemail;
use App\Models\WebRtcCredential;
use App\Services\Billing\CreditService;
use App\Services\Telnyx\TelnyxService;
use App\Services\TimelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Str;

class VoiceController extends Controller implements HasMiddleware
{
    /** Voice calling is part of the paid Phone feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:phone')];
    }

    public function __construct(
        private TelnyxService $telnyx,
        private CreditService $credits,
    ) {}

    /**
     * Get or create a WebRTC token for the current user.
     */
    public function getToken(Request $request): JsonResponse
    {
        $user = $request->user();

        $credential = $user->webRtcCredential;

        // Create credential if not exists
        if (! $credential) {
            $sipUsername = 'bunnyidx_'.$user->id.'_'.Str::random(8);
            $sipPassword = Str::random(32);

            // Create SIP connection if needed (once per install)
            $connectionId = config('telnyx.sip_connection_id');

            if (! $connectionId) {
                $connection = $this->telnyx->createSipConnection('BunnyIDX WebRTC');
                if (! $connection) {
                    return response()->json(['error' => 'Failed to create SIP connection.'], 500);
                }
                $connectionId = $connection['id'];
            }

            $result = $this->telnyx->createWebRtcCredential($connectionId, $sipUsername, $sipPassword);

            if (! $result) {
                return response()->json(['error' => 'Failed to create WebRTC credential.'], 500);
            }

            $credential = WebRtcCredential::create([
                'user_id' => $user->id,
                'telnyx_credential_id' => $result['id'],
                'sip_username' => $sipUsername,
                'sip_password' => $sipPassword,
            ]);
        }

        // Generate a short-lived token
        $token = $this->telnyx->generateClientToken($credential->telnyx_credential_id);

        if (! $token) {
            return response()->json(['error' => 'Failed to generate WebRTC token.'], 500);
        }

        return response()->json(['token' => $token]);
    }

    /**
     * Initiate an outbound call. Creates the local CallRecord row; the browser-side TelnyxRTC SDK
     * places the real WebRTC leg and then PATCHes the resulting telnyx_call_control_id back via
     * attachCallControl(). All contact/deal lookups are tenant-scoped.
     */
    public function initiateCall(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to_number' => 'required|string|starts_with:+',
            'contact_id' => 'nullable|integer',
            'deal_id' => 'nullable|integer',
            'phone_number_id' => 'nullable|exists:phone_numbers,id',
        ]);

        $user = $request->user();

        // Tenant-scoped contact lookup. Reject contact_ids the user can't see.
        $contactId = null;
        if (! empty($validated['contact_id'])) {
            $contact = Contact::withPermissions($user, 'contacts')
                ->where('id', $validated['contact_id'])
                ->first();
            if (! $contact) {
                return response()->json(['error' => 'Contact not found or not accessible.'], 403);
            }
            $contactId = $contact->id;
        }

        $dealId = null;
        if (! empty($validated['deal_id'])) {
            // Deal::withPermissions would be cleaner but Deal model may not have the trait; verify via direct ownership.
            $deal = Deal::query()
                ->where('id', $validated['deal_id'])
                ->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                    if ($user->team_id) {
                        $q->orWhere('team_id', $user->team_id);
                    }
                })
                ->first();
            if (! $deal) {
                return response()->json(['error' => 'Deal not found or not accessible.'], 403);
            }
            $dealId = $deal->id;
        }

        // Resolve outbound caller-ID number — must be voice-capable.
        $fromNumber = null;
        if (! empty($validated['phone_number_id'])) {
            $fromNumber = PhoneNumber::where('id', $validated['phone_number_id'])
                ->where('user_id', $user->id)
                ->active()
                ->first();
        }

        if (! $fromNumber) {
            $fromNumber = PhoneNumber::where('user_id', $user->id)
                ->where('is_default', true)
                ->active()
                ->first();
        }

        if (! $fromNumber) {
            return response()->json(['error' => 'No active phone number.'], 422);
        }

        // Credit gate: block placing a call with no balance to cover a minute.
        // Per-minute usage is charged when the call ends (hangup webhook).
        if (! $this->credits->canAfford($user, $this->credits->voicePerMinuteCents())) {
            return response()->json(['error' => 'Not enough phone credits. Top up your balance in Settings.'], 422);
        }

        $callRecord = CallRecord::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'contact_id' => $contactId,
            'deal_id' => $dealId,
            'phone_number_id' => $fromNumber->id,
            'direction' => 'outbound',
            'from_number' => $fromNumber->phone_number,
            'to_number' => $validated['to_number'],
            'status' => 'initiated',
            'started_at' => now(),
        ]);

        return response()->json([
            'call_record' => $callRecord,
            'from_number' => $fromNumber->phone_number,
        ], 201);
    }

    /**
     * Persist the Telnyx call_control_id once the WebRTC SDK has placed the leg.
     * Called by PhoneDialer immediately after client.newCall() returns. This ID is required
     * for any subsequent mute/hold/record/hangup commands to find the right Telnyx call.
     */
    public function attachCallControl(Request $request, CallRecord $callRecord): JsonResponse
    {
        $this->authorizeCallRecord($request, $callRecord);

        $validated = $request->validate([
            'telnyx_call_control_id' => 'required|string|max:128',
            'status' => 'nullable|in:initiated,ringing,answered,completed,failed,missed',
        ]);

        $callRecord->update(array_filter([
            'telnyx_call_control_id' => $validated['telnyx_call_control_id'],
            'status' => $validated['status'] ?? null,
        ], fn ($v) => $v !== null));

        return response()->json(['call_record' => $callRecord->fresh()]);
    }

    /**
     * Issue a server-side Call Control command (hold/unhold, record_start/record_stop, transfer).
     * Mute is handled locally by the WebRTC SDK and does NOT route through this endpoint.
     */
    public function callControl(Request $request, CallRecord $callRecord): JsonResponse
    {
        $this->authorizeCallRecord($request, $callRecord);

        $validated = $request->validate([
            'action' => 'required|in:hold,unhold,record_start,record_stop,transfer,voicemail_drop',
            'to_number' => 'required_if:action,transfer|nullable|string|starts_with:+',
            'voicemail_id' => 'required_if:action,voicemail_drop|nullable|integer|exists:voicemails,id',
        ]);

        if (! $callRecord->telnyx_call_control_id) {
            return response()->json(['error' => 'Call is not connected yet.'], 422);
        }

        $ccid = $callRecord->telnyx_call_control_id;

        // Voicemail drop: load the visible clip and play it on the live call.
        if ($validated['action'] === 'voicemail_drop') {
            $voicemail = Voicemail::visibleTo($request->user())->find($validated['voicemail_id']);
            if (! $voicemail) {
                return response()->json(['error' => 'Voicemail not found.'], 404);
            }
            $ok = $this->telnyx->playAudio($ccid, $voicemail->audio_url);
            if (! $ok) {
                return response()->json(['error' => 'Telnyx rejected the voicemail playback.'], 502);
            }

            return response()->json(['ok' => true, 'voicemail_id' => $voicemail->id]);
        }

        $ok = match ($validated['action']) {
            'hold' => $this->telnyx->holdCall($ccid, true),
            'unhold' => $this->telnyx->holdCall($ccid, false),
            'record_start' => $this->telnyx->startRecording($ccid),
            'record_stop' => $this->telnyx->stopRecording($ccid),
            'transfer' => $this->telnyx->transferCall($ccid, $validated['to_number']),
        };

        if (! $ok) {
            return response()->json(['error' => "Telnyx rejected the {$validated['action']} command."], 502);
        }

        if ($validated['action'] === 'record_start') {
            $callRecord->update(['is_recorded' => true]);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * End a call and save notes/outcome. Hangs up the live Telnyx leg if one exists
     * (i.e. the call connected past WebRTC handshake), then writes the timeline entry.
     */
    public function endCall(Request $request, CallRecord $callRecord): JsonResponse
    {
        $this->authorizeCallRecord($request, $callRecord);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:5000',
            'status' => 'nullable|in:completed,failed,missed',
            'duration_seconds' => 'nullable|integer|min:0',
        ]);

        // Actually hang up the Telnyx leg. If the SDK already tore it down (common when the
        // user hangs up via the WebRTC client) this just no-ops on Telnyx's side.
        if ($callRecord->telnyx_call_control_id && ! $callRecord->ended_at) {
            $this->telnyx->hangupCall($callRecord->telnyx_call_control_id);
        }

        $callRecord->update([
            'status' => $validated['status'] ?? 'completed',
            'notes' => $validated['notes'] ?? $callRecord->notes,
            'duration_seconds' => $validated['duration_seconds'] ?? $callRecord->duration_seconds,
            'ended_at' => now(),
        ]);

        $contact = $callRecord->contact;
        if ($contact) {
            $duration = $callRecord->duration_seconds;
            $durationStr = $duration ? gmdate('i:s', $duration) : '0:00';

            TimelineService::log(
                $request->user(),
                'call_completed',
                "{$callRecord->direction} call with {$contact->full_name} ({$durationStr})",
                $validated['notes'] ?? null,
                $contact,
                loggable: $callRecord,
            );

            $contact->update(['last_contacted_at' => now()]);
        }

        return response()->json(['call_record' => $callRecord->fresh()]);
    }

    /**
     * Tenant authorization for any operation against a single CallRecord. Allows the original
     * caller (user_id) and team members on the same team_id.
     */
    private function authorizeCallRecord(Request $request, CallRecord $callRecord): void
    {
        $user = $request->user();
        $sameUser = $callRecord->user_id === $user->id;
        $sameTeam = $callRecord->team_id && $user->team_id && $callRecord->team_id === $user->team_id;
        if (! $sameUser && ! $sameTeam) {
            abort(403, 'Unauthorized.');
        }
    }

    /**
     * Look up a caller by phone number (for inbound calls).
     */
    public function lookupCaller(Request $request): JsonResponse
    {
        $request->validate([
            'phone_number' => 'required|string',
        ]);

        $phone = $request->input('phone_number');
        $user = $request->user();

        $contact = Contact::withPermissions($user, 'contacts')
            ->where(function ($q) use ($phone) {
                $q->where('phone', $phone)->orWhere('mobile', $phone);
            })
            ->first();

        if ($contact) {
            return response()->json([
                'contact' => [
                    'id' => $contact->id,
                    'uuid' => $contact->uuid,
                    'name' => $contact->full_name,
                    'type' => $contact->type,
                    'phone' => $contact->phone,
                    'mobile' => $contact->mobile,
                ],
            ]);
        }

        return response()->json(['contact' => null]);
    }
}
