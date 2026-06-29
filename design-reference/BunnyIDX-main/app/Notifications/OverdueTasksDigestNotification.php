<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

class OverdueTasksDigestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Collection $tasks,
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
        $count = $this->tasks->count();

        $mail = (new MailMessage)
            ->subject("You have {$count} overdue task(s) — {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("You have **{$count} overdue task(s)** that need attention:");

        foreach ($this->tasks->take(10) as $task) {
            $due = $task->due_at ? $task->due_at->format('M j') : ($task->due_date ? $task->due_date->format('M j') : '');
            $mail->line("- {$task->title}" . ($due ? " (due {$due})" : ''));
        }

        if ($count > 10) {
            $mail->line("...and " . ($count - 10) . " more.");
        }

        return $mail
            ->action('View Tasks', url('/crm/tasks?filter=overdue'))
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'overdue_tasks_digest',
            'count' => $this->tasks->count(),
            'message' => "You have {$this->tasks->count()} overdue task(s)",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
