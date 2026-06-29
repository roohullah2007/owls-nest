<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailAccount extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'provider',
        'email_address',
        'provider_account_id',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'sync_state',
        'history_id',
        'last_synced_at',
        'last_full_sync_at',
        'sync_error',
        'is_default',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'token_expires_at' => 'datetime',
            'last_synced_at' => 'datetime',
            'last_full_sync_at' => 'datetime',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    // Relationships

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function threads(): HasMany
    {
        return $this->hasMany(EmailThread::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(EmailMessage::class);
    }

    // Scopes

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeGoogle(Builder $query): Builder
    {
        return $query->where('provider', 'google');
    }

    // Helpers

    public function isTokenExpired(): bool
    {
        if (!$this->token_expires_at) {
            return true;
        }

        return $this->token_expires_at->isPast();
    }

    public function needsSync(): bool
    {
        if (!$this->last_synced_at) {
            return true;
        }

        return $this->last_synced_at->diffInMinutes(now()) >= 5;
    }
}
