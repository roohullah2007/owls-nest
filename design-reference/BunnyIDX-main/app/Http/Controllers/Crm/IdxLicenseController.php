<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Services\LicenseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Log;

class IdxLicenseController extends Controller implements HasMiddleware
{
    /** IDX / MLS is a paid feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:idx')];
    }

    public function __construct(
        private readonly LicenseService $licenseService,
    ) {}

    public function purchase(Request $request): RedirectResponse
    {
        $user = $request->user();
        $priceId = config('services.stripe.idx_license_price_id');

        if (!$priceId) {
            return back()->with('error', 'Stripe is not configured yet. Please contact support.');
        }

        try {
            $stripe = new \Stripe\StripeClient(config('services.stripe.secret'));

            // Get or create Stripe customer
            $customerId = $user->stripe_customer_id;
            if (!$customerId) {
                $customer = $stripe->customers->create([
                    'email' => $user->email,
                    'name' => $user->name,
                    'metadata' => ['user_id' => $user->id],
                ]);
                $customerId = $customer->id;
                $user->update(['stripe_customer_id' => $customerId]);
            }

            $session = $stripe->checkout->sessions->create([
                'customer' => $customerId,
                'mode' => 'payment',
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1,
                ]],
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'product_type' => 'idx_license',
                ],
                'success_url' => route('crm.idx.index') . '?purchased=1',
                'cancel_url' => route('crm.idx.index') . '?canceled=1',
            ]);

            return redirect($session->url);
        } catch (\Throwable $e) {
            Log::error('Stripe checkout failed', ['error' => $e->getMessage(), 'user_id' => $user->id]);

            return back()->with('error', 'Unable to start checkout. Please try again.');
        }
    }

    /**
     * Called by Stripe webhook after successful payment.
     * This is a static helper, not a route handler.
     */
    public static function handlePurchaseComplete(string $email, string $paymentIntentId, int $userId): License
    {
        $service = app(LicenseService::class);

        return $service->generate($email, $paymentIntentId, 'stripe', $userId);
    }

    public function activate(Request $request, License $license): RedirectResponse
    {
        abort_unless($license->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'domain' => 'required|string|max:255',
        ]);

        try {
            $this->licenseService->activate($license->key, $validated['domain']);

            return back()->with('success', 'License activated on ' . $validated['domain']);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function deactivate(Request $request, License $license): RedirectResponse
    {
        abort_unless($license->user_id === $request->user()->id, 403);

        $activeDomain = $license->activeDomain;
        if (! $activeDomain) {
            return back()->with('error', 'No active domain to deactivate.');
        }

        try {
            $this->licenseService->deactivate($license->key, $activeDomain->domain);

            return back()->with('success', 'License deactivated from ' . $activeDomain->domain);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
