<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Task extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'taskable_id',
        'taskable_type',
        'title',
        'description',
        'priority',
        'due_at',
        'due_date',
        'reminder_at',
        'reminder_sent_at',
        'completed_at',
        'is_completed',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'due_date' => 'date',
            'reminder_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
            'completed_at' => 'datetime',
            'is_completed' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function taskable(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopeIncomplete(Builder $query): Builder
    {
        return $query->where('is_completed', false);
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where('is_completed', false)
            ->where(function ($q) {
                $q->where('due_at', '<', now())
                  ->orWhere('due_date', '<', now()->toDateString());
            });
    }

    public function scopeNeedsReminder(Builder $query): Builder
    {
        return $query->where('is_completed', false)
            ->whereNotNull('reminder_at')
            ->where('reminder_at', '<=', now())
            ->whereNull('reminder_sent_at');
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('is_completed', false)
            ->where(function ($q) {
                $q->where('due_at', '>=', now())
                  ->orWhere('due_date', '>=', now()->toDateString());
            })
            ->orderBy('due_at')
            ->orderBy('due_date');
    }
}
