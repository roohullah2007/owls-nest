<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\SendTeamInvitationEmail;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * The onboarding wizard's Team step now provisions a real team and sends member
 * invitations (for rows with an email) — but only for entitled (Team-plan)
 * self-serve users. Solo users still get a personal site with no team.
 */
class OnboardingTeamInviteTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'template' => 'luxury',
            'agent_name' => 'Jane Agent',
            'agent_country' => 'US',
            'agent_city' => 'Miami',
            'brokerage_name' => 'Skyline Realty',
            'site_type' => 'team',
            'blogging' => false,
            'featured' => 'none',
        ], $overrides);
    }

    public function test_team_plan_user_provisions_team_and_invites_members_with_emails(): void
    {
        Queue::fake();
        $user = User::factory()->create(['subscription_tier' => 'enterprise']);

        $this->actingAs($user)->post(route('crm.onboarding'), $this->payload([
            'team_members' => [
                ['first_name' => 'Jane', 'last_name' => 'Doe', 'role' => 'Listing Agent', 'email' => 'jane@example.com'],
                ['first_name' => 'Bob', 'last_name' => 'Lee', 'role' => 'Buyer Agent', 'email' => 'bob@example.com'],
                ['first_name' => 'NoEmail', 'last_name' => 'Person', 'role' => 'Coordinator', 'email' => ''],
            ],
        ]))->assertRedirect();

        // Team was provisioned for the owner.
        $team = Team::where('owner_id', $user->id)->first();
        $this->assertNotNull($team);
        $this->assertSame($team->id, $user->fresh()->team_id);

        // Only the two rows with an email became invitations.
        $this->assertDatabaseCount('team_invitations', 2);
        $this->assertDatabaseHas('team_invitations', ['team_id' => $team->id, 'email' => 'jane@example.com', 'role' => 'agent']);
        $this->assertDatabaseHas('team_invitations', ['team_id' => $team->id, 'email' => 'bob@example.com', 'role' => 'agent']);
        Queue::assertPushed(SendTeamInvitationEmail::class, 2);

        // The website is a team site.
        $this->assertDatabaseHas('agent_websites', ['team_id' => $team->id]);
    }

    public function test_solo_user_gets_personal_site_and_no_team(): void
    {
        Queue::fake();
        $user = User::factory()->create(['subscription_tier' => 'pro']); // websites yes, team no

        $this->actingAs($user)->post(route('crm.onboarding'), $this->payload([
            'team_members' => [
                ['first_name' => 'Jane', 'last_name' => 'Doe', 'role' => 'Agent', 'email' => 'jane@example.com'],
            ],
        ]))->assertRedirect();

        $this->assertDatabaseCount('teams', 0);
        $this->assertDatabaseCount('team_invitations', 0);
        Queue::assertNothingPushed();
        // Personal site owned by the user.
        $this->assertDatabaseHas('agent_websites', ['user_id' => $user->id, 'team_id' => null]);
    }

    public function test_seat_cap_limits_onboarding_invites(): void
    {
        Queue::fake();
        $user = User::factory()->create(['subscription_tier' => 'enterprise']); // 5 included seats

        // Owner takes 1 seat; 5 invites with emails → only 4 fit (seats 2-5).
        $members = [];
        for ($i = 1; $i <= 5; $i++) {
            $members[] = ['first_name' => "A{$i}", 'last_name' => 'B', 'role' => 'Agent', 'email' => "inv{$i}@example.com"];
        }

        $this->actingAs($user)->post(route('crm.onboarding'), $this->payload(['team_members' => $members]))
            ->assertRedirect();

        $this->assertDatabaseCount('team_invitations', 4);
    }
}
