<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Meeting;
use App\Models\Task;
use App\Models\User;
use App\Notifications\DailyMeetingSummaryNotification;
use App\Notifications\MeetingReminderNotification;
use App\Notifications\OverdueTasksDigestNotification;
use App\Notifications\TaskReminderNotification;
use Illuminate\Console\Command;

class SendReminders extends Command
{
    protected $signature = 'reminders:send {--type=all : all|task|meeting|overdue-digest|meeting-summary}';
    protected $description = 'Send task/meeting reminders and daily digests';

    public function handle(): int
    {
        $type = $this->option('type');

        match ($type) {
            'task' => $this->sendTaskReminders(),
            'meeting' => $this->sendMeetingReminders(),
            'overdue-digest' => $this->sendOverdueTasksDigest(),
            'meeting-summary' => $this->sendDailyMeetingSummary(),
            default => $this->sendAll(),
        };

        return self::SUCCESS;
    }

    private function sendAll(): void
    {
        $this->sendTaskReminders();
        $this->sendMeetingReminders();
    }

    private function sendTaskReminders(): void
    {
        $tasks = Task::needsReminder()->with('user')->get();

        foreach ($tasks as $task) {
            if ($task->user) {
                $task->user->notify(new TaskReminderNotification($task));
            }
            $task->update(['reminder_sent_at' => now()]);
        }

        $this->info("Sent {$tasks->count()} task reminder(s).");
    }

    private function sendMeetingReminders(): void
    {
        $meetings = Meeting::needsReminder()->with('user')->get();

        foreach ($meetings as $meeting) {
            if ($meeting->user) {
                $meeting->user->notify(new MeetingReminderNotification($meeting));
            }
            $meeting->update(['reminder_sent_at' => now()]);
        }

        $this->info("Sent {$meetings->count()} meeting reminder(s).");
    }

    private function sendOverdueTasksDigest(): void
    {
        $count = 0;

        User::whereHas('tasks', fn ($q) => $q->overdue())
            ->chunk(100, function ($users) use (&$count) {
                foreach ($users as $user) {
                    $overdueTasks = $user->tasks()->overdue()->orderBy('due_at')->get();
                    if ($overdueTasks->isNotEmpty()) {
                        $user->notify(new OverdueTasksDigestNotification($overdueTasks));
                        $count++;
                    }
                }
            });

        $this->info("Sent overdue digest to {$count} user(s).");
    }

    private function sendDailyMeetingSummary(): void
    {
        $count = 0;

        User::whereHas('meetings', fn ($q) => $q
            ->where('is_completed', false)
            ->whereDate('starts_at', today())
        )->chunk(100, function ($users) use (&$count) {
            foreach ($users as $user) {
                $meetings = $user->meetings()
                    ->where('is_completed', false)
                    ->whereDate('starts_at', today())
                    ->orderBy('starts_at')
                    ->get();

                if ($meetings->isNotEmpty()) {
                    $user->notify(new DailyMeetingSummaryNotification($meetings));
                    $count++;
                }
            }
        });

        $this->info("Sent meeting summary to {$count} user(s).");
    }
}
