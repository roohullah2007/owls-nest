<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailLog extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'contact_id',
        'deal_id',
        'direction',
        'from_address',
        'to_address',
        'cc',
        'bcc',
        'subject',
        'body_preview',
        'thread_id',
        'sent_at',
        'opened_at',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'opened_at' => 'datetime',
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
}
