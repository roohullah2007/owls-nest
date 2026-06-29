<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Task $task,
        private User $createdBy,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];
        $prefs = $notifiable->notification_preferences ?? [];

        if (!empty($prefs['email_task_assigned'])) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'BunnyIDX');
        $due = $this->task->due_at ? ' — Due ' . $this->task->due_at->format('M j, Y') : '';

        return (new MailMessage)
            ->subject("Task Assigned: {$this->task->title} — {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("**{$this->createdBy->name}** assigned you a new task:")
            ->line("**{$this->task->title}**{$due}")
            ->action('View Tasks', url('/crm/tasks'))
            ->line('You can manage your email preferences in Settings.')
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'task_assigned',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'created_by' => $this->createdBy->name,
            'message' => "{$this->createdBy->name} assigned you a task: {$this->task->title}",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
