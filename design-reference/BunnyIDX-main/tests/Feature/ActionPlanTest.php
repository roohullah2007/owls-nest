<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ProcessActionPlanStep;
use App\Models\ActionPlan;
use App\Models\ActionPlanEnrollment;
use App\Models\ActionPlanStep;
use App\Models\ActionPlanStepRun;
use App\Models\Contact;
use App\Models\EmailSendLog;
use App\Models\EmailSuppression;
use App\Models\Task;
use App\Models\User;
use App\Services\ActionPlans\ActionPlanEnroller;
use App\Services\Email\EmailCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ActionPlanTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        // Action Plans are a paid feature (gated behind feature:email), so the
        // acting user must be on a paid plan.
        $this->user = User::factory()->create(['subscription_tier' => 'pro']);
    }

    private function contact(array $attrs = []): Contact
    {
        return $this->user->contacts()->create(array_merge([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
            'phone' => '+15551234567',
            'type' => 'buyer',
            'status' => 'new_lead',
            'source' => 'website',
        ], $attrs));
    }

    private function plan(array $attrs = []): ActionPlan
    {
        return $this->user->actionPlans()->create(array_merge([
            'name' => 'Test Plan',
            'trigger_type' => 'manual',
            'is_active' => true,
        ], $attrs));
    }

    private function step(ActionPlan $plan, string $type, array $config, int $position = 0): ActionPlanStep
    {
        return $plan->steps()->create([
            'user_id' => $plan->user_id,
            'team_id' => $plan->team_id,
            'position' => $position,
            'step_type' => $type,
            'delay_amount' => 0,
            'delay_unit' => 'days',
            'config' => $config,
        ]);
    }

    private function runJob(ActionPlanEnrollment $enrollment): void
    {
        ProcessActionPlanStep::dispatchSync($enrollment->id);
    }

    /** Stub the Resend HTTP API + the platform sender config so email steps send. */
    private function fakeResend(string $messageId = 're_test'): void
    {
        config([
            'services.resend.key' => 're_platform',
            'mail.sender_alias.domain' => 'm.agentsbunny.com',
            'mail.sender_alias.default' => 'updates@m.agentsbunny.com',
            'mail.sender_alias.default_name' => 'Agents Bunny Updates',
            'mail.sender_alias.domain_verified' => true,
        ]);

        Http::fake(['api.resend.com/*' => Http::response(['id' => $messageId], 200)]);
    }

    private function emailEnrollment(array $contactAttrs = []): ActionPlanEnrollment
    {
        $plan = $this->plan();
        $this->step($plan, 'email', ['subject' => 'Hi {{first_name}}', 'body_html' => '<p>Hello {{first_name}}</p>']);
        $enrollment = app(ActionPlanEnroller::class)->enroll($plan, $this->contact($contactAttrs));
        $enrollment->update(['next_run_at' => now()->subMinute()]);

        return $enrollment;
    }

    // ── Plan CRUD ───────────────────────────────────────────────────

    public function test_create_action_plan(): void
    {
        $response = $this->actingAs($this->user)->post(route('crm.action-plans.store'), [
            'name' => 'New Buyer Nurture',
            'trigger_type' => 'manual',
        ]);

        $plan = ActionPlan::first();
        $this->assertNotNull($plan);
        $this->assertSame('New Buyer Nurture', $plan->name);
        $this->assertSame($this->user->id, $plan->user_id);
        $this->assertFalse($plan->is_active);
        $response->assertRedirect(route('crm.action-plans.edit', $plan));
    }

    public function test_index_lists_only_own_plans(): void
    {
        $this->plan(['name' => 'Mine']);
        $other = User::factory()->create();
        $other->actionPlans()->create(['name' => 'Theirs', 'trigger_type' => 'manual']);

        $this->actingAs($this->user)->get(route('crm.action-plans.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Crm/ActionPlans/Index')
                ->has('plans', 1)
                ->where('plans.0.name', 'Mine'));
    }

    // ── Enrollment ──────────────────────────────────────────────────

    public function test_manual_enroll_creates_active_enrollment(): void
    {
        $plan = $this->plan();
        $this->step($plan, 'task', ['title' => 'Call']);
        $contact = $this->contact();

        $this->actingAs($this->user)->post(route('crm.action-plan-enrollments.store'), [
            'action_plan_id' => $plan->id,
            'contact_id' => $contact->id,
        ])->assertRedirect();

        $enrollment = ActionPlanEnrollment::first();
        $this->assertNotNull($enrollment);
        $this->assertSame('active', $enrollment->status);
        $this->assertSame($contact->id, $enrollment->contact_id);
        $this->assertNotNull($enrollment->next_run_at);
    }

    public function test_no_duplicate_enrollment_unless_allowed(): void
    {
        $plan = $this->plan();
        $this->step($plan, 'task', ['title' => 'Call']);
        $contact = $this->contact();
        $enroller = app(ActionPlanEnroller::class);

        $this->assertNotNull($enroller->enroll($plan, $contact));
        $this->assertNull($enroller->enroll($plan, $contact)); // blocked
        $this->assertSame(1, ActionPlanEnrollment::count());

        $plan->update(['allow_reenroll' => true]);
        $this->assertNotNull($enroller->enroll($plan, $contact)); // now allowed
        $this->assertSame(2, ActionPlanEnrollment::count());
    }

    public function test_status_change_trigger_enrolls_contact(): void
    {
        $plan = $this->plan([
            'trigger_type' => 'status_changed',
            'trigger_config' => ['to_status' => 'active'],
        ]);
        $this->step($plan, 'task', ['title' => 'Welcome call']);
        $contact = $this->contact(['status' => 'new_lead']);

        app(ActionPlanEnroller::class)->evaluateStatusChange($contact, 'new_lead', 'active');

        $enrollment = ActionPlanEnrollment::first();
        $this->assertNotNull($enrollment);
        $this->assertSame('trigger', $enrollment->enrolled_via);
        $this->assertSame($plan->id, $enrollment->action_plan_id);
    }

    public function test_status_change_trigger_respects_to_status(): void
    {
        $plan = $this->plan([
            'trigger_type' => 'status_changed',
            'trigger_config' => ['to_status' => 'client'],
        ]);
        $this->step($plan, 'task', ['title' => 'x']);
        $contact = $this->contact();

        // Changing to 'active' should NOT match a plan keyed on 'client'.
        app(ActionPlanEnroller::class)->evaluateStatusChange($contact, 'new_lead', 'active');

        $this->assertSame(0, ActionPlanEnrollment::count());
    }

    public function test_inactive_plan_is_not_triggered(): void
    {
        $plan = $this->plan([
            'trigger_type' => 'status_changed',
            'trigger_config' => ['to_status' => 'active'],
            'is_active' => false,
        ]);
        $this->step($plan, 'task', ['title' => 'x']);
        $contact = $this->contact();

        app(ActionPlanEnroller::class)->evaluateStatusChange($contact, 'new_lead', 'active');

        $this->assertSame(0, ActionPlanEnrollment::count());
    }

    // ── Execution engine ────────────────────────────────────────────

    public function test_tick_command_dispatches_due_steps_only(): void
    {
        Queue::fake();

        $plan = $this->plan();
        $step = $this->step($plan, 'task', ['title' => 'x']);

        // Due
        ActionPlanEnrollment::create([
            'action_plan_id' => $plan->id, 'contact_id' => $this->contact()->id,
            'user_id' => $this->user->id, 'status' => 'active',
            'current_step_id' => $step->id, 'next_run_at' => now()->subMinute(),
        ]);
        // Not due
        ActionPlanEnrollment::create([
            'action_plan_id' => $plan->id, 'contact_id' => $this->contact(['email' => 'b@example.com'])->id,
            'user_id' => $this->user->id, 'status' => 'active',
            'current_step_id' => $step->id, 'next_run_at' => now()->addDay(),
        ]);

        $this->artisan('action-plans:tick')->assertSuccessful();

        Queue::assertPushed(ProcessActionPlanStep::class, 1);
    }

    public function test_task_step_creates_task_and_completes_enrollment(): void
    {
        $plan = $this->plan();
        $step = $this->step($plan, 'task', ['title' => 'Follow up call', 'priority' => 'high', 'due_offset_days' => 2]);
        $contact = $this->contact();
        $enrollment = app(ActionPlanEnroller::class)->enroll($plan, $contact);
        $enrollment->update(['next_run_at' => now()->subMinute()]);

        $this->runJob($enrollment);

        $task = Task::first();
        $this->assertNotNull($task);
        $this->assertSame('Follow up call', $task->title);
        $this->assertSame('high', $task->priority);
        $this->assertSame($contact->id, $task->taskable_id);
        $this->assertNotNull($task->due_at);

        $run = ActionPlanStepRun::first();
        $this->assertSame('sent', $run->status);
        $this->assertSame(Task::class, $run->result_ref_type);

        $this->assertSame('completed', $enrollment->fresh()->status);
    }

    public function test_email_step_sends_via_resend_and_logs_action_plan_category(): void
    {
        $this->fakeResend('re_sent_1');
        $enrollment = $this->emailEnrollment();

        $this->runJob($enrollment);

        // Sent through Resend — NOT the Gmail inbox — and logged for tracking.
        $log = EmailSendLog::first();
        $this->assertNotNull($log);
        $this->assertSame('resend', $log->provider);
        $this->assertSame('action_plan_email', $log->template_type);
        $this->assertSame(EmailCategory::ACTION_PLAN, $log->quota_category);
        $this->assertSame('jane@example.com', $log->recipient);
        $this->assertSame(EmailSendLog::STATUS_SENT, $log->status);
        $this->assertSame('re_sent_1', $log->provider_message_id);
        $this->assertSame('ap:'.$enrollment->id.':'.$enrollment->current_step_id, $log->idempotency_key);

        $run = ActionPlanStepRun::first();
        $this->assertSame('sent', $run->status);
        $this->assertSame('completed', $enrollment->fresh()->status);
        Http::assertSentCount(1);
    }

    public function test_action_plan_email_does_not_count_toward_quota_by_default(): void
    {
        config(['email_categories.quota.action_plan' => false]);
        $this->fakeResend();

        $this->runJob($this->emailEnrollment());

        $this->assertFalse((bool) EmailSendLog::first()->counts_toward_quota);
    }

    public function test_action_plan_email_counts_toward_quota_when_enabled(): void
    {
        config(['email_categories.quota.action_plan' => true]);
        $this->fakeResend();

        $this->runJob($this->emailEnrollment());

        $this->assertTrue((bool) EmailSendLog::first()->counts_toward_quota);
    }

    public function test_email_step_skipped_for_contact_without_email(): void
    {
        $this->fakeResend();
        $enrollment = $this->emailEnrollment(['email' => null]);

        $this->runJob($enrollment);

        $run = ActionPlanStepRun::first();
        $this->assertSame('skipped', $run->status);
        $this->assertSame('no_email', $run->skip_reason);
        $this->assertSame(0, EmailSendLog::count());
        Http::assertNothingSent();
    }

    public function test_email_step_skipped_for_unsubscribed_contact(): void
    {
        $this->fakeResend();
        $enrollment = $this->emailEnrollment(['email_opted_out' => true]);

        $this->runJob($enrollment);

        $run = ActionPlanStepRun::first();
        $this->assertSame('skipped', $run->status);
        $this->assertSame('unsubscribed', $run->skip_reason);
        $this->assertSame(0, EmailSendLog::count());
        Http::assertNothingSent();
    }

    public function test_email_step_skipped_for_suppressed_recipient(): void
    {
        $this->fakeResend();
        EmailSuppression::suppress('jane@example.com', EmailSuppression::REASON_BOUNCE, 'resend');
        $enrollment = $this->emailEnrollment();

        $this->runJob($enrollment);

        $run = ActionPlanStepRun::first();
        $this->assertSame('skipped', $run->status);
        $this->assertSame('suppressed', $run->skip_reason);
        $this->assertSame(0, EmailSendLog::count());
        Http::assertNothingSent();
    }

    public function test_email_send_is_idempotent_no_duplicate_on_retry(): void
    {
        $this->fakeResend();
        $plan = $this->plan();
        $step = $this->step($plan, 'email', ['subject' => 'Hi', 'body_html' => '<p>Hello</p>']);
        $contact = $this->contact();
        $enrollment = app(ActionPlanEnroller::class)->enroll($plan, $contact);

        // Pre-reserve the deterministic idempotency key, as if a prior attempt
        // already sent this exact (enrollment, step) email.
        EmailSendLog::create([
            'user_id' => $this->user->id,
            'provider' => 'resend',
            'template_type' => 'action_plan_email',
            'recipient' => $contact->email,
            'status' => EmailSendLog::STATUS_SENT,
            'idempotency_key' => 'ap:'.$enrollment->id.':'.$step->id,
        ]);

        $this->runJob($enrollment);

        // No second Resend call and no duplicate log row.
        Http::assertNothingSent();
        $this->assertSame(1, EmailSendLog::count());
        $this->assertSame('skipped', ActionPlanStepRun::first()->status);
        $this->assertSame('duplicate', ActionPlanStepRun::first()->skip_reason);
    }

    public function test_paused_plan_does_not_send(): void
    {
        $this->fakeResend();
        $enrollment = $this->emailEnrollment();
        $enrollment->actionPlan->update(['is_active' => false]);

        $this->runJob($enrollment);

        $this->assertSame(0, EmailSendLog::count());
        Http::assertNothingSent();
        $enrollment->refresh();
        $this->assertSame('stopped', $enrollment->status);
        $this->assertSame('plan_deactivated', $enrollment->stop_reason);
    }

    public function test_paused_enrollment_does_not_send(): void
    {
        $this->fakeResend();
        $enrollment = $this->emailEnrollment();
        $enrollment->update(['status' => 'paused']);

        $this->runJob($enrollment);

        $this->assertSame(0, EmailSendLog::count());
        Http::assertNothingSent();
        $this->assertSame('paused', $enrollment->fresh()->status);
    }

    public function test_unsubscribe_route_opts_contact_out(): void
    {
        $contact = $this->contact();
        $token = $contact->ensureEmailUnsubscribeToken();

        $this->get('/email/unsubscribe/'.$token)->assertOk();

        $this->assertTrue($contact->fresh()->emailUnsubscribed());
        $this->assertNotNull($contact->fresh()->email_opted_out_at);
    }

    public function test_sms_step_skips_when_contact_opted_out(): void
    {
        $plan = $this->plan();
        $this->step($plan, 'sms', ['body' => 'Hi {{first_name}}']);
        $contact = $this->contact(['sms_opted_out' => true]);
        $enrollment = app(ActionPlanEnroller::class)->enroll($plan, $contact);

        $this->runJob($enrollment);

        $run = ActionPlanStepRun::first();
        $this->assertSame('skipped', $run->status);
        $this->assertSame('opted_out', $run->skip_reason);
        $this->assertSame(0, \App\Models\SmsMessage::count());
        $this->assertSame('completed', $enrollment->fresh()->status);
    }

    public function test_multi_step_advances_to_next_step(): void
    {
        $plan = $this->plan();
        $s1 = $this->step($plan, 'task', ['title' => 'Step 1'], position: 0);
        $s2 = $this->step($plan, 'task', ['title' => 'Step 2'], position: 1);
        $contact = $this->contact();
        $enrollment = app(ActionPlanEnroller::class)->enroll($plan, $contact);

        $this->runJob($enrollment);

        $enrollment->refresh();
        $this->assertSame('active', $enrollment->status);
        $this->assertSame($s2->id, $enrollment->current_step_id);
        $this->assertSame(1, Task::count());
    }

    public function test_idempotency_guard_prevents_double_send(): void
    {
        $plan = $this->plan();
        $step = $this->step($plan, 'task', ['title' => 'Once only']);
        $contact = $this->contact();
        $enrollment = app(ActionPlanEnroller::class)->enroll($plan, $contact);

        // Simulate a prior resolved run for this (enrollment, step) — as if the job
        // already executed and is being retried.
        ActionPlanStepRun::create([
            'action_plan_enrollment_id' => $enrollment->id,
            'action_plan_step_id' => $step->id,
            'user_id' => $this->user->id,
            'status' => 'sent',
            'ran_at' => now(),
        ]);

        $this->runJob($enrollment);

        // No new Task: the guard caused the job to advance without re-performing.
        $this->assertSame(0, Task::count());
        $this->assertSame(1, ActionPlanStepRun::count());
        $this->assertSame('completed', $enrollment->fresh()->status);
    }

    public function test_stop_enrollment(): void
    {
        $plan = $this->plan();
        $this->step($plan, 'task', ['title' => 'x']);
        $contact = $this->contact();
        $enrollment = app(ActionPlanEnroller::class)->enroll($plan, $contact);

        $this->actingAs($this->user)
            ->patch(route('crm.action-plan-enrollments.stop', $enrollment))
            ->assertRedirect();

        $enrollment->refresh();
        $this->assertSame('stopped', $enrollment->status);
        $this->assertSame('manual', $enrollment->stop_reason);
    }
}
