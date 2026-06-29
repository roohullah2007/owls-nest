<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTeamOrUser
{
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Scope to records visible to the given user.
     * Respects active_context: personal = own data only, team = team data with permissions.
     */
    public function scopeForUser(Builder $query, User $user): Builder
    {
        if ($user->isInTeamContext() && $user->team_id) {
            return $query->where('team_id', $user->team_id);
        }

        return $query->where('user_id', $user->id);
    }

    /**
     * Apply permission-aware scoping for a specific resource.
     * "all" = full team scope, "own" = team scope + user_id filter, "none" = empty.
     */
    public function scopeWithPermissions(Builder $query, User $user, string $resource): Builder
    {
        if (! $user->isInTeamContext() || ! $user->team_id) {
            return $query->where('user_id', $user->id);
        }

        $teamMember = $user->getTeamMember();

        if (! $teamMember || ! $teamMember->is_active) {
            return $query->where('user_id', $user->id);
        }

        $level = $teamMember->can($resource);

        return match ($level) {
            'all' => $query->where('team_id', $user->team_id),
            'own' => $query->where('team_id', $user->team_id)->where('user_id', $user->id),
            'none' => $query->whereRaw('0 = 1'),
            default => $query->where('user_id', $user->id),
        };
    }

    /**
     * Auto-set team_id when creating a record.
     */
    public static function bootBelongsToTeamOrUser(): void
    {
        static::creating(function ($model) {
            if ($model->user_id && !$model->team_id) {
                $user = User::find($model->user_id);
                if ($user && $user->team_id) {
                    $model->team_id = $user->team_id;
                }
            }
        });
    }
}
