<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * OAuth tokens for MLS providers that use token-based auth.
 * Currently reserved for future BYOK providers that require OAuth flows.
 */
class MlsToken extends Model
{
    protected $fillable = [
        'credential_id',
        'access_token',
        'refresh_token',
        'token_type',
        'expires_at',
        'scope',
    ];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'expires_at' => 'datetime',
        ];
    }

    public function credential(): BelongsTo
    {
        return $this->belongsTo(MlsCredential::class, 'credential_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isExpiringSoon(int $bufferSeconds = 3600): bool
    {
        return $this->expires_at->subSeconds($bufferSeconds)->isPast();
    }
}
