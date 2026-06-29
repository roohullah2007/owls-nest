<?php

declare(strict_types=1);

/**
 * Property Alerts — saved-search & favorite listing email notifications.
 *
 * Billing values live HERE, never hardcoded in the sending path (the sender
 * reads this config). Quota is tracked + an overage amount is exposed; we do
 * NOT charge automatically because BillingService has no metered-billing
 * integration. Flip `enforce_hard_limit` only once billing can collect overage.
 */
return [
    'enabled' => env('PROPERTY_ALERTS_ENABLED', true),

    // Per-account sending cadence. Stored on users.notification_preferences
    // ['property_alert_frequency']. Value = minimum days between sends for a
    // single subscription ("do not send more often than selected frequency").
    // null = never send.
    'default_frequency' => 'twice_weekly',
    'frequencies' => [
        'daily' => 1,
        'twice_weekly' => 3,   // ~2x / week
        'weekly' => 7,
        'off' => null,
    ],

    'quota' => [
        // Property-alert emails included per account per calendar month.
        // New RESEND_* key wins; falls back to the original key so existing
        // live .env files keep working without edits.
        'included_limit' => (int) env('RESEND_PROPERTY_ALERT_MONTHLY_INCLUDED', env('PROPERTY_ALERT_INCLUDED_LIMIT', 10000)),
        // Overage is billed per this many emails beyond the included limit.
        'overage_unit' => 1000,
        'overage_price_per_unit' => (float) env('RESEND_PROPERTY_ALERT_OVERAGE_PER_1000', env('PROPERTY_ALERT_OVERAGE_PRICE', 1.00)),
        // Billing cannot collect metered overage yet → never block sends, just
        // track + expose the amount. Set true once metered billing exists.
        'enforce_hard_limit' => (bool) env('PROPERTY_ALERT_ENFORCE_LIMIT', false),
    ],

    // Platform sender identity for non-branded alerts now comes from each user's
    // sending alias (config('mail.sender_alias') + SenderAliasService); branded
    // (per-user key) sends keep the user's own from-identity. See
    // BrandedEmailResolver — no per-feature sender override is needed here.

    // Alert types that COUNT against the monthly property-alert quota. Anything
    // not in this list (verification, password reset, lead/registration
    // confirmation, admin notices, Gmail/Outlook inbox mail) is never counted.
    'quota_alert_types' => [
        'saved_search_match',
        'price_drop',
        'status_change',
    ],

    // Suppress a duplicate (visitor + listing + alert_type) inside this window
    // even if a deterministic idempotency key somehow differs.
    'dedup_window_hours' => (int) env('PROPERTY_ALERT_DEDUP_HOURS', 72),

    // Cap MLS results pulled per saved-search evaluation (bounds API fan-out).
    'max_matches_per_search' => 50,
];
