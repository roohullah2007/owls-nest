<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ChatAttachment extends Model
{
    protected $fillable = [
        'team_chat_message_id',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size',
    ];

    protected $appends = ['url', 'is_image', 'is_audio'];

    public function message(): BelongsTo
    {
        return $this->belongsTo(TeamChatMessage::class, 'team_chat_message_id');
    }

    public function getUrlAttribute(): string
    {
        $disk = Storage::disk($this->disk);

        if ($this->disk === 's3') {
            return $disk->temporaryUrl($this->path, now()->addMinutes(30));
        }

        // Use relative URL to avoid APP_URL port mismatch in dev
        return '/storage/' . $this->path;
    }

    public function getIsImageAttribute(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    public function getIsAudioAttribute(): bool
    {
        if (str_starts_with($this->mime_type, 'audio/')) {
            return true;
        }

        // MediaRecorder may produce video/webm for audio-only streams;
        // treat as audio when the original filename indicates a voice message
        if ($this->mime_type === 'video/webm' && str_starts_with($this->original_name, 'voice-message')) {
            return true;
        }

        return false;
    }
}
