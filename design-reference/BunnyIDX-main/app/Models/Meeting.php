<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Meeting extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'contact_id',
        'deal_id',
        'title',
        'description',
        'location',
        'meeting_type',
        'starts_at',
        'ends_at',
        'is_completed',
        'outcome',
        'reminder_minutes',
        'reminder_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_completed' => 'boolean',
            'reminder_minutes' => 'integer',
            'reminder_sent_at' => 'datetime',
        ];
    }

    public function reminderAt(): ?Carbon
    {
        if (! $this->reminder_minutes || ! $this->starts_at) {
            return null;
        }

        return $this->starts_at->copy()->subMinutes($this->reminder_minutes);
    }

    public function scopeNeedsReminder(Builder $query): Builder
    {
        // "starts_at minus reminder_minutes" has to be computed in SQL, and the
        // expression is driver-specific. The previous SQLite-only form
        // (datetime(starts_at, '-' || reminder_minutes || ' minutes')) is a
        // 1064 syntax error on MySQL/MariaDB, so build it per driver.
        $dueExpression = match ($query->getConnection()->getDriverName()) {
            'mysql', 'mariadb' => 'DATE_SUB(starts_at, INTERVAL reminder_minutes MINUTE)',
            'pgsql' => "starts_at - (reminder_minutes * interval '1 minute')",
            default => "datetime(starts_at, '-' || reminder_minutes || ' minutes')", // sqlite
        };

        return $query->where('is_completed', false)
            ->whereNotNull('reminder_minutes')
            ->where('reminder_minutes', '>', 0)
            ->whereNull('reminder_sent_at')
            ->whereRaw("{$dueExpression} <= ?", [now()->toDateTimeString()]);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }
}
