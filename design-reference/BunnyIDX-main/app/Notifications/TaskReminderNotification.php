<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Task $task,
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
        $due = $this->task->due_at
            ? $this->task->due_at->format('M j, Y g:ia')
            : ($this->task->due_date ? $this->task->due_date->format('M j, Y') : 'No due date');

        return (new MailMessage)
            ->subject("Reminder: {$this->task->title} — {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("This is a reminder for your task:")
            ->line("**{$this->task->title}**")
            ->line("Due: {$due}")
            ->action('View Tasks', url('/crm/tasks'))
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'task_reminder',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'message' => "Reminder: {$this->task->title}",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
