<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Monthly property-alert email counter for one account. Overage maths lives in
 * PropertyAlertQuota so billing values stay configurable, not baked into the
 * model. See create_property_alert_usage migration.
 */
class PropertyAlertUsage extends Model
{
    protected $table = 'property_alert_usage';

    protected $fillable = [
        'user_id',
        'year_month',
        'property_alert_emails_sent',
        'included_limit',
    ];

    protected function casts(): array
    {
        return [
            'property_alert_emails_sent' => 'integer',
            'included_limit' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
