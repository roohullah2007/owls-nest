<?php

declare(strict_types=1);

namespace App\Models;

use App\Notifications\Auth\ResetPasswordNotification;
use App\Notifications\Auth\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'phone', 'company', 'avatar', 'role', 'subscription_tier', 'is_lifetime', 'subscription_expires_at', 'trial_plan', 'trial_ends_at', 'trial_used', 'feature_overrides', 'google_id', 'settings', 'notification_preferences', 'stripe_customer_id', 'stripe_subscription_id', 'idx_agent_id', 'idx_office_id', 'idx_auto_import', 'team_id', 'active_context', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'resend_from_email', 'resend_from_name', 'sender_alias_display_name'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes', 'resend_api_key', 'resend_last_four'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const DEFAULT_LEAD_TYPES = ['buyer', 'seller'];

    public const DEFAULT_CONTACT_STATUSES = ['new_lead', 'active', 'client', 'past_client', 'inactive'];

    public const DEFAULT_LISTING_TYPES = ['residential', 'commercial', 'land', 'rental'];

    public const DEFAULT_LISTING_STATUSES = ['active', 'pending', 'sold', 'expired', 'withdrawn', 'coming_soon'];

    public const DEFAULT_DEAL_TYPES = ['buy', 'sell', 'lease', 'referral', 'other'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'settings' => 'array',
            'notification_preferences' => 'array',
            'idx_auto_import' => 'boolean',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'failed_login_attempts' => 'integer',
            'failed_two_factor_attempts' => 'integer',
            'locked_until' => 'datetime',
            'is_lifetime' => 'boolean',
            'subscription_expires_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'trial_used' => 'boolean',
            'feature_overrides' => 'array',
            // Branded-email Resend key is encrypted at rest (same convention as
            // MLS/2FA secrets). last_four is stored in clear only for display.
            'resend_api_key' => 'encrypted',
            'resend_last_tested_at' => 'datetime',
        ];
    }

    /** Has the user configured their own (branded) Resend API key? */
    public function hasBrandedResendKey(): bool
    {
        return ! empty($this->resend_api_key);
    }

    /**
     * Use the branded, HTML-templated verification email (sent via the platform
     * `resend` mailer). Keeping it on the notify() path preserves Laravel's
     * notification testing conventions.
     */
    public function sendEmailVerificationNotification(): void
    {
        // Email verification is only enforced in production. Locally / on
        // staging the mail transport is frequently unconfigured (e.g. an
        // invalid Resend API key), and a transport failure must never break
        // sign-up — so outside production we auto-verify instead of sending.
        // ('testing' keeps the real notify path so the email-flow tests, which
        // fake Mail/Notification, still assert the notification is sent.)
        if (! app()->environment(['production', 'testing'])) {
            if (! $this->hasVerifiedEmail()) {
                $this->markEmailAsVerified();
            }

            return;
        }

        // Even in production, a provider outage shouldn't 500 the registration
        // request — log and move on; the user can re-request verification.
        try {
            $this->notify(new VerifyEmailNotification);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Verification email failed to send', [
                'user_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function hasTwoFactorEnabled(): bool
    {
        return ! is_null($this->two_factor_secret) && ! is_null($this->two_factor_confirmed_at);
    }

    /* ===================== Sign-in lockout ===================== */

    /** Failed attempts (password OR 2FA) before the account is temporarily locked. */
    public const MAX_AUTH_ATTEMPTS = 3;

    /** How long the account stays locked once the limit is hit. */
    public const LOCK_MINUTES = 15;

    /** Is the account currently within an active lockout window? */
    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    /** Seconds left on the current lock (0 when not locked). */
    public function lockSecondsRemaining(): int
    {
        return $this->isLocked() ? (int) ceil(now()->diffInSeconds($this->locked_until, true)) : 0;
    }

    /** Record a failed password attempt; lock the account on the Nth failure. */
    public function registerFailedLogin(): void
    {
        $this->bumpFailures('failed_login_attempts');
    }

    /** Record a failed 2FA-code attempt; lock the account on the Nth failure. */
    public function registerFailedTwoFactor(): void
    {
        $this->bumpFailures('failed_two_factor_attempts');
    }

    private function bumpFailures(string $column): void
    {
        $attempts = (int) $this->{$column} + 1;

        if ($attempts >= self::MAX_AUTH_ATTEMPTS) {
            $this->forceFill([
                $column => 0,
                'locked_until' => now()->addMinutes(self::LOCK_MINUTES),
            ])->save();

            return;
        }

        $this->forceFill([$column => $attempts])->save();
    }

    /** Clear all failure counters + any lock (called after a successful sign-in). */
    public function clearAuthLock(): void
    {
        if ($this->failed_login_attempts || $this->failed_two_factor_attempts || $this->locked_until) {
            $this->forceFill([
                'failed_login_attempts' => 0,
                'failed_two_factor_attempts' => 0,
                'locked_until' => null,
            ])->save();
        }
    }

    public function getLeadTypes(): array
    {
        $custom = $this->settings['lead_types'] ?? [];

        return array_unique(array_merge(self::DEFAULT_LEAD_TYPES, $custom));
    }

    public function getContactStatuses(): array
    {
        $custom = $this->settings['contact_statuses'] ?? [];

        return array_unique(array_merge(self::DEFAULT_CONTACT_STATUSES, $custom));
    }

    public function getListingTypes(): array
    {
        $custom = $this->settings['listing_types'] ?? [];

        return array_unique(array_merge(self::DEFAULT_LISTING_TYPES, $custom));
    }

    public function getListingStatuses(): array
    {
        $custom = $this->settings['listing_statuses'] ?? [];

        return array_unique(array_merge(self::DEFAULT_LISTING_STATUSES, $custom));
    }

    public function getDealTypes(): array
    {
        $custom = $this->settings['deal_types'] ?? [];

        return array_values(array_unique(array_merge(self::DEFAULT_DEAL_TYPES, $custom)));
    }

    public function getListingCustomFields(): array
    {
        return $this->settings['custom_fields_listings'] ?? [];
    }

    public function getCustomFields(): array
    {
        return $this->settings['custom_fields'] ?? [];
    }

    public function getCustomFieldsFor(string $entity): array
    {
        return $this->settings["custom_fields_{$entity}"] ?? $this->getCustomFields();
    }

    public function getDefaultPipeline(?string $leadType = null): ?Pipeline
    {
        $query = Pipeline::forUser($this);

        if ($leadType) {
            return (clone $query)->where('lead_type', $leadType)->first()
                ?? (clone $query)->where('is_default', true)->first()
                ?? $query->first();
        }

        return (clone $query)->where('is_default', true)->first()
            ?? $query->first();
    }

    // Relationships

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function ownedTeam(): HasMany
    {
        return $this->hasMany(Team::class, 'owner_id');
    }

    public function teamMembers(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function actionPlans(): HasMany
    {
        return $this->hasMany(ActionPlan::class);
    }

    public function companies(): HasMany
    {
        return $this->hasMany(Company::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class);
    }

    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }

    public function pipelines(): HasMany
    {
        return $this->hasMany(Pipeline::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function callLogs(): HasMany
    {
        return $this->hasMany(CallLog::class);
    }

    public function emailLogs(): HasMany
    {
        return $this->hasMany(EmailLog::class);
    }

    public function smsLogs(): HasMany
    {
        return $this->hasMany(SmsLog::class);
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(Meeting::class);
    }

    public function calendarFeeds(): HasMany
    {
        return $this->hasMany(CalendarFeed::class);
    }

    public function licenses(): HasMany
    {
        return $this->hasMany(License::class);
    }

    public function idxConnections(): HasMany
    {
        return $this->hasMany(IdxConnection::class);
    }

    public function activeIdxConnections(): HasMany
    {
        return $this->hasMany(IdxConnection::class)->where('is_active', true);
    }

    public function idxSearches(): HasMany
    {
        return $this->hasMany(IdxSearch::class);
    }

    public function idxWidgets(): HasMany
    {
        return $this->hasMany(IdxWidget::class);
    }

    public function phoneNumbers(): HasMany
    {
        return $this->hasMany(PhoneNumber::class);
    }

    public function smsMessages(): HasMany
    {
        return $this->hasMany(SmsMessage::class);
    }

    public function callRecords(): HasMany
    {
        return $this->hasMany(CallRecord::class);
    }

    public function emailAccounts(): HasMany
    {
        return $this->hasMany(EmailAccount::class);
    }

    public function emailMessages(): HasMany
    {
        return $this->hasMany(EmailMessage::class);
    }

    public function webRtcCredential(): HasOne
    {
        return $this->hasOne(WebRtcCredential::class);
    }

    public function getWidgetDefaults(): array
    {
        return $this->settings['widget_defaults'] ?? [];
    }

    public function supportRequests(): HasMany
    {
        return $this->hasMany(SupportRequest::class);
    }

    public function savedListingViews(): HasMany
    {
        return $this->hasMany(SavedListingView::class);
    }

    public function savedContactViews(): HasMany
    {
        return $this->hasMany(SavedContactView::class);
    }

    /**
     * Admin-class roles. Add new ones here (e.g. 'support_admin') as the panel grows.
     */
    public const ADMIN_ROLES = ['superadmin', 'admin'];

    public function isAdmin(): bool
    {
        return in_array($this->role, self::ADMIN_ROLES, true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'superadmin';
    }

    // ── Subscription / entitlements ─────────────────────────────────
    // Effective access is derived, not stored: an active self-serve trial
    // elevates the user to the trial plan; a lifetime grant never expires; an
    // expired admin grant falls back to free. isPro/isEnterprise and hasFeature
    // all resolve against the *effective* plan.

    private ?Plan $cachedEffectivePlan = null;

    private ?string $cachedPlanKey = null;

    public function isLifetime(): bool
    {
        return (bool) $this->is_lifetime;
    }

    public function isTrialing(): bool
    {
        return $this->trial_plan !== null
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isFuture();
    }

    public function trialDaysRemaining(): int
    {
        if (! $this->isTrialing()) {
            return 0;
        }

        return (int) ceil(now()->floatDiffInDays($this->trial_ends_at, false));
    }

    /**
     * Whether a time-limited (non-lifetime) admin grant has lapsed.
     */
    public function subscriptionExpired(): bool
    {
        if ($this->is_lifetime) {
            return false;
        }

        return $this->subscription_expires_at !== null && $this->subscription_expires_at->isPast();
    }

    /**
     * The plan key the user currently gets access through.
     */
    public function effectivePlanKey(): string
    {
        if ($this->isTrialing()) {
            return $this->trial_plan;
        }

        if ($this->subscriptionExpired()) {
            return 'free';
        }

        return $this->subscription_tier ?? 'free';
    }

    public function effectivePlan(): ?Plan
    {
        $key = $this->effectivePlanKey();

        // Cache keyed on the resolved plan key so it self-invalidates when the
        // tier/trial changes within the same instance (e.g. after refresh()).
        if ($this->cachedPlanKey !== $key) {
            $this->cachedEffectivePlan = Plan::findByKey($key);
            $this->cachedPlanKey = $key;
        }

        return $this->cachedEffectivePlan;
    }

    /**
     * Feature keys granted by the effective plan (before per-user overrides).
     */
    public function planFeatures(): array
    {
        return $this->effectivePlan()?->features ?? [];
    }

    /**
     * Does this user have access to a gated feature?
     * Per-user override (feature_overrides) wins over the plan default.
     * Unknown keys (not in the catalog) are never gated.
     */
    public function hasFeature(string $key): bool
    {
        if (! array_key_exists($key, Plan::featureCatalog())) {
            return true;
        }

        $overrides = $this->feature_overrides ?? [];
        if (array_key_exists($key, $overrides)) {
            return (bool) $overrides[$key];
        }

        return in_array($key, $this->planFeatures(), true);
    }

    public function isPro(): bool
    {
        return in_array($this->effectivePlanKey(), ['pro', 'enterprise'], true);
    }

    public function isEnterprise(): bool
    {
        return $this->effectivePlanKey() === 'enterprise';
    }

    /**
     * May this user use team-collaboration features (members, roles, shared
     * inbox/deal board, team reports, lead assignment, team chat)?
     *
     * Billing is per-user and the team owner pays, so entitlement is either:
     *  - the user's own plan grants `team` (they can found/own a team), OR
     *  - they are an active member of a team whose owner has the `team`
     *    feature (invited Solo/free members inherit access to the workspace
     *    they were invited to).
     * Admins are handled by the gate middleware, not here.
     */
    public function canUseTeamFeatures(): bool
    {
        if ($this->hasFeature('team')) {
            return true;
        }

        if (! $this->team_id) {
            return false;
        }

        $member = $this->getTeamMember();
        if (! $member || ! $member->is_active) {
            return false;
        }

        return (bool) $this->team?->owner?->hasFeature('team');
    }

    public function isInTeamContext(): bool
    {
        return $this->active_context === 'team' && $this->team_id !== null;
    }

    public function isInPersonalContext(): bool
    {
        return $this->active_context === 'personal';
    }

    public function switchContext(string $context): void
    {
        $this->update(['active_context' => $context]);
    }

    public function getTeamMember(): ?TeamMember
    {
        if (! $this->team_id) {
            return null;
        }

        return TeamMember::where('team_id', $this->team_id)
            ->where('user_id', $this->id)
            ->first();
    }

    /**
     * The user who owns billing for this account: the team owner when this user
     * belongs to a team, otherwise the user themselves. Phone credits, seat and
     * usage limits are all charged to / counted against the billing owner, so a
     * team's members share the owner's wallet and quotas.
     */
    public function billingOwner(): self
    {
        if ($this->team_id && $this->team && $this->team->owner_id) {
            return $this->team->owner_id === $this->id ? $this : $this->team->owner;
        }

        return $this;
    }

    /**
     * The credit wallet for this account's billing owner, created on demand.
     */
    public function creditWallet(): CreditWallet
    {
        $owner = $this->billingOwner();

        return CreditWallet::firstOrCreate(
            ['user_id' => $owner->id],
            [
                'team_id' => $owner->team_id,
                'balance_cents' => 0,
                'included_allowance_cents' => 0,
            ],
        );
    }
}
