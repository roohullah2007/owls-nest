<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Services\Billing\CreditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Stripe\Checkout\Session;
use Stripe\Customer;
use Stripe\Stripe;
use Symfony\Component\HttpFoundation\Response;

/**
 * One-time phone-credit top-ups via Stripe Checkout (mode=payment). Packages are
 * defined in config/billing.php. The wallet is credited by the Stripe webhook
 * (source of truth) and, as a fallback for delayed/missing webhooks, by the
 * success-page reconciliation here — both idempotent on the checkout session id.
 *
 * Buying credits requires the paid Phone feature.
 */
class CreditPackageController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly CreditService $credits,
    ) {}

    public static function middleware(): array
    {
        return [new Middleware('feature:phone')];
    }

    public function checkout(Request $request): Response|RedirectResponse
    {
        $packages = config('billing.packages', []);

        $validated = $request->validate([
            'package' => ['required', 'string', 'in:'.implode(',', array_keys($packages))],
        ]);

        if (! config('services.stripe.secret')) {
            return back()->with('error', 'Stripe is not configured.');
        }

        $package = $packages[$validated['package']];
        $user = $request->user();

        Stripe::setApiKey(config('services.stripe.secret'));

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
            'product_type' => 'credit_package',
            'package' => $validated['package'],
            'credit_cents' => (string) $package['credit_cents'],
        ];

        $session = Session::create([
            'customer' => $user->stripe_customer_id,
            'mode' => 'payment',
            'line_items' => [[
                'price_data' => [
                    'currency' => 'usd',
                    'unit_amount' => $package['price_cents'],
                    'product_data' => ['name' => "Phone credits — {$package['label']}"],
                ],
                'quantity' => 1,
            ]],
            'metadata' => $meta,
            'payment_intent_data' => ['metadata' => $meta],
            'success_url' => route('crm.credits.checkout-success').'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('crm.settings.tab', ['tab' => 'phone']).'?topup=cancelled',
        ]);

        return Inertia::location($session->url);
    }

    /**
     * Stripe success return. The webhook is the source of truth, but it can be
     * delayed or (in local dev) never arrive — so we also reconcile here by
     * retrieving the session and crediting the wallet. Idempotent on the session
     * id, and only ever credits the authenticated user's own paid session.
     */
    public function checkoutSuccess(Request $request): RedirectResponse
    {
        $sessionId = (string) $request->query('session_id', '');
        $user = $request->user();
        $phoneTab = redirect()->route('crm.settings.tab', ['tab' => 'phone']);

        if ($sessionId === '' || ! config('services.stripe.secret')) {
            return $phoneTab->with('error', 'Could not confirm your purchase.');
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        try {
            $session = Session::retrieve($sessionId);
        } catch (\Throwable $e) {
            Log::error('Credit top-up success retrieve failed', ['error' => $e->getMessage()]);

            return $phoneTab->with('error', 'Could not confirm your purchase.');
        }

        $metadata = $session->metadata?->toArray() ?? [];

        $sameUser = (int) ($metadata['user_id'] ?? 0) === (int) $user->id
            || ($session->customer && $session->customer === $user->stripe_customer_id);
        $isPaid = ($session->payment_status ?? '') === 'paid' || ($session->status ?? '') === 'complete';

        if (! $sameUser || ! $isPaid || ($metadata['product_type'] ?? '') !== 'credit_package') {
            return $phoneTab->with('error', 'Purchase could not be verified.');
        }

        $cents = (int) ($metadata['credit_cents'] ?? 0);
        if ($cents > 0) {
            $this->credits->topUpFromStripe($user, $cents, 'cs:'.$session->id, 'Credit purchase');
        }

        return $phoneTab->with('success', 'Credits added to your balance.');
    }
}
