<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class BlogPost extends Model
{
    protected $fillable = [
        'agent_website_id',
        'slug',
        'title',
        'excerpt',
        'category',
        'body',
        'featured_image',
        'status',
        'published_at',
        'meta_title',
        'meta_description',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    public function agentWebsite(): BelongsTo
    {
        return $this->belongsTo(AgentWebsite::class);
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->where('published_at', '<=', now());
    }

    public static function generateSlug(string $title, int $websiteId): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $i = 1;
        while (static::where('agent_website_id', $websiteId)->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
