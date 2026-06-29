<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * A standalone, block-based lead-capture page (Buyer / Seller / …).
 *
 * Mirrors the AgentWebsite content model — content lives in the `page_data`
 * JSON column as an ordered `blocks` array — but is a single page tuned for
 * conversion rather than a multi-page site.
 */
class LandingPage extends Model
{
    /** @use HasUuids<HasUuids> */
    use HasUuids;

    /** Custom-domain lifecycle — mirrors AgentWebsite so the shared service works for both. */
    public const DOMAIN_PENDING = 'pending';

    public const DOMAIN_CONNECTED = 'connected';

    protected $fillable = [
        'user_id',
        'team_id',
        'slug',
        'name',
        'type',
        'kind',
        'template',
        'accent_color',
        'agent_name',
        'agent_email',
        'agent_phone',
        'agent_photo',
        'page_data',
        'meta_title',
        'meta_description',
        'is_published',
        'submissions_count',
        'custom_domain',
        'domain_status',
        'domain_verification_token',
        'domain_verified_at',
        'domain_last_checked_at',
    ];

    protected function casts(): array
    {
        return [
            'page_data' => 'array',
            'is_published' => 'boolean',
            'submissions_count' => 'integer',
            'domain_verified_at' => 'datetime',
            'domain_last_checked_at' => 'datetime',
        ];
    }

    /** Only the `uuid` column is auto-generated; the table keeps its bigint PK. */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(LandingPageMedia::class);
    }

    /** Ordered, visible blocks for rendering. */
    public function blocks(): array
    {
        return array_values(array_filter(
            $this->page_data['blocks'] ?? [],
            fn ($b) => empty($b['hidden'])
        ));
    }

    public static function generateSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'landing-page';
        $slug = $base;
        $i = 2;
        while (static::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
