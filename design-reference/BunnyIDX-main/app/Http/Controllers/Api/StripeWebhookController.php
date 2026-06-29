<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Crm\IdxLicenseController;
use App\Models\User;
use App\Models\WebhookEvent;
use App\Services\Billing\CreditService;
use App\Services\Billing\SeatBillingService;
use App\Services\BillingService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeObject;
use Stripe\Webhook;

class StripeWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $webhookSecret = config('services.stripe.webhook_secret');

        if (! $webhookSecret) {
            Log::error('Stripe webhook secret not configured');

            return response('Webhook secret not configured', 500);
        }

        try {
            $event = Webhook::constructEvent(
                $request->getContent(),
                $request->header('Stripe-Signature'),
                $webhookSecret,
            );
        } catch (SignatureVerificationException $e) {
            Log::warning('Stripe webhook signature verification failed', ['error' => $e->getMessage()]);

            return response('Invalid signature', 400);
        }

        // Idempotency check
        if (WebhookEvent::where('stripe_event_id', $event->id)->exists()) {
            return response('Already processed', 200);
        }

        // Log the event
        WebhookEvent::create([
            'stripe_event_id' => $event->id,
            'event_type' => $event->type,
            'processed_at' => now(),
            'payload' => $event->toArray(),
        ]);

        try {
            match ($event->type) {
                'checkout.session.completed' => $this->handleCheckoutCompleted($event->data->object),
                'invoice.payment_succeeded' => $this->handleInvoicePaymentSucceeded($event->data->object),
                'customer.subscription.updated' => $this->handleSubscriptionUpdated($event->data->object),
                'customer.subscription.deleted' => $this->handleSubscriptionDeleted($event->data->object),
                default => null,
            };
        } catch (\Throwable $e) {
            Log::error('Stripe webhook handler failed', [
                'event_type' => $event->type,
                'event_id' => $event->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response('OK', 200);
    }

    /**
     * Stripe metadata is a StripeObject; casting it with (array) exposes the
     * SDK's internal props instead of the keys (so user_id reads back null).
     * Normalise to a real associative array via toArray().
     */
    private function metadataToArray(object $object): array
    {
        $meta = $object->metadata ?? null;

        if ($meta instanceof StripeObject) {
            return $meta->toArray();
        }

        return is_array($meta) ? $meta : [];
    }

    private function handleCheckoutCompleted(object $session): void
    {
        $metadata = $this->metadataToArray($session);
        $productType = $metadata['product_type'] ?? '';

        $userId = (int) ($metadata['user_id'] ?? 0);
        if (! $userId) {
            Log::error('Stripe checkout completed but no user_id in metadata', ['session_id' => $session->id]);

            return;
        }

        if ($productType === 'idx_license') {
            $email = $session->customer_details->email ?? $session->customer_email ?? '';
            $paymentIntentId = $session->payment_intent ?? $session->id;

            IdxLicenseController::handlePurchaseComplete($email, $paymentIntentId, $userId);

            Log::info('IDX license created via Stripe checkout', ['user_id' => $userId]);
        } elseif ($productType === 'credit_package') {
            $user = User::find($userId);
            $cents = (int) ($metadata['credit_cents'] ?? 0);
            if ($user && $cents > 0) {
                // Idempotent on the checkout session id (the success-page
                // reconciliation uses the same reference).
                app(CreditService::class)
                    ->topUpFromStripe($user, $cents, 'cs:'.$session->id, 'Credit purchase');
                Log::info('Phone credits added via Stripe checkout', ['user_id' => $userId, 'cents' => $cents]);
            }
        } elseif ($productType === 'crm_subscription') {
            $plan = $metadata['plan'] ?? 'pro';
            $isTrial = ($metadata['is_trial'] ?? '') === '1';
            $user = User::find($userId);
            if ($user) {
                // A paid subscription (or card-backed trial) supersedes any
                // time-limited admin grant. Capture the subscription id so seat
                // billing can attach a per-seat item to it. A trial checkout also
                // burns the one-per-account trial allowance.
                $user->update([
                    'subscription_tier' => $plan,
                    'stripe_subscription_id' => $session->subscription ?? $user->stripe_subscription_id,
                    'trial_plan' => null,
                    'trial_ends_at' => null,
                    'subscription_expires_at' => null,
                    'trial_used' => $isTrial ? true : $user->trial_used,
                ]);
                Log::info('CRM subscription activated', ['user_id' => $userId, 'plan' => $plan, 'trial' => $isTrial]);
            }
        }
    }

    private function handleInvoicePaymentSucceeded(object $invoice): void
    {
        $subscriptionId = $invoice->subscription ?? null;
        if (! $subscriptionId) {
            return;
        }

        // IDX subscription renewals (Subscription model)
        $billing = app(BillingService::class);
        $billing->renewSubscription(
            $subscriptionId,
            date('Y-m-d H:i:s', $invoice->period_start),
            date('Y-m-d H:i:s', $invoice->period_end),
        );

        // CRM subscription renewals: the tier stays current as long as invoices
        // succeed; on each successful billing cycle, refill the plan's included
        // phone-credit allowance for the billing owner (identified by customer).
        $customerId = $invoice->customer ?? null;
        if ($customerId) {
            $user = User::where('stripe_customer_id', $customerId)->first();
            if ($user) {
                app(CreditService::class)->applyMonthlyAllowance($user);
            }
        }
    }

    private function handleSubscriptionUpdated(object $subscription): void
    {
        $metadata = $this->metadataToArray($subscription);

        if (($metadata['product_type'] ?? '') === 'crm_subscription') {
            // CRM subscription status changed (e.g. past_due, active)
            $userId = (int) ($metadata['user_id'] ?? 0);
            $user = $userId ? User::find($userId) : null;
            if ($user && $subscription->status === 'active') {
                $plan = $metadata['plan'] ?? 'pro';
                $user->update(['subscription_tier' => $plan]);
            } elseif ($user && ! $user->is_lifetime && in_array($subscription->status, ['past_due', 'unpaid', 'canceled'])) {
                // Never downgrade a lifetime grant on a Stripe status change.
                $user->update(['subscription_tier' => 'free']);
            }

            // Reconcile team seat quantity (source of truth for purchased_seats).
            app(SeatBillingService::class)->syncFromSubscription($subscription);
        } else {
            // IDX subscription update
            $billing = app(BillingService::class);
            $billing->updateSubscriptionStatus($subscription->id, $subscription->status);
        }
    }

    private function handleSubscriptionDeleted(object $subscription): void
    {
        $metadata = $this->metadataToArray($subscription);

        if (($metadata['product_type'] ?? '') === 'crm_subscription') {
            // Downgrade CRM subscription
            $userId = (int) ($metadata['user_id'] ?? 0);
            $user = $userId ? User::find($userId) : null;
            if ($user && ! $user->is_lifetime) {
                $user->update(['subscription_tier' => 'free', 'stripe_subscription_id' => null]);
                Log::info('CRM subscription downgraded to free', ['user_id' => $userId]);
            }
        } else {
            // IDX subscription cancellation
            $billing = app(BillingService::class);
            $billing->cancelSubscription($subscription->id);
        }
    }
}
