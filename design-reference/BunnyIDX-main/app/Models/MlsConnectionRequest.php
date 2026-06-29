<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MlsConnectionRequest extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_IN_PROCESS = 'in_process';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_INTEGRATED = 'integrated';
    public const STATUS_DENIED = 'denied';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_IN_PROCESS,
        self::STATUS_COMPLETED,
        self::STATUS_INTEGRATED,
        self::STATUS_DENIED,
    ];

    protected $fillable = [
        'user_id',
        'team_id',
        'mls_provider_id',
        'status',
        'feed_types_requested',
        'agent_mls_id',
        'agent_license_number',
        'nrds_id',
        'office_mls_id',
        'broker_mls_id',
        'brokerage_name',
        'idx_domain',
        'listing_scope',
        'is_principal_broker',
        'principal_broker_name',
        'principal_broker_email',
        'user_notes',
        'admin_notes',
        'denied_reason',
        'processed_by_user_id',
        'processed_at',
        'integrated_at',
        'idx_connection_id',
    ];

    protected function casts(): array
    {
        return [
            'feed_types_requested' => 'array',
            'is_principal_broker' => 'boolean',
            'processed_at' => 'datetime',
            'integrated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function mlsProvider(): BelongsTo
    {
        return $this->belongsTo(MlsProvider::class);
    }

    public function idxConnection(): BelongsTo
    {
        return $this->belongsTo(IdxConnection::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_IN_PROCESS, self::STATUS_COMPLETED], true);
    }
}
