<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ActionPlan extends Model
{
    use BelongsToTeamOrUser, SoftDeletes;

    /** Trigger types supported in the MVP. */
    public const TRIGGER_TYPES = ['manual', 'status_changed'];

    protected $fillable = [
        'user_id',
        'team_id',
        'name',
        'description',
        'trigger_type',
        'trigger_config',
        'is_active',
        'stop_on_reply',
        'stop_on_status',
        'allow_reenroll',
        'enrolled_count',
        'completed_count',
    ];

    protected function casts(): array
    {
        return [
            'trigger_config' => 'array',
            'stop_on_status' => 'array',
            'is_active' => 'boolean',
            'stop_on_reply' => 'boolean',
            'allow_reenroll' => 'boolean',
            'enrolled_count' => 'integer',
            'completed_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(ActionPlanStep::class)->orderBy('position');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(ActionPlanEnrollment::class);
    }
}
