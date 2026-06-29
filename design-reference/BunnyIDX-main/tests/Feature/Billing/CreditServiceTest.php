<?php

declare(strict_types=1);

namespace Tests\Feature\Billing;

use App\Exceptions\InsufficientCreditsException;
use App\Models\CreditTransaction;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\Billing\CreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): CreditService
    {
        return app(CreditService::class);
    }

    public function test_grant_then_charge_updates_balance_and_writes_ledger(): void
    {
        $user = User::factory()->create();
        $svc = $this->service();

        $svc->grant($user, 500, CreditTransaction::CATEGORY_PURCHASE, 'Top-up');
        $this->assertSame(500, $svc->balanceCents($user));

        $svc->charge($user, 200, CreditTransaction::CATEGORY_SMS, null, 'SMS');
        $this->assertSame(300, $svc->balanceCents($user));

        $this->assertDatabaseCount('credit_transactions', 2);
        $this->assertDatabaseHas('credit_transactions', [
            'direction' => CreditTransaction::DIRECTION_DEBIT,
            'category' => CreditTransaction::CATEGORY_SMS,
            'amount_cents' => 200,
            'balance_after_cents' => 300,
        ]);
    }

    public function test_charge_throws_when_balance_is_insufficient(): void
    {
        $user = User::factory()->create();
        $svc = $this->service();
        $svc->grant($user, 100, CreditTransaction::CATEGORY_PURCHASE);

        $this->expectException(InsufficientCreditsException::class);

        try {
            $svc->charge($user, 150, CreditTransaction::CATEGORY_SMS);
        } finally {
            // Balance untouched and no debit entry written.
            $this->assertSame(100, $svc->balanceCents($user->fresh()));
            $this->assertDatabaseMissing('credit_transactions', [
                'direction' => CreditTransaction::DIRECTION_DEBIT,
            ]);
        }
    }

    public function test_team_member_shares_the_team_owner_wallet(): void
    {
        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);
        $team = Team::create(['name' => 'Acme', 'owner_id' => $owner->id]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner', 'is_active' => true, 'accepted_at' => now()]);
        $owner->update(['team_id' => $team->id]);

        $member = User::factory()->create(['subscription_tier' => 'free']);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $member->id, 'role' => 'agent', 'is_active' => true, 'accepted_at' => now()]);
        $member->update(['team_id' => $team->id]);

        $svc = $this->service();

        // Owner's wallet starts with the enterprise included allowance; assert
        // sharing via deltas so the test is robust to the seeded allowance value.
        $ownerStart = $svc->balanceCents($owner->fresh());

        // Member and owner resolve to the same single wallet.
        $this->assertSame($ownerStart, $svc->balanceCents($member->fresh()));
        $this->assertDatabaseCount('credit_wallets', 1);

        // A member's charge draws down the owner's balance.
        $svc->charge($member->fresh(), 400, CreditTransaction::CATEGORY_SMS);
        $this->assertSame($ownerStart - 400, $svc->balanceCents($owner->fresh()));
    }

    public function test_apply_monthly_allowance_grants_plan_credit_once_per_period(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'pro']); // pro included = 1000c
        $svc = $this->service();

        $svc->applyMonthlyAllowance($user);
        $this->assertSame(1000, $svc->balanceCents($user->fresh()));

        // Within the same period it's a no-op.
        $svc->applyMonthlyAllowance($user->fresh());
        $this->assertSame(1000, $svc->balanceCents($user->fresh()));
        $this->assertDatabaseCount('credit_transactions', 1);
    }

    public function test_cost_helpers_round_minutes_up(): void
    {
        $svc = $this->service();

        // Defaults: 2c/segment, 3c/minute.
        $this->assertSame(2, $svc->smsCost(1));
        $this->assertSame(6, $svc->smsCost(3));
        $this->assertSame(3, $svc->voiceCost(1));    // 1s -> 1 min
        $this->assertSame(3, $svc->voiceCost(60));   // 60s -> 1 min
        $this->assertSame(6, $svc->voiceCost(61));   // 61s -> 2 min
        $this->assertSame(0, $svc->voiceCost(0));
    }
}
