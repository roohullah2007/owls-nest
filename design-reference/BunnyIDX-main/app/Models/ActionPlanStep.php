<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterval;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActionPlanStep extends Model
{
    /** Step types supported in the MVP. */
    public const STEP_TYPES = ['email', 'sms', 'task'];

    public const DELAY_UNITS = ['minutes', 'hours', 'days'];

    protected $fillable = [
        'action_plan_id',
        'user_id',
        'team_id',
        'position',
        'step_type',
        'delay_amount',
        'delay_unit',
        'config',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'position' => 'integer',
            'delay_amount' => 'integer',
        ];
    }

    public function actionPlan(): BelongsTo
    {
        return $this->belongsTo(ActionPlan::class);
    }

    /**
     * The delay before this step runs, as a CarbonInterval added to "now"
     * (or the previous step's completion) to compute the next run time.
     */
    public function delayInterval(): CarbonInterval
    {
        $amount = max(0, (int) $this->delay_amount);

        return match ($this->delay_unit) {
            'minutes' => CarbonInterval::minutes($amount),
            'hours' => CarbonInterval::hours($amount),
            default => CarbonInterval::days($amount),
        };
    }
}
