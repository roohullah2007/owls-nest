<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Addresses that should not receive future marketing / property-alert emails
 * (added on spam complaint or hard bounce). Consult isSuppressed() before any
 * non-transactional send once alert/marketing sending is built.
 */
class EmailSuppression extends Model
{
    public const REASON_COMPLAINT = 'complaint';

    public const REASON_BOUNCE = 'bounce';

    public const REASON_MANUAL = 'manual';

    protected $fillable = [
        'email',
        'reason',
        'source',
        'suppressed_at',
    ];

    protected function casts(): array
    {
        return [
            'suppressed_at' => 'datetime',
        ];
    }

    public static function suppress(?string $email, string $reason, string $source = 'resend'): void
    {
        $email = trim((string) $email);
        if ($email === '') {
            return;
        }

        static::updateOrCreate(
            ['email' => mb_strtolower($email)],
            ['reason' => $reason, 'source' => $source, 'suppressed_at' => now()],
        );
    }

    public static function isSuppressed(?string $email): bool
    {
        $email = trim((string) $email);

        return $email !== '' && static::where('email', mb_strtolower($email))->exists();
    }
}
