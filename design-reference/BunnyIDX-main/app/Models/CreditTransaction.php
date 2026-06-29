<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\Billing\CreditService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Append-only ledger entry for a credit wallet. `amount_cents` is always
 * positive; `direction` gives the sign. Created only by
 * {@see CreditService}.
 */
class CreditTransaction extends Model
{
    public const DIRECTION_DEBIT = 'debit';

    public const DIRECTION_CREDIT = 'credit';

    public const CATEGORY_SMS = 'sms';

    public const CATEGORY_VOICE = 'voice';

    public const CATEGORY_NUMBER_RENTAL = 'number_rental';

    public const CATEGORY_MONTHLY_GRANT = 'monthly_grant';

    public const CATEGORY_PURCHASE = 'purchase';

    public const CATEGORY_REFUND = 'refund';

    public const CATEGORY_ADJUSTMENT = 'adjustment';

    protected $fillable = [
        'credit_wallet_id',
        'user_id',
        'direction',
        'category',
        'amount_cents',
        'balance_after_cents',
        'description',
        'stripe_reference',
        'reference_type',
        'reference_id',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'balance_after_cents' => 'integer',
            'meta' => 'array',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(CreditWallet::class, 'credit_wallet_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
