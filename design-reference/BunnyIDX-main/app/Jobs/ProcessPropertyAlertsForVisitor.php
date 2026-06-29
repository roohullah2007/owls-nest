<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\SiteVisitor;
use App\Services\PropertyAlerts\PropertyAlertService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Evaluates and (if due) sends property alerts for one site visitor. Dispatched
 * by the property-alerts:dispatch command so each visitor's MLS fan-out runs on
 * the queue rather than blocking the scheduler. Per-subscription idempotency
 * keys keep a retry from double-sending.
 */
class ProcessPropertyAlertsForVisitor implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public int $siteVisitorId) {}

    public function handle(PropertyAlertService $service): void
    {
        $visitor = SiteVisitor::with('website.user', 'favorites', 'savedSearches')->find($this->siteVisitorId);
        if (! $visitor) {
            return;
        }

        $service->runForVisitor($visitor);
    }
}
