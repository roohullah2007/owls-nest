<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\EmailSendLog;
use App\Models\EmailSuppression;
use App\Models\PropertyAlertLog;
use App\Models\PropertyAlertUsage;
use App\Models\SiteVisitor;
use App\Models\User;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\PropertyAlerts\MlsListingProbe;
use App\Services\PropertyAlerts\PropertyAlertFrequency;
use App\Services\PropertyAlerts\PropertyAlertQuota;
use App\Services\PropertyAlerts\PropertyAlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PropertyAlertTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Resend credentials + sender identity so the send path resolves.
        config([
            'services.resend.key' => 're_test_key',
            'mail.from.address' => 'platform@example.com',
            'mail.from.name' => 'Platform',
            'property_alerts.enabled' => true,
        ]);

        Http::fake([
            'api.resend.com/*' => Http::response(['id' => 'msg_test_123'], 200),
        ]);
    }

    /* ───────────────────────── helpers ───────────────────────── */

    private function account(bool $pro = true): User
    {
        // Free plan: leave subscription_tier at its column default (the column
        // is NOT NULL). Paid plan: set "pro".
        return User::factory()->create($pro ? ['subscription_tier' => 'pro'] : []);
    }

    private function visitor(User $account, array $attrs = []): SiteVisitor
    {
        $site = new AgentWebsite;
        $site->forceFill([
            'user_id' => $account->id,
            'slug' => 'site-'.$account->id,
            'agent_name' => $account->name,
            'is_published' => true,
        ])->save();

        return SiteVisitor::create(array_merge([
            'agent_website_id' => $site->id,
            'name' => 'Lead Person',
            'email' => 'lead'.$account->id.'@example.com',
            'password' => 'secret-pass',
        ], $attrs));
    }

    private function listing(string $slug, string $id, ?int $price, string $status, string $address = '123 Main St', string $city = 'Austin'): MlsListing
    {
        return MlsListing::fromNormalizedArray([
            'mls_id' => $id,
            'mls_number' => $id,
            'mls_slug' => $slug,
            'status' => $status,
            'price' => $price,
            'address' => ['full' => $address, 'city' => $city],
        ]);
    }

    /** Swap the MLS probe for canned data and return the configured service. */
    private function serviceWithProbe(array $searchListings = [], array $getMap = [], bool $errored = false): PropertyAlertService
    {
        $fake = new class extends MlsListingProbe
        {
            public array $searchListings = [];

            public array $getMap = [];

            public bool $errored = false;

            public function __construct() {}

            public function searchListings(User $user, MlsQuery $query): array
            {
                return ['listings' => $this->searchListings, 'errored' => $this->errored];
            }

            public function getListing(User $user, string $mlsSlug, string $listingId): ?MlsListing
            {
                return $this->getMap[$mlsSlug.'|'.$listingId] ?? null;
            }
        };
        $fake->searchListings = $searchListings;
        $fake->getMap = $getMap;
        $fake->errored = $errored;

        $this->app->instance(MlsListingProbe::class, $fake);

        return $this->app->make(PropertyAlertService::class);
    }

    /* ───────────────────────── tests ───────────────────────── */

    public function test_default_property_alert_frequency_is_twice_weekly(): void
    {
        $user = User::factory()->create(['notification_preferences' => null]);

        $this->assertSame('twice_weekly', PropertyAlertFrequency::forUser($user));
        $this->assertSame('twice_weekly', config('property_alerts.default_frequency'));
    }

    public function test_paid_plan_sends_saved_search_alert_for_new_match(): void
    {
        $account = $this->account(pro: true);
        $visitor = $this->visitor($account);
        // Baseline already seeded as empty → the incoming listing is "new".
        $search = $visitor->savedSearches()->create([
            'name' => 'Downtown condos',
            'filters' => ['cities' => ['Austin']],
            'seen_listing_ids' => [],
        ]);

        $service = $this->serviceWithProbe(searchListings: [$this->listing('rmls', 'L1', 500000, 'Active')]);
        $sent = $service->runForVisitor($visitor);

        $this->assertSame(1, $sent);
        Http::assertSentCount(1);
        $this->assertDatabaseHas('email_send_logs', [
            'recipient' => $visitor->email,
            'quota_category' => 'property_alert',
            'template_type' => 'saved_search_alert',
            'status' => EmailSendLog::STATUS_SENT,
        ]);
        $this->assertDatabaseHas('property_alert_logs', [
            'site_visitor_saved_search_id' => $search->id,
            'alert_type' => PropertyAlertLog::TYPE_SAVED_SEARCH,
            'status' => PropertyAlertLog::STATUS_SENT,
        ]);
        $this->assertSame(1, (int) $this->quota($account)->property_alert_emails_sent);
    }

    public function test_free_plan_does_not_send_property_alerts(): void
    {
        $account = $this->account(pro: false);
        $visitor = $this->visitor($account);
        $visitor->savedSearches()->create(['name' => 'X', 'filters' => [], 'seen_listing_ids' => []]);

        $service = $this->serviceWithProbe(searchListings: [$this->listing('rmls', 'L1', 500000, 'Active')]);
        $sent = $service->runForVisitor($visitor);

        $this->assertSame(0, $sent);
        Http::assertNothingSent();
        $this->assertDatabaseCount('email_send_logs', 0);
        $this->assertDatabaseCount('property_alert_usage', 0);
    }

    public function test_first_evaluation_only_seeds_baseline_without_emailing(): void
    {
        $account = $this->account();
        $visitor = $this->visitor($account);
        $search = $visitor->savedSearches()->create(['name' => 'X', 'filters' => []]); // seen_listing_ids null

        $service = $this->serviceWithProbe(searchListings: [$this->listing('rmls', 'L1', 500000, 'Active')]);
        $sent = $service->runForVisitor($visitor);

        $this->assertSame(0, $sent);
        Http::assertNothingSent();
        $this->assertSame(['rmls|L1'], $search->fresh()->seen_listing_ids);
    }

    public function test_saved_search_duplicate_is_not_sent_twice(): void
    {
        $account = $this->account();
        $visitor = $this->visitor($account);
        $visitor->savedSearches()->create(['name' => 'X', 'filters' => [], 'seen_listing_ids' => []]);

        $listings = [$this->listing('rmls', 'L1', 500000, 'Active')];
        $this->serviceWithProbe(searchListings: $listings)->runForVisitor($visitor);
        // Second run: the listing is now in seen_listing_ids → no new match.
        $this->serviceWithProbe(searchListings: $listings)->runForVisitor($visitor);

        Http::assertSentCount(1);
        $this->assertSame(1, PropertyAlertLog::where('alert_type', PropertyAlertLog::TYPE_SAVED_SEARCH)->count());
        $this->assertSame(1, (int) $this->quota($account)->property_alert_emails_sent);
    }

    public function test_favorite_price_drop_queues_alert(): void
    {
        config(['property_alerts.default_frequency' => 'daily']);
        $account = $this->account();
        $visitor = $this->visitor($account);
        $visitor->favorites()->create([
            'mls_slug' => 'rmls',
            'listing_id' => 'L9',
            'snapshot' => ['alert_price' => 500000, 'alert_status' => 'active'],
        ]);

        $service = $this->serviceWithProbe(getMap: [
            'rmls|L9' => $this->listing('rmls', 'L9', 450000, 'Active'),
        ]);
        $sent = $service->runForVisitor($visitor);

        $this->assertSame(1, $sent);
        $this->assertDatabaseHas('property_alert_logs', [
            'alert_type' => PropertyAlertLog::TYPE_PRICE_DROP,
            'listing_id' => 'L9',
            'status' => PropertyAlertLog::STATUS_SENT,
        ]);
        $this->assertDatabaseHas('email_send_logs', [
            'template_type' => 'property_price_drop_alert',
            'quota_category' => 'property_alert',
        ]);
        $this->assertSame(1, (int) $this->quota($account)->property_alert_emails_sent);
    }

    public function test_favorite_status_change_queues_alert(): void
    {
        config(['property_alerts.default_frequency' => 'daily']);
        $account = $this->account();
        $visitor = $this->visitor($account);
        $visitor->favorites()->create([
            'mls_slug' => 'rmls',
            'listing_id' => 'L9',
            'snapshot' => ['alert_price' => 500000, 'alert_status' => 'active'],
        ]);

        $service = $this->serviceWithProbe(getMap: [
            'rmls|L9' => $this->listing('rmls', 'L9', 500000, 'Pending'),
        ]);
        $service->runForVisitor($visitor);

        $this->assertDatabaseHas('property_alert_logs', [
            'alert_type' => PropertyAlertLog::TYPE_STATUS_CHANGE,
            'listing_id' => 'L9',
        ]);
    }

    public function test_unsubscribed_lead_does_not_receive_alert(): void
    {
        $account = $this->account();
        $visitor = $this->visitor($account, ['alerts_unsubscribed_at' => now()]);
        $visitor->savedSearches()->create(['name' => 'X', 'filters' => [], 'seen_listing_ids' => []]);

        $service = $this->serviceWithProbe(searchListings: [$this->listing('rmls', 'L1', 500000, 'Active')]);
        $sent = $service->runForVisitor($visitor);

        $this->assertSame(0, $sent);
        Http::assertNothingSent();
    }

    public function test_suppressed_email_is_not_alerted(): void
    {
        config(['property_alerts.default_frequency' => 'daily']);
        $account = $this->account();
        $visitor = $this->visitor($account);
        EmailSuppression::suppress($visitor->email, 'bounce');
        $visitor->savedSearches()->create(['name' => 'X', 'filters' => [], 'seen_listing_ids' => []]);

        $service = $this->serviceWithProbe(searchListings: [$this->listing('rmls', 'L1', 500000, 'Active')]);

        $this->assertSame(0, $service->runForVisitor($visitor));
        Http::assertNothingSent();
    }

    public function test_quota_increments_only_for_property_alerts(): void
    {
        $account = $this->account();

        // A non-alert email logged directly (e.g. lead notification / auth) must
        // never touch the property-alert usage counter.
        EmailSendLog::create([
            'user_id' => $account->id,
            'provider' => 'resend',
            'template_type' => 'password_reset',
            'recipient' => 'x@example.com',
            'status' => EmailSendLog::STATUS_SENT,
            'quota_category' => 'auth',
        ]);
        EmailSendLog::create([
            'user_id' => $account->id,
            'provider' => 'resend',
            'template_type' => 'new_lead_notification',
            'recipient' => 'x@example.com',
            'status' => EmailSendLog::STATUS_SENT,
            'quota_category' => 'lead_notification',
        ]);

        $this->assertSame(0, (int) app(PropertyAlertQuota::class)->summary($account)['sent']);
    }

    public function test_over_quota_overage_is_one_dollar_per_thousand(): void
    {
        $account = $this->account();
        $quota = app(PropertyAlertQuota::class);

        $usage = PropertyAlertUsage::create([
            'user_id' => $account->id,
            'year_month' => now()->format('Y-m'),
            'property_alert_emails_sent' => 10500,
            'included_limit' => 10000,
        ]);

        $this->assertSame(500, $quota->overageEmails($usage));
        $this->assertSame(1, $quota->overageUnits($usage));
        $this->assertSame(1.00, $quota->overageAmount($usage));

        $usage->update(['property_alert_emails_sent' => 12000]);
        $this->assertSame(2, $quota->overageUnits($usage->fresh()));
        $this->assertSame(2.00, $quota->overageAmount($usage->fresh()));
    }

    public function test_included_quota_under_limit_has_no_overage(): void
    {
        $account = $this->account();
        $quota = app(PropertyAlertQuota::class);
        $usage = PropertyAlertUsage::create([
            'user_id' => $account->id,
            'year_month' => now()->format('Y-m'),
            'property_alert_emails_sent' => 9999,
            'included_limit' => 10000,
        ]);

        $this->assertSame(0, $quota->overageUnits($usage));
        $this->assertSame(0.0, $quota->overageAmount($usage));
    }

    private function quota(User $account): PropertyAlertUsage
    {
        return PropertyAlertUsage::firstOrCreate(
            ['user_id' => $account->id, 'year_month' => now()->format('Y-m')],
            ['included_limit' => 10000],
        );
    }
}
