<?php

namespace Tests\Feature\Crm;

use App\Models\Meeting;
use App\Models\User;
use App\Notifications\MeetingReminderNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MeetingReminderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_needs_reminder_scope_selects_only_due_unsent_meetings(): void
    {
        // Due: starts in 10 min, remind 30 min before → reminder time is in the past.
        $due = $this->makeMeeting(startsInMinutes: 10, reminderMinutes: 30);
        // Not yet due: starts in 2h, remind 10 min before → reminder time in the future.
        $this->makeMeeting(startsInMinutes: 120, reminderMinutes: 10);
        // Already sent.
        $this->makeMeeting(startsInMinutes: 10, reminderMinutes: 30, reminderSentAt: now());
        // No reminder configured.
        $this->makeMeeting(startsInMinutes: 10, reminderMinutes: null);
        // Completed.
        $this->makeMeeting(startsInMinutes: 10, reminderMinutes: 30, completed: true);

        $ids = Meeting::needsReminder()->pluck('id');

        $this->assertCount(1, $ids);
        $this->assertTrue($ids->contains($due->id));
    }

    public function test_send_meeting_reminders_command_runs_and_marks_sent(): void
    {
        Notification::fake();

        $meeting = $this->makeMeeting(startsInMinutes: 10, reminderMinutes: 30);

        $this->artisan('reminders:send --type=meeting')->assertSuccessful();

        Notification::assertSentTo($this->user, MeetingReminderNotification::class);
        $this->assertNotNull($meeting->fresh()->reminder_sent_at);
    }

    private function makeMeeting(
        int $startsInMinutes,
        ?int $reminderMinutes,
        bool $completed = false,
        $reminderSentAt = null,
    ): Meeting {
        return Meeting::create([
            'user_id' => $this->user->id,
            'title' => 'Test meeting',
            'meeting_type' => 'video',
            'starts_at' => now()->addMinutes($startsInMinutes),
            'is_completed' => $completed,
            'reminder_minutes' => $reminderMinutes,
            'reminder_sent_at' => $reminderSentAt,
        ]);
    }
}
