<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallRecord extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'contact_id',
        'deal_id',
        'phone_number_id',
        'telnyx_call_control_id',
        'direction',
        'from_number',
        'to_number',
        'status',
        'duration_seconds',
        'is_recorded',
        'recording_url',
        'notes',
        'started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'is_recorded' => 'boolean',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function phoneNumber(): BelongsTo
    {
        return $this->belongsTo(PhoneNumber::class);
    }
}
