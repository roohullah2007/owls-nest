<?php

declare(strict_types=1);

namespace App\Services\Email;

use App\Models\EmailSendLog;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Per-plan, per-user, per-calendar-month cap on quota-counting (transactional)
 * emails. The limit comes from the billing owner's plan `email_quota_monthly`
 * (null = unlimited); usage counts the user's own `email_send_logs` rows flagged
 * `counts_toward_quota` since the start of the month.
 *
 * `counts_toward_quota` is owned by {@see EmailCategory}; this service only
 * enforces the ceiling on those same emails.
 */
class EmailQuota
{
    /** The user's monthly transactional-email allowance; null = unlimited. */
    public function limit(User $user): ?int
    {
        return $user->billingOwner()->effectivePlan()->email_quota_monthly ?? null;
    }

    /** Quota-counting emails this user has sent this calendar month. */
    public function usedThisMonth(User $user): int
    {
        return EmailSendLog::query()
            ->where('user_id', $user->id)
            ->where('counts_toward_quota', true)
            ->where('created_at', '>=', Carbon::now()->startOfMonth())
            ->count();
    }

    public function isOverLimit(User $user): bool
    {
        $limit = $this->limit($user);
        if ($limit === null) {
            return false;
        }

        return $this->usedThisMonth($user) >= $limit;
    }

    /** Remaining quota-counting sends this month; null = unlimited. */
    public function remaining(User $user): ?int
    {
        $limit = $this->limit($user);
        if ($limit === null) {
            return null;
        }

        return max(0, $limit - $this->usedThisMonth($user));
    }
}
