<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactFile extends Model
{
    protected $fillable = [
        'contact_id',
        'user_id',
        'team_id',
        'original_name',
        'path',
        'mime_type',
        'size',
        'description',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
