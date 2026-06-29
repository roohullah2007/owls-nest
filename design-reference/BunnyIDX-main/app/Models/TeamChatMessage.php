<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeamChatMessage extends Model
{
    protected $fillable = [
        'team_id',
        'user_id',
        'body',
        'mentions',
        'contact_id',
        'reply_to_id',
        'listing_id',
        'deal_id',
        'recipient_id',
        'edited_at',
        'is_ai_response',
        'reactions',
    ];

    protected function casts(): array
    {
        return [
            'mentions' => 'array',
            'edited_at' => 'datetime',
            'is_ai_response' => 'boolean',
            'reactions' => 'array',
        ];
    }

    public function getIsStickerAttribute(): bool
    {
        return (bool) preg_match('/^sticker:[a-z0-9_-]+$/', $this->body ?? '');
    }

    public function getStickerNameAttribute(): ?string
    {
        if (preg_match('/^sticker:([a-z0-9_-]+)$/', $this->body ?? '', $matches)) {
            return $matches[1];
        }

        return null;
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reply_to_id');
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ChatAttachment::class);
    }
}
