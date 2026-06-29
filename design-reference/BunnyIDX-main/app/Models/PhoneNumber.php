<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PhoneNumber extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'telnyx_phone_number_id',
        'telnyx_messaging_profile_id',
        'phone_number',
        'friendly_name',
        'capabilities',
        'monthly_cost',
        'status',
        'number_type',
        'is_default',
        'provisioned_at',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'capabilities' => 'array',
            'monthly_cost' => 'decimal:4',
            'is_default' => 'boolean',
            'provisioned_at' => 'datetime',
            'released_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function smsMessages(): HasMany
    {
        return $this->hasMany(SmsMessage::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeForSms(Builder $query): Builder
    {
        return $query->active()->where(function ($q) {
            $q->whereNull('capabilities')
              ->orWhereJsonContains('capabilities', 'sms');
        });
    }

    public function scopeForVoice(Builder $query): Builder
    {
        return $query->active()->where(function ($q) {
            $q->whereNull('capabilities')
              ->orWhereJsonContains('capabilities', 'voice');
        });
    }
}
