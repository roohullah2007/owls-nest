<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Exceptions\InsufficientCreditsException;
use App\Models\CreditTransaction;
use App\Models\CreditWallet;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Single authority over the phone-credit wallet: balance reads, atomic
 * charge/grant with a written ledger entry, the monthly plan allowance, and the
 * per-action rates (SystemSetting override → config/billing.php default).
 *
 * Every wallet mutation goes through here so balance and ledger never diverge.
 * All amounts are USD **cents**.
 */
class CreditService
{
    public function walletFor(User $user): CreditWallet
    {
        return $user->creditWallet();
    }

    public function balanceCents(User $user): int
    {
        // Ensure the plan's included allowance has been granted for this period
        // before reporting a balance, so paid users can use their included
        // credits immediately (and the allowance auto-renews monthly).
        $this->applyMonthlyAllowance($user);

        return (int) $user->creditWallet()->balance_cents;
    }

    public function canAfford(User $user, int $cents): bool
    {
        return $this->balanceCents($user) >= $cents;
    }

    /**
     * Deduct credits, writing a debit ledger entry. Atomic (row lock) so
     * concurrent SMS/calls can't overspend. Throws when the balance can't cover
     * the charge — nothing should be sent/provisioned in that case.
     */
    public function charge(
        User $actor,
        int $cents,
        string $category,
        ?Model $reference = null,
        string $description = '',
    ): CreditTransaction {
        if ($cents < 0) {
            throw new \InvalidArgumentException('Charge amount must be non-negative.');
        }

        // Make sure any due included allowance is granted before charging.
        $this->applyMonthlyAllowance($actor);

        $walletId = $actor->creditWallet()->id;

        return DB::transaction(function () use ($walletId, $actor, $cents, $category, $reference, $description) {
            $wallet = CreditWallet::whereKey($walletId)->lockForUpdate()->first();

            if ($wallet->balance_cents < $cents) {
                throw new InsufficientCreditsException($cents, $wallet->balance_cents);
            }

            $wallet->balance_cents -= $cents;
            // Track how much of the plan's included allowance remains (display only).
            $wallet->included_allowance_cents = max(0, $wallet->included_allowance_cents - $cents);
            $wallet->save();

            return $this->writeEntry($wallet, $actor, CreditTransaction::DIRECTION_DEBIT, $category, $cents, $description, $reference);
        });
    }

    /**
     * Add credits (top-up, monthly allowance, refund, adjustment), writing a
     * credit ledger entry. Atomic.
     */
    public function grant(
        User $actor,
        int $cents,
        string $category,
        string $description = '',
        ?Model $reference = null,
        ?string $stripeReference = null,
    ): CreditTransaction {
        if ($cents < 0) {
            throw new \InvalidArgumentException('Grant amount must be non-negative.');
        }

        $walletId = $actor->creditWallet()->id;

        return DB::transaction(function () use ($walletId, $actor, $cents, $category, $reference, $description, $stripeReference) {
            $wallet = CreditWallet::whereKey($walletId)->lockForUpdate()->first();

            $wallet->balance_cents += $cents;
            $wallet->save();

            return $this->writeEntry($wallet, $actor, CreditTransaction::DIRECTION_CREDIT, $category, $cents, $description, $reference, $stripeReference);
        });
    }

    /**
     * Add purchased credits from a Stripe payment, exactly once per Stripe
     * reference (checkout session / payment id). Both the webhook and the
     * success-page reconciliation call this; the first wins, the rest no-op.
     * Returns the new transaction, or null if already applied.
     */
    public function topUpFromStripe(
        User $actor,
        int $cents,
        string $stripeReference,
        string $description = 'Credit purchase',
    ): ?CreditTransaction {
        if (CreditTransaction::where('stripe_reference', $stripeReference)->exists()) {
            return null;
        }

        try {
            return $this->grant($actor, $cents, CreditTransaction::CATEGORY_PURCHASE, $description, null, $stripeReference);
        } catch (QueryException) {
            // Lost a race on the unique stripe_reference — already credited.
            return null;
        }
    }

    /**
     * Reset/grant the plan's monthly included credit allowance when due (never
     * granted yet, or the reset date has passed). Idempotent within a period.
     */
    public function applyMonthlyAllowance(User $user): void
    {
        $owner = $user->billingOwner();
        $wallet = $owner->creditWallet();

        $due = $wallet->allowance_resets_at === null || $wallet->allowance_resets_at->isPast();
        if (! $due) {
            return;
        }

        $allowance = (int) ($owner->effectivePlan()->included_credits_cents ?? 0);

        if ($allowance > 0) {
            $this->grant($owner, $allowance, CreditTransaction::CATEGORY_MONTHLY_GRANT, 'Monthly plan credit allowance');
        }

        $wallet->refresh();
        $wallet->included_allowance_cents = $allowance;
        $wallet->allowance_resets_at = now()->addMonth();
        $wallet->save();
    }

    // ---- Per-action rates & cost helpers --------------------------------

    public function smsSegmentCents(): int
    {
        return $this->rate('sms_segment_cents');
    }

    public function voicePerMinuteCents(): int
    {
        return $this->rate('voice_per_minute_cents');
    }

    public function numberMonthlyCents(): int
    {
        return $this->rate('number_monthly_cents');
    }

    /** Cost of an outbound SMS with the given segment count. */
    public function smsCost(int $segments): int
    {
        return max(1, $segments) * $this->smsSegmentCents();
    }

    /** Cost of an outbound call of the given duration (minutes, rounded up). */
    public function voiceCost(int $durationSeconds): int
    {
        if ($durationSeconds <= 0) {
            return 0;
        }

        return (int) ceil($durationSeconds / 60) * $this->voicePerMinuteCents();
    }

    /**
     * Resolve a rate: runtime SystemSetting override wins, else the config
     * default. Stored under `billing.rate.<key>`.
     */
    private function rate(string $key): int
    {
        $override = SystemSetting::get("billing.rate.{$key}");
        if ($override !== null && $override !== '') {
            return (int) $override;
        }

        return (int) config("billing.rates.{$key}", 0);
    }

    private function writeEntry(
        CreditWallet $wallet,
        User $actor,
        string $direction,
        string $category,
        int $cents,
        string $description,
        ?Model $reference,
        ?string $stripeReference = null,
    ): CreditTransaction {
        $tx = new CreditTransaction([
            'credit_wallet_id' => $wallet->id,
            'user_id' => $actor->id,
            'direction' => $direction,
            'category' => $category,
            'amount_cents' => $cents,
            'balance_after_cents' => $wallet->balance_cents,
            'description' => $description !== '' ? $description : null,
            'stripe_reference' => $stripeReference,
        ]);

        if ($reference) {
            $tx->reference()->associate($reference);
        }

        $tx->save();

        return $tx;
    }
}
