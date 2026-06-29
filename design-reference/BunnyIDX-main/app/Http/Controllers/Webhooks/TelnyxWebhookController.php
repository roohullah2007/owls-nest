<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Events\NewSmsMessage;
use App\Exceptions\InsufficientCreditsException;
use App\Http\Controllers\Controller;
use App\Models\CallRecord;
use App\Models\Contact;
use App\Models\CreditTransaction;
use App\Models\DialerSessionCall;
use App\Models\PhoneNumber;
use App\Models\SmsMessage;
use App\Services\Billing\CreditService;
use App\Services\Telnyx\TelnyxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelnyxWebhookController extends Controller
{
    public function __construct(
        private TelnyxService $telnyx,
        private CreditService $credits,
    ) {}

    /**
     * Handle inbound SMS webhooks from Telnyx.
     */
    public function handleSms(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('telnyx-signature-ed25519', '');
        $timestamp = $request->header('telnyx-timestamp', '');

        if (! $this->telnyx->verifyWebhookSignature($payload, $signature, $timestamp)) {
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $data = $request->input('data', []);
        $eventType = $data['event_type'] ?? $request->input('data.event_type', '');
        $messageData = $data['payload'] ?? [];

        return match (true) {
            str_starts_with($eventType, 'message.received') => $this->handleInboundMessage($messageData),
            str_starts_with($eventType, 'message.sent'),
            str_starts_with($eventType, 'message.delivered'),
            str_starts_with($eventType, 'message.failed') => $this->handleStatusUpdate($messageData, $eventType),
            default => response()->json(['status' => 'ignored']),
        };
    }

    /**
     * Handle Telnyx voice/Call Control webhooks.
     * Orchestrates voicedrop playback and keeps CallRecord state in sync.
     */
    public function handleVoice(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('telnyx-signature-ed25519', '');
        $timestamp = $request->header('telnyx-timestamp', '');

        if (! $this->telnyx->verifyWebhookSignature($payload, $signature, $timestamp)) {
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $data = $request->input('data', []);
        $eventType = $data['event_type'] ?? '';
        $eventPayload = $data['payload'] ?? [];
        $callControlId = $eventPayload['call_control_id'] ?? null;

        if (! $callControlId) {
            return response()->json(['status' => 'ignored']);
        }

        $clientState = $this->decodeClientState($eventPayload['client_state'] ?? null);
        $isVoicedrop = ($clientState['kind'] ?? null) === 'voicedrop';

        return match ($eventType) {
            'call.answered' => $this->onCallAnswered($callControlId, $clientState, $isVoicedrop),
            'call.machine.detection.ended',
            'call.machine.premium.detection.ended' => $this->onAmdEnded($callControlId, $eventPayload, $clientState, $isVoicedrop),
            'call.playback.ended' => $this->onPlaybackEnded($callControlId),
            'call.recording.saved' => $this->onRecordingSaved($callControlId, $eventPayload),
            'call.hangup' => $this->onHangup($callControlId, $eventPayload),
            default => response()->json(['status' => 'ignored', 'event' => $eventType]),
        };
    }

    /**
     * Telnyx finished writing a recording. Pull the public URL into the CallRecord so
     * the agent can play it back from the timeline.
     */
    private function onRecordingSaved(string $callControlId, array $payload): JsonResponse
    {
        $url = $payload['recording_urls']['mp3']
            ?? $payload['recording_urls']['wav']
            ?? $payload['public_recording_urls']['mp3']
            ?? $payload['public_recording_urls']['wav']
            ?? null;

        if (! $url) {
            return response()->json(['status' => 'no_url']);
        }

        $callRecord = CallRecord::where('telnyx_call_control_id', $callControlId)->first();
        if ($callRecord) {
            $callRecord->update([
                'recording_url' => $url,
                'is_recorded' => true,
            ]);
            $this->syncDialerSessionCall($callRecord->fresh());
        }

        return response()->json(['status' => 'saved']);
    }

    /**
     * Sync the corresponding DialerSessionCall row (if any) with the final call
     * facts — duration + attempted_at — once the webhook lands. This means
     * even if the agent closed the tab mid-call, the session still gets a
     * source-of-truth timestamp + duration to report on.
     */
    private function syncDialerSessionCall(CallRecord $callRecord): void
    {
        if (! $callRecord->id) {
            return;
        }

        $row = DialerSessionCall::where('call_record_id', $callRecord->id)->first();
        if (! $row) {
            return;
        }

        $row->update([
            'attempted_at' => $callRecord->ended_at ?? $row->attempted_at ?? now(),
            'duration_seconds' => $callRecord->duration_seconds ?? $row->duration_seconds,
        ]);
    }

    private function decodeClientState(?string $state): array
    {
        if (! $state) {
            return [];
        }
        $decoded = json_decode(base64_decode($state, true) ?: '', true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * On answer for a voicedrop: don't play yet — wait for AMD to confirm voicemail.
     * If AMD wasn't used (no client_state), play immediately on human answer.
     */
    private function onCallAnswered(string $callControlId, array $clientState, bool $isVoicedrop): JsonResponse
    {
        CallRecord::where('telnyx_call_control_id', $callControlId)->update(['status' => 'answered']);

        if ($isVoicedrop && empty($clientState['audio_url'])) {
            return response()->json(['status' => 'answered']);
        }

        // If voicedrop and we explicitly chose no AMD, play now. Otherwise wait for AMD event.
        return response()->json(['status' => 'answered']);
    }

    /**
     * AMD finished. If a voicemail/machine was detected, play the voicedrop audio.
     * If a human answered, hang up so we don't intrude.
     */
    private function onAmdEnded(string $callControlId, array $payload, array $clientState, bool $isVoicedrop): JsonResponse
    {
        if (! $isVoicedrop) {
            return response()->json(['status' => 'ignored']);
        }

        $result = $payload['result'] ?? '';
        $audioUrl = $clientState['audio_url'] ?? null;

        $isMachine = in_array($result, ['machine', 'machine_premium', 'machine_premium_message'], true);
        $isHuman = in_array($result, ['human', 'human_residential'], true);

        if ($isMachine && $audioUrl) {
            $this->telnyx->playAudio($callControlId, $audioUrl);
            CallRecord::where('telnyx_call_control_id', $callControlId)->update(['status' => 'answered']);

            return response()->json(['status' => 'playing']);
        }

        if ($isHuman) {
            // Don't drop voicemail on a live human — hang up gracefully.
            $this->telnyx->hangupCall($callControlId);

            return response()->json(['status' => 'human_hangup']);
        }

        return response()->json(['status' => 'amd_inconclusive', 'result' => $result]);
    }

    /**
     * Playback finished — hang up.
     */
    private function onPlaybackEnded(string $callControlId): JsonResponse
    {
        $this->telnyx->hangupCall($callControlId);

        return response()->json(['status' => 'playback_done']);
    }

    /**
     * Final hangup — record outcome + sync any linked DialerSessionCall.
     */
    private function onHangup(string $callControlId, array $payload): JsonResponse
    {
        $cause = $payload['hangup_cause'] ?? null;
        $startedAt = $payload['start_time'] ?? null;
        $endedAt = $payload['end_time'] ?? null;
        $duration = ($startedAt && $endedAt) ? max(0, strtotime($endedAt) - strtotime($startedAt)) : null;

        $callRecord = CallRecord::where('telnyx_call_control_id', $callControlId)->first();
        if ($callRecord) {
            $callRecord->update([
                'status' => 'completed',
                'duration_seconds' => $duration,
                'ended_at' => $endedAt ?? now(),
            ]);
            $this->syncDialerSessionCall($callRecord->fresh());
            $this->chargeForCall($callRecord, $duration);
        }

        return response()->json(['status' => 'hung_up', 'cause' => $cause]);
    }

    /**
     * Charge phone credits for a completed outbound call, billed per minute
     * (rounded up). The call already happened, so an exhausted wallet is logged
     * rather than failing — the pre-call balance guard bars empty wallets.
     */
    private function chargeForCall(CallRecord $callRecord, ?int $duration): void
    {
        if ($callRecord->direction !== 'outbound' || ! $duration || $duration <= 0) {
            return;
        }

        $user = $callRecord->user;
        if (! $user) {
            return;
        }

        $cost = $this->credits->voiceCost($duration);
        if ($cost <= 0) {
            return;
        }

        try {
            $this->credits->charge(
                $user,
                $cost,
                CreditTransaction::CATEGORY_VOICE,
                $callRecord,
                "Call to {$callRecord->to_number}",
            );
        } catch (InsufficientCreditsException) {
            Log::warning('Call completed but credit charge failed (insufficient balance)', [
                'user_id' => $user->id,
                'call_record_id' => $callRecord->id,
            ]);
        }
    }

    private function handleInboundMessage(array $data): JsonResponse
    {
        $fromNumber = $data['from']['phone_number'] ?? '';
        $toNumber = $data['to'][0]['phone_number'] ?? $data['to'] ?? '';
        $body = $data['text'] ?? '';
        $telnyxMessageId = $data['id'] ?? null;

        if (is_array($toNumber)) {
            $toNumber = $toNumber['phone_number'] ?? '';
        }

        // Handle opt-out keywords
        $normalizedBody = strtoupper(trim($body));
        if (in_array($normalizedBody, ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'])) {
            $this->handleOptOut($fromNumber);

            return response()->json(['status' => 'opt_out_processed']);
        }

        if (in_array($normalizedBody, ['START', 'UNSTOP', 'SUBSCRIBE'])) {
            $this->handleOptIn($fromNumber);

            return response()->json(['status' => 'opt_in_processed']);
        }

        // Telnyx retries webhooks, so the same message.received can arrive more than once.
        // The telnyx_message_id column is unique — re-creating would throw — so ignore any
        // event we've already stored instead of erroring back to Telnyx (which keeps retrying).
        if ($telnyxMessageId && SmsMessage::where('telnyx_message_id', $telnyxMessageId)->exists()) {
            return response()->json(['status' => 'duplicate_ignored']);
        }

        // Find the phone number record to determine the user/team
        $phoneRecord = PhoneNumber::where('phone_number', $toNumber)->active()->first();

        if (! $phoneRecord) {
            Log::warning('Telnyx: Inbound SMS to unrecognized number', ['to' => $toNumber]);

            return response()->json(['status' => 'no_matching_number']);
        }

        // Try to match contact by phone number
        $contact = Contact::where(function ($q) use ($fromNumber) {
            $q->where('phone', $fromNumber)->orWhere('mobile', $fromNumber);
        })->where(function ($q) use ($phoneRecord) {
            $q->where('user_id', $phoneRecord->user_id);
            if ($phoneRecord->team_id) {
                $q->orWhere('team_id', $phoneRecord->team_id);
            }
        })->first();

        // Auto-create contact for unknown inbound numbers
        if (! $contact) {
            $contact = Contact::create([
                'user_id' => $phoneRecord->user_id,
                'team_id' => $phoneRecord->team_id,
                'first_name' => 'Unknown',
                'last_name' => $fromNumber,
                'phone' => $fromNumber,
                'source' => 'SMS',
                'type' => 'prospect',
            ]);
        }

        $sms = SmsMessage::create([
            'user_id' => $phoneRecord->user_id,
            'team_id' => $phoneRecord->team_id,
            'contact_id' => $contact->id,
            'phone_number_id' => $phoneRecord->id,
            'telnyx_message_id' => $telnyxMessageId,
            'direction' => 'inbound',
            'from_number' => $fromNumber,
            'to_number' => $toNumber,
            'body' => $body,
            'status' => 'received',
        ]);

        broadcast(new NewSmsMessage($sms->load('contact')));

        return response()->json(['status' => 'received']);
    }

    private function handleStatusUpdate(array $data, string $eventType): JsonResponse
    {
        $telnyxMessageId = $data['id'] ?? null;

        if (! $telnyxMessageId) {
            return response()->json(['status' => 'no_id']);
        }

        $sms = SmsMessage::where('telnyx_message_id', $telnyxMessageId)->first();

        if (! $sms) {
            return response()->json(['status' => 'not_found']);
        }

        $newStatus = match (true) {
            str_contains($eventType, 'delivered') => 'delivered',
            str_contains($eventType, 'sent') => 'sent',
            str_contains($eventType, 'failed') => 'failed',
            default => $sms->status,
        };

        $sms->update([
            'status' => $newStatus,
            'error_code' => $data['errors'][0]['code'] ?? null,
        ]);

        return response()->json(['status' => 'updated']);
    }

    private function handleOptOut(string $phoneNumber): void
    {
        Contact::where(function ($q) use ($phoneNumber) {
            $q->where('phone', $phoneNumber)->orWhere('mobile', $phoneNumber);
        })->update([
            'sms_opted_out' => true,
            'sms_opted_out_at' => now(),
        ]);
    }

    private function handleOptIn(string $phoneNumber): void
    {
        Contact::where(function ($q) use ($phoneNumber) {
            $q->where('phone', $phoneNumber)->orWhere('mobile', $phoneNumber);
        })->update([
            'sms_opted_out' => false,
            'sms_opted_out_at' => null,
            'sms_consent' => true,
            'sms_consent_at' => now(),
        ]);
    }
}
