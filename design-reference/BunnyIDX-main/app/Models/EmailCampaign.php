<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailCampaign extends Model
{
    use BelongsToTeamOrUser, HasFactory;

    protected $fillable = [
        'user_id',
        'team_id',
        'email_account_id',
        'subject',
        'body_html',
        'status',
        'total_recipients',
        'sent_count',
        'failed_count',
        'skipped_count',
        'contact_ids',
        'sent_contact_ids',
        'failed_contact_ids',
        'errors',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'contact_ids' => 'array',
        'sent_contact_ids' => 'array',
        'failed_contact_ids' => 'array',
        'errors' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function emailAccount(): BelongsTo
    {
        return $this->belongsTo(EmailAccount::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isSending(): bool
    {
        return $this->status === 'sending';
    }

    public function isPaused(): bool
    {
        return $this->status === 'paused';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }
}
