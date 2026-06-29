<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class NoteMentionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private User $mentionedBy,
        private string $noteBody,
        private string $notableType,
        private int $notableId,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        $preview = Str::limit($this->stripMentionMarkup($this->noteBody), 100);

        return [
            'type' => 'note_mention',
            'mentioned_by_id' => $this->mentionedBy->id,
            'mentioned_by' => $this->mentionedBy->name,
            'message_preview' => $preview,
            'message' => "{$this->mentionedBy->name} mentioned you in a note",
            'notable_type' => $this->notableType,
            'notable_id' => $this->notableId,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    private function stripMentionMarkup(string $body): string
    {
        return preg_replace('/@\[([^\]]+)\]\(\d+\)/', '@$1', $body);
    }
}
