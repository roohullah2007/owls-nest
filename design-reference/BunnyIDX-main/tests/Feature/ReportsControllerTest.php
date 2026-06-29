<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CallLog;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Pipeline $pipeline;

    private PipelineStage $stage;

    protected function setUp(): void
    {
        parent::setUp();
        // Team reports (per-agent filter) are a Team-plan feature, so the team
        // owner used across these tests must be on the Team plan.
        $this->user = User::factory()->create(['subscription_tier' => 'enterprise']);
        $this->pipeline = Pipeline::create([
            'user_id' => $this->user->id,
            'name' => 'Buyer Pipeline',
            'lead_type' => 'buyer',
            'is_default' => true,
            'position' => 0,
        ]);
        $this->stage = PipelineStage::create([
            'pipeline_id' => $this->pipeline->id,
            'name' => 'New Lead',
            'type' => 'open',
            'color' => '#3B82F6',
            'position' => 0,
        ]);
    }

    private function dealAttrs(array $attrs): array
    {
        return array_merge([
            'pipeline_id' => $this->pipeline->id,
            'pipeline_stage_id' => $this->stage->id,
        ], $attrs);
    }

    public function test_index_requires_auth(): void
    {
        $this->get(route('crm.reports.index'))->assertRedirect(route('login'));
    }

    public function test_index_renders_with_summary_metrics(): void
    {
        // 3 leads this period.
        Contact::factory()->count(3)->create([
            'user_id' => $this->user->id,
            'source' => 'website',
        ]);

        // 1 won deal worth 500k with 15k commission, closed today.
        Deal::factory()->create($this->dealAttrs([
            'user_id' => $this->user->id,
            'value' => 500000,
            'commission_amount' => 15000,
            'won_at' => now(),
        ]));
        // 1 lost deal closed today.
        Deal::factory()->create($this->dealAttrs([
            'user_id' => $this->user->id,
            'value' => 200000,
            'lost_at' => now(),
        ]));
        // 1 active deal in pipeline.
        Deal::factory()->create($this->dealAttrs([
            'user_id' => $this->user->id,
            'value' => 300000,
            'won_at' => null,
            'lost_at' => null,
        ]));

        $response = $this->actingAs($this->user)->get(route('crm.reports.index', ['range' => '30d']));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Crm/Reports/Index')
            ->where('report.summary.new_leads', 3)
            ->where('report.summary.deals_won', 1)
            ->where('report.summary.won_volume', 500000)
            ->where('report.summary.gci', 15000)
            ->where('report.summary.deals_lost', 1)
            ->where('report.summary.win_rate', 50)
            ->where('report.summary.active_pipeline_value', 300000)
            ->where('filters.context', 'personal')
            ->has('report.leads.by_source', 1)
            ->where('report.leads.by_source.0.key', 'website')
            ->where('report.leads.by_source.0.value', 3)
        );
    }

    public function test_call_report_metrics(): void
    {
        $make = fn (array $a) => CallLog::create(array_merge([
            'user_id' => $this->user->id,
            'direction' => 'outbound',
            'outcome' => 'connected',
            'phone_number' => '+13055551234',
        ], $a));

        $make(['outcome' => 'connected', 'duration_seconds' => 120]);
        $make(['outcome' => 'connected', 'duration_seconds' => 60]);
        $make(['outcome' => 'no_answer', 'duration_seconds' => 0]);
        $make(['outcome' => 'left_voicemail', 'duration_seconds' => 0]);
        $make(['direction' => 'inbound', 'outcome' => 'connected', 'duration_seconds' => 30]);

        $this->actingAs($this->user)->get(route('crm.reports.index', ['range' => '30d']))
            ->assertInertia(fn ($page) => $page
                ->where('report.calls.summary.total', 5)
                ->where('report.calls.summary.connected', 3)
                ->where('report.calls.summary.connect_rate', 60)
                ->where('report.calls.summary.talk_time_seconds', 210)
                ->where('report.calls.summary.avg_duration_seconds', 70)
                ->where('report.calls.summary.outbound', 4)
                ->where('report.calls.summary.inbound', 1)
                ->where('report.calls.summary.voicemails', 1)
                ->where('report.calls.summary.no_answer', 1)
                ->has('report.calls.by_hour', 24)
            );
    }

    public function test_personal_context_excludes_other_users_data(): void
    {
        Contact::factory()->count(2)->create(['user_id' => $this->user->id]);
        Contact::factory()->count(5)->create(['user_id' => User::factory()->create()->id]);

        $this->actingAs($this->user)->get(route('crm.reports.index'))
            ->assertInertia(fn ($page) => $page->where('report.summary.new_leads', 2));
    }

    public function test_team_context_aggregates_team_and_builds_leaderboard(): void
    {
        $team = Team::create(['name' => 'Skyline Realty', 'owner_id' => $this->user->id]);
        $this->user->update(['team_id' => $team->id, 'active_context' => 'team']);
        TeamMember::create([
            'team_id' => $team->id,
            'user_id' => $this->user->id,
            'role' => 'owner',
            'is_active' => true,
        ]);

        $agent = User::factory()->create(['team_id' => $team->id]);
        TeamMember::create([
            'team_id' => $team->id,
            'user_id' => $agent->id,
            'role' => 'agent',
            'is_active' => true,
        ]);

        // Owner: 1 lead. Agent: 2 leads + a won deal.
        Contact::factory()->create(['user_id' => $this->user->id, 'team_id' => $team->id]);
        Contact::factory()->count(2)->create(['user_id' => $agent->id, 'team_id' => $team->id]);
        Deal::factory()->create($this->dealAttrs([
            'user_id' => $agent->id,
            'team_id' => $team->id,
            'value' => 750000,
            'won_at' => now(),
        ]));

        // Agent logs 2 calls (1 connected, 90s talk time).
        CallLog::create(['user_id' => $agent->id, 'team_id' => $team->id, 'direction' => 'outbound', 'outcome' => 'connected', 'duration_seconds' => 90]);
        CallLog::create(['user_id' => $agent->id, 'team_id' => $team->id, 'direction' => 'outbound', 'outcome' => 'no_answer', 'duration_seconds' => 0]);

        $response = $this->actingAs($this->user)->get(route('crm.reports.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('filters.context', 'team')
            ->where('report.summary.new_leads', 3)
            ->where('report.summary.won_volume', 750000)
            ->has('report.leaderboard', 2)
            // Agent leads with the most volume.
            ->where('report.leaderboard.0.id', $agent->id)
            ->where('report.leaderboard.0.volume', 750000)
            ->where('report.leaderboard.0.leads', 2)
            ->where('report.leaderboard.0.calls', 2)
            ->where('report.leaderboard.0.talk_time_seconds', 90)
            ->where('report.leaderboard.0.connect_rate', 50)
            // Calls-by-agent rollup is present for the team.
            ->where('report.calls.by_agent.0.id', $agent->id)
            ->where('report.calls.by_agent.0.calls', 2)
            ->has('agents', 2)
        );
    }

    public function test_agent_filter_narrows_to_single_user(): void
    {
        $team = Team::create(['name' => 'Skyline', 'owner_id' => $this->user->id]);
        $this->user->update(['team_id' => $team->id, 'active_context' => 'team']);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $this->user->id, 'role' => 'owner', 'is_active' => true]);

        $agent = User::factory()->create(['team_id' => $team->id]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $agent->id, 'role' => 'agent', 'is_active' => true]);

        Contact::factory()->count(4)->create(['user_id' => $this->user->id, 'team_id' => $team->id]);
        Contact::factory()->count(2)->create(['user_id' => $agent->id, 'team_id' => $team->id]);

        $this->actingAs($this->user)
            ->get(route('crm.reports.index', ['agent' => $agent->id]))
            ->assertInertia(fn ($page) => $page
                ->where('filters.agent', $agent->id)
                ->where('report.summary.new_leads', 2)
            );
    }
}
