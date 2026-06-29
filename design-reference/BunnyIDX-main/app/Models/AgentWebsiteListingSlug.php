<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per-site SEO slug for a public listing-detail URL. Maps
 * /site/{site}/property/{slug} back to the (mls_slug, listing_id) pair the
 * MLS gateway resolves. Rows are created lazily by ListingSlugResolver as
 * listings are rendered on a site (search results, featured blocks).
 */
class AgentWebsiteListingSlug extends Model
{
    protected $fillable = [
        'agent_website_id',
        'slug',
        'mls_slug',
        'listing_id',
    ];

    public function website(): BelongsTo
    {
        return $this->belongsTo(AgentWebsite::class, 'agent_website_id');
    }
}
