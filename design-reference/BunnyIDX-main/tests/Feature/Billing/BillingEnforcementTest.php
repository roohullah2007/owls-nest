<?php

declare(strict_types=1);

namespace Tests\Feature\Billing;

use App\Models\Contact;
use App\Models\CreditTransaction;
use App\Models\PhoneNumber;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\Billing\CreditService;
use App\Services\Telnyx\SmsSender;
use App\Services\Telnyx\TelnyxService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BillingEnforcementTest extends TestCase
{
    use RefreshDatabase;

    private function activeNumber(User $user): PhoneNumber
    {
        return PhoneNumber::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'phone_number' => '+15550001111',
            'friendly_name' => 'Test',
            'capabilities' => ['sms', 'voice'],
            'status' => 'active',
            'is_default' => true,
            'provisioned_at' => now(),
        ]);
    }

    public function test_sms_is_skipped_when_wallet_cannot_cover_a_segment(): void
    {
        // Free plan includes 0 credits, so the wallet stays empty.
        $user = User::factory()->create(['subscription_tier' => 'free']);
        $this->activeNumber($user);
        // International (non-NANP) number side-steps the 10DLC gate.
        $contact = Contact::factory()->create(['user_id' => $user->id, 'phone' => '+447911123456']);

        $result = app(SmsSender::class)->send($user, $contact, 'hello');

        $this->assertSame('skipped', $result['status']);
        $this->assertSame('insufficient_credits', $result['reason']);
        $this->assertDatabaseCount('sms_messages', 0);
    }

    public function test_sms_send_debits_the_wallet(): void
    {
        // Free plan = 0 included credits, so the granted 100c is the whole balance.
        $user = User::factory()->create(['subscription_tier' => 'free']);
        $this->activeNumber($user);
        $contact = Contact::factory()->create(['user_id' => $user->id, 'phone' => '+447911123456']);

        app(CreditService::class)->grant($user, 100, CreditTransaction::CATEGORY_PURCHASE);

        $this->mock(TelnyxService::class, function ($m) {
            $m->shouldReceive('sendSms')->once()->andReturn(['id' => 'msg_1', 'parts' => 1]);
        });

        $result = app(SmsSender::class)->send($user->fresh(), $contact, 'hello');

        $this->assertSame('sent', $result['status']);
        // 1 segment * 2c default = 2c.
        $this->assertSame(98, app(CreditService::class)->balanceCents($user->fresh()));
        $this->assertDatabaseHas('credit_transactions', [
            'category' => CreditTransaction::CATEGORY_SMS,
            'amount_cents' => 2,
        ]);
    }

    public function test_phone_number_purchase_is_blocked_at_plan_limit(): void
    {
        // Pro includes 1 number; the user already has one active.
        $user = User::factory()->create(['subscription_tier' => 'pro']);
        $this->activeNumber($user);

        $this->actingAs($user)
            ->postJson(route('crm.phone-numbers.purchase'), ['phone_number' => '+15559998888'])
            ->assertStatus(422);

        $this->assertDatabaseCount('phone_numbers', 1);
    }

    public function test_website_limit_prop_reflects_the_plan(): void
    {
        $pro = User::factory()->create(['subscription_tier' => 'pro']);
        $this->actingAs($pro)->get(route('crm.websites.index'))
            ->assertInertia(fn (Assert $p) => $p->where('websiteLimit', 1));

        $team = User::factory()->create(['subscription_tier' => 'enterprise']);
        $this->actingAs($team)->get(route('crm.websites.index'))
            ->assertInertia(fn (Assert $p) => $p->where('websiteLimit', null));
    }

    public function test_team_invitations_are_blocked_beyond_the_seat_limit(): void
    {
        // Enterprise includes 5 seats; owner occupies 1.
        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);
        $team = Team::create(['name' => 'Acme', 'owner_id' => $owner->id]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner', 'is_active' => true, 'accepted_at' => now()]);
        $owner->update(['team_id' => $team->id]);

        // 4 invites fill seats 2-5.
        for ($i = 1; $i <= 4; $i++) {
            $this->actingAs($owner->fresh())
                ->post(route('crm.team.invitations.store'), ['email' => "inv{$i}@example.com", 'role' => 'agent'])
                ->assertRedirect();
        }
        $this->assertDatabaseCount('team_invitations', 4);

        // The 6th seat is over the limit.
        $this->actingAs($owner->fresh())
            ->post(route('crm.team.invitations.store'), ['email' => 'inv5@example.com', 'role' => 'agent']);

        $this->assertNotNull(session('error'));
        $this->assertDatabaseCount('team_invitations', 4);
    }
}
