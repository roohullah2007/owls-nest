<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RelayLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'license_id',
        'mls_slug',
        'endpoint',
        'params_hash',
        'http_status',
        'response_ms',
        'was_cached',
        'error_message',
        'requested_at',
    ];

    protected function casts(): array
    {
        return [
            'was_cached' => 'boolean',
            'requested_at' => 'datetime',
        ];
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class);
    }
}
