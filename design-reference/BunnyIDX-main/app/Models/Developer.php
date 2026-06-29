<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * A real-estate developer in the New Developments taxonomy. Platform rows
 * (null agent_website_id) are shared by every site; site-owned rows are
 * created by owners in the website editor and visible only to that site.
 */
class Developer extends Model
{
    protected $fillable = [
        'agent_website_id',
        'name',
        'slug',
        'logo',
        'info',
    ];

    public function developments(): HasMany
    {
        return $this->hasMany(NewDevelopment::class);
    }

    /** Platform developers plus the given site's own. */
    public function scopeVisibleToSite($query, AgentWebsite $site)
    {
        return $query->where(function ($q) use ($site) {
            $q->whereNull('agent_website_id')->orWhere('agent_website_id', $site->id);
        });
    }

    public static function generateSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'developer';
        $slug = $base;
        $i = 1;
        while (static::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
