<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Hotsheet extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'name',
        'scope',
        'filters',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Visible hotsheets: personal (mine) + team-scoped (if in team).
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->where(function ($q) use ($user) {
            $q->where(function ($qq) use ($user) {
                $qq->where('scope', 'personal')->where('user_id', $user->id);
            });

            if ($user->team_id) {
                $q->orWhere(function ($qq) use ($user) {
                    $qq->where('scope', 'team')->where('team_id', $user->team_id);
                });
            }
        });
    }
}
