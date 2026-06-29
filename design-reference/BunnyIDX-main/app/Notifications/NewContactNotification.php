<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewContactNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Contact $contact,
        private User $createdBy,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];
        $prefs = $notifiable->notification_preferences ?? [];

        if (!empty($prefs['email_new_contact'])) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'BunnyIDX');
        $contactName = trim("{$this->contact->first_name} {$this->contact->last_name}");
        $email = $this->contact->email ? " ({$this->contact->email})" : '';

        return (new MailMessage)
            ->subject("New Contact Added: {$contactName} — {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("**{$this->createdBy->name}** added a new contact to your team:")
            ->line("**{$contactName}**{$email}")
            ->action('View Contact', url("/crm/contacts/{$this->contact->uuid}"))
            ->line('You can manage your email preferences in Settings.')
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'new_contact',
            'contact_id' => $this->contact->id,
            'contact_uuid' => $this->contact->uuid,
            'contact_name' => "{$this->contact->first_name} {$this->contact->last_name}",
            'created_by' => $this->createdBy->name,
            'message' => "{$this->createdBy->name} added a new contact: {$this->contact->first_name} {$this->contact->last_name}",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
