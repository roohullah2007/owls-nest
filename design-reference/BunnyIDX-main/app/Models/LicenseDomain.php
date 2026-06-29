<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LicenseDomain extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'license_id',
        'domain',
        'is_active',
        'activated_at',
        'deactivated_at',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'activated_at' => 'datetime',
            'deactivated_at' => 'datetime',
        ];
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class);
    }
}
