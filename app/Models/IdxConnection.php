<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdxConnection extends Model
{
    use BelongsToTeamOrUser, HasFactory;

    public const STATUS_UNTESTED = 'untested';

    public const STATUS_PASSED = 'passed';

    public const STATUS_FAILED = 'failed';

    public const PROVIDER_BRIDGE = 'bridge';

    public const PROVIDER_REALTYNA = 'realtyna';

    public const PROVIDER_REPLIERS = 'repliers';

    protected $fillable = [
        'user_id',
        'mls_provider_id',
        'provider',
        'mls_slug',
        'display_name',
        'api_key',
        'client_id',
        'client_secret',
        'agent_id',
        'office_id',
        'constraints',
        'is_active',
        'last_tested_at',
        'test_status',
    ];

    protected function casts(): array
    {
        return [
            // MLS secrets are encrypted at rest. client_id is an OAuth client
            // identifier (not a secret, paired with the encrypted client_secret) —
            // left plaintext per Laravel convention. Keys are admin-entered only.
            'api_key' => 'encrypted',
            'client_secret' => 'encrypted',
            'constraints' => 'array',
            'is_active' => 'boolean',
            'last_tested_at' => 'datetime',
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

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeConnected($query)
    {
        return $query->where('is_active', true)->where('test_status', self::STATUS_PASSED);
    }

    public function isConnected(): bool
    {
        return $this->test_status === self::STATUS_PASSED;
    }

    public function isByok(): bool
    {
        $dataset = config("idx.datasets.{$this->mls_slug}");

        return ($dataset['tier'] ?? '') === 'byok';
    }
}
