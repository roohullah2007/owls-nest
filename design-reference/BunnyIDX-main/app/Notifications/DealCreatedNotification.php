<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Deal;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DealCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Deal $deal,
        private User $createdBy,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];
        $prefs = $notifiable->notification_preferences ?? [];

        if (!empty($prefs['email_deal_created'])) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'BunnyIDX');
        $value = $this->deal->value ? ' ($' . number_format((float) $this->deal->value, 0) . ')' : '';

        return (new MailMessage)
            ->subject("New Deal Created: {$this->deal->title} — {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("**{$this->createdBy->name}** created a new deal on your team:")
            ->line("**{$this->deal->title}**{$value}")
            ->action('View Deal', url("/crm/transactions/{$this->deal->id}"))
            ->line('You can manage your email preferences in Settings.')
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'deal_created',
            'deal_id' => $this->deal->id,
            'deal_title' => $this->deal->title,
            'created_by' => $this->createdBy->name,
            'message' => "{$this->createdBy->name} created a new deal: {$this->deal->title}",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
