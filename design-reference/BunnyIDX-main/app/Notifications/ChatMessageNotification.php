<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\TeamChatMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class ChatMessageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private User $sender,
        private string $messageBody,
        private ?string $listingTitle = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'BunnyIDX');
        $preview = Str::limit($this->stripMentionMarkup($this->messageBody), 150);

        $mail = (new MailMessage)
            ->subject("New message from {$this->sender->name} — {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("**{$this->sender->name}** sent you a message in team chat:");

        if ($this->messageBody) {
            $mail->line("> {$preview}");
        }

        if ($this->listingTitle) {
            $mail->line("Shared listing: **{$this->listingTitle}**");
        }

        return $mail
            ->action('Open Team Chat', url('/crm'))
            ->line('You can manage your notification preferences in Settings.')
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        $message = $this->listingTitle
            ? "{$this->sender->name} shared a listing: {$this->listingTitle}"
            : "{$this->sender->name} sent you a message in team chat";

        return [
            'type' => 'team_mention',
            'mentioned_by_id' => $this->sender->id,
            'mentioned_by' => $this->sender->name,
            'message_preview' => Str::limit($this->messageBody, 100),
            'message' => $message,
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
