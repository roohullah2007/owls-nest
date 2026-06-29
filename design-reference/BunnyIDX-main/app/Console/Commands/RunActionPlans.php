<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\ProcessActionPlanStep;
use App\Models\ActionPlanEnrollment;
use Illuminate\Console\Command;

/**
 * Polls active action-plan enrollments whose next step is due and dispatches a
 * ProcessActionPlanStep job for each. Kept thin (the job does the work) and
 * runs every minute via routes/console.php — same pattern as reminders:send.
 */
class RunActionPlans extends Command
{
    protected $signature = 'action-plans:tick';

    protected $description = 'Dispatch due action-plan steps for active enrollments';

    public function handle(): int
    {
        $dispatched = 0;

        ActionPlanEnrollment::due()
            ->select('id')
            ->chunkById(200, function ($enrollments) use (&$dispatched) {
                foreach ($enrollments as $enrollment) {
                    ProcessActionPlanStep::dispatch($enrollment->id);
                    $dispatched++;
                }
            });

        $this->info("Dispatched {$dispatched} action-plan step(s).");

        return self::SUCCESS;
    }
}
