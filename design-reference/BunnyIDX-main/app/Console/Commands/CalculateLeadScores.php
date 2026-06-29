<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Contact;
use App\Services\Ai\LeadScoringService;
use Illuminate\Console\Command;

class CalculateLeadScores extends Command
{
    protected $signature = 'contacts:score {--user= : Only score contacts for a specific user ID}';

    protected $description = 'Batch recalculate lead scores for all contacts';

    public function handle(LeadScoringService $scoring): int
    {
        $query = Contact::query();

        if ($userId = $this->option('user')) {
            $query->where('user_id', $userId);
        }

        $total = $query->count();
        $this->info("Scoring {$total} contacts...");

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $query->chunkById(100, function ($contacts) use ($scoring, $bar) {
            foreach ($contacts as $contact) {
                $scoring->calculateAndSave($contact);
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
        $this->info("Done. {$total} contacts scored.");

        return self::SUCCESS;
    }
}
