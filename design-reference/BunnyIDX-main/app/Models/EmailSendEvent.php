<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single Resend (Svix) webhook event. See the create_email_send_events
 * migration for the column contract. `event_id` (svix-id) is the dedup key.
 */
class EmailSendEvent extends Model
{
    protected $fillable = [
        'email_send_log_id',
        'provider',
        'event_id',
        'event_type',
        'provider_message_id',
        'recipient',
        'clicked_url',
        'payload',
        'occurred_at',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'occurred_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    public function emailSendLog(): BelongsTo
    {
        return $this->belongsTo(EmailSendLog::class);
    }
}
