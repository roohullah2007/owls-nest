<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use App\Services\TimelineService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class Deal extends Model
{
    use BelongsToTeamOrUser, HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'team_id',
        'assigned_to',
        'company_id',
        'pipeline_id',
        'pipeline_stage_id',
        'title',
        'value',
        'currency',
        'type',
        'property_address',
        'mls_number',
        'expected_close_date',
        'actual_close_date',
        'commission_rate',
        'commission_amount',
        'arv',
        'repair_cost',
        'assignment_fee',
        'inspection_date',
        'walkthrough_date',
        'possession_date',
        'earnest_money_due_date',
        'due_diligence_date',
        'notes',
        'won_at',
        'lost_at',
        'lost_reason',
        'custom_fields',
        'position',
        'last_activity_at',
    ];

    protected $appends = ['mao'];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'commission_rate' => 'decimal:2',
            'commission_amount' => 'decimal:2',
            'arv' => 'decimal:2',
            'repair_cost' => 'decimal:2',
            'assignment_fee' => 'decimal:2',
            'expected_close_date' => 'date',
            'actual_close_date' => 'date',
            'inspection_date' => 'date',
            'walkthrough_date' => 'date',
            'possession_date' => 'date',
            'earnest_money_due_date' => 'date',
            'due_diligence_date' => 'date',
            'won_at' => 'datetime',
            'lost_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'custom_fields' => 'array',
            'position' => 'integer',
        ];
    }

    public function getMaoAttribute(): ?string
    {
        if ($this->arv === null) {
            return null;
        }

        $mao = (float) $this->arv * 0.70
            - (float) ($this->repair_cost ?? 0)
            - (float) ($this->assignment_fee ?? 0);

        return number_format($mao, 2, '.', '');
    }

    /**
     * A deal is "closed" once it's marked won or lost. There is no dedicated
     * closed_at column — it's derived from won_at / lost_at. Note: this is a
     * computed attribute, so it can't be used in SQL where() clauses; query
     * won_at / lost_at directly for those.
     */
    public function getClosedAtAttribute(): ?Carbon
    {
        return $this->won_at ?? $this->lost_at;
    }

    public function touchActivity(): void
    {
        $this->update(['last_activity_at' => now()]);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'deal_contact');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    public function pipelineStage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function notes(): MorphMany
    {
        return $this->morphMany(Note::class, 'notable');
    }

    public function tasks(): MorphMany
    {
        return $this->morphMany(Task::class, 'taskable');
    }

    public function callLogs(): HasMany
    {
        return $this->hasMany(CallLog::class);
    }

    public function emailLogs(): HasMany
    {
        return $this->hasMany(EmailLog::class);
    }

    public function smsLogs(): HasMany
    {
        return $this->hasMany(SmsLog::class);
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(Meeting::class);
    }

    public function assignedUsers(): MorphToMany
    {
        return $this->morphToMany(User::class, 'assignable', 'assigned_users')
            ->withPivot('assigned_by')
            ->withTimestamps();
    }

    public function timelineEvents(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function markAsWon(): void
    {
        $wonStage = $this->pipeline->stages()->where('type', 'won')->first();

        if ($wonStage) {
            $oldStage = $this->pipelineStage;
            $this->update([
                'pipeline_stage_id' => $wonStage->id,
                'won_at' => now(),
                'lost_at' => null,
                'lost_reason' => null,
            ]);

            TimelineService::log(
                user: $this->user,
                eventType: 'deal_won',
                subject: 'Deal marked as won',
                deal: $this,
                contact: $this->contacts->first(),
                metadata: ['old_stage' => $oldStage?->name, 'value' => $this->value],
            );
        }
    }

    public function markAsLost(?string $reason = null): void
    {
        $lostStage = $this->pipeline->stages()->where('type', 'lost')->first();

        if ($lostStage) {
            $oldStage = $this->pipelineStage;
            $this->update([
                'pipeline_stage_id' => $lostStage->id,
                'lost_at' => now(),
                'lost_reason' => $reason,
                'won_at' => null,
            ]);

            TimelineService::log(
                user: $this->user,
                eventType: 'deal_lost',
                subject: 'Deal marked as lost',
                deal: $this,
                contact: $this->contacts->first(),
                metadata: ['old_stage' => $oldStage?->name, 'reason' => $reason],
            );
        }
    }
}
