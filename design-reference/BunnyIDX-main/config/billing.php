<?php

declare(strict_types=1);

/**
 * Phone-credit pricing (USD, in cents). These are the *default* per-action rates
 * that draw down a user's credit wallet. Defaults here are overridable at
 * runtime — with no deploy — via SystemSetting keys, which the admin panel
 * edits:
 *   billing.rate.sms_segment_cents
 *   billing.rate.voice_per_minute_cents
 *   billing.rate.number_monthly_cents
 *
 * Per-plan included allowances, number/website/email limits and seat pricing
 * live on the `plans` table (admin-editable), not here.
 */
return [
    'rates' => [
        // Cost charged per outbound SMS segment (Telnyx bills per 160-char part).
        'sms_segment_cents' => (int) env('BILLING_SMS_SEGMENT_CENTS', 2),
        // Cost charged per minute (rounded up) of outbound voice.
        'voice_per_minute_cents' => (int) env('BILLING_VOICE_PER_MINUTE_CENTS', 3),
        // Monthly rental charged per active phone number.
        'number_monthly_cents' => (int) env('BILLING_NUMBER_MONTHLY_CENTS', 200),
    ],

    /*
     * One-time credit top-up packages (Stripe Checkout, mode=payment).
     *   price_cents  – what the customer pays.
     *   credit_cents – credit added to the wallet (>= price_cents allows a bonus).
     * Keyed by a stable slug used as the checkout payload + Stripe metadata.
     */
    'packages' => [
        'starter' => ['label' => 'Starter', 'price_cents' => 1000, 'credit_cents' => 1000],
        'standard' => ['label' => 'Standard', 'price_cents' => 2500, 'credit_cents' => 2750],   // +10% bonus
        'pro' => ['label' => 'Pro', 'price_cents' => 5000, 'credit_cents' => 5750],             // +15% bonus
        'bulk' => ['label' => 'Bulk', 'price_cents' => 10000, 'credit_cents' => 12000],         // +20% bonus
    ],
];
