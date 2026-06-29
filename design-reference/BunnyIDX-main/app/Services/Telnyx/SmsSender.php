<?php

declare(strict_types=1);

namespace App\Services\Telnyx;

use App\Events\NewSmsMessage;
use App\Exceptions\InsufficientCreditsException;
use App\Models\Contact;
use App\Models\CreditTransaction;
use App\Models\PhoneNumber;
use App\Models\SmsMessage;
use App\Models\TelnyxBrand;
use App\Models\TelnyxCampaign;
use App\Models\User;
use App\Services\Billing\CreditService;
use App\Services\TimelineService;
use Illuminate\Support\Facades\Log;

/**
 * Reusable outbound-SMS pipeline shared by the SMS inbox controller and the
 * Action Plans engine. Centralizes every compliance gate (opt-out, DND, 10DLC),
 * from-number resolution, message logging, timeline write and broadcast so an
 * automated send is held to exactly the same rules as a manual one.
 *
 * Returns a structured result instead of throwing so callers (HTTP vs queued
 * job) can map outcomes to their own response shape.
 *
 * Result shape:
 *   ['status' => 'sent',    'message' => SmsMessage]
 *   ['status' => 'skipped', 'reason' => 'opted_out'|'dnd'|'no_phone'|'10dlc_unapproved'|'insufficient_credits']
 *   ['status' => 'failed',  'reason' => 'send_failed', 'error' => string]
 */
class SmsSender
{
    public function __construct(
        private TelnyxService $telnyx,
        private CreditService $credits,
    ) {}

    /**
     * @param  string|null  $toNumber  Explicit destination; falls back to the contact's phone/mobile.
     * @return array{status:string, message?:SmsMessage, reason?:string, error?:string}
     */
    public function send(User $user, Contact $contact, string $body, ?string $toNumber = null, ?int $phoneNumberId = null): array
    {
        $toNumber = $toNumber ?: ($contact->phone ?: $contact->mobile);

        if (! $toNumber) {
            return ['status' => 'skipped', 'reason' => 'no_phone'];
        }

        // Hard blocks: STOP-replied opt-outs (TCPA) and DND for SMS.
        if ($contact->sms_opted_out) {
            return ['status' => 'skipped', 'reason' => 'opted_out'];
        }
        if (in_array($contact->dnd_mode, ['all', 'sms'], true)) {
            return ['status' => 'skipped', 'reason' => 'dnd'];
        }

        // 10DLC enforcement: only required for US/Canadian (NANP) destinations.
        if ($this->isNanp($toNumber) && ! $this->tenDlcApproved($user->id)) {
            return ['status' => 'skipped', 'reason' => '10dlc_unapproved'];
        }

        $fromNumber = $this->resolveFromNumber($user, $phoneNumberId);

        if (! $fromNumber) {
            return ['status' => 'skipped', 'reason' => 'no_phone'];
        }

        // Credit gate: block when the wallet can't cover even a single segment.
        // The exact (multi-segment) cost is charged after Telnyx confirms the
        // part count below.
        if (! $this->credits->canAfford($user, $this->credits->smsCost(1))) {
            return ['status' => 'skipped', 'reason' => 'insufficient_credits'];
        }

        $result = $this->telnyx->sendSms($fromNumber->phone_number, $toNumber, $body);

        if (! $result) {
            return ['status' => 'failed', 'reason' => 'send_failed', 'error' => 'Failed to send SMS via Telnyx.'];
        }

        $sms = SmsMessage::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'contact_id' => $contact->id,
            'phone_number_id' => $fromNumber->id,
            'telnyx_message_id' => $result['id'] ?? null,
            'direction' => 'outbound',
            'from_number' => $fromNumber->phone_number,
            'to_number' => $toNumber,
            'body' => $body,
            'status' => 'sent',
            'segment_count' => $result['parts'] ?? 1,
        ]);

        // Charge the wallet for the actual segment count. The message is already
        // sent, so a (rare, multi-segment) shortfall is logged rather than
        // failing the send — the single-segment pre-check above bars empty wallets.
        try {
            $this->credits->charge(
                $user,
                $this->credits->smsCost((int) ($result['parts'] ?? 1)),
                CreditTransaction::CATEGORY_SMS,
                $sms,
                "SMS to {$toNumber}",
            );
        } catch (InsufficientCreditsException $e) {
            Log::warning('SMS sent but credit charge failed (insufficient balance)', [
                'user_id' => $user->id,
                'sms_id' => $sms->id,
            ]);
        }

        TimelineService::log(
            $user,
            'sms_sent',
            "SMS sent to {$contact->full_name}",
            mb_substr($body, 0, 200),
            $contact,
            loggable: $sms,
        );

        $contact->update(['last_contacted_at' => now()]);

        broadcast(new NewSmsMessage($sms->load('contact')))->toOthers();

        return ['status' => 'sent', 'message' => $sms];
    }

    /**
     * Resolve the from-number: an explicit active number owned by the user,
     * else the user's default active number.
     */
    public function resolveFromNumber(User $user, ?int $phoneNumberId = null): ?PhoneNumber
    {
        if ($phoneNumberId) {
            $number = PhoneNumber::where('id', $phoneNumberId)
                ->where('user_id', $user->id)
                ->active()
                ->first();
            if ($number) {
                return $number;
            }
        }

        return PhoneNumber::where('user_id', $user->id)
            ->where('is_default', true)
            ->active()
            ->first();
    }

    /**
     * NANP detection — US and Canadian numbers share country code +1.
     * 10DLC registration is only required for these destinations.
     */
    public function isNanp(string $phone): bool
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (strlen($digits) === 10) {
            return true;
        }
        if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
            return true;
        }

        return false;
    }

    public function tenDlcApproved(int $userId): bool
    {
        $brand = TelnyxBrand::where('user_id', $userId)->latest('id')->first();
        if (! $brand || $brand->status !== 'approved') {
            return false;
        }

        $campaign = TelnyxCampaign::where('user_id', $userId)->latest('id')->first();
        if (! $campaign || $campaign->status !== 'approved') {
            return false;
        }

        return true;
    }
}
