<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pre-recorded voicemail clip used by the Power Dialer's "VM Drop" feature.
 * Stored as a publicly-fetchable URL so Telnyx can play it during a call.
 */
class Voicemail extends Model
{
    protected $fillable = [
        'user_id',
        'team_id',
        'name',
        'audio_url',
        'audio_path',
        'duration_seconds',
        'is_default',
        'is_team_shared',
    ];

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'is_default' => 'boolean',
            'is_team_shared' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** Scope to clips visible to the given user — their own + team-shared. */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->where(function ($q) use ($user) {
            $q->where('user_id', $user->id);
            if ($user->team_id) {
                $q->orWhere(function ($qq) use ($user) {
                    $qq->where('team_id', $user->team_id)->where('is_team_shared', true);
                });
            }
        });
    }
}
