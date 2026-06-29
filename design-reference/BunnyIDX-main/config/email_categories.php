<?php

declare(strict_types=1);

/**
 * Resend email category → quota classification.
 *
 * Property alerts always count against the monthly Resend property-alert quota;
 * auth/verification/password-reset/admin updates and lead/visitor-registration
 * notifications never do; connected Gmail/Outlook inbox mail never reaches
 * Resend at all (it's sent through the user's own mailbox). Action-plan and
 * automation emails are CONFIGURABLE here because product requirements conflict
 * — default OFF (do not count). Action-plan email steps are sent through Resend
 * (App\Services\ActionPlans\ActionPlanEmailSender) with the `action_plan`
 * category, so this toggle decides whether those automated sends draw down the
 * Resend quota. Default OFF: automated nurture email does not count.
 *
 * See App\Services\Email\EmailCategory for the canonical category list and the
 * countsTowardQuota() authority that reads these flags.
 */
return [
    'quota' => [
        'action_plan' => (bool) env('RESEND_QUOTA_ACTION_PLAN_EMAILS', false),
        'automation' => (bool) env('RESEND_QUOTA_AUTOMATION_EMAILS', false),
    ],
];
