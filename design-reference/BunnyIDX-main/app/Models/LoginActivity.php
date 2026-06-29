<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'event', 'ip_address', 'user_agent', 'device', 'browser', 'platform', 'occurred_at'])]
class LoginActivity extends Model
{
    public const EVENT_LOGIN = 'login';
    public const EVENT_LOGOUT = 'logout';
    public const EVENT_FAILED = 'failed';
    public const EVENT_TWO_FACTOR_FAILED = '2fa_failed';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
