<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\LandingPage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class LandingPageDomainTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        Queue::fake();
    }

    private function makePage(array $attrs = []): LandingPage
    {
        return LandingPage::create(array_merge([
            'user_id' => $this->user->id,
            'slug' => LandingPage::generateSlug('Domain Page'),
            'name' => 'Domain Page',
            'type' => 'seller',
            'template' => 'classic',
            'accent_color' => '#1693C9',
            'agent_name' => $this->user->name,
            'page_data' => ['blocks' => [['id' => 'hero', 'type' => 'hero', 'data' => ['headline' => 'Hi']]]],
            'is_published' => true,
        ], $attrs));
    }

    public function test_connect_sets_pending_status_and_returns_dns_records(): void
    {
        $page = $this->makePage();

        $res = $this->actingAs($this->user)
            ->postJson("/api/landing-page-editor/{$page->uuid}/domain", ['domain' => 'offer.example.com'])
            ->assertOk()
            ->json();

        $this->assertSame('offer.example.com', $res['custom_domain']);
        $this->assertSame('pending', $res['domain_status']);
        $this->assertNotEmpty($res['dns_records']);

        $page->refresh();
        $this->assertNotNull($page->domain_verification_token);
    }

    public function test_connect_lowercases_the_domain(): void
    {
        $page = $this->makePage();

        // A valid bare host (any case) is stored lowercased; scheme/path are
        // rejected by validation, matching the agent-website flow.
        $this->actingAs($this->user)
            ->postJson("/api/landing-page-editor/{$page->uuid}/domain", ['domain' => 'Offer.Example.COM'])
            ->assertOk()
            ->assertJsonPath('custom_domain', 'offer.example.com');
    }

    public function test_domain_must_be_unique_across_pages_and_websites(): void
    {
        $taken = $this->makePage(['slug' => 'taken', 'custom_domain' => 'taken.example.com', 'domain_status' => 'connected']);
        $page = $this->makePage(['slug' => 'second']);

        $this->actingAs($this->user)
            ->postJson("/api/landing-page-editor/{$page->uuid}/domain", ['domain' => 'taken.example.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('domain');

        // Also blocked if an agent website already uses it.
        AgentWebsite::query()->create([
            'user_id' => $this->user->id,
            'slug' => 'web',
            'agent_name' => 'A',
            'custom_domain' => 'site.example.com',
        ]);

        $this->actingAs($this->user)
            ->postJson("/api/landing-page-editor/{$page->uuid}/domain", ['domain' => 'site.example.com'])
            ->assertStatus(422);
    }

    public function test_invalid_domain_is_rejected(): void
    {
        $page = $this->makePage();

        $this->actingAs($this->user)
            ->postJson("/api/landing-page-editor/{$page->uuid}/domain", ['domain' => 'not a domain'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('domain');
    }

    public function test_disconnect_clears_the_domain(): void
    {
        $page = $this->makePage(['custom_domain' => 'gone.example.com', 'domain_status' => 'connected']);

        $this->actingAs($this->user)
            ->deleteJson("/api/landing-page-editor/{$page->uuid}/domain")
            ->assertOk()
            ->assertJsonPath('custom_domain', null);

        $this->assertNull($page->refresh()->custom_domain);
        $this->assertNull($page->domain_status);
    }

    public function test_another_user_cannot_manage_the_domain(): void
    {
        $page = $this->makePage();
        $other = User::factory()->create();

        $this->actingAs($other)
            ->postJson("/api/landing-page-editor/{$page->uuid}/domain", ['domain' => 'x.example.com'])
            ->assertForbidden();
    }

    public function test_domain_endpoints_require_auth(): void
    {
        $page = $this->makePage();

        $this->getJson("/api/landing-page-editor/{$page->uuid}/domain")->assertUnauthorized();
    }

    public function test_connected_domain_resolves_to_the_react_landing_page(): void
    {
        $page = $this->makePage([
            'custom_domain' => 'live.example.com',
            'domain_status' => LandingPage::DOMAIN_CONNECTED,
            'is_published' => true,
        ]);

        $this->get('http://live.example.com/')
            ->assertOk()
            ->assertSee('id="lp-root"', false)
            ->assertSee('"slug":"'.$page->slug.'"', false);
    }

    public function test_connected_but_unpublished_domain_serves_not_live_503(): void
    {
        $this->makePage([
            'custom_domain' => 'soon.example.com',
            'domain_status' => LandingPage::DOMAIN_CONNECTED,
            'is_published' => false,
        ]);

        $this->get('http://soon.example.com/')
            ->assertStatus(503)
            ->assertSee('almost ready', false);
    }

    public function test_domain_allowed_endpoint_authorizes_connected_published_page(): void
    {
        $this->makePage([
            'custom_domain' => 'tls.example.com',
            'domain_status' => LandingPage::DOMAIN_CONNECTED,
            'is_published' => true,
        ]);

        $this->get('/api/internal/domain-allowed?domain=tls.example.com')->assertOk();
        $this->get('/api/internal/domain-allowed?domain=unknown.example.com')->assertNotFound();
    }
}
