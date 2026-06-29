<?php

declare(strict_types=1);

namespace App\Services\Email;

/**
 * Canonical category taxonomy for every Resend-sent email plus the single
 * authority on whether a category counts against the Resend quota.
 *
 * Stored on email_send_logs (template_type + the boolean counts_toward_quota).
 * Connected Gmail/Outlook inbox mail is sent through the user's own mailbox and
 * never reaches Resend, so it never appears here and never counts.
 */
class EmailCategory
{
    public const AUTH_VERIFICATION = 'auth_verification';

    public const PASSWORD_RESET = 'password_reset';

    public const LEAD_NOTIFICATION = 'lead_notification';

    public const VISITOR_REGISTRATION = 'visitor_registration';

    public const SAVED_SEARCH_ALERT = 'saved_search_alert';

    public const PROPERTY_UPDATE_ALERT = 'property_update_alert';

    public const ACTION_PLAN = 'action_plan';

    public const AUTOMATION = 'automation';

    public const ADMIN_UPDATE = 'admin_update';

    public const TEAM_INVITATION = 'team_invitation';

    /** @var string[] */
    public const ALL = [
        self::AUTH_VERIFICATION,
        self::PASSWORD_RESET,
        self::LEAD_NOTIFICATION,
        self::VISITOR_REGISTRATION,
        self::SAVED_SEARCH_ALERT,
        self::PROPERTY_UPDATE_ALERT,
        self::ACTION_PLAN,
        self::AUTOMATION,
        self::ADMIN_UPDATE,
        self::TEAM_INVITATION,
    ];

    /**
     * Map an email template_type (or a property-alert alert_type) to a canonical
     * category. Unknown types fall back to AUTOMATION — the configurable bucket.
     */
    public static function fromTemplateType(string $type): string
    {
        return match ($type) {
            'email_verification', 'auth_verification' => self::AUTH_VERIFICATION,
            'password_reset' => self::PASSWORD_RESET,
            'new_lead_notification', 'lead_notification' => self::LEAD_NOTIFICATION,
            'visitor_registration_confirmation', 'visitor_registration' => self::VISITOR_REGISTRATION,
            'saved_search_alert', 'saved_search_match' => self::SAVED_SEARCH_ALERT,
            'property_price_drop_alert', 'price_drop',
            'property_status_change_alert', 'status_change',
            'property_update_alert',
            'open_house_alert', 'back_on_market_alert' => self::PROPERTY_UPDATE_ALERT,
            'action_plan_email', 'action_plan' => self::ACTION_PLAN,
            'admin_update' => self::ADMIN_UPDATE,
            'team_invitation' => self::TEAM_INVITATION,
            default => self::AUTOMATION,
        };
    }

    /**
     * Does this category count against the Resend transactional / property-alert
     * quota? Auth, password reset, admin updates, and lead/visitor-registration
     * notifications never count. Property alerts always count. Action-plan and
     * automation are configurable (config/email_categories.php) because product
     * requirements conflict. Accepts the legacy stored value 'property_alert'.
     */
    public static function countsTowardQuota(string $category): bool
    {
        return match ($category) {
            self::SAVED_SEARCH_ALERT, self::PROPERTY_UPDATE_ALERT, 'property_alert' => true,
            self::ACTION_PLAN => (bool) config('email_categories.quota.action_plan', false),
            self::AUTOMATION => (bool) config('email_categories.quota.automation', false),
            default => false,
        };
    }
}
