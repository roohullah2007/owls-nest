<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\AgentWebsite;
use App\Models\LandingPage;
use App\Services\Sites\CloudflareSaaSClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Registers a custom domain as a Cloudflare for SaaS custom hostname in the
 * background, so the synchronous "Connect" request returns instantly and the
 * (potentially slow) external API call never blocks the web request.
 */
class RegisterCustomDomainCloudflare implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [30, 120, 300];

    public function __construct(public AgentWebsite|LandingPage $site, public string $domain) {}

    public function handle(CloudflareSaaSClient $cloudflare): void
    {
        if (! $cloudflare->configured()) {
            return;
        }

        // Skip if the domain was changed/removed between dispatch and run.
        if ($this->site->fresh()?->custom_domain !== $this->domain) {
            return;
        }

        $cloudflare->ensureHostname($this->domain);
    }
}
