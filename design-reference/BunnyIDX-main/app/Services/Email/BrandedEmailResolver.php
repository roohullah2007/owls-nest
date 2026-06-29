<?php

declare(strict_types=1);

namespace App\Services\Email;

use App\Models\User;

/**
 * Decides which Resend credentials + sender identity an outbound email should
 * use: a user's own (branded) key when they've configured one, otherwise the
 * platform key + platform sender. A user key is only ever used for that user's
 * own notification emails — callers pass the owning account.
 */
class BrandedEmailResolver
{
    public function __construct(private readonly SenderAliasService $aliases) {}

    /**
     * @return array{key: ?string, from_email: string, from_name: string, branded: bool}
     */
    public function for(?User $user): array
    {
        if ($user && $user->hasBrandedResendKey()) {
            return [
                'key' => $user->resend_api_key, // decrypted by the model cast
                'from_email' => $user->resend_from_email ?: (string) config('mail.from.address'),
                'from_name' => $user->resend_from_name ?: (string) config('mail.from.name'),
                'branded' => true,
            ];
        }

        // Platform key + the account's per-user sending alias (which falls back
        // to the default platform sender when the user has no alias set).
        return [
            'key' => config('services.resend.key'),
            'from_email' => $this->aliases->emailFor($user),
            'from_name' => $this->aliases->displayNameFor($user),
            'branded' => false,
        ];
    }
}
