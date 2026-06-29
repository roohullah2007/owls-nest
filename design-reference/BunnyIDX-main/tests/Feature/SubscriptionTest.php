<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    // ── Plans + entitlement engine ──────────────────────────────────

    public function test_baseline_plans_are_seeded(): void
    {
        $this->assertSame(3, Plan::count());
        $this->assertNotNull(Plan::findByKey('free'));
        $this->assertSame([], Plan::findByKey('free')->features);
        $this->assertContains('websites', Plan::findByKey('pro')->features);
    }

    public function test_free_user_lacks_paid_features_and_pro_has_them(): void
    {
        $free = User::factory()->create(['subscription_tier' => 'free']);
        $pro = User::factory()->create(['subscription_tier' => 'pro']);

        $this->assertFalse($free->hasFeature('websites'));
        $this->assertFalse($free->hasFeature('ai'));
        $this->assertFalse($free->isPro());

        $this->assertTrue($pro->hasFeature('websites'));
        $this->assertTrue($pro->hasFeature('idx'));
        $this->assertTrue($pro->isPro());
    }

    public function test_unknown_feature_is_never_gated(): void
    {
        $free = User::factory()->create(['subscription_tier' => 'free']);
        $this->assertTrue($free->hasFeature('contacts')); // not in catalog
    }

    public function test_per_user_override_wins_over_plan_default(): void
    {
        $free = User::factory()->create([
            'subscription_tier' => 'free',
            'feature_overrides' => ['websites' => true],
        ]);
        $this->assertTrue($free->hasFeature('websites'));
        $this->assertFalse($free->hasFeature('ai'));

        $pro = User::factory()->create([
            'subscription_tier' => 'pro',
            'feature_overrides' => ['ai' => false],
        ]);
        $this->assertTrue($pro->hasFeature('websites'));
        $this->assertFalse($pro->hasFeature('ai')); // forced off
    }

    public function test_lifetime_grant_never_expires(): void
    {
        $user = User::factory()->create([
            'subscription_tier' => 'enterprise',
            'is_lifetime' => true,
            'subscription_expires_at' => now()->subYear(),
        ]);

        $this->assertFalse($user->subscriptionExpired());
        $this->assertTrue($user->isEnterprise());
        $this->assertTrue($user->hasFeature('ai'));
    }

    public function test_expired_time_limited_grant_reverts_to_free(): void
    {
        $user = User::factory()->create([
            'subscription_tier' => 'pro',
            'subscription_expires_at' => now()->subDay(),
        ]);

        $this->assertTrue($user->subscriptionExpired());
        $this->assertSame('free', $user->effectivePlanKey());
        $this->assertFalse($user->hasFeature('websites'));
    }

    // ── Self-serve trials ───────────────────────────────────────────

    public function test_starting_a_trial_requires_a_card_via_stripe(): void
    {
        // No Stripe secret → the card-collection Checkout cannot be created, so
        // the trial must NOT start (no more silent, card-free elevation).
        config(['services.stripe.secret' => null]);

        $user = User::factory()->create(['subscription_tier' => 'free']);

        $this->actingAs($user)
            ->post(route('crm.subscription.start-trial'), ['plan' => 'pro'])
            ->assertRedirect();

        $user->refresh();
        $this->assertFalse($user->trial_used);
        $this->assertFalse($user->isTrialing());
        $this->assertSame('free', $user->effectivePlanKey());
        $this->assertNotNull(session('error'));
    }

    public function test_trial_cannot_be_started_twice(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'free', 'trial_used' => true]);

        $this->actingAs($user)->post(route('crm.subscription.start-trial'), ['plan' => 'pro']);

        $user->refresh();
        $this->assertFalse($user->isTrialing());
    }

    public function test_expired_trial_reverts_to_free(): void
    {
        $user = User::factory()->create([
            'subscription_tier' => 'free',
            'trial_plan' => 'pro',
            'trial_ends_at' => now()->subDay(),
            'trial_used' => true,
        ]);

        $this->assertFalse($user->isTrialing());
        $this->assertSame('free', $user->effectivePlanKey());
        $this->assertFalse($user->hasFeature('websites'));
    }

    // ── Feature middleware ──────────────────────────────────────────

    public function test_free_user_is_blocked_from_gated_route(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'free']);

        $this->actingAs($user)
            ->post(route('crm.listings.search-mls'), [])
            ->assertRedirect();

        $this->assertNotNull(session('error'));
    }

    public function test_trialing_user_passes_gated_route_gate(): void
    {
        $user = User::factory()->create([
            'subscription_tier' => 'free',
            'trial_plan' => 'pro',
            'trial_ends_at' => now()->addDays(10),
            'trial_used' => true,
        ]);

        // Passes the feature:idx gate (no upgrade error). Controller may still
        // complain about input, but the gate itself must not block.
        $this->actingAs($user)->post(route('crm.listings.search-mls'), []);

        $this->assertNull(session('error'));
    }

    // ── Admin control ───────────────────────────────────────────────

    public function test_admin_can_assign_lifetime_plan_and_overrides(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin']);
        $target = User::factory()->create(['subscription_tier' => 'free']);

        $this->actingAs($admin)->patch(route('admin.users.update-subscription', $target), [
            'subscription_tier' => 'enterprise',
            'is_lifetime' => true,
            'feature_overrides' => ['ai' => false],
        ])->assertRedirect();

        $target->refresh();
        $this->assertTrue($target->is_lifetime);
        $this->assertSame('enterprise', $target->subscription_tier);
        $this->assertTrue($target->hasFeature('websites'));
        $this->assertFalse($target->hasFeature('ai')); // override
    }

    public function test_admin_can_edit_plan_features(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin']);
        $free = Plan::findByKey('free');

        $this->actingAs($admin)->patch(route('admin.plans.update', $free), [
            'key' => 'free',
            'name' => 'Starter',
            'trial_days' => 0,
            'features' => ['websites'],
            'sort_order' => 0,
        ])->assertRedirect();

        $this->assertContains('websites', $free->fresh()->features);

        // A free user now gets websites for free.
        $user = User::factory()->create(['subscription_tier' => 'free']);
        $this->assertTrue($user->hasFeature('websites'));
    }

    public function test_built_in_plan_cannot_be_deleted(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin']);
        $pro = Plan::findByKey('pro');

        $this->actingAs($admin)->delete(route('admin.plans.destroy', $pro));

        $this->assertNotNull(Plan::findByKey('pro'));
    }

    public function test_non_admin_cannot_reach_admin_plans(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'free']);
        $this->actingAs($user)->get(route('admin.plans'))->assertForbidden();
    }
}
