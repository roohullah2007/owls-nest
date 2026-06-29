<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Regression for the production bug where Stripe `metadata` (a StripeObject) was
 * read via `(array)` casting — which exposes the SDK's internal props, not the
 * keys — so checkout.session.completed logged "no user_id in metadata" and the
 * plan never activated. The handler must read metadata via toArray().
 */
class StripeWebhookSubscriptionTest extends TestCase
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
            'POST',
            '/webhooks/stripe',
            [], [], [],
            ['HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}", 'CONTENT_TYPE' => 'application/json'],
            $payload,
        );
    }

    public function test_checkout_completed_activates_plan_from_metadata(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'free']);

        $this->postSignedEvent([
            'id' => 'evt_test_checkout_1',
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => 'cs_test_123',
                'object' => 'checkout.session',
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'product_type' => 'crm_subscription',
                    'plan' => 'enterprise',
                ],
                'payment_status' => 'paid',
                'status' => 'complete',
                'customer' => 'cus_test_123',
            ]],
        ])->assertOk();

        // The whole point: user_id was read out of the StripeObject metadata.
        $this->assertSame('enterprise', $user->fresh()->subscription_tier);
        $this->assertDatabaseHas('webhook_events', ['stripe_event_id' => 'evt_test_checkout_1']);
    }

    public function test_trial_checkout_activates_plan_and_marks_trial_used(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'free', 'trial_used' => false]);

        $this->postSignedEvent([
            'id' => 'evt_test_trial_1',
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'data' => ['object' => [
                'id' => 'cs_test_trial',
                'object' => 'checkout.session',
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'product_type' => 'crm_subscription',
                    'plan' => 'pro',
                    'is_trial' => '1',
                ],
                // A trialing subscription owes $0 now, so no payment is required.
                'payment_status' => 'no_payment_required',
                'status' => 'complete',
                'subscription' => 'sub_test_trial',
                'customer' => 'cus_test_trial',
            ]],
        ])->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('pro', $fresh->subscription_tier);
        $this->assertTrue($fresh->trial_used);
        $this->assertSame('sub_test_trial', $fresh->stripe_subscription_id);
    }

    public function test_invalid_signature_is_rejected(): void
    {
        config(['services.stripe.webhook_secret' => self::SECRET]);

        $this->call(
            'POST',
            '/webhooks/stripe',
            [], [], [],
            ['HTTP_STRIPE_SIGNATURE' => 't=1,v1=deadbeef', 'CONTENT_TYPE' => 'application/json'],
            json_encode(['id' => 'evt_x', 'type' => 'checkout.session.completed', 'data' => ['object' => []]]),
        )->assertStatus(400);

        $this->assertDatabaseMissing('webhook_events', ['stripe_event_id' => 'evt_x']);
    }

    public function test_subscription_deleted_downgrades_non_lifetime_user(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'enterprise']);

        $this->postSignedEvent([
            'id' => 'evt_test_sub_del_1',
            'object' => 'event',
            'type' => 'customer.subscription.deleted',
            'data' => ['object' => [
                'id' => 'sub_test_1',
                'object' => 'subscription',
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'product_type' => 'crm_subscription',
                    'plan' => 'enterprise',
                ],
                'status' => 'canceled',
            ]],
        ])->assertOk();

        $this->assertSame('free', $user->fresh()->subscription_tier);
    }
}
