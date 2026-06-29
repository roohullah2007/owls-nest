<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\License;
use App\Models\Subscription;

class BillingService
{
    public function createSubscription(
        License $license,
        string $stripeSubscriptionId,
        string $stripeCustomerId,
        string $mlsSlug,
        string $currentPeriodStart,
        string $currentPeriodEnd,
    ): Subscription {
        return Subscription::create([
            'license_id' => $license->id,
            'stripe_subscription_id' => $stripeSubscriptionId,
            'stripe_customer_id' => $stripeCustomerId,
            'mls_slug' => $mlsSlug,
            'status' => 'active',
            'current_period_start' => $currentPeriodStart,
            'current_period_end' => $currentPeriodEnd,
        ]);
    }

    public function updateSubscriptionStatus(string $stripeSubscriptionId, string $status): void
    {
        Subscription::where('stripe_subscription_id', $stripeSubscriptionId)
            ->update(['status' => $status]);
    }

    public function cancelSubscription(string $stripeSubscriptionId): void
    {
        Subscription::where('stripe_subscription_id', $stripeSubscriptionId)
            ->update([
                'status' => 'canceled',
                'canceled_at' => now(),
            ]);
    }

    public function hasActiveSubscription(License $license, string $mlsSlug): bool
    {
        return $license->subscriptions()
            ->where('mls_slug', $mlsSlug)
            ->where('status', 'active')
            ->exists();
    }

    public function renewSubscription(string $stripeSubscriptionId, string $periodStart, string $periodEnd): void
    {
        Subscription::where('stripe_subscription_id', $stripeSubscriptionId)
            ->update([
                'status' => 'active',
                'current_period_start' => $periodStart,
                'current_period_end' => $periodEnd,
            ]);
    }
}
