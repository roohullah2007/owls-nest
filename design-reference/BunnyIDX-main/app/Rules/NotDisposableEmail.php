<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Reject sign-ups that use a known disposable / temporary email provider
 * (10minutemail, guerrillamail, mailinator, …). The domain is compared
 * case-insensitively against a curated blocklist so the check is fully
 * deterministic (no DNS lookup) and safe to run in tests.
 *
 * Extend the list via config('security.disposable_email_domains') — those
 * entries are merged with the built-in set below.
 */
class NotDisposableEmail implements ValidationRule
{
    /**
     * Common throwaway-email domains. Kept intentionally focused on the
     * highest-volume providers; site owners can append more via config.
     *
     * @var list<string>
     */
    private const BLOCKED_DOMAINS = [
        '10minutemail.com', '10minutemail.net', '20minutemail.com',
        'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
        'guerrillamail.biz', 'guerrillamailblock.com', 'sharklasers.com',
        'grr.la', 'pokemail.net', 'spam4.me',
        'mailinator.com', 'mailinator.net', 'mailinator2.com',
        'temp-mail.org', 'tempmail.com', 'tempmail.net', 'tempr.email',
        'tempmailo.com', 'tempmailaddress.com', 'throwawaymail.com',
        'getnada.com', 'nada.email', 'dispostable.com', 'fakeinbox.com',
        'trashmail.com', 'trashmail.net', 'mytrashmail.com', 'wegwerfmail.de',
        'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.org',
        'maildrop.cc', 'mailnesia.com', 'mailcatch.com', 'mohmal.com',
        'emailondeck.com', 'mintemail.com', 'spambox.us', 'mailtemp.info',
        'tmpmail.org', 'tmpmail.net', 'fakemail.net', 'burnermail.io',
        'inboxkitten.com', 'mailpoof.com', 'tempinbox.com', 'einrot.com',
        'discard.email', 'spamgourmet.com', 'mvrht.com', 'tempmail.plus',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! str_contains($value, '@')) {
            return; // let the standard `email` rule report format errors
        }

        $domain = strtolower(trim(substr(strrchr($value, '@'), 1)));

        if ($domain === '') {
            return;
        }

        $blocked = array_map(
            'strtolower',
            array_merge(self::BLOCKED_DOMAINS, (array) config('security.disposable_email_domains', [])),
        );

        if (in_array($domain, $blocked, true)) {
            $fail('Please use a permanent email address. Temporary or disposable email providers are not allowed.');
        }
    }
}
