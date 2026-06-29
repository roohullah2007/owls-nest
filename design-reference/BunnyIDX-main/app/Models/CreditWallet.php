<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\Billing\CreditService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A phone-credit wallet (USD, stored in cents). One per billing owner — a team
 * owner for team accounts, or a solo user. Resolve/charge through
 * {@see CreditService} rather than mutating directly so
 * the ledger and balance stay consistent.
 */
class CreditWallet extends Model
{
    protected $fillable = [
        'user_id',
        'team_id',
        'balance_cents',
        'included_allowance_cents',
        'allowance_resets_at',
    ];

    protected function casts(): array
    {
        return [
            'balance_cents' => 'integer',
            'included_allowance_cents' => 'integer',
            'allowance_resets_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class);
    }

    public function balanceDollars(): float
    {
        return round($this->balance_cents / 100, 2);
    }
}
