<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One row per outbound transactional/branded email sent through Resend.
 * See the create_email_send_logs migration for the column contract; delivery
 * tracking columns are filled in from Resend webhook events.
 */
class EmailSendLog extends Model
{
    public const STATUS_QUEUED = 'queued';

    public const STATUS_SENT = 'sent';

    public const STATUS_DELIVERED = 'delivered';

    public const STATUS_BOUNCED = 'bounced';

    public const STATUS_COMPLAINED = 'complained';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'team_id',
        'provider',
        'template_type',
        'recipient',
        'sender',
        'subject',
        'status',
        'provider_message_id',
        'error_message',
        'branded',
        'quota_category',
        'counts_toward_quota',
        'idempotency_key',
        'meta',
        'sent_at',
        'delivered_at',
        'opened_at',
        'last_opened_at',
        'clicked_at',
        'last_clicked_at',
        'bounce_reason',
        'complaint_at',
        'failed_reason',
    ];

    protected function casts(): array
    {
        return [
            'branded' => 'boolean',
            'counts_toward_quota' => 'boolean',
            'meta' => 'array',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'opened_at' => 'datetime',
            'last_opened_at' => 'datetime',
            'clicked_at' => 'datetime',
            'last_clicked_at' => 'datetime',
            'complaint_at' => 'datetime',
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

    public function events(): HasMany
    {
        return $this->hasMany(EmailSendEvent::class);
    }
}
