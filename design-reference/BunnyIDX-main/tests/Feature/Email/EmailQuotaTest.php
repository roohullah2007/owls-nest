<?php

declare(strict_types=1);

namespace Tests\Feature\Email;

use App\Jobs\SendLeadNotificationEmail;
use App\Models\Contact;
use App\Models\EmailSendLog;
use App\Models\User;
use App\Services\Email\EmailCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EmailQuotaTest extends TestCase
{
    use RefreshDatabase;

    public function test_template_types_classify_into_canonical_categories(): void
    {
        $this->assertSame(EmailCategory::AUTH_VERIFICATION, EmailCategory::fromTemplateType('email_verification'));
        $this->assertSame(EmailCategory::PASSWORD_RESET, EmailCategory::fromTemplateType('password_reset'));
        $this->assertSame(EmailCategory::LEAD_NOTIFICATION, EmailCategory::fromTemplateType('new_lead_notification'));
        $this->assertSame(EmailCategory::VISITOR_REGISTRATION, EmailCategory::fromTemplateType('visitor_registration_confirmation'));
        $this->assertSame(EmailCategory::SAVED_SEARCH_ALERT, EmailCategory::fromTemplateType('saved_search_alert'));
        $this->assertSame(EmailCategory::PROPERTY_UPDATE_ALERT, EmailCategory::fromTemplateType('property_price_drop_alert'));
        $this->assertSame(EmailCategory::PROPERTY_UPDATE_ALERT, EmailCategory::fromTemplateType('property_status_change_alert'));
        $this->assertSame(EmailCategory::ACTION_PLAN, EmailCategory::fromTemplateType('action_plan_email'));
        // Unknown → the configurable automation bucket.
        $this->assertSame(EmailCategory::AUTOMATION, EmailCategory::fromTemplateType('some_future_blast'));
    }

    public function test_property_alerts_always_count_toward_quota(): void
    {
        $this->assertTrue(EmailCategory::countsTowardQuota(EmailCategory::SAVED_SEARCH_ALERT));
        $this->assertTrue(EmailCategory::countsTowardQuota(EmailCategory::PROPERTY_UPDATE_ALERT));
        // Legacy stored value still classifies correctly.
        $this->assertTrue(EmailCategory::countsTowardQuota('property_alert'));
    }

    public function test_auth_admin_and_lead_emails_never_count(): void
    {
        $this->assertFalse(EmailCategory::countsTowardQuota(EmailCategory::AUTH_VERIFICATION));
        $this->assertFalse(EmailCategory::countsTowardQuota(EmailCategory::PASSWORD_RESET));
        $this->assertFalse(EmailCategory::countsTowardQuota(EmailCategory::ADMIN_UPDATE));
        $this->assertFalse(EmailCategory::countsTowardQuota(EmailCategory::LEAD_NOTIFICATION));
        $this->assertFalse(EmailCategory::countsTowardQuota(EmailCategory::VISITOR_REGISTRATION));
    }

    public function test_gmail_outlook_inbox_mail_is_excluded_from_resend_quota(): void
    {
        // Connected-inbox sends never produce a Resend category; any non-Resend
        // / unknown category defaults to not counting (automation toggle off).
        config(['email_categories.quota.automation' => false]);
        $this->assertFalse(EmailCategory::countsTowardQuota('gmail_inbox'));
        $this->assertFalse(EmailCategory::countsTowardQuota('outlook_inbox'));
    }

    public function test_action_plan_and_automation_quota_are_configurable(): void
    {
        config(['email_categories.quota.action_plan' => false]);
        $this->assertFalse(EmailCategory::countsTowardQuota(EmailCategory::ACTION_PLAN));

        config(['email_categories.quota.action_plan' => true]);
        $this->assertTrue(EmailCategory::countsTowardQuota(EmailCategory::ACTION_PLAN));

        config(['email_categories.quota.automation' => false]);
        $this->assertFalse(EmailCategory::countsTowardQuota(EmailCategory::AUTOMATION));

        config(['email_categories.quota.automation' => true]);
        $this->assertTrue(EmailCategory::countsTowardQuota(EmailCategory::AUTOMATION));
    }

    public function test_property_alert_env_keys_have_backward_compat_fallback(): void
    {
        // Defaults resolve to the documented values whichever env naming is used.
        $this->assertSame(10000, (int) config('property_alerts.quota.included_limit'));
        $this->assertSame(1.0, (float) config('property_alerts.quota.overage_price_per_unit'));
    }

    public function test_lead_notification_log_is_not_counted(): void
    {
        config(['services.resend.key' => 're_platform_key']);
        Http::fake(['api.resend.com/*' => Http::response(['id' => 're_lead'], 200)]);

        $agent = User::factory()->create(['email' => 'agent@example.com']);
        $contact = Contact::factory()->create([
            'user_id' => $agent->id,
            'email' => 'lead@example.com',
        ]);

        SendLeadNotificationEmail::dispatch($contact->id, $agent->id, 'Website', 'lead:contact:'.$contact->id);

        $log = EmailSendLog::where('idempotency_key', 'lead:contact:'.$contact->id)->firstOrFail();
        $this->assertFalse((bool) $log->counts_toward_quota);
        $this->assertSame('lead_notification', $log->quota_category);
    }
}
