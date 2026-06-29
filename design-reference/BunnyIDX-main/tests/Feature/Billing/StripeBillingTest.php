<?php

declare(strict_types=1);

namespace Tests\Feature\Billing;

use App\Models\Plan;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\Billing\CreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Phase 2 — Stripe purchase flows: credit top-ups, monthly allowance refill on
 * invoice, and team seat-quantity sync. Webhook paths are exercised with real
 * HMAC-signed events (no live Stripe API call needed for these branches).
 */
class StripeBillingTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'whsec_test_secret';

    private function postSignedEvent(array $event): TestResponse
    {
        config(['services.stripe.webhook_secret' => self::SECRET]);

        $payload = json_encode($event);
        $timestamp = time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", self::SECRET);

        return $this->call(
            'POST', '/webhooks/stripe', [], [], [],
            ['HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}", 'CONTENT_TYPE' => 'application/json'],
            $payload,
        );
    }

    private function credits(): CreditService
    {
        return app(CreditService::class);
    }

    public function test_credit_package_checkout_credits_the_wallet_and_is_idempotent(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'free', 'stripe_customer_id' => 'cus_1']);

        $event = fn (string $id) => [
            'id' => $id,
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => 'cs_topup_1',
                'object' => 'checkout.session',
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'product_type' => 'credit_package',
                    'package' => 'standard',
                    'credit_cents' => '2750',
                ],
                'payment_status' => 'paid',
                'status' => 'complete',
                'customer' => 'cus_1',
            ]],
        ];

        $this->postSignedEvent($event('evt_topup_1'))->assertOk();
        $this->assertSame(2750, $this->credits()->balanceCents($user->fresh()));

        // A different event id but the SAME checkout session must not double-credit.
        $this->postSignedEvent($event('evt_topup_2'))->assertOk();
        $this->assertSame(2750, $this->credits()->balanceCents($user->fresh()));
        $this->assertDatabaseCount('credit_transactions', 1);
    }

    public function test_invoice_payment_refills_monthly_allowance(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'enterprise', 'stripe_customer_id' => 'cus_inv']);

        $this->postSignedEvent([
            'id' => 'evt_invoice_1',
            'object' => 'event',
            'type' => 'invoice.payment_succeeded',
            'data' => ['object' => [
                'id' => 'in_1',
                'object' => 'invoice',
                'subscription' => 'sub_inv',
                'customer' => 'cus_inv',
                'period_start' => 1_700_000_000,
                'period_end' => 1_702_592_000,
            ]],
        ])->assertOk();

        // Enterprise includes 5000c — granted on the successful invoice.
        $this->assertSame(5000, $this->credits()->balanceCents($user->fresh()));
    }

    public function test_subscription_updated_syncs_team_purchased_seats(): void
    {
        Plan::where('key', 'enterprise')->update(['extra_seat_stripe_price_id' => 'price_seat']);

        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);
        $team = Team::create(['name' => 'Acme', 'owner_id' => $owner->id, 'stripe_subscription_id' => 'sub_seat']);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner', 'is_active' => true, 'accepted_at' => now()]);
        $owner->update(['team_id' => $team->id]);

        $this->postSignedEvent([
            'id' => 'evt_seat_1',
            'object' => 'event',
            'type' => 'customer.subscription.updated',
            'data' => ['object' => [
                'id' => 'sub_seat',
                'object' => 'subscription',
                'status' => 'active',
                'metadata' => [
                    'user_id' => (string) $owner->id,
                    'product_type' => 'crm_subscription',
                    'plan' => 'enterprise',
                ],
                'items' => ['object' => 'list', 'data' => [
                    ['id' => 'si_base', 'quantity' => 1, 'price' => ['id' => 'price_base']],
                    ['id' => 'si_seat', 'quantity' => 3, 'price' => ['id' => 'price_seat']],
                ]],
            ]],
        ])->assertOk();

        $team->refresh();
        $this->assertSame(3, $team->purchased_seats);
        $this->assertSame('si_seat', $team->stripe_seat_item_id);
    }

    public function test_seat_update_requires_team_owner(): void
    {
        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);
        $team = Team::create(['name' => 'Acme', 'owner_id' => $owner->id]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner', 'is_active' => true, 'accepted_at' => now()]);
        $owner->update(['team_id' => $team->id]);

        $member = User::factory()->create(['subscription_tier' => 'free']);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $member->id, 'role' => 'agent', 'is_active' => true, 'accepted_at' => now()]);
        $member->update(['team_id' => $team->id]);

        $this->actingAs($member->fresh())
            ->post(route('crm.team.seats.update'), ['purchased_seats' => 2]);

        $this->assertNotNull(session('error'));
        $this->assertSame(0, $team->fresh()->purchased_seats);
    }

    public function test_seat_update_surfaces_stripe_not_configured(): void
    {
        config(['services.stripe.secret' => null]);

        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);
        $team = Team::create(['name' => 'Acme', 'owner_id' => $owner->id]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner', 'is_active' => true, 'accepted_at' => now()]);
        $owner->update(['team_id' => $team->id]);

        $this->actingAs($owner->fresh())
            ->post(route('crm.team.seats.update'), ['purchased_seats' => 2]);

        $this->assertNotNull(session('error'));
        $this->assertSame(0, $team->fresh()->purchased_seats);
    }
}
