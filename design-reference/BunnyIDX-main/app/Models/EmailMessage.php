<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailMessage extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'email_account_id',
        'email_thread_id',
        'contact_id',
        'deal_id',
        'gmail_message_id',
        'direction',
        'from_address',
        'from_name',
        'to_addresses',
        'cc_addresses',
        'bcc_addresses',
        'subject',
        'body_text',
        'body_html',
        'snippet',
        'label_ids',
        'is_read',
        'is_starred',
        'has_attachments',
        'attachments_metadata',
        'in_reply_to',
        'references',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'to_addresses' => 'array',
            'cc_addresses' => 'array',
            'bcc_addresses' => 'array',
            'label_ids' => 'array',
            'attachments_metadata' => 'array',
            'is_read' => 'boolean',
            'is_starred' => 'boolean',
            'has_attachments' => 'boolean',
            'sent_at' => 'datetime',
        ];
    }

    // Relationships

    public function emailAccount(): BelongsTo
    {
        return $this->belongsTo(EmailAccount::class);
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(EmailThread::class, 'email_thread_id');
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
}
