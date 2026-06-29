<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelnyxCampaign extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'telnyx_brand_id',
        'telnyx_campaign_id',
        'use_case',
        'description',
        'sample_message_1',
        'sample_message_2',
        'subscriber_optin',
        'subscriber_optout',
        'subscriber_help',
        'status',
        'rejection_reasons',
    ];

    protected function casts(): array
    {
        return [
            'subscriber_optin' => 'boolean',
            'subscriber_optout' => 'boolean',
            'subscriber_help' => 'boolean',
            'rejection_reasons' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(TelnyxBrand::class, 'telnyx_brand_id');
    }
}
