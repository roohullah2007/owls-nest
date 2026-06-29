<?php

declare(strict_types=1);

namespace App\Services\PropertyAlerts;

use App\Models\PropertyAlertUsage;
use App\Models\User;

/**
 * Monthly property-alert usage + overage maths. Billing values come from
 * config('property_alerts.quota') so nothing is hardcoded in the send path.
 * Only successfully sent property alerts increment usage.
 */
class PropertyAlertQuota
{
    public function currentMonth(): string
    {
        return now()->format('Y-m');
    }

    /** Get (or create) the usage row for an account's current month. */
    public function usageFor(User $user, ?string $yearMonth = null): PropertyAlertUsage
    {
        return PropertyAlertUsage::firstOrCreate(
            ['user_id' => $user->id, 'year_month' => $yearMonth ?? $this->currentMonth()],
            [
                'property_alert_emails_sent' => 0,
                'included_limit' => (int) config('property_alerts.quota.included_limit'),
            ],
        );
    }

    /**
     * Record successfully sent property alerts. Atomic increment so concurrent
     * workers can't lose counts.
     */
    public function increment(User $user, int $by = 1): void
    {
        if ($by < 1) {
            return;
        }

        $this->usageFor($user); // ensure the row exists

        PropertyAlertUsage::where('user_id', $user->id)
            ->where('year_month', $this->currentMonth())
            ->increment('property_alert_emails_sent', $by);
    }

    /** Would the next send push the account past a hard limit (if enforced)? */
    public function isOverHardLimit(User $user): bool
    {
        if (! config('property_alerts.quota.enforce_hard_limit')) {
            return false;
        }
        $usage = $this->usageFor($user);

        return $usage->property_alert_emails_sent >= $usage->included_limit;
    }

    public function overageEmails(PropertyAlertUsage $usage): int
    {
        return max(0, $usage->property_alert_emails_sent - $usage->included_limit);
    }

    /** Overage billed in whole units (round up): e.g. 1 email over → 1 unit. */
    public function overageUnits(PropertyAlertUsage $usage): int
    {
        $unit = max(1, (int) config('property_alerts.quota.overage_unit'));

        return (int) ceil($this->overageEmails($usage) / $unit);
    }

    public function overageAmount(PropertyAlertUsage $usage): float
    {
        return round(
            $this->overageUnits($usage) * (float) config('property_alerts.quota.overage_price_per_unit'),
            2,
        );
    }

    /** Read-only summary for settings/admin surfaces. */
    public function summary(User $user): array
    {
        $usage = $this->usageFor($user);

        return [
            'month' => $usage->year_month,
            // Coerce to int — a legacy/null DB value would otherwise reach the
            // UI as null and crash `.toLocaleString()` (the prop is typed number).
            'sent' => (int) $usage->property_alert_emails_sent,
            'included_limit' => (int) $usage->included_limit,
            'overage_emails' => $this->overageEmails($usage),
            'overage_units' => $this->overageUnits($usage),
            'overage_amount' => $this->overageAmount($usage),
            'overage_price_per_unit' => (float) config('property_alerts.quota.overage_price_per_unit'),
            'overage_unit' => (int) config('property_alerts.quota.overage_unit'),
        ];
    }
}
