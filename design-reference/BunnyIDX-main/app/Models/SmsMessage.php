<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsMessage extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'contact_id',
        'phone_number_id',
        'telnyx_message_id',
        'direction',
        'from_number',
        'to_number',
        'body',
        'status',
        'error_code',
        'segment_count',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'segment_count' => 'integer',
            'read_at' => 'datetime',
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

    public function phoneNumber(): BelongsTo
    {
        return $this->belongsTo(PhoneNumber::class);
    }

    public function scopeThread(Builder $query, int $contactId): Builder
    {
        return $query->where('contact_id', $contactId)->orderBy('created_at', 'asc');
    }
}
