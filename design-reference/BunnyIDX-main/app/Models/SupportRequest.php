<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportRequest extends Model
{
    protected $fillable = [
        'user_id',
        'topic',
        'message',
        'preferred_date',
        'preferred_time',
        'contact_method',
        'status',
        'admin_notes',
        'scheduled_at',
    ];

    protected function casts(): array
    {
        return [
            'preferred_date' => 'date',
            'scheduled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
