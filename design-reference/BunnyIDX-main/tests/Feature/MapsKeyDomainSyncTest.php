<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\AddDomainToMapsKey;
use App\Jobs\RemoveDomainFromMapsKey;
use App\Models\AgentWebsite;
use App\Models\User;
use App\Services\Sites\CustomDomainService;
use App\Services\Sites\GoogleMapsKeyManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Connecting/disconnecting a custom domain keeps the public Maps key's referrer
 * allowlist in sync — but only when the key sync is configured, so unconfigured
 * installs (the default) never queue a no-op job.
 */
class MapsKeyDomainSyncTest extends TestCase
{
    use RefreshDatabase;

    private function makeSite(): AgentWebsite
    {
        return AgentWebsite::create([
            'user_id' => User::factory()->create()->id,
            'name' => 'Map Site',
            'slug' => 'map-site',
            'template' => 'luxury',
            'agent_name' => 'Map Agent',
            'is_published' => true,
        ]);
    }

    private function configureKey(): void
    {
        config([
            'services.google.maps_key_resource' => 'projects/1/locations/global/keys/test',
            'services.google.maps_key_credentials' => '/tmp/sa.json',
        ]);
    }

    public function test_connect_queues_a_maps_key_add_when_configured(): void
    {
        Queue::fake();
        $this->configureKey();
        $site = $this->makeSite();

        app(CustomDomainService::class)->connect($site, 'agent.example.com');

        Queue::assertPushed(AddDomainToMapsKey::class, fn ($job) => $job->domain === 'agent.example.com');
    }

    public function test_disconnect_queues_a_maps_key_removal_when_configured(): void
    {
        Queue::fake();
        $this->configureKey();
        $site = $this->makeSite();
        $site->forceFill(['custom_domain' => 'agent.example.com'])->save();

        app(CustomDomainService::class)->disconnect($site);

        Queue::assertPushed(RemoveDomainFromMapsKey::class, fn ($job) => $job->domain === 'agent.example.com');
    }

    public function test_no_maps_key_job_is_queued_when_unconfigured(): void
    {
        Queue::fake();
        config(['services.google.maps_key_resource' => null, 'services.google.maps_key_credentials' => null]);
        $site = $this->makeSite();

        app(CustomDomainService::class)->connect($site, 'agent.example.com');

        Queue::assertNotPushed(AddDomainToMapsKey::class);
    }

    public function test_managed_referrers_cover_apex_and_subdomains(): void
    {
        $referrers = app(GoogleMapsKeyManager::class)->referrersFor('Example.com');

        $this->assertSame(['https://example.com/*', 'https://*.example.com/*'], $referrers);
    }
}
