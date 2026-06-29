<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\Team;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Stripe\Stripe;
use Stripe\Subscription;
use Stripe\SubscriptionItem;

/**
 * Per-seat billing: the team's extra members beyond the plan's included_seats
 * are a recurring quantity on a Stripe subscription item (price =
 * plan.extra_seat_stripe_price_id), attached to the team owner's CRM
 * subscription. The webhook (customer.subscription.updated) is the source of
 * truth for `teams.purchased_seats`; setSeatQuantity() drives Stripe and
 * mirrors locally for immediate UX.
 */
class SeatBillingService
{
    /**
     * Set the number of purchased extra seats for a team, syncing the Stripe
     * subscription-item quantity. Throws RuntimeException with a user-facing
     * message when the team can't be billed (no subscription / no seat price).
     */
    public function setSeatQuantity(Team $team, int $quantity): void
    {
        $quantity = max(0, $quantity);

        if (! config('services.stripe.secret')) {
            throw new RuntimeException('Stripe is not configured.');
        }

        $owner = $team->owner;
        $subscriptionId = $team->stripe_subscription_id ?: $owner?->stripe_subscription_id;

        if (! $subscriptionId) {
            throw new RuntimeException('Start your Team subscription before adding seats.');
        }

        $priceId = $owner?->effectivePlan()?->extra_seat_stripe_price_id;
        if (! $priceId) {
            throw new RuntimeException('Per-seat pricing is not configured for this plan.');
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        $subscription = Subscription::retrieve($subscriptionId);
        $seatItem = $this->findSeatItem($subscription, $priceId, $team->stripe_seat_item_id);

        if ($quantity === 0) {
            if ($seatItem) {
                SubscriptionItem::update($seatItem->id, ['quantity' => 0, 'proration_behavior' => 'create_prorations']);
            }
            $newItemId = $seatItem?->id;
        } elseif ($seatItem) {
            SubscriptionItem::update($seatItem->id, ['quantity' => $quantity, 'proration_behavior' => 'create_prorations']);
            $newItemId = $seatItem->id;
        } else {
            $created = SubscriptionItem::create([
                'subscription' => $subscriptionId,
                'price' => $priceId,
                'quantity' => $quantity,
                'proration_behavior' => 'create_prorations',
            ]);
            $newItemId = $created->id;
        }

        $team->update([
            'purchased_seats' => $quantity,
            'stripe_subscription_id' => $subscriptionId,
            'stripe_seat_item_id' => $newItemId,
        ]);
    }

    /**
     * Reconcile teams.purchased_seats from a Stripe subscription object (webhook
     * source of truth). No-op when the subscription isn't a team's seat-bearing
     * subscription.
     */
    public function syncFromSubscription(object $subscription): void
    {
        $team = Team::where('stripe_subscription_id', $subscription->id ?? null)->first();
        if (! $team) {
            return;
        }

        $priceId = $team->owner?->effectivePlan()?->extra_seat_stripe_price_id;
        $seatItem = $this->findSeatItem($subscription, $priceId, $team->stripe_seat_item_id);

        $quantity = $seatItem ? (int) ($seatItem->quantity ?? 0) : 0;

        $team->update([
            'purchased_seats' => $quantity,
            'stripe_seat_item_id' => $seatItem->id ?? $team->stripe_seat_item_id,
        ]);

        Log::info('Team seats synced from Stripe', ['team_id' => $team->id, 'purchased_seats' => $quantity]);
    }

    /**
     * Locate the seat subscription item: prefer a known item id, else match on
     * the seat price id.
     */
    private function findSeatItem(object $subscription, ?string $priceId, ?string $knownItemId): ?object
    {
        $items = $subscription->items->data ?? [];

        foreach ($items as $item) {
            if ($knownItemId && ($item->id ?? null) === $knownItemId) {
                return $item;
            }
            if ($priceId && (($item->price->id ?? null) === $priceId)) {
                return $item;
            }
        }

        return null;
    }
}
