<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * A single item in a landing page's Media Library. Every image uploaded through
 * the editor is recorded here so it can be re-inserted from the picker later.
 */
class LandingPageMedia extends Model
{
    protected $table = 'landing_page_media';

    protected $fillable = [
        'landing_page_id',
        'path',
        'filename',
        'mime',
        'size',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    protected $appends = ['url'];

    public function landingPage(): BelongsTo
    {
        return $this->belongsTo(LandingPage::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->path);
    }
}
