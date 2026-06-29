<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Sites\CloudflareSaaSClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Deletes a custom domain's Cloudflare for SaaS custom hostname in the
 * background, so "Disconnect" returns instantly and the external API call never
 * blocks the web request.
 */
class RemoveCustomDomainCloudflare implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [30, 120, 300];

    public function __construct(public string $domain)
    {
    }

    public function handle(CloudflareSaaSClient $cloudflare): void
    {
        if (! $cloudflare->configured()) {
            return;
        }

        $existing = $cloudflare->findByHostname($this->domain);
        if ($existing && $existing['id']) {
            $cloudflare->delete($existing['id']);
        }
    }
}
