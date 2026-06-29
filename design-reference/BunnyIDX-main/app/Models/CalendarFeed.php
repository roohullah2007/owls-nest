<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarFeed extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'url',
        'color',
        'cached_events',
        'last_synced_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cached_events' => 'array',
            'last_synced_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
