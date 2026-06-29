<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ActionPlanEnrollment extends Model
{
    use BelongsToTeamOrUser;

    public const STATUSES = ['active', 'paused', 'completed', 'stopped'];

    protected $fillable = [
        'action_plan_id',
        'contact_id',
        'user_id',
        'team_id',
        'status',
        'current_step_id',
        'next_run_at',
        'enrolled_by',
        'enrolled_via',
        'started_at',
        'completed_at',
        'stopped_at',
        'stop_reason',
    ];

    protected function casts(): array
    {
        return [
            'next_run_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'stopped_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function actionPlan(): BelongsTo
    {
        return $this->belongsTo(ActionPlan::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function currentStep(): BelongsTo
    {
        return $this->belongsTo(ActionPlanStep::class, 'current_step_id');
    }

    public function stepRuns(): HasMany
    {
        return $this->hasMany(ActionPlanStepRun::class);
    }

    /** Active enrollments whose next step is due to run. */
    public function scopeDue(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->whereNotNull('next_run_at')
            ->where('next_run_at', '<=', now());
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
