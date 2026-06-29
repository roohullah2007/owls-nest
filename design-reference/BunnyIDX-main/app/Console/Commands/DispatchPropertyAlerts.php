<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\ProcessPropertyAlertsForVisitor;
use App\Models\SiteVisitor;
use App\Services\PropertyAlerts\PropertyAlertFrequency;
use Illuminate\Console\Command;

/**
 * Daily driver for property alerts. Selects site visitors who could receive an
 * alert (have favorites or saved searches, not opted out, owned by a paid
 * account whose cadence isn't "off") and dispatches a per-visitor job. The
 * per-subscription cadence + idempotency are enforced downstream, so running
 * this daily is safe even for weekly/twice-weekly accounts.
 *
 * Use --sync to process inline (no queue worker) — handy in cron-only setups.
 */
class DispatchPropertyAlerts extends Command
{
    protected $signature = 'property-alerts:dispatch {--sync : Process inline instead of queueing}';

    protected $description = 'Evaluate saved-search & favorite property alerts and send any that are due';

    public function handle(): int
    {
        if (! config('property_alerts.enabled', true)) {
            $this->info('Property alerts are disabled (config/property_alerts.enabled).');

            return self::SUCCESS;
        }

        $dispatched = 0;
        $skipped = 0;

        SiteVisitor::query()
            ->whereNull('alerts_unsubscribed_at')
            ->where(fn ($q) => $q->whereHas('favorites')->orWhereHas('savedSearches'))
            ->with('website.user')
            ->chunkById(200, function ($visitors) use (&$dispatched, &$skipped) {
                foreach ($visitors as $visitor) {
                    $account = $visitor->website?->user;

                    // Paid-plan only + cadence gate. Free / "off" accounts never
                    // generate the MLS fan-out.
                    if (! $account || ! $account->isPro()
                        || PropertyAlertFrequency::isOff(PropertyAlertFrequency::forUser($account))) {
                        $skipped++;

                        continue;
                    }

                    if ($this->option('sync')) {
                        ProcessPropertyAlertsForVisitor::dispatchSync($visitor->id);
                    } else {
                        ProcessPropertyAlertsForVisitor::dispatch($visitor->id);
                    }
                    $dispatched++;
                }
            });

        $this->info("Property alerts: dispatched {$dispatched} visitor job(s), skipped {$skipped}.");

        return self::SUCCESS;
    }
}
