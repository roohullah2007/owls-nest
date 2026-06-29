<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One position in a DialerSession's queue. Starts as 'pending'; when the agent dials
 * it flips to 'in_progress'; the disposition picker writes the outcome and flips to
 * 'completed' (or 'skipped').
 *
 * This is also the audit trail — "how many sessions has contact X been in" is a
 * simple WHERE contact_id = ? query against this table.
 */
class DialerSessionCall extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_SKIPPED = 'skipped';

    public const DISPOSITION_CONNECTED = 'connected';
    public const DISPOSITION_NO_ANSWER = 'no_answer';
    public const DISPOSITION_VOICEMAIL = 'voicemail';
    public const DISPOSITION_WRONG_NUMBER = 'wrong_number';
    public const DISPOSITION_DO_NOT_CALL = 'do_not_call';
    public const DISPOSITION_CALLBACK = 'callback_scheduled';

    public const ALL_DISPOSITIONS = [
        self::DISPOSITION_CONNECTED,
        self::DISPOSITION_NO_ANSWER,
        self::DISPOSITION_VOICEMAIL,
        self::DISPOSITION_WRONG_NUMBER,
        self::DISPOSITION_DO_NOT_CALL,
        self::DISPOSITION_CALLBACK,
    ];

    protected $fillable = [
        'dialer_session_id',
        'contact_id',
        'task_id',
        'position',
        'status',
        'disposition',
        'disposition_notes',
        'answers',
        'call_record_id',
        'duration_seconds',
        'callback_at',
        'attempted_at',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'duration_seconds' => 'integer',
            'answers' => 'array',
            'callback_at' => 'datetime',
            'attempted_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(DialerSession::class, 'dialer_session_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function callRecord(): BelongsTo
    {
        return $this->belongsTo(CallRecord::class);
    }
}
