<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Phase 1 Team-vs-Solo: the `team` umbrella feature gates collaboration.
 * Billing stays per-user; invited members inherit access when the team owner
 * is on the Team plan.
 */
class TeamPlanGatingTest extends TestCase
{
    use RefreshDatabase;

    private function makeTeam(User $owner): Team
    {
        $team = Team::create(['name' => 'Acme', 'owner_id' => $owner->id]);
        TeamMember::create([
            'team_id' => $team->id, 'user_id' => $owner->id,
            'role' => 'owner', 'is_active' => true, 'accepted_at' => now(),
        ]);
        $owner->update(['team_id' => $team->id]);

        return $team;
    }

    private function addMember(Team $team, User $user, string $role = 'agent'): void
    {
        TeamMember::create([
            'team_id' => $team->id, 'user_id' => $user->id,
            'role' => $role, 'is_active' => true, 'accepted_at' => now(),
        ]);
        $user->update(['team_id' => $team->id]);
    }

    // 1. Solo cannot create a team.
    public function test_solo_user_cannot_create_team(): void
    {
        $solo = User::factory()->create(['subscription_tier' => 'pro']);

        $this->actingAs($solo)->post(route('crm.team.store'), ['name' => 'My Team']);

        $this->assertNotNull(session('error'));
        $this->assertDatabaseCount('teams', 0);
    }

    // 2. Team user can create a team and invite members.
    public function test_team_user_can_create_team_and_invite(): void
    {
        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);

        $this->actingAs($owner)->post(route('crm.team.store'), ['name' => 'My Team'])->assertRedirect();
        $this->assertDatabaseHas('teams', ['name' => 'My Team', 'owner_id' => $owner->id]);

