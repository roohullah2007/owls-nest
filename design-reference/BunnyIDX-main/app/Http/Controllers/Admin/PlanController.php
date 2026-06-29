<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Plans/Index', [
            'plans' => Plan::ordered()->get(),
            'featureCatalog' => Plan::featureCatalog(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatePlan($request, null);

        Plan::create($validated);

        return back()->with('success', 'Plan created.');
    }

    public function update(Request $request, Plan $plan): RedirectResponse
    {
        $validated = $this->validatePlan($request, $plan);

        $plan->update($validated);

        return back()->with('success', "Plan “{$plan->name}” saved.");
    }

    public function destroy(Plan $plan): RedirectResponse
    {
        // The three baseline plans back the subscription_tier enum — keep them.
        if (in_array($plan->key, ['free', 'pro', 'enterprise'], true)) {
            return back()->with('error', 'Built-in plans cannot be deleted.');
        }

        $plan->delete();

        return back()->with('success', 'Plan deleted.');
    }

    private function validatePlan(Request $request, ?Plan $plan): array
    {
        $catalogKeys = array_keys(Plan::featureCatalog());

        $validated = $request->validate([
            'key' => ['required', 'string', 'max:50', 'regex:/^[a-z0-9_]+$/', Rule::unique('plans', 'key')->ignore($plan?->id)],
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'monthly_price' => 'nullable|string|max:50',
            'is_paid' => 'boolean',
            'trial_days' => 'required|integer|min:0|max:365',
            'features' => 'nullable|array',
            'features.*' => ['string', Rule::in($catalogKeys)],
            'stripe_price_id' => 'nullable|string|max:255',
            'sort_order' => 'integer|min:0',
            'is_active' => 'boolean',
            // Quotas / limits / seat pricing (all money in cents). `sometimes` so
            // a partial update that omits them keeps the stored value; nullable
            // integer limits mean "unlimited".
            'included_credits_cents' => 'sometimes|integer|min:0',
            'phone_number_limit' => 'sometimes|nullable|integer|min:0',
            'website_limit' => 'sometimes|nullable|integer|min:0',
            'email_quota_monthly' => 'sometimes|nullable|integer|min:0',
            'included_seats' => 'sometimes|integer|min:1',
            'extra_seat_price_cents' => 'sometimes|integer|min:0',
            'per_member_website_price_cents' => 'sometimes|nullable|integer|min:0',
            'extra_seat_stripe_price_id' => 'sometimes|nullable|string|max:255',
        ]);

        $validated['features'] = array_values($validated['features'] ?? []);

        return $validated;
    }
}
