<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One user's Power Dialer working session. Owns an ordered queue of
 * DialerSessionCall rows; `current_position` is the cursor into that queue.
 *
 * State transitions:
 *   active   ─pause()──▶ paused
 *   paused   ─resume()─▶ active
 *   active/paused ─end()─▶ completed
 *   active/paused ─[scheduler 24h]─▶ abandoned
 */
class DialerSession extends Model
{
    use BelongsToTeamOrUser;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_PAUSED = 'paused';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_ABANDONED = 'abandoned';

    public const SOURCE_CONTACTS = 'contacts';
    public const SOURCE_SMART_LIST = 'smart_list';
    public const SOURCE_TASKS = 'tasks';
    public const SOURCE_MANUAL = 'manual';

    protected $fillable = [
        'user_id',
        'team_id',
        'name',
        'status',
        'source_type',
        'source_id',
        'calling_script_id',
        'total_contacts',
        'current_position',
        'calls_attempted',
        'calls_connected',
        'calls_voicemail',
        'calls_no_answer',
        'calls_wrong_number',
        'calls_dnc',
        'callbacks_scheduled',
        'calls_skipped',
        'started_at',
        'paused_at',
        'last_resumed_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'total_contacts' => 'integer',
            'current_position' => 'integer',
            'calls_attempted' => 'integer',
            'calls_connected' => 'integer',
            'calls_voicemail' => 'integer',
            'calls_no_answer' => 'integer',
            'calls_wrong_number' => 'integer',
            'calls_dnc' => 'integer',
            'callbacks_scheduled' => 'integer',
            'calls_skipped' => 'integer',
            'started_at' => 'datetime',
            'paused_at' => 'datetime',
            'last_resumed_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function calls(): HasMany
    {
        return $this->hasMany(DialerSessionCall::class)->orderBy('position');
    }

    public function callingScript(): BelongsTo
    {
        return $this->belongsTo(CallingScript::class);
    }

    /**
     * The next pending call (cursor lookup). Null when the queue is exhausted.
     */
    public function nextCall(): ?DialerSessionCall
    {
        return $this->calls()
            ->where('status', DialerSessionCall::STATUS_PENDING)
            ->orderBy('position')
            ->first();
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isPaused(): bool
    {
        return $this->status === self::STATUS_PAUSED;
    }

    public function isFinished(): bool
    {
        return in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_ABANDONED], true);
    }

    /**
     * Mapping from disposition string → which stats counter to bump.
     * Kept on the parent model so the controller can use it without hardcoding.
     */
    public const DISPOSITION_TO_COUNTER = [
        DialerSessionCall::DISPOSITION_CONNECTED => 'calls_connected',
        DialerSessionCall::DISPOSITION_VOICEMAIL => 'calls_voicemail',
        DialerSessionCall::DISPOSITION_NO_ANSWER => 'calls_no_answer',
        DialerSessionCall::DISPOSITION_WRONG_NUMBER => 'calls_wrong_number',
        DialerSessionCall::DISPOSITION_DO_NOT_CALL => 'calls_dnc',
        DialerSessionCall::DISPOSITION_CALLBACK => 'callbacks_scheduled',
    ];
}
