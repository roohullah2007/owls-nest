<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    protected $fillable = ['name', 'owner_id', 'settings', 'role_permissions', 'purchased_seats', 'stripe_subscription_id', 'stripe_seat_item_id'];

    public const DEFAULT_ROLE_PERMISSIONS = [
        'admin' => [
            'listings' => 'all',
            'contacts' => 'all',
            'contact_types' => [],
            'tasks' => 'all',
            'calendar' => 'all',
            'deals' => 'all',
            'action_plans' => 'all',
        ],
        'agent' => [
            'listings' => 'all',
            'contacts' => 'all',
            'contact_types' => [],
            'tasks' => 'all',
            'calendar' => 'all',
            'deals' => 'all',
            'action_plans' => 'all',
        ],
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'role_permissions' => 'array',
            'purchased_seats' => 'integer',
        ];
    }

    public function getRolePermissions(): array
    {
        return $this->role_permissions ?? self::DEFAULT_ROLE_PERMISSIONS;
    }

    public function getPermissionsForRole(string $role): array
    {
        if ($role === 'owner') {
            return TeamMember::DEFAULT_PERMISSIONS;
        }

        $perms = $this->getRolePermissions();

        return $perms[$role] ?? TeamMember::DEFAULT_PERMISSIONS;
    }

    public function getAvailableRoles(): array
    {
        $perms = $this->getRolePermissions();

        return array_keys($perms);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_members')->withPivot('role')->withTimestamps();
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(TeamInvitation::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }

    public function companies(): HasMany
    {
        return $this->hasMany(Company::class);
    }

    public function pipelines(): HasMany
    {
        return $this->hasMany(Pipeline::class);
    }

    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class);
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(TeamChatMessage::class);
    }
}
