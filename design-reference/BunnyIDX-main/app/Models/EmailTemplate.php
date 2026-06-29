<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A stored override of a default email template. Resolution + safe rendering
 * live in App\Services\Email\EmailTemplateRenderer; defaults live in
 * App\Services\Email\DefaultEmailTemplates.
 */
class EmailTemplate extends Model
{
    public const TYPES = [
        'email_verification',
        'password_reset',
        'new_lead_notification',
        'saved_search_alert',
        'property_update_alert',
        'action_plan_email',
    ];

    protected $fillable = [
        'user_id',
        'team_id',
        'type',
        'subject',
        'body_html',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
