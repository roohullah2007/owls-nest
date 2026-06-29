<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Pull new Gmail messages into the inbox every 3 minutes. Without this,
// replies from leads only show up after a manual sync. Run inline (--sync) so
// the poll actually performs the work in the scheduler process rather than
// only enqueueing jobs onto the "gmail-sync" queue (which requires a worker
// that consumes that queue). withoutOverlapping bounds the lock to 10 min so a
// slow/hung run can't block the next poll for the default 24h.
Schedule::command('gmail:sync-all --sync')->everyThreeMinutes()->withoutOverlapping(10);

Schedule::command('reminders:send --type=task')->everyMinute()->withoutOverlapping();
Schedule::command('reminders:send --type=meeting')->everyMinute()->withoutOverlapping();
Schedule::command('reminders:send --type=overdue-digest')->dailyAt('08:00')->withoutOverlapping();
Schedule::command('reminders:send --type=meeting-summary')->dailyAt('07:30')->withoutOverlapping();

// Advance action-plan enrollments: dispatch any step whose delay has elapsed.
Schedule::command('action-plans:tick')->everyMinute()->withoutOverlapping();

// Property alerts (saved-search matches + favorite price/status changes). Runs
// daily; the per-subscription cadence (daily / twice-weekly / weekly) and
// last-sent throttle are enforced inside the dispatched jobs, so a daily tick
// never over-sends. 08:15 keeps it clear of the morning digests above.
Schedule::command('property-alerts:dispatch')->dailyAt('08:15')->withoutOverlapping();
