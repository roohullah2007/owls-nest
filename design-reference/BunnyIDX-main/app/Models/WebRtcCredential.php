<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebRtcCredential extends Model
{
    protected $fillable = [
        'user_id',
        'telnyx_credential_id',
        'sip_username',
        'sip_password',
    ];

    protected function casts(): array
    {
        return [
            'sip_password' => 'encrypted',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
