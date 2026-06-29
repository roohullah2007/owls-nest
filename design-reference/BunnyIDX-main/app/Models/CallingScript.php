<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Reusable calling script + questionnaire used by the Power Dialer modal.
 *
 *   intro      — short opening line ("Hi, this is X from BunnyIDX...")
 *   body       — long-form script the agent reads through during the call
 *   questions  — JSON list of questions the agent asks while talking
 *
 * Visibility:
 *   - Personal scripts: user_id set, is_team_shared = false. Only the owner sees them.
 *   - Team scripts:     team_id set, is_team_shared = true. Any teammate can read; only
 *                       the author or a team admin can edit/delete.
 */
class CallingScript extends Model
{
    protected $fillable = [
        'user_id',
        'team_id',
        'name',
        'intro',
        'body',
        'questions',
        'is_team_shared',
        'usage_count',
        'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'questions' => 'array',
            'is_team_shared' => 'boolean',
            'usage_count' => 'integer',
            'last_used_at' => 'datetime',
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

    /**
     * Scope to scripts the given user is allowed to see: their own + their team's shared ones.
     */
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

    /**
     * Whether the given user can edit/delete this script.
     * Author can always edit. Team admins can edit any team-shared script.
     */
    public function isEditableBy(User $user): bool
    {
        if ($this->user_id === $user->id) {
            return true;
        }
        if ($this->is_team_shared && $this->team_id && $this->team_id === $user->team_id) {
            // Owner of the team may edit. Falls back gracefully if Team has no owner concept.
            return $user->team && $user->team->owner_id === $user->id;
        }
        return false;
    }
}
