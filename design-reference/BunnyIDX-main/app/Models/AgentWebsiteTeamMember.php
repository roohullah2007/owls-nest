<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A member of a site's team — public /team grid, per-member page (bio +
 * their MLS listings via mls_agent_id) and the Team content block.
 */
class AgentWebsiteTeamMember extends Model
{
    protected $fillable = [
        'agent_website_id', 'name', 'slug', 'title', 'photo', 'phone',
        'email', 'bio', 'socials', 'mls_agent_id', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'socials' => 'array',
        'is_active' => 'boolean',
    ];

    public function website(): BelongsTo
    {
        return $this->belongsTo(AgentWebsite::class, 'agent_website_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