        $team = Team::where('owner_id', $owner->id)->firstOrFail();
        $this->actingAs($owner->fresh())
            ->post(route('crm.team.invitations.store'), ['email' => 'invitee@example.com', 'role' => 'agent'])
            ->assertRedirect();
        $this->assertDatabaseHas('team_invitations', ['team_id' => $team->id, 'email' => 'invitee@example.com']);
    }

    // 3. Solo cannot switch to team context (not entitled).
    public function test_solo_user_cannot_switch_to_team_context(): void
    {
        $owner = User::factory()->create(['subscription_tier' => 'pro']);
        $this->makeTeam($owner); // pro owner — no team entitlement

        $this->actingAs($owner->fresh())->post(route('crm.account.switch'), ['context' => 'team']);

        $this->assertNotNull(session('error'));
        $this->assertSame('personal', $owner->fresh()->active_context);
    }

    // 4. Invited Solo/free member CAN use team features when owner has Team plan.
    public function test_invited_member_inherits_team_features_from_team_plan_owner(): void
    {
        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);
        $team = $this->makeTeam($owner);
        $member = User::factory()->create(['subscription_tier' => 'free']);
        $this->addMember($team, $member);

        $this->assertTrue($member->fresh()->canUseTeamFeatures());

        $this->actingAs($member->fresh())->post(route('crm.account.switch'), ['context' => 'team'])->assertRedirect();
        $this->assertNull(session('error'));
        $this->assertSame('team', $member->fresh()->active_context);
    }

    // 5. Member of a Solo-owned team CANNOT use team features.
    public function test_member_of_solo_owned_team_cannot_use_team_features(): void
    {
        $soloOwner = User::factory()->create(['subscription_tier' => 'pro']);
        $team = $this->makeTeam($soloOwner);
        $member = User::factory()->create(['subscription_tier' => 'free']);
        $this->addMember($team, $member);

        $this->assertFalse($member->fresh()->canUseTeamFeatures());

        $this->actingAs($member->fresh())->post(route('crm.account.switch'), ['context' => 'team']);
        $this->assertNotNull(session('error'));
    }

    // 6. Team reports agent filter is Team-only.
    public function test_reports_agent_filter_is_team_plan_only(): void
    {
        // Entitled: enterprise owner in team context sees the agent list.
        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);
        $team = $this->makeTeam($owner);
        $owner->update(['active_context' => 'team']);
        $this->addMember($team, User::factory()->create());

        $this->actingAs($owner->fresh())->get(route('crm.reports.index'))
            ->assertInertia(fn (Assert $p) => $p->has('agents', 2));

        // Not entitled: pro owner in team context gets no agent filter.
        $solo = User::factory()->create(['subscription_tier' => 'pro']);
        $this->makeTeam($solo);
        $solo->update(['active_context' => 'team']);

        $this->actingAs($solo->fresh())->get(route('crm.reports.index'))
            ->assertInertia(fn (Assert $p) => $p->where('agents', []));
    }

    // 7. Lead assignment to other users is Team-only.
    public function test_lead_assignment_to_other_users_is_team_plan_only(): void
    {
        // Entitled.
        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);
        $assignee = User::factory()->create();
        $contact = Contact::factory()->create(['user_id' => $owner->id, 'team_id' => null]);

        $this->actingAs($owner)->patch(route('crm.contacts.update', $contact), [
            'first_name' => 'A', 'last_name' => 'B',
            'type' => $owner->getLeadTypes()[0] ?? 'buyer', 'source' => 'manual',
            'assigned_user_ids' => [$assignee->id],
        ])->assertRedirect();
        $this->assertSame(1, $contact->assignedUsers()->count());

        // Not entitled — assignment payload is ignored.
        $solo = User::factory()->create(['subscription_tier' => 'pro']);
        $other = User::factory()->create();
        $contact2 = Contact::factory()->create(['user_id' => $solo->id, 'team_id' => null]);

        $this->actingAs($solo)->patch(route('crm.contacts.update', $contact2), [
            'first_name' => 'A', 'last_name' => 'B',
            'type' => $solo->getLeadTypes()[0] ?? 'buyer', 'source' => 'manual',
            'assigned_user_ids' => [$other->id],
        ])->assertRedirect();
        $this->assertSame(0, $contact2->assignedUsers()->count());
    }

    // 8. Team page shows an upgrade state for non-entitled users (no crash).
    public function test_team_page_shows_upgrade_state_for_non_entitled(): void
    {
        $free = User::factory()->create(['subscription_tier' => 'free']);
        $this->actingAs($free)->get(route('crm.team.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Crm/Team/Index')
                ->where('canUseTeamFeatures', false)
                ->where('team', null));

        $teamUser = User::factory()->create(['subscription_tier' => 'enterprise']);
        $this->actingAs($teamUser)->get(route('crm.team.index'))
            ->assertInertia(fn (Assert $p) => $p->where('canUseTeamFeatures', true));
    }

    // 9. Admin bypasses team gates on a free tier.
    public function test_admin_bypasses_team_gates_on_free_tier(): void
    {
        $admin = User::factory()->create(['subscription_tier' => 'free', 'role' => 'superadmin']);

        $this->actingAs($admin)->post(route('crm.team.store'), ['name' => 'Admin Team'])->assertRedirect();
        $this->assertDatabaseHas('teams', ['name' => 'Admin Team']);
        $this->assertNull(session('error'));
    }

    // 10a. Existing pro team users are grandfathered by the migration.
    public function test_existing_pro_team_users_are_grandfathered(): void
    {
        $pro = User::factory()->create(['subscription_tier' => 'pro']);
        $team = Team::create(['name' => 'Legacy', 'owner_id' => $pro->id]);
        $pro->update(['team_id' => $team->id]);

        $this->assertFalse($pro->fresh()->canUseTeamFeatures());

        // Re-run the grandfathering migration against the new data.
        (require database_path('migrations/2026_06_24_000001_add_team_feature_and_grandfather_existing_teams.php'))->up();

        $pro->refresh();
        $this->assertTrue((bool) ($pro->feature_overrides['team'] ?? false));
        $this->assertTrue($pro->canUseTeamFeatures());
    }

    // 10b. Subscription UI receives the team feature row.
    public function test_subscription_ui_exposes_team_feature(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'enterprise']);

        $this->actingAs($user)->get(route('crm.settings.tab', ['tab' => 'subscription']))
            ->assertInertia(fn (Assert $p) => $p
                ->where('featureCatalog.team', 'Team collaboration')
                ->where('auth.features.team', true));
    }
}
