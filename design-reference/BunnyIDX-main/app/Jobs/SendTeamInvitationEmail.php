<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\EmailSendLog;
use App\Models\TeamInvitation;
use App\Services\Email\BrandedEmailResolver;
use App\Services\Email\EmailCategory;
use App\Services\Email\EmailTemplateRenderer;
use App\Services\Email\ResendClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * Emails a team invitation to the invited address through Resend, using the
 * platform sender (updates@m.agentsbunny.com) — never the inviter's connected
 * Gmail/Outlook inbox. An idempotency key keeps a re-dispatched job from
 * double-sending, and every attempt is recorded in email_send_logs.
 *
 * Transactional: not counted against any property-alert quota. The invitation
 * token travels only inside the rendered email (the accept link) — it is never
 * written to logs.
 */
class SendTeamInvitationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $invitationId,
        public string $idempotencyKey,
    ) {}

    public function handle(
        BrandedEmailResolver $resolver,
        EmailTemplateRenderer $renderer,
        ResendClient $client,
    ): void {
        // Idempotency: bail if this exact send was already logged. The unique
        // index on idempotency_key is the race-safe guard.
        if (EmailSendLog::where('idempotency_key', $this->idempotencyKey)->exists()) {
            return;
        }

        $invitation = TeamInvitation::with(['team', 'inviter'])->find($this->invitationId);

        // Nothing to send if the invite was withdrawn or already accepted.
        if (! $invitation || $invitation->isAccepted()) {
            return;
        }

        // Platform sender only (pass null so the branded/per-user key path is
        // never used): updates@m.agentsbunny.com / "Agents Bunny Updates".
        $resolved = $resolver->for(null);

        $inviterName = $invitation->inviter?->name ?: 'A teammate';
        $teamName = $invitation->team?->name ?: 'a team';
        $acceptUrl = route('team.invite.accept', ['token' => $invitation->token]);

        $rendered = $renderer->render('team_invitation', [
            'inviter_name' => $inviterName,
            'team_name' => $teamName,
            'role' => Str::headline((string) $invitation->role),
            'accept_url' => $acceptUrl,
            'expires_at' => optional($invitation->expires_at)->format('M j, Y') ?? '',
        ]);

        // Record the attempt first so a failure still leaves a trace and the
        // idempotency key is reserved. NOTE: no token is stored here.
        try {
            $log = EmailSendLog::create([
                'user_id' => $invitation->invited_by,
                'team_id' => $invitation->team_id,
                'provider' => 'resend',
                'template_type' => 'team_invitation',
                'recipient' => $invitation->email,
                'sender' => $resolved['from_email'],
                'subject' => $rendered['subject'],
                'status' => EmailSendLog::STATUS_QUEUED,
                'branded' => $resolved['branded'],
                'quota_category' => EmailCategory::TEAM_INVITATION,
                'counts_toward_quota' => EmailCategory::countsTowardQuota(EmailCategory::TEAM_INVITATION),
                'idempotency_key' => $this->idempotencyKey,
                'meta' => ['invitation_id' => $invitation->id, 'team_id' => $invitation->team_id],
            ]);
        } catch (QueryException $e) {
            // Unique violation → another worker already claimed this send.
            return;
        }

        try {
            $messageId = $client->send(
                $resolved['key'],
                $resolved['from_email'],
                $resolved['from_name'],
                $invitation->email,
                $rendered['subject'],
                $rendered['html'],
            );

            $log->update([
                'status' => EmailSendLog::STATUS_SENT,
                'provider_message_id' => $messageId,
                'sent_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Provider error text only — never the API key or token.
            $log->update([
                'status' => EmailSendLog::STATUS_FAILED,
                'error_message' => Str::limit($e->getMessage(), 480),
            ]);
            // Swallow: the failure is logged. We deliberately do not rethrow so a
            // retry can't bypass the idempotency row and double-send.
        }
    }
}
