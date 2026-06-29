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

class TeamMentionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private User $mentionedBy,
        private string $messageBody,
    ) {}

    public function via(object $notifiable): array
    {
        // Mentions always send email — they're high-priority
        return ['database', 'broadcast', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'BunnyIDX');
        $preview = Str::limit($this->stripMentionMarkup($this->messageBody), 150);

        return (new MailMessage)
            ->subject("You were mentioned by {$this->mentionedBy->name} — {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("**{$this->mentionedBy->name}** mentioned you in team chat:")
            ->line("> {$preview}")
            ->action('View in Team Chat', url('/crm'))
            ->line("You're receiving this because you were directly mentioned. You can update your notification preferences in Settings.")
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'team_mention',
            'mentioned_by_id' => $this->mentionedBy->id,
            'mentioned_by' => $this->mentionedBy->name,
            'message_preview' => Str::limit($this->messageBody, 100),
            'message' => "{$this->mentionedBy->name} mentioned you in team chat",
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
