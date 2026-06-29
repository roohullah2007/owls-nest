<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * OAuth credentials for MLS providers that require per-license authentication.
 * Currently reserved for future BYOK providers that use OAuth (not yet active).
 */
class MlsCredential extends Model
{
    protected $fillable = [
        'license_id',
        'mls_slug',
        'client_id',
        'client_secret',
        'member_id',
        'is_active',
        'last_verified_at',
    ];

    protected function casts(): array
    {
        return [
            'client_id' => 'encrypted',
            'client_secret' => 'encrypted',
            'is_active' => 'boolean',
            'last_verified_at' => 'datetime',
        ];
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class);
    }

    public function latestToken(): HasOne
    {
        return $this->hasOne(MlsToken::class, 'credential_id')->latestOfMany();
    }
}
