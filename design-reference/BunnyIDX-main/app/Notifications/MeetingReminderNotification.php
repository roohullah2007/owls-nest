<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Meeting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MeetingReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Meeting $meeting,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];
        $prefs = $notifiable->notification_preferences ?? [];

        if (!empty($prefs['email_reminders'])) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'BunnyIDX');
        $time = $this->meeting->starts_at->format('M j, Y g:ia');

        return (new MailMessage)
            ->subject("Meeting Reminder: {$this->meeting->title} — {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("Your meeting is coming up:")
            ->line("**{$this->meeting->title}** at {$time}")
            ->when($this->meeting->location, fn ($mail) => $mail->line("Location: {$this->meeting->location}"))
            ->action('View Calendar', url('/crm/calendar'))
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'meeting_reminder',
            'meeting_id' => $this->meeting->id,
            'meeting_title' => $this->meeting->title,
            'starts_at' => $this->meeting->starts_at->toIso8601String(),
            'message' => "Meeting: {$this->meeting->title} at {$this->meeting->starts_at->format('g:ia')}",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
