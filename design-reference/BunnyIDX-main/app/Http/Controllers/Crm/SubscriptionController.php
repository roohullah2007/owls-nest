<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Stripe\Checkout\Session;
use Stripe\Customer;
use Stripe\Stripe;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionController extends Controller
{
    public function checkout(Request $request): Response|RedirectResponse
    {
        $validated = $request->validate([
            'plan' => 'required|in:pro,enterprise',
        ]);

        $user = $request->user();

        // Prefer a per-plan Stripe price id (admin-editable), fall back to config.
        $plan = Plan::findByKey($validated['plan']);
        $priceId = $plan?->stripe_price_id ?: ($validated['plan'] === 'pro'
            ? config('services.stripe.pro_price_id')
            : config('services.stripe.enterprise_price_id'));

        if (! $priceId || ! config('services.stripe.secret')) {
            return back()->with('error', 'Stripe is not configured.');
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        // Ensure customer exists
        if (! $user->stripe_customer_id) {
            $customer = Customer::create([
                'email' => $user->email,
                'name' => $user->name,
                'metadata' => ['user_id' => $user->id],
            ]);
            $user->update(['stripe_customer_id' => $customer->id]);
        }

        $meta = [
            'user_id' => (string) $user->id,
            'product_type' => 'crm_subscription',
            'plan' => $validated['plan'],
        ];

        $session = Session::create([
            'customer' => $user->stripe_customer_id,
            'mode' => 'subscription',
            'line_items' => [[
                'price' => $priceId,
                'quantity' => 1,
            ]],
            'metadata' => $meta,
            'subscription_data' => [
                'metadata' => $meta,
            ],
            'success_url' => route('crm.subscription.checkout-success').'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('crm.settings').'?checkout=cancelled',
        ]);

        // Inertia XHR can't follow a 302 to an external domain — use a
        // 409 X-Inertia-Location so the client does a full-page visit to Stripe.
        return Inertia::location($session->url);
    }

    /**
     * Stripe success-page return. The webhook is the source of truth, but it
     * can be delayed or (in local dev) never reach the site at all — so we
     * also reconcile the plan here by retrieving the Checkout Session directly
     * from Stripe. Idempotent and safe: we only ever sync the *authenticated*
     * user's own paid session.
     */
    public function checkoutSuccess(Request $request): RedirectResponse
    {
        $sessionId = (string) $request->query('session_id', '');
        $user = $request->user();

        if ($sessionId === '' || ! config('services.stripe.secret')) {
            return redirect()->route('crm.settings')->with('error', 'Could not confirm your checkout.');
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        try {
            $session = Session::retrieve($sessionId);
        } catch (\Throwable $e) {
            Log::error('Stripe checkout-success retrieve failed', ['error' => $e->getMessage()]);

            return redirect()->route('crm.settings')->with('error', 'Could not confirm your checkout.');
        }

        // Stripe metadata is a StripeObject — casting it to (array) exposes the
        // SDK's internal props, NOT the keys, so user_id/plan read back null.
        // Use toArray() to get the real key/value map.
        $metadata = $session->metadata?->toArray() ?? [];

        // Guard: the session must belong to this user and actually be paid.
        $sameUser = (int) ($metadata['user_id'] ?? 0) === (int) $user->id
            || ($session->customer && $session->customer === $user->stripe_customer_id);
        $isPaid = ($session->payment_status ?? '') === 'paid' || ($session->status ?? '') === 'complete';

        if (! $sameUser || ! $isPaid || ($metadata['product_type'] ?? '') !== 'crm_subscription') {
            return redirect()->route('crm.settings')->with('error', 'Checkout could not be verified.');
        }

        $plan = $metadata['plan'] ?? 'pro';
        $isTrial = ($metadata['is_trial'] ?? '') === '1';

        // Mirror the webhook: a real paid subscription (or card-backed trial)
        // supersedes any time-limited admin grant. No-op if the webhook already
        // applied it.
        if ($user->subscription_tier !== $plan || ! $user->stripe_subscription_id) {
            $user->update([
                'subscription_tier' => $plan,
                'stripe_subscription_id' => $session->subscription ?? $user->stripe_subscription_id,
                'trial_plan' => null,
                'trial_ends_at' => null,
                'subscription_expires_at' => null,
                'trial_used' => $isTrial ? true : $user->trial_used,
            ]);
            Log::info('CRM subscription activated via success return', ['user_id' => $user->id, 'plan' => $plan, 'trial' => $isTrial]);
        }

        return redirect()->route('crm.settings')->with('success', $isTrial
            ? 'Your free trial has started. Your card will be charged when it ends.'
            : 'Your plan is now active.');
    }

    public function portal(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user->stripe_customer_id || ! config('services.stripe.secret')) {
            return back()->with('error', 'Stripe is not configured or no billing account found.');
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        $session = \Stripe\BillingPortal\Session::create([
            'customer' => $user->stripe_customer_id,
            'return_url' => route('crm.settings'),
        ]);

        return Inertia::location($session->url);
    }

    /**
     * Start a free trial of a paid plan. A valid card is collected up front via
     * Stripe Checkout (subscription mode with trial_period_days) — nothing is
     * charged until the trial ends, after which Stripe auto-bills the card. The
     * webhook / success-return marks the trial as used. One trial per account.
     */
    public function startTrial(Request $request): Response|RedirectResponse
    {
        $validated = $request->validate([
            'plan' => 'required|string',
        ]);

        $user = $request->user();
        $plan = Plan::active()->where('key', $validated['plan'])->first();

        if (! $plan || ! $plan->offersTrial()) {
            return back()->with('error', 'This plan does not offer a free trial.');
        }

        if ($user->trial_used) {
            return back()->with('error', 'You have already used your free trial.');
        }

        if ($user->isLifetime() || $user->isPro()) {
            return back()->with('error', 'You already have a paid plan.');
        }

        $priceId = $plan->stripe_price_id ?: ($plan->key === 'enterprise'
            ? config('services.stripe.enterprise_price_id')
            : config('services.stripe.pro_price_id'));

        if (! $priceId || ! config('services.stripe.secret')) {
            return back()->with('error', 'Stripe is not configured, so trials are unavailable.');
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        // Ensure a Stripe customer exists to attach the card / subscription to.
        if (! $user->stripe_customer_id) {
            $customer = Customer::create([
                'email' => $user->email,
                'name' => $user->name,
                'metadata' => ['user_id' => $user->id],
            ]);
            $user->update(['stripe_customer_id' => $customer->id]);
        }

        $meta = [
            'user_id' => (string) $user->id,
            'product_type' => 'crm_subscription',
            'plan' => $plan->key,
            'is_trial' => '1',
        ];

        $session = Session::create([
            'customer' => $user->stripe_customer_id,
            'mode' => 'subscription',
            // Require a card on file even though the trial bills $0 today.
            'payment_method_collection' => 'always',
            'line_items' => [[
                'price' => $priceId,
                'quantity' => 1,
            ]],
            'metadata' => $meta,
            'subscription_data' => [
                'trial_period_days' => $plan->trial_days,
                'metadata' => $meta,
            ],
            'success_url' => route('crm.subscription.checkout-success').'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('crm.settings').'?checkout=cancelled',
        ]);

        // Inertia XHR can't follow a 302 to an external domain — use a
        // 409 X-Inertia-Location so the client does a full-page visit to Stripe.
        return Inertia::location($session->url);
    }
}
