<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * A single item in a site's Media Library. Every image uploaded through the
 * editor is recorded here so it can be re-inserted from the picker later.
 */
class AgentWebsiteMedia extends Model
{
    protected $table = 'agent_website_media';

    protected $fillable = [
        'agent_website_id',
        'path',
        'filename',
        'mime',
        'size',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    protected $appends = ['url'];

    public function agentWebsite(): BelongsTo
    {
        return $this->belongsTo(AgentWebsite::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->path);
    }
}
