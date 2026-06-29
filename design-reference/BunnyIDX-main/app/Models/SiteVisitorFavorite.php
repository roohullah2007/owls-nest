<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A listing favorited by a site visitor (snapshot keeps the panel MLS-free). */
class SiteVisitorFavorite extends Model
{
    protected $fillable = [
        'site_visitor_id',
        'mls_slug',
        'listing_id',
        'snapshot',
        'last_alerted_at',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'last_alerted_at' => 'datetime',
        ];
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(SiteVisitor::class, 'site_visitor_id');
    }
}
