<?php

declare(strict_types=1);

namespace Tests\Feature\Email;

use App\Jobs\SendLeadNotificationEmail;
use App\Models\Contact;
use App\Models\EmailSendLog;
use App\Models\LandingPage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class LeadNotificationEmailTest extends TestCase
{
    use RefreshDatabase;

    private function fakeResend(): void
    {
        Http::fake([
            'api.resend.com/*' => Http::response(['id' => 're_test_123'], 200),
        ]);
    }

    private function leadFor(User $user): Contact
    {
        return Contact::factory()->create([
            'user_id' => $user->id,
            'first_name' => 'New',
            'last_name' => 'Lead',
            'email' => 'lead@example.com',
        ]);
    }

    public function test_lead_notification_sends_via_platform_key_when_user_has_none(): void
    {
        config(['services.resend.key' => 're_platform_key']);
        $this->fakeResend();

        $agent = User::factory()->create(['email' => 'agent@example.com']);
        $contact = $this->leadFor($agent);

        SendLeadNotificationEmail::dispatch($contact->id, $agent->id, 'Website', 'lead:contact:'.$contact->id);

        Http::assertSent(fn ($req) => $req->hasHeader('Authorization', 'Bearer re_platform_key'));

        $log = EmailSendLog::where('idempotency_key', 'lead:contact:'.$contact->id)->firstOrFail();
        $this->assertSame(EmailSendLog::STATUS_SENT, $log->status);
        $this->assertFalse($log->branded);
        $this->assertSame('re_test_123', $log->provider_message_id);
        $this->assertSame('lead_notification', $log->quota_category);
    }

    public function test_lead_notification_uses_user_branded_key_when_present(): void
    {
        config(['services.resend.key' => 're_platform_key']);
        $this->fakeResend();

        $agent = User::factory()->create(['email' => 'agent@example.com']);
        $agent->forceFill([
            'resend_api_key' => 're_user_branded_KEY',
            'resend_last_four' => '_KEY',
            'resend_from_email' => 'team@agentdomain.com',
            'resend_from_name' => 'Agent Brand',
        ])->save();

        $contact = $this->leadFor($agent);

        SendLeadNotificationEmail::dispatch($contact->id, $agent->id, 'Website', 'lead:contact:'.$contact->id);

        // The user's own key — not the platform key — must be used.
        Http::assertSent(fn ($req) => $req->hasHeader('Authorization', 'Bearer re_user_branded_KEY'));

        $log = EmailSendLog::where('idempotency_key', 'lead:contact:'.$contact->id)->firstOrFail();
        $this->assertTrue($log->branded);
        $this->assertSame('team@agentdomain.com', $log->sender);
    }

    public function test_duplicate_job_does_not_send_twice(): void
    {
        config(['services.resend.key' => 're_platform_key']);
        $this->fakeResend();

        $agent = User::factory()->create();
        $contact = $this->leadFor($agent);
        $key = 'lead:contact:'.$contact->id;

        SendLeadNotificationEmail::dispatch($contact->id, $agent->id, 'Website', $key);
        SendLeadNotificationEmail::dispatch($contact->id, $agent->id, 'Website', $key);

        $this->assertSame(1, EmailSendLog::where('idempotency_key', $key)->count());
        Http::assertSentCount(1);
    }

    public function test_landing_page_submission_queues_a_lead_notification(): void
    {
        Queue::fake();

        $owner = User::factory()->create();
        $page = LandingPage::create([
            'user_id' => $owner->id,
            'slug' => 'sell-fast',
            'name' => 'Sell Fast',
            'type' => 'seller',
            'template' => 'classic',
            'page_data' => [],
            'is_published' => true,
        ]);

        $this->post('/l/'.$page->slug, [
            'name' => 'Homer Seller',
            'email' => 'homer@example.com',
        ]);

        Queue::assertPushed(SendLeadNotificationEmail::class, function ($job) use ($owner) {
            return $job->recipientUserId === $owner->id && $job->source === 'Landing Page';
        });
    }
}
