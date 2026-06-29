<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelnyxBrand extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'telnyx_brand_id',
        'company_name',
        'ein',
        'entity_type',
        'vertical',
        'website',
        'status',
        'rejection_reasons',
    ];

    protected function casts(): array
    {
        return [
            'ein' => 'encrypted',
            'rejection_reasons' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(TelnyxCampaign::class);
    }
}
