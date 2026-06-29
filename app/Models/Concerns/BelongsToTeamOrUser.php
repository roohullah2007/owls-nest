<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Single-broker ownership scope. This build has no team layer — every record
 * is owned by a user and scoped by user_id.
 */
trait BelongsToTeamOrUser
{
    /**
     * Scope to records owned by the given user.
     */
    public function scopeForUser(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }
}
