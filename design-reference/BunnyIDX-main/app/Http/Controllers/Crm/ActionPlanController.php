<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\ActionPlan;
use App\Models\EmailAccount;
use App\Services\Email\MergeFieldService;
use App\Services\Telnyx\SmsSender;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ActionPlanController extends Controller implements HasMiddleware
{
    /**
     * Action Plans send automated emails (Resend) — gate behind the paid Email
     * feature until a dedicated action_plans entitlement exists.
     */
    public static function middleware(): array
    {
        return [new Middleware('feature:email')];
    }

    /**
     * List the tenant's action plans.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $plans = ActionPlan::forUser($user)
            ->withCount(['steps', 'enrollments as active_enrollments_count' => fn ($q) => $q->where('status', 'active')])
            ->latest()
            ->get();

        return Inertia::render('Crm/ActionPlans/Index', [
            'plans' => $plans,
            'contactStatuses' => $user->getContactStatuses(),
        ]);
    }

    /**
     * Create a draft plan and jump straight into the builder.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_type' => ['required', Rule::in(ActionPlan::TRIGGER_TYPES)],
            'trigger_config' => 'nullable|array',
            'trigger_config.to_status' => 'nullable|string|max:50',
        ]);

        $plan = $user->actionPlans()->create([
            'name' => $validated['name'],
            'trigger_type' => $validated['trigger_type'],
            'trigger_config' => $validated['trigger_config'] ?? null,
            'is_active' => false,
        ]);

        return redirect()->route('crm.action-plans.edit', $plan)
            ->with('success', 'Action plan created. Add your steps.');
    }

    /**
     * The builder page for a single plan.
     */
    public function edit(Request $request, ActionPlan $actionPlan): Response
    {
        $this->authorizePlan($request, $actionPlan);
        $user = $request->user();

        $actionPlan->load(['steps' => fn ($q) => $q->orderBy('position')]);

        return Inertia::render('Crm/ActionPlans/Edit', [
            'plan' => $actionPlan,
            'contactStatuses' => $user->getContactStatuses(),
            'mergeFields' => MergeFieldService::availableFields(),
            // Builder guardrails (see spec H.4).
            'hasEmailAccount' => EmailAccount::where('user_id', $user->id)->where('is_active', true)->exists(),
            'tenDlcReady' => app(SmsSender::class)->tenDlcApproved($user->id),
        ]);
    }

    /**
     * Update plan settings (name, trigger, active toggle, stop conditions).
     */
    public function update(Request $request, ActionPlan $actionPlan): RedirectResponse
    {
        $this->authorizePlan($request, $actionPlan);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'trigger_type' => ['required', Rule::in(ActionPlan::TRIGGER_TYPES)],
            'trigger_config' => 'nullable|array',
            'trigger_config.to_status' => 'nullable|string|max:50',
            'is_active' => 'boolean',
            'stop_on_reply' => 'boolean',
            'allow_reenroll' => 'boolean',
            'stop_on_status' => 'nullable|array',
            'stop_on_status.*' => 'string|max:50',
        ]);

        $actionPlan->update($validated);

        return back()->with('success', 'Action plan saved.');
    }

    /**
     * Toggle the active (published) state without a full form submit.
     */
    public function toggleActive(Request $request, ActionPlan $actionPlan): RedirectResponse
    {
        $this->authorizePlan($request, $actionPlan);

        $actionPlan->update(['is_active' => ! $actionPlan->is_active]);

        return back()->with('success', $actionPlan->is_active ? 'Action plan activated.' : 'Action plan paused.');
    }

    public function destroy(Request $request, ActionPlan $actionPlan): RedirectResponse
    {
        $this->authorizePlan($request, $actionPlan);

        $actionPlan->delete();

        return redirect()->route('crm.action-plans.index')
            ->with('success', 'Action plan deleted.');
    }

    /**
     * Abort unless the plan belongs to the current user's tenant scope.
     */
    private function authorizePlan(Request $request, ActionPlan $plan): void
    {
        $user = $request->user();
        $owned = ActionPlan::forUser($user)->whereKey($plan->id)->exists();

        abort_unless($owned, 404);
    }
}
