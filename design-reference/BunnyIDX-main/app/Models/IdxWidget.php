<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdxWidget extends Model
{
    protected $fillable = [
        'user_id',
        'license_id',
        'idx_search_id',
        'name',
        'widget_type',
        'mls_slug',
        'appearance',
        'config',
        'custom_css',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'appearance' => 'array',
            'config' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class);
    }

    public function search(): BelongsTo
    {
        return $this->belongsTo(IdxSearch::class, 'idx_search_id');
    }
}
