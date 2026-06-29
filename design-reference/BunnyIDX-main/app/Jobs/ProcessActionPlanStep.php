<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ActionPlanEnrollment;
use App\Models\ActionPlanStep;
use App\Models\ActionPlanStepRun;
use App\Models\Contact;
use App\Models\Task;
use App\Models\User;
use App\Services\ActionPlans\ActionPlanEmailSender;
use App\Services\Email\MergeFieldService;
use App\Services\Telnyx\SmsSender;
use App\Services\TimelineService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Executes the current due step of a single action-plan enrollment, then advances
 * the enrollment to its next step (or completes it). Idempotent: a unique
 * ActionPlanStepRun row per (enrollment, step) guarantees a retried job can never
 * double-send. Every send routes through the existing comms services so consent /
 * DND / 10DLC gates and timeline logging are applied automatically.
 */
class ProcessActionPlanStep implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(
        public int $enrollmentId,
    ) {}

    public function handle(): void
    {
        $enrollment = ActionPlanEnrollment::with(['actionPlan', 'contact', 'currentStep', 'user'])
            ->find($this->enrollmentId);

        if (! $enrollment || ! $enrollment->isActive()) {
            return;
        }

        $plan = $enrollment->actionPlan;
        $contact = $enrollment->contact;
        $step = $enrollment->currentStep;
        $user = $enrollment->user;

        // Defensive: missing plan/contact/step/user means nothing actionable remains.
        if (! $plan || ! $contact || ! $step || ! $user) {
            $enrollment->update(['status' => 'completed', 'completed_at' => now(), 'next_run_at' => null]);

            return;
        }

        // Plan deactivated after enrollment → stop the run.
        if (! $plan->is_active) {
            $enrollment->update([
                'status' => 'stopped',
                'stopped_at' => now(),
                'stop_reason' => 'plan_deactivated',
                'next_run_at' => null,
            ]);

            return;
        }

        // Idempotency guard: one run row per (enrollment, step). If we've already
        // resolved this step, just advance — never re-perform the action.
        $run = ActionPlanStepRun::firstOrCreate(
            [
                'action_plan_enrollment_id' => $enrollment->id,
                'action_plan_step_id' => $step->id,
            ],
            [
                'user_id' => $enrollment->user_id,
                'team_id' => $enrollment->team_id,
                'status' => 'pending',
            ],
        );

        if ($run->isResolved()) {
            $this->advance($enrollment, $step);

            return;
        }

        try {
            $outcome = match ($step->step_type) {
                'email' => $this->runEmail($enrollment, $user, $contact, $step),
                'sms' => $this->runSms(app(SmsSender::class), $user, $contact, $step),
                'task' => $this->runTask($user, $contact, $step),
                default => ['status' => 'skipped', 'reason' => 'unknown_step'],
            };
        } catch (\Throwable $e) {
            // One failed step must not wedge the enrollment — record and advance.
            $run->update(['status' => 'failed', 'error' => $e->getMessage(), 'ran_at' => now()]);
            Log::warning('ProcessActionPlanStep: step failed', [
                'enrollment_id' => $enrollment->id,
                'step_id' => $step->id,
                'error' => $e->getMessage(),
            ]);
            $this->advance($enrollment, $step);

            return;
        }

        $run->ran_at = now();
        $run->status = $outcome['status'];
        $run->skip_reason = $outcome['reason'] ?? null;
        $run->error = $outcome['error'] ?? null;

        if (! empty($outcome['result'])) {
            $run->resultRef()->associate($outcome['result']);
        }

        $run->save();

        $this->advance($enrollment, $step);
    }

    /**
     * Move the enrollment to its next ordered step, or complete it when none remain.
     */
    private function advance(ActionPlanEnrollment $enrollment, ActionPlanStep $step): void
    {
        $next = ActionPlanStep::where('action_plan_id', $step->action_plan_id)
            ->where('position', '>', $step->position)
            ->orderBy('position')
            ->first();

        if ($next) {
            $enrollment->update([
                'current_step_id' => $next->id,
                'next_run_at' => now()->add($next->delayInterval()),
            ]);

            return;
        }

        $enrollment->update([
            'status' => 'completed',
            'completed_at' => now(),
            'next_run_at' => null,
        ]);
        $enrollment->actionPlan?->increment('completed_count');
    }

    /**
     * Automated sequence email routes through the platform Resend stack (NOT the
     * agent's connected inbox): category `action_plan`, quota-classified, logged
     * to email_send_logs, and gated on suppression / unsubscribe / DND. See
     * ActionPlanEmailSender for the full send + idempotency contract.
     *
     * @return array{status:string, reason?:string, error?:string, result?:Model}
     */
    private function runEmail(ActionPlanEnrollment $enrollment, User $user, Contact $contact, ActionPlanStep $step): array
    {
        return app(ActionPlanEmailSender::class)->send($user, $contact, $step, $enrollment);
    }

    /**
     * @return array{status:string, reason?:string, error?:string, result?:Model}
     */
    private function runSms(SmsSender $smsSender, User $user, Contact $contact, ActionPlanStep $step): array
    {
        $config = $step->config ?? [];
        $body = MergeFieldService::replace($config['body'] ?? '', $contact, [
            'agent_name' => $user->name ?? '',
            'agent_email' => $user->email ?? '',
        ]);

        $result = $smsSender->send($user, $contact, $body);

        return [
            'status' => $result['status'],
            'reason' => $result['reason'] ?? null,
            'error' => $result['error'] ?? null,
            'result' => $result['message'] ?? null,
        ];
    }

    /**
     * @return array{status:string, result?:Model}
     */
    private function runTask(User $user, Contact $contact, ActionPlanStep $step): array
    {
        $config = $step->config ?? [];

        $dueAt = null;
        if (isset($config['due_offset_days']) && $config['due_offset_days'] !== '') {
            $dueAt = now()->addDays((int) $config['due_offset_days']);
        }

        $task = Task::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'taskable_id' => $contact->id,
            'taskable_type' => $contact->getMorphClass(),
            'title' => $config['title'] ?? 'Follow up',
            'description' => $config['description'] ?? null,
            'priority' => in_array($config['priority'] ?? null, ['low', 'normal', 'high', 'urgent'], true)
                ? $config['priority']
                : 'normal',
            'due_at' => $dueAt,
        ]);

        TimelineService::log(
            $user,
            'task_created',
            "Action plan task created: {$task->title}",
            null,
            $contact,
            loggable: $task,
            metadata: ['action_plan_step_id' => $step->id, 'automated' => true],
        );

        return ['status' => 'sent', 'result' => $task];
    }
}
