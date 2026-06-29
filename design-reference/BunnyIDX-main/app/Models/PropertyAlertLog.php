<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Audit + dedup row for one property-alert email. See the
 * create_property_alert_logs migration for the column contract.
 */
class PropertyAlertLog extends Model
{
    public const STATUS_QUEUED = 'queued';

    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    public const TYPE_SAVED_SEARCH = 'saved_search_match';

    public const TYPE_PRICE_DROP = 'price_drop';

    public const TYPE_STATUS_CHANGE = 'status_change';

    protected $fillable = [
        'user_id',
        'site_visitor_id',
        'contact_id',
        'site_visitor_saved_search_id',
        'email_send_log_id',
        'alert_type',
        'mls_slug',
        'listing_id',
        'idempotency_key',
        'status',
        'sent_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'sent_at' => 'datetime',
        ];
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(SiteVisitor::class, 'site_visitor_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function emailSendLog(): BelongsTo
    {
        return $this->belongsTo(EmailSendLog::class);
    }
}
