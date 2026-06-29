<?php

declare(strict_types=1);

namespace App\Services\PropertyAlerts;

use App\Models\AgentWebsite;
use App\Models\EmailSendLog;
use App\Models\EmailSuppression;
use App\Models\PropertyAlertLog;
use App\Models\SiteVisitor;
use App\Models\User;
use App\Services\Email\BrandedEmailResolver;
use App\Services\Email\EmailCategory;
use App\Services\Email\EmailTemplateRenderer;
use App\Services\Email\ResendClient;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

/**
 * Sends a single property-alert email through the existing Resend stack and
 * enforces every gate: paid-plan only, visitor opt-out, global suppression,
 * dedup, idempotency. Quota is incremented ONLY on a successful send. Billing
 * values are never referenced here — see config('property_alerts').
 *
 * Returns true when the email was sent and counted.
 */
class PropertyAlertSender
{
    public function __construct(
        private readonly BrandedEmailResolver $resolver,
        private readonly EmailTemplateRenderer $renderer,
        private readonly ResendClient $client,
        private readonly PropertyAlertQuota $quota,
    ) {}

    /**
     * @param  array<string,string|null>  $vars  Template-specific merge values
     *                                           (address/price/status/etc.).
     */
    public function send(
        SiteVisitor $visitor,
        User $account,
        AgentWebsite $site,
        string $alertType,
        string $templateType,
        array $vars,
        ?string $mlsSlug,
        ?string $listingId,
        ?int $savedSearchId,
        string $idempotencyKey,
    ): bool {
        // Paid-plan restriction: free plans never send automated alerts. The
        // caller (service) skips free accounts up front; this is the hard guard.
        if (! $account->isPro()) {
            return false;
        }
        if (empty($visitor->email)) {
            return false;
        }
        if ($visitor->alertsUnsubscribed()) {
            return false;
        }
        if (EmailSuppression::isSuppressed($visitor->email)) {
            return false;
        }
        if ($this->quota->isOverHardLimit($account)) {
            return false;
        }
        if ($this->isDuplicateInWindow($visitor->id, $listingId, $alertType)) {
            return false;
        }
        // Deterministic idempotency: the email_send_logs unique index is the
        // race-safe guard, but short-circuit cheaply first.
        if (PropertyAlertLog::where('idempotency_key', $idempotencyKey)->exists()) {
            return false;
        }

        // Platform-keyed alerts use the account's sending alias; branded
        // (per-user key) sends keep the user's own from (resolved internally).
        $resolved = $this->resolver->for($account);

        $vars = array_merge([
            'lead_name' => $visitor->name ?: 'there',
            'name' => $visitor->name ?: 'there',
            'agent_name' => $account->name,
            'unsubscribe_url' => $this->unsubscribeUrl($visitor),
        ], $vars);

        $rendered = $this->renderer->render($templateType, $vars, $account);

        // Reserve the idempotency keys + leave an audit trace even on failure.
        try {
            $emailLog = EmailSendLog::create([
                'user_id' => $account->id,
                'team_id' => $account->team_id,
                'provider' => 'resend',
                'template_type' => $templateType,
                'recipient' => $visitor->email,
                'sender' => $resolved['from_email'],
                'subject' => $rendered['subject'],
                'status' => EmailSendLog::STATUS_QUEUED,
                'branded' => $resolved['branded'],
                'quota_category' => 'property_alert',
                'counts_toward_quota' => EmailCategory::countsTowardQuota(EmailCategory::fromTemplateType($templateType)),
                'idempotency_key' => $idempotencyKey,
                'meta' => [
                    'alert_type' => $alertType,
                    'mls_slug' => $mlsSlug,
                    'listing_id' => $listingId,
                    'site_visitor_id' => $visitor->id,
                ],
            ]);

            $alertLog = PropertyAlertLog::create([
                'user_id' => $account->id,
                'site_visitor_id' => $visitor->id,
                'contact_id' => $visitor->contact_id,
                'site_visitor_saved_search_id' => $savedSearchId,
                'email_send_log_id' => $emailLog->id,
                'alert_type' => $alertType,
                'mls_slug' => $mlsSlug,
                'listing_id' => $listingId,
                'idempotency_key' => $idempotencyKey,
                'status' => PropertyAlertLog::STATUS_QUEUED,
            ]);
        } catch (QueryException) {
            // Unique violation → another worker already claimed this send.
            return false;
        }

        try {
            $messageId = $this->client->send(
                $resolved['key'],
                $resolved['from_email'],
                $resolved['from_name'],
                $visitor->email,
                $rendered['subject'],
                $rendered['html'],
            );

            $emailLog->update([
                'status' => EmailSendLog::STATUS_SENT,
                'provider_message_id' => $messageId,
                'sent_at' => now(),
            ]);
            $alertLog->update([
                'status' => PropertyAlertLog::STATUS_SENT,
                'sent_at' => now(),
            ]);

            // Count ONLY a successful property-alert send (config-driven types).
            if (in_array($alertType, config('property_alerts.quota_alert_types', []), true)) {
                $this->quota->increment($account, 1);
            }

            return true;
        } catch (\Throwable $e) {
            $emailLog->update([
                'status' => EmailSendLog::STATUS_FAILED,
                'error_message' => Str::limit($e->getMessage(), 480),
            ]);
            $alertLog->update(['status' => PropertyAlertLog::STATUS_FAILED]);

            // Failed sends are NOT counted against quota. Swallow so a retry
            // can't bypass the idempotency row and double-send.
            return false;
        }
    }

    /** Same visitor + listing + alert type already sent inside the dedup window. */
    private function isDuplicateInWindow(int $visitorId, ?string $listingId, string $alertType): bool
    {
        if ($listingId === null) {
            return false;
        }
        $hours = (int) config('property_alerts.dedup_window_hours', 72);

        return PropertyAlertLog::where('site_visitor_id', $visitorId)
            ->where('listing_id', $listingId)
            ->where('alert_type', $alertType)
            ->where('status', PropertyAlertLog::STATUS_SENT)
            ->where('created_at', '>=', now()->subHours($hours))
            ->exists();
    }

    private function unsubscribeUrl(SiteVisitor $visitor): string
    {
        $token = $visitor->ensureUnsubscribeToken();

        if (Route::has('property-alerts.unsubscribe')) {
            return route('property-alerts.unsubscribe', $token, true);
        }

        return url('/alerts/unsubscribe/'.$token);
    }
}
