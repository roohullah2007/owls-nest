<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    protected $fillable = [
        'license_id',
        'stripe_subscription_id',
        'stripe_customer_id',
        'mls_slug',
        'status',
        'current_period_start',
        'current_period_end',
        'canceled_at',
    ];

    protected function casts(): array
    {
        return [
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'canceled_at' => 'datetime',
        ];
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
