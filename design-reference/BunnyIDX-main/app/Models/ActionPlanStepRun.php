<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActionPlanStepRun extends Model
{
    public const STATUSES = ['pending', 'sent', 'skipped', 'failed'];

    protected $fillable = [
        'action_plan_enrollment_id',
        'action_plan_step_id',
        'user_id',
        'team_id',
        'status',
        'skip_reason',
        'result_ref_id',
        'result_ref_type',
        'error',
        'ran_at',
    ];

    protected function casts(): array
    {
        return [
            'ran_at' => 'datetime',
        ];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(ActionPlanEnrollment::class, 'action_plan_enrollment_id');
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(ActionPlanStep::class, 'action_plan_step_id');
    }

    public function resultRef(): MorphTo
    {
        return $this->morphTo();
    }

    /** True once the step has actually been acted on (so the engine can skip it). */
    public function isResolved(): bool
    {
        return in_array($this->status, ['sent', 'skipped'], true);
    }
}
