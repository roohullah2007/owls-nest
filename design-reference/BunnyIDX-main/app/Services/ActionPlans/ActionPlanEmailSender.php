<?php

declare(strict_types=1);

namespace App\Services\ActionPlans;

use App\Models\ActionPlanEnrollment;
use App\Models\ActionPlanStep;
use App\Models\AgentWebsite;
use App\Models\Contact;
use App\Models\EmailSendLog;
use App\Models\EmailSuppression;
use App\Models\User;
use App\Services\Email\BrandedEmailResolver;
use App\Services\Email\EmailCategory;
use App\Services\Email\EmailQuota;
use App\Services\Email\MergeFieldService;
use App\Services\Email\ResendClient;
use App\Services\TimelineService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

/**
 * Sends a single Action Plan email step through the existing Resend stack —
 * NOT the agent's connected Gmail/Outlook inbox. Automated sequence email is a
 * platform-sent transactional category, so it routes through Resend with the
 * `action_plan` category and is logged to email_send_logs for tracking + quota.
 *
 * Every send enforces the same gates a manual send respects: missing email,
 * per-contact email opt-out (one-click unsubscribe), global bounce/complaint
 * suppression, and email DND. The send is mirrored into the contact's timeline
 * (the unified activity/conversation feed) so it stays visible in their record.
 *
 * Idempotent: the email_send_logs.idempotency_key unique index is the race-safe
 * guard — a retried job can never double-send. Returns an outcome array shaped
 * for ProcessActionPlanStep's step-run recorder.
 *
 * @phpstan-type Outcome array{status:string, reason?:string, error?:string}
 */
class ActionPlanEmailSender
{
    public function __construct(
        private readonly BrandedEmailResolver $resolver,
        private readonly ResendClient $client,
        private readonly EmailQuota $quota,
    ) {}

