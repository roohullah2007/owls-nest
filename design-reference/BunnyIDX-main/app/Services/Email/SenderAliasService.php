<?php

declare(strict_types=1);

namespace App\Services\Email;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * Per-user platform sending aliases: {alias}.updates@{domain}
 * (e.g. john.smith.updates@m.agentsbunny.com). Aliases are sanitised, unique,
 * and ALWAYS on the single configured platform domain — there is no way to emit
 * another domain here, so the alias path can never be used to spoof a domain
 * the platform hasn't verified. A user with no (or an invalid) alias falls back
 * to the default platform sender (updates@{domain}).
 *
 * Branded senders that supply their own Resend key + verified domain are handled
 * separately in BrandedEmailResolver — this service only governs platform sends.
 */
class SenderAliasService
{
    /** Max length of the sanitised username portion of an alias. */
    private const MAX_ALIAS_LENGTH = 32;

    public function domain(): string
    {
        return (string) config('mail.sender_alias.domain', 'm.agentsbunny.com');
    }

    public function defaultSender(): string
    {
        return (string) config('mail.sender_alias.default', 'updates@'.$this->domain());
    }

    public function defaultDisplayName(): string
    {
        return (string) config('mail.sender_alias.default_name', 'Agents Bunny Updates');
    }

    /**
     * Reduce an arbitrary username to a safe local-part token: ASCII, lowercase,
     * [a-z0-9.] only, no leading/trailing/doubled dots, length-capped. Returns
     * null when nothing usable remains (caller then falls back to the default).
     */
    public function sanitize(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }

        $value = strtolower(Str::ascii($raw));
        $value = preg_replace('/[\s_]+/', '.', $value) ?? '';   // separators → dot
        $value = preg_replace('/[^a-z0-9.]/', '', $value) ?? ''; // drop unsafe chars
        $value = preg_replace('/\.+/', '.', $value) ?? '';       // collapse dot runs
        $value = trim($value, '.');

        if ($value === '') {
            return null;
        }

        return substr($value, 0, self::MAX_ALIAS_LENGTH);
    }

    /** Is a stored alias still well-formed (defends against tampered rows)? */
    public function isValid(?string $alias): bool
    {
        return $alias !== null && $alias !== '' && $this->sanitize($alias) === $alias;
    }

    /**
     * Build a unique alias for a user (does NOT persist). Derives a base from
     * the name, then the email local-part, then "agent", and appends a numeric
     * suffix until it no longer collides with another user.
     */
    public function generateFor(User $user): string
    {
        $base = $this->sanitize($user->name)
            ?? $this->sanitize(Str::before((string) $user->email, '@'))
            ?? 'agent';

        $candidate = $base;
        $n = 1;
        while ($this->aliasTaken($candidate, $user->id)) {
            $n++;
            $suffix = '.'.$n;
            $candidate = substr($base, 0, self::MAX_ALIAS_LENGTH - strlen($suffix)).$suffix;
        }

        return $candidate;
    }

    /** Persist a unique alias for the user when they don't already have a valid one. */
    public function ensureFor(User $user): string
    {
        if ($this->isValid($user->sender_alias) && ! $this->aliasTaken($user->sender_alias, $user->id)) {
            return $user->sender_alias;
        }

        $alias = $this->generateFor($user);
        $user->forceFill(['sender_alias' => $alias])->save();

        return $alias;
    }

    /**
     * The platform from-email for a user, with safe fallback to the default
     * sender when the alias is missing or invalid.
     */
    public function emailFor(?User $user): string
    {
        $alias = $user?->sender_alias;

        if (! $this->isValid($alias)) {
            return $this->defaultSender();
        }

        return $alias.'.updates@'.$this->domain();
    }

    /** Configurable display name; falls back to the default platform name. */
    public function displayNameFor(?User $user): string
    {
        $name = $user?->sender_alias_display_name;

        return is_string($name) && trim($name) !== '' ? trim($name) : $this->defaultDisplayName();
    }

    private function aliasTaken(string $alias, ?int $exceptUserId = null): bool
    {
        return User::query()
            ->where('sender_alias', $alias)
            ->when($exceptUserId, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->exists();
    }
}
