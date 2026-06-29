<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

class DailyMeetingSummaryNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Collection $meetings,
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
        $count = $this->meetings->count();

        $mail = (new MailMessage)
            ->subject("Today's Schedule: {$count} meeting(s) — {$appName}")
            ->greeting("Good morning {$notifiable->name},")
            ->line("Here's your schedule for today:");

        foreach ($this->meetings->take(10) as $meeting) {
            $time = $meeting->starts_at->format('g:ia');
            $mail->line("- {$time} — {$meeting->title}");
        }

        return $mail
            ->action('View Calendar', url('/crm/calendar'))
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'daily_meeting_summary',
            'count' => $this->meetings->count(),
            'message' => "Today's schedule: {$this->meetings->count()} meeting(s)",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
