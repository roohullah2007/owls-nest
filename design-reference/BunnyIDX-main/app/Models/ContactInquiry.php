<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactInquiry extends Model
{
    protected $fillable = [
        'contact_id',
        'user_id',
        'team_id',
        'listing_id',
        'listing_address',
        'subject',
        'message',
        'replies',
        'submitted_at',
        'source',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'replies' => 'array',
            'submitted_at' => 'datetime',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }
}
