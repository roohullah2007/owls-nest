<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailThread extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'email_account_id',
        'contact_id',
        'deal_id',
        'gmail_thread_id',
        'subject',
        'snippet',
        'message_count',
        'is_read',
        'is_starred',
        'is_archived',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'message_count' => 'integer',
            'is_read' => 'boolean',
            'is_starred' => 'boolean',
            'is_archived' => 'boolean',
            'last_message_at' => 'datetime',
        ];
    }

    // Relationships

    public function emailAccount(): BelongsTo
    {
        return $this->belongsTo(EmailAccount::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(EmailMessage::class);
    }

    // Scopes

    public function scopeInbox(Builder $query): Builder
    {
        return $query->where('is_archived', false);
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->where('is_read', false);
    }

    public function scopeStarred(Builder $query): Builder
    {
        return $query->where('is_starred', true);
    }
}
