<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A search (filter payload + free text) a site visitor saved to their account. */
class SiteVisitorSavedSearch extends Model
{
    protected $fillable = [
        'site_visitor_id',
        'name',
        'filters',
        'search_text',
        'last_alerted_at',
        'seen_listing_ids',
        'alerts_enabled',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'seen_listing_ids' => 'array',
            'alerts_enabled' => 'boolean',
            'last_alerted_at' => 'datetime',
        ];
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(SiteVisitor::class, 'site_visitor_id');
    }
}
