<?php

declare(strict_types=1);

namespace App\Services\PropertyAlerts;

use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Resolves and enforces the per-account sending cadence. The frequency is a
 * minimum interval between sends for a single subscription — "do not send more
 * often than selected frequency". Stored on
 * users.notification_preferences['property_alert_frequency'].
 */
class PropertyAlertFrequency
{
    public static function forUser(User $user): string
    {
        $prefs = $user->notification_preferences ?? [];
        $value = $prefs['property_alert_frequency'] ?? config('property_alerts.default_frequency');

        return self::isValid($value) ? $value : config('property_alerts.default_frequency');
    }

    public static function isValid(?string $frequency): bool
    {
        return $frequency !== null
            && array_key_exists($frequency, config('property_alerts.frequencies', []));
    }

    /** "off" (or an unknown frequency) → alerts disabled entirely. */
    public static function isOff(string $frequency): bool
    {
        return self::intervalDays($frequency) === null;
    }

    public static function intervalDays(string $frequency): ?int
    {
        return config("property_alerts.frequencies.{$frequency}");
    }

    /**
     * Has enough time elapsed since the last send for this cadence? A never-yet
     * alerted subscription (null) is always due (unless the cadence is off).
     */
    public static function isDue(string $frequency, ?Carbon $lastSentAt, ?Carbon $now = null): bool
    {
        $days = self::intervalDays($frequency);
        if ($days === null) {
            return false;
        }
        if ($lastSentAt === null) {
            return true;
        }

        $now ??= now();

        return $lastSentAt->copy()->addDays($days)->lessThanOrEqualTo($now);
    }
}
