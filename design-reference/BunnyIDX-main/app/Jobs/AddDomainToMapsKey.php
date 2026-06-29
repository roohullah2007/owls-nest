<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\AgentWebsite;
use App\Models\LandingPage;
use App\Services\Sites\GoogleMapsKeyManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Adds a newly-connected custom domain to the public Maps key's allowed HTTP
 * referrers in the background, so the synchronous "Connect" request returns
 * instantly. Retries on failure because the API Keys update has no later
 * polling step to self-heal a missed write.
 */
class AddDomainToMapsKey implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [30, 120, 300];

    public function __construct(public AgentWebsite|LandingPage $site, public string $domain) {}

    public function handle(GoogleMapsKeyManager $maps): void
    {
        if (! $maps->configured()) {
            return;
        }

        // Skip if the domain was changed/removed between dispatch and run.
        if ($this->site->fresh()?->custom_domain !== $this->domain) {
            return;
        }

        $maps->addDomain($this->domain);
    }
}