    /**
     * @return array{status:string, reason?:string, error?:string}
     */
    public function send(User $user, Contact $contact, ActionPlanStep $step, ActionPlanEnrollment $enrollment): array
    {
        if (! $contact->email) {
            return ['status' => 'skipped', 'reason' => 'no_email'];
        }
        // Per-contact opt-out (public one-click unsubscribe link).
        if ($contact->emailUnsubscribed()) {
            return ['status' => 'skipped', 'reason' => 'unsubscribed'];
        }
        // Email DND ('all' or explicit 'email'). SMS-only DND does not gate email.
        if (in_array($contact->dnd_mode, ['all', 'email'], true)) {
            return ['status' => 'skipped', 'reason' => 'dnd'];
        }
        // Global bounce/complaint suppression — never email a suppressed address.
        if (EmailSuppression::isSuppressed($contact->email)) {
            return ['status' => 'skipped', 'reason' => 'suppressed'];
        }
        // Plan transactional-email cap (only when this category counts toward it).
        if (EmailCategory::countsTowardQuota(EmailCategory::ACTION_PLAN) && $this->quota->isOverLimit($user)) {
            return ['status' => 'skipped', 'reason' => 'quota_exceeded'];
        }

        $config = $step->config ?? [];
        $extra = $this->mergeContext($user, $contact, $enrollment);

        $subject = MergeFieldService::replace((string) ($config['subject'] ?? ''), $contact, $extra);
        $bodyHtml = $this->sanitizeHtml(
            MergeFieldService::replace((string) ($config['body_html'] ?? ''), $contact, $extra)
        );

        $resolved = $this->resolver->for($user);

        // Deterministic key: one email per (enrollment, step). The unique index
        // makes a concurrent/retried dispatch a no-op.
        $idempotencyKey = 'ap:'.$enrollment->id.':'.$step->id;

        try {
            $emailLog = EmailSendLog::create([
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'provider' => 'resend',
                'template_type' => 'action_plan_email',
                'recipient' => $contact->email,
                'sender' => $resolved['from_email'],
                'subject' => $subject,
                'status' => EmailSendLog::STATUS_QUEUED,
                'branded' => $resolved['branded'],
                'quota_category' => EmailCategory::ACTION_PLAN,
                'counts_toward_quota' => EmailCategory::countsTowardQuota(EmailCategory::ACTION_PLAN),
                'idempotency_key' => $idempotencyKey,
                'meta' => [
                    'action_plan_id' => $enrollment->action_plan_id,
                    'action_plan_step_id' => $step->id,
                    'enrollment_id' => $enrollment->id,
                    'contact_id' => $contact->id,
                ],
            ]);
        } catch (QueryException) {
            // Another worker already reserved this exact send — do not resend.
            return ['status' => 'skipped', 'reason' => 'duplicate'];
        }

        try {
            $messageId = $this->client->send(
                $resolved['key'],
                $resolved['from_email'],
                $resolved['from_name'],
                $contact->email,
                $subject,
                $bodyHtml,
            );

            $emailLog->update([
                'status' => EmailSendLog::STATUS_SENT,
                'provider_message_id' => $messageId,
                'sent_at' => now(),
            ]);

            // Mirror into the contact's timeline/conversation feed so the
            // automated email is visible in their record (same as a manual send).
            TimelineService::log(
                $user,
                'email_sent',
                "Action plan email sent to {$contact->full_name}",
                mb_substr(strip_tags($bodyHtml), 0, 200),
                $contact,
                metadata: [
                    'action_plan_step_id' => $step->id,
                    'email_send_log_id' => $emailLog->id,
                    'provider' => 'resend',
                    'automated' => true,
                ],
            );

            $contact->update(['last_contacted_at' => now()]);

            return ['status' => 'sent'];
        } catch (\Throwable $e) {
            $emailLog->update([
                'status' => EmailSendLog::STATUS_FAILED,
                'error_message' => Str::limit($e->getMessage(), 480),
            ]);

            Log::warning('ActionPlanEmailSender: send failed', [
                'enrollment_id' => $enrollment->id,
                'step_id' => $step->id,
                'error' => $e->getMessage(),
            ]);

            // Swallow: the failed log row + idempotency key prevent a retry from
            // double-sending. Surface as a failed step (engine advances anyway).
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    /**
     * Non-contact merge tokens supplied for Action Plan email steps.
     *
     * @return array<string,string|null>
     */
    private function mergeContext(User $user, Contact $contact, ActionPlanEnrollment $enrollment): array
    {
        return [
            'agent_name' => $user->name ?? '',
            'agent_email' => $user->email ?? '',
            'plan_name' => $enrollment->actionPlan?->name ?? '',
            'website_url' => $this->websiteUrl($user),
            'unsubscribe_url' => $this->unsubscribeUrl($contact),
        ];
    }

    /** Public one-click unsubscribe link for this contact (mirrors property alerts). */
    private function unsubscribeUrl(Contact $contact): string
    {
        $token = $contact->ensureEmailUnsubscribeToken();

        if (Route::has('email.unsubscribe')) {
            return route('email.unsubscribe', $token, true);
        }

        return url('/email/unsubscribe/'.$token);
    }

    /** Best-effort public site URL for the {{website_url}} token. */
    private function websiteUrl(User $user): string
    {
        $site = AgentWebsite::where('user_id', $user->id)->first();

        if (! $site || empty($site->slug)) {
            return '';
        }

        try {
            return Route::has('agent-site.home')
                ? route('agent-site.home', $site->slug, true)
                : url('/site/'.$site->slug);
        } catch (\Throwable) {
            return url('/site/'.$site->slug);
        }
    }

    /**
     * Strip script/style blocks, inline event handlers and javascript: URLs from
     * agent-authored HTML before it goes out over Resend. Mirrors the
     * sanitisation applied by EmailTemplateRenderer to DB-stored templates.
     */
    private function sanitizeHtml(string $html): string
    {
        $html = preg_replace('#<\s*(script|style)\b[^>]*>.*?<\s*/\s*\1\s*>#is', '', $html) ?? $html;
        $html = preg_replace('#\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', $html) ?? $html;
        $html = preg_replace('#(href|src)\s*=\s*("|\')\s*javascript:[^"\']*\2#i', '$1=$2#$2', $html) ?? $html;

        return $html;
    }
}
