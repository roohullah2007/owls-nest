<?php

declare(strict_types=1);

namespace App\Services\ActionPlans;

use App\Models\ActionPlan;
use App\Models\ActionPlanEnrollment;
use App\Models\Contact;
use App\Models\User;

/**
 * Enrolls contacts into action plans — both manual ("Add to Action Plan") and
 * automatic (status_changed trigger). Owns the enrollment guards (no duplicate
 * active enrollment unless the plan allows re-enrollment) and computes the first
 * step's run time so the polling engine can pick it up.
 */
class ActionPlanEnroller
{
    /**
     * Enroll a single contact into a plan.
     *
     * @param  string  $via  'manual'|'trigger'
     * @return ActionPlanEnrollment|null  null when skipped (duplicate / inactive plan).
     */
    public function enroll(ActionPlan $plan, Contact $contact, string $via = 'manual', ?User $enrolledBy = null): ?ActionPlanEnrollment
    {
        if (! $plan->is_active && $via === 'trigger') {
            return null;
        }

        // No duplicate active enrollment unless the plan explicitly allows it.
        if (! $plan->allow_reenroll) {
            $existing = ActionPlanEnrollment::where('action_plan_id', $plan->id)
                ->where('contact_id', $contact->id)
                ->whereIn('status', ['active', 'paused'])
                ->exists();

            if ($existing) {
                return null;
            }
        }

        $firstStep = $plan->steps()->orderBy('position')->first();

        $enrollment = new ActionPlanEnrollment([
            'action_plan_id' => $plan->id,
            'contact_id' => $contact->id,
            'user_id' => $contact->user_id,
            'enrolled_by' => $enrolledBy?->id,
            'enrolled_via' => $via,
            'started_at' => now(),
        ]);

        if ($firstStep) {
            $enrollment->status = 'active';
            $enrollment->current_step_id = $firstStep->id;
            $enrollment->next_run_at = now()->add($firstStep->delayInterval());
        } else {
            // A plan with no steps completes the instant it is entered.
            $enrollment->status = 'completed';
            $enrollment->completed_at = now();
        }

        $enrollment->save();

        $plan->increment('enrolled_count');
        if ($enrollment->status === 'completed') {
            $plan->increment('completed_count');
        }

        return $enrollment;
    }

    /**
     * Evaluate a contact status change and enroll into any matching active plans.
     * Tenant-scoped: only plans owned by the contact's team (or user, in personal
     * context) are considered.
     *
     * @return int  number of enrollments created
     */
    public function evaluateStatusChange(Contact $contact, ?string $oldStatus, ?string $newStatus): int
    {
        if (! $newStatus || $oldStatus === $newStatus) {
            return 0;
        }

        $plans = ActionPlan::query()
            ->where('is_active', true)
            ->where('trigger_type', 'status_changed')
            ->when(
                $contact->team_id,
                fn ($q) => $q->where('team_id', $contact->team_id),
                fn ($q) => $q->where('user_id', $contact->user_id)->whereNull('team_id'),
            )
            ->get();

        $count = 0;

        foreach ($plans as $plan) {
            $config = $plan->trigger_config ?? [];

            // Optional narrowing: only fire when entering a specific status,
            // and/or leaving a specific one. Empty = any status change.
            if (! empty($config['to_status']) && $config['to_status'] !== $newStatus) {
                continue;
            }
            if (! empty($config['from_status']) && $config['from_status'] !== $oldStatus) {
                continue;
            }

            if ($this->enroll($plan, $contact, via: 'trigger')) {
                $count++;
            }
        }

        return $count;
    }
}
