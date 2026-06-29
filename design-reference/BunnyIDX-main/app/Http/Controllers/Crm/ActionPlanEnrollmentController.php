<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\ActionPlan;
use App\Models\ActionPlanEnrollment;
use App\Models\Contact;
use App\Services\ActionPlans\ActionPlanEnroller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ActionPlanEnrollmentController extends Controller implements HasMiddleware
{
    /** Enrolling contacts triggers automated emails — paid Email feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:email')];
    }

    public function __construct(
        private ActionPlanEnroller $enroller,
    ) {}

    /**
     * Manually enroll a single contact (from the contact detail page).
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'action_plan_id' => 'required|integer',
            'contact_id' => 'required|integer',
        ]);

        $plan = ActionPlan::forUser($user)->findOrFail($validated['action_plan_id']);
        $contact = Contact::forUser($user)->findOrFail($validated['contact_id']);

        $enrollment = $this->enroller->enroll($plan, $contact, via: 'manual', enrolledBy: $user);

        return back()->with(
            $enrollment ? 'success' : 'error',
            $enrollment ? "Enrolled in “{$plan->name}”." : 'Contact is already enrolled in this plan.',
        );
    }

    /**
     * Manually enroll many contacts at once (Contacts list bulk action).
     */
    public function bulkStore(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'action_plan_id' => 'required|integer',
            'contact_ids' => 'required|array',
            'contact_ids.*' => 'integer',
        ]);

        $plan = ActionPlan::forUser($user)->findOrFail($validated['action_plan_id']);
        $contacts = Contact::forUser($user)->whereIn('id', $validated['contact_ids'])->get();

        $enrolled = 0;
        foreach ($contacts as $contact) {
            if ($this->enroller->enroll($plan, $contact, via: 'manual', enrolledBy: $user)) {
                $enrolled++;
            }
        }

        $skipped = $contacts->count() - $enrolled;
        $msg = "Enrolled {$enrolled} contact(s) in “{$plan->name}”.";
        if ($skipped > 0) {
            $msg .= " {$skipped} already enrolled.";
        }

        return back()->with('success', $msg);
    }

    /**
     * Stop an active/paused enrollment (manual exit).
     */
    public function stop(Request $request, ActionPlanEnrollment $enrollment): RedirectResponse
    {
        $owned = ActionPlanEnrollment::forUser($request->user())->whereKey($enrollment->id)->exists();
        abort_unless($owned, 404);

        if (in_array($enrollment->status, ['active', 'paused'], true)) {
            $enrollment->update([
                'status' => 'stopped',
                'stopped_at' => now(),
                'stop_reason' => 'manual',
                'next_run_at' => null,
            ]);
        }

        return back()->with('success', 'Enrollment stopped.');
    }
}
