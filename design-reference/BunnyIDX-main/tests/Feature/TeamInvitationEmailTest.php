<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\SendTeamInvitationEmail;
use App\Models\EmailSendLog;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TeamInvitationEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.resend.key' => 're_platform_key',
            'mail.sender_alias.domain' => 'm.agentsbunny.com',
            'mail.sender_alias.default' => 'updates@m.agentsbunny.com',
            'mail.sender_alias.default_name' => 'Agents Bunny Updates',
            'mail.sender_alias.domain_verified' => true,
        ]);
        Http::fake(['api.resend.com/*' => Http::response(['id' => 're_invite_123'], 200)]);
    }

    /** Enterprise owner in team context. */
    private function owner(): User
    {
        $owner = User::factory()->create(['subscription_tier' => 'enterprise']);
        $team = Team::create(['name' => 'Skyline Realty', 'owner_id' => $owner->id]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner', 'is_active' => true, 'accepted_at' => now()]);
        $owner->update(['team_id' => $team->id, 'active_context' => 'team']);

        return $owner->fresh();
    }

    // 0. Email dedup is case-insensitive and stored normalized (lowercased).
    public function test_invitation_email_is_normalized_and_dedup_is_case_insensitive(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)
            ->post(route('crm.team.invitations.store'), ['email' => 'New@Example.com', 'role' => 'agent'])
            ->assertRedirect();

        // Stored lowercased.
        $this->assertDatabaseHas('team_invitations', ['team_id' => $owner->team_id, 'email' => 'new@example.com']);

        // A differently-cased re-invite is treated as a duplicate.
        $this->actingAs($owner->fresh())
            ->post(route('crm.team.invitations.store'), ['email' => 'NEW@EXAMPLE.COM', 'role' => 'agent']);

        $this->assertNotNull(session('error'));
        $this->assertSame(1, TeamInvitation::where('team_id', $owner->team_id)->count());
    }

    // 1. Owner can create an invitation and the email is sent + logged.
    public function test_owner_can_invite_and_email_is_sent_and_logged(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)
            ->post(route('crm.team.invitations.store'), ['email' => 'new@example.com', 'role' => 'agent'])
            ->assertRedirect();

        $this->assertDatabaseHas('team_invitations', ['team_id' => $owner->team_id, 'email' => 'new@example.com']);
        $this->assertDatabaseHas('email_send_logs', [
            'template_type' => 'team_invitation',
            'recipient' => 'new@example.com',
            'sender' => 'updates@m.agentsbunny.com',
            'provider' => 'resend',
            'status' => EmailSendLog::STATUS_SENT,
        ]);
        Http::assertSentCount(1);
    }

    // 2. Email contains the accept link (token), team name, role, inviter name.
    public function test_invitation_email_contains_link_team_role_and_inviter(): void
    {
        $owner = $this->owner();
        $owner->update(['name' => 'Dana Broker']);

        $this->actingAs($owner->fresh())
            ->post(route('crm.team.invitations.store'), ['email' => 'invitee@example.com', 'role' => 'agent']);

        $invitation = TeamInvitation::where('email', 'invitee@example.com')->firstOrFail();

        Http::assertSent(function ($request) use ($invitation) {
            $html = $request['html'] ?? '';
            $from = $request['from'] ?? '';

            return $request->url() === 'https://api.resend.com/emails'
                && str_contains($from, 'updates@m.agentsbunny.com')
                && str_contains($html, $invitation->token)               // accept link
                && str_contains($html, 'Skyline Realty')                 // team name
                && str_contains($html, 'Agent')                          // role label
                && str_contains($html, 'Dana Broker');                   // inviter name
        });
    }

    // 3. The email log is created with counts_toward_quota = false.
    public function test_invitation_email_log_does_not_count_toward_quota(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)
            ->post(route('crm.team.invitations.store'), ['email' => 'quota@example.com', 'role' => 'agent']);

        $log = EmailSendLog::where('recipient', 'quota@example.com')->firstOrFail();
        $this->assertSame('team_invitation', $log->quota_category);
        $this->assertFalse($log->counts_toward_quota);
    }

    // 4. A retried job with the same idempotency key does not double-send.
    public function test_retry_does_not_send_duplicate_email(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)
            ->post(route('crm.team.invitations.store'), ['email' => 'once@example.com', 'role' => 'agent']);

        $invitation = TeamInvitation::where('email', 'once@example.com')->firstOrFail();

        // Re-dispatch the same initial-send job (simulating a queue retry).
        SendTeamInvitationEmail::dispatchSync($invitation->id, "team_invitation:{$invitation->id}");

        $this->assertSame(1, EmailSendLog::where('recipient', 'once@example.com')->count());
        Http::assertSentCount(1);
    }

    // 5. Resend works for a pending invitation (fresh idempotency key).
    public function test_resend_sends_a_fresh_email_for_pending_invite(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)
            ->post(route('crm.team.invitations.store'), ['email' => 'resend@example.com', 'role' => 'agent']);

        $invitation = TeamInvitation::where('email', 'resend@example.com')->firstOrFail();

        $this->actingAs($owner->fresh())
            ->post(route('crm.team.invitations.resend', $invitation))
            ->assertRedirect();

        $this->assertSame(2, EmailSendLog::where('recipient', 'resend@example.com')->count());
        Http::assertSentCount(2);
        $this->assertDatabaseHas('email_send_logs', [
            'idempotency_key' => "team_invitation:{$invitation->id}:resend:1",
            'status' => EmailSendLog::STATUS_SENT,
        ]);
    }

    // 6. An accepted invitation cannot be resent.
    public function test_accepted_invitation_cannot_be_resent(): void
    {
        $owner = $this->owner();
        $invitation = TeamInvitation::create([
            'team_id' => $owner->team_id, 'email' => 'accepted@example.com',
            'role' => 'agent', 'invited_by' => $owner->id, 'accepted_at' => now(),
        ]);

        $this->actingAs($owner)->post(route('crm.team.invitations.resend', $invitation));

        $this->assertNotNull(session('error'));
        $this->assertSame(0, EmailSendLog::where('recipient', 'accepted@example.com')->count());
        Http::assertSentCount(0);
    }

    // 7. A cancelled/deleted invitation cannot be resent (404).
    public function test_deleted_invitation_cannot_be_resent(): void
    {
        $owner = $this->owner();
        $invitation = TeamInvitation::create([
            'team_id' => $owner->team_id, 'email' => 'gone@example.com',
            'role' => 'agent', 'invited_by' => $owner->id,
        ]);
        $id = $invitation->id;
        $invitation->delete();

        $this->actingAs($owner)
            ->post(route('crm.team.invitations.resend', $id))
            ->assertNotFound();
    }

    // 8. A non-admin team member cannot invite.
    public function test_non_admin_member_cannot_invite(): void
    {
        $owner = $this->owner();
        $agent = User::factory()->create(['subscription_tier' => 'free']);
        TeamMember::create(['team_id' => $owner->team_id, 'user_id' => $agent->id, 'role' => 'agent', 'is_active' => true, 'accepted_at' => now()]);
        $agent->update(['team_id' => $owner->team_id, 'active_context' => 'team']);

        $this->actingAs($agent->fresh())
            ->post(route('crm.team.invitations.store'), ['email' => 'x@example.com', 'role' => 'agent'])
            ->assertForbidden();

        Http::assertNothingSent();
    }

    // 9. A Solo user without team entitlement cannot invite (team.plan gate).
    public function test_solo_user_without_team_cannot_invite(): void
    {
        $solo = User::factory()->create(['subscription_tier' => 'pro']);

        $this->actingAs($solo)
            ->post(route('crm.team.invitations.store'), ['email' => 'y@example.com', 'role' => 'agent']);

        $this->assertNotNull(session('error'));
        $this->assertDatabaseCount('team_invitations', 0);
        Http::assertNothingSent();
    }

    // 10. The invited member can still accept via the existing token flow.
    public function test_invited_member_can_accept_via_existing_flow(): void
    {
        $owner = $this->owner();
        $invitation = TeamInvitation::create([
            'team_id' => $owner->team_id, 'email' => 'joiner@example.com',
            'role' => 'agent', 'invited_by' => $owner->id,
        ]);

        $joiner = User::factory()->create(['email' => 'joiner@example.com']);

        $this->actingAs($joiner)
            ->get(route('team.invite.accept', ['token' => $invitation->token]))
            ->assertRedirect(route('crm.team.index'));

        $this->assertDatabaseHas('team_members', ['team_id' => $owner->team_id, 'user_id' => $joiner->id, 'role' => 'agent']);
        $this->assertSame($owner->team_id, $joiner->fresh()->team_id);
        $this->assertNotNull($invitation->fresh()->accepted_at);
    }

    // 11. A Resend failure keeps the invitation row and logs the failure.
    public function test_resend_provider_failure_keeps_row_and_logs_failure(): void
    {
        // Force a send failure (no platform key) — exercises the same catch →
        // log-failed path as a provider error, without leaking key/token.
        config(['services.resend.key' => null]);

        $owner = $this->owner();

        $this->actingAs($owner)
            ->post(route('crm.team.invitations.store'), ['email' => 'fail@example.com', 'role' => 'agent']);

        // Invitation row survives a send failure.
        $this->assertDatabaseHas('team_invitations', ['email' => 'fail@example.com']);

        $log = EmailSendLog::where('recipient', 'fail@example.com')->firstOrFail();
        $this->assertSame(EmailSendLog::STATUS_FAILED, $log->status);
        $this->assertNotEmpty($log->error_message);
        // Never leak the API key or the invite token in the error.
        $this->assertStringNotContainsString('re_platform_key', (string) $log->error_message);
        $invitation = TeamInvitation::where('email', 'fail@example.com')->firstOrFail();
        $this->assertStringNotContainsString($invitation->token, (string) $log->error_message);
    }
}
