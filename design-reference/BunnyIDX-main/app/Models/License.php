<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class License extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'key',
        'email',
        'purchase_ref',
        'purchase_source',
        'status',
        'note',
        'revoked_at',
        'revoked_reason',
    ];

    protected function casts(): array
    {
        return [
            'revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function domains(): HasMany
    {
        return $this->hasMany(LicenseDomain::class);
    }

    public function activeDomain(): HasOne
    {
        return $this->hasOne(LicenseDomain::class)->where('is_active', true);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function mlsCredentials(): HasMany
    {
        return $this->hasMany(MlsCredential::class);
    }

    public function relayLogs(): HasMany
    {
        return $this->hasMany(RelayLog::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
