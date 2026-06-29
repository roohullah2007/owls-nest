<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactOffer extends Model
{
    protected $fillable = [
        'contact_id',
        'user_id',
        'team_id',
        'listing_id',
        'listing_address',
        'amount',
        'status',
        'notes',
        'replies',
        'submitted_at',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
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
