<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\IsDirectoryListing;
use Illuminate\Database\Eloquent\Model;

/**
 * One project in the New Developments catalog. Rows with a null
 * agent_website_id are the admin-curated platform catalog shared by every
 * agent website; rows with an agent_website_id are owner-created and render
 * only on that site. Sites opt in and pick their source (platform / own /
 * both) via page_data._config.new_developments. Deliberate duplicate of
 * CondoBuilding — shared behavior lives in IsDirectoryListing.
 */
class NewDevelopment extends Model
{
    use IsDirectoryListing;

    public const STATUSES = ['pre-construction', 'under-construction', 'completed'];

    public const CONFIG_KEY = 'new_developments';

    public const SLUG_FALLBACK = 'development';

    protected $fillable = [
        'agent_website_id',
        'name',
        'slug',
        'area',
        'city',
        'zip',
        'address',
        'image',
        'logo',
        'description',
        'developer',
        'developer_id',
        'developer_info',
        'architect',
        'interior_design',
        'status',
        'completion_year',
        'price_label',
        'highlights',
        'video_url',
        'brochure',
        'floor_plans',
        'gallery',
        'key_details',
        'deposit_schedule',
        'mls_keyword',
        'lat',
        'lng',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'highlights' => 'array',
        'floor_plans' => 'array',
        'gallery' => 'array',
        'key_details' => 'array',
        'deposit_schedule' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'lat' => 'float',
        'lng' => 'float',
    ];
}
