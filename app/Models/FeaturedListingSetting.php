<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Singleton configuration for the public Featured Listings page. There is at
 * most one row; use FeaturedListingSetting::current() to read it.
 *
 * @property int $id
 * @property string|null $search_query
 * @property array<int,string>|null $mls_slugs
 * @property string|null $agent_id
 * @property string|null $office_id
 * @property int $result_limit
 * @property bool $is_active
 */
class FeaturedListingSetting extends Model
{
    protected $fillable = [
        'search_query',
        'mls_slugs',
        'agent_id',
        'office_id',
        'result_limit',
        'is_active',
    ];

    /**
     * Defaults for a fresh (never-saved) singleton — mirrors the migration
     * column defaults so current() returns a sensible shape before first save.
     */
    protected $attributes = [
        'result_limit' => 12,
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'mls_slugs' => 'array',
            'is_active' => 'boolean',
            'result_limit' => 'integer',
        ];
    }

    /**
     * The singleton config row. Returns an unsaved instance with defaults when
     * none exists yet — callers persist explicitly via save().
     */
    public static function current(): self
    {
        return static::query()->firstOrNew([]);
    }
}
