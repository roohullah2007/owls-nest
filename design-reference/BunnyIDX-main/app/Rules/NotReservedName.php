<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Reject impersonation-style names such as "Admin", "Super Admin", "Support"
 * or "System" in user-facing name fields (full name, first name, last name).
 *
 * The value is normalised (lowercased, non-alphanumerics stripped) before an
 * exact match against the reserved set, so "Super Admin", "super-admin" and
 * "SuperAdmin" all collapse to the same blocked token, while ordinary names
 * that merely contain a reserved word ("Adminah", "Roots") are left alone.
 */
class NotReservedName implements ValidationRule
{
    /**
     * Normalised reserved tokens (already lowercased, no spaces/punctuation).
     *
     * @var list<string>
     */
    private const RESERVED = [
        'admin', 'admins', 'administrator', 'administration',
        'superadmin', 'superadministrator', 'sysadmin', 'systemadmin',
        'root', 'system', 'support', 'helpdesk', 'moderator', 'mod',
        'staff', 'owner', 'billing', 'security', 'noreply', 'nobody',
        'bunnyidx', 'bunnychamp', 'bunbuilder', 'bunpilot',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || trim($value) === '') {
            return;
        }

        $normalised = preg_replace('/[^a-z0-9]/', '', strtolower($value));

        if ($normalised !== null && in_array($normalised, self::RESERVED, true)) {
            $fail('This name is reserved and cannot be used.');
        }
    }
}
