<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IdxSearch extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'mls_slug',
        'filters',
        'sort_by',
        'sort_dir',
        'per_page',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'per_page' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function widgets(): HasMany
    {
        return $this->hasMany(IdxWidget::class);
    }
}
