<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamMember extends Model
{
    protected $fillable = ['team_id', 'user_id', 'role', 'permissions', 'is_active', 'invited_at', 'accepted_at'];

    public const DEFAULT_PERMISSIONS = [
        'listings' => 'all',
        'contacts' => 'all',
        'contact_types' => [],
        'tasks' => 'all',
        'calendar' => 'all',
        'deals' => 'all',
        'phone' => 'own',
        'action_plans' => 'all',
    ];

    protected function casts(): array
    {
        return [
            'invited_at' => 'datetime',
            'accepted_at' => 'datetime',
            'permissions' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the permission level for a resource.
     * Resolves from the team's role-based permissions.
     */
    public function can(string $resource): string
    {
        if ($this->role === 'owner') {
            return 'all';
        }

        $team = $this->team;
        if ($team) {
            $perms = $team->getPermissionsForRole($this->role);
            return $perms[$resource] ?? 'all';
        }

        return 'all';
    }

    /**
     * Check if the member can see all team records for a resource.
     */
    public function canSeeAll(string $resource): bool
    {
        return $this->can($resource) === 'all';
    }

    /**
     * Check if the member can see at least their own records.
     */
    public function canSeeOwn(string $resource): bool
    {
        return in_array($this->can($resource), ['all', 'own']);
    }

    /**
     * Get allowed contact types (empty = all).
     * Resolves from team's role-based permissions.
     */
    public function allowedContactTypes(): array
    {
        if ($this->role === 'owner') {
            return [];
        }

        $team = $this->team;
        if ($team) {
            $perms = $team->getPermissionsForRole($this->role);
            return $perms['contact_types'] ?? [];
        }

        return [];
    }
}
