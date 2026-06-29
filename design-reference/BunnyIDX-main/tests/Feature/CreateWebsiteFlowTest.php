<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateWebsiteFlowTest extends TestCase
{
    use RefreshDatabase;

    private function site(User $user, string $slug = 'my-site'): AgentWebsite
    {
        return AgentWebsite::create([
            'user_id' => $user->id,
            'slug' => $slug,
            'agent_name' => 'Test Agent',
        ]);
    }

    // ── Eligibility props on the Websites index ─────────────────────

    public function test_free_user_sees_creation_as_restricted(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'free']);

        $this->actingAs($user)->get(route('crm.websites.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Crm/Websites/Index')
                ->where('canCreateWebsite', false)
                ->where('atWebsiteLimit', false));
    }

    public function test_entitled_user_under_limit_can_create(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'pro']);

        $this->actingAs($user)->get(route('crm.websites.index'))
            ->assertInertia(fn ($page) => $page
                ->where('canCreateWebsite', true)
                ->where('atWebsiteLimit', false));
    }

    public function test_entitled_user_at_limit_is_flagged(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'pro']);
        $this->site($user);

        $this->actingAs($user)->get(route('crm.websites.index'))
            ->assertInertia(fn ($page) => $page
                ->where('canCreateWebsite', true)
                ->where('atWebsiteLimit', true)
                ->where('websiteLimit', 1));
    }

    public function test_admin_can_always_create_even_on_free(): void
    {
        $admin = User::factory()->create(['subscription_tier' => 'free', 'role' => 'superadmin']);

        $this->actingAs($admin)->get(route('crm.websites.index'))
            ->assertInertia(fn ($page) => $page->where('canCreateWebsite', true));
    }

    // ── Backend enforcement (safety net behind the modal) ───────────

    public function test_free_user_is_blocked_from_onboarding_wizard(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'free']);

        $this->actingAs($user)->get(route('crm.onboarding'))->assertRedirect();
        $this->assertNotNull(session('error'));
    }

    public function test_entitled_user_without_site_reaches_the_wizard(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'pro']);

        $this->actingAs($user)->get(route('crm.onboarding'))->assertOk();
    }

    public function test_entitled_user_at_limit_is_routed_to_existing_site(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'pro']);
        $site = $this->site($user);

        $this->actingAs($user)->get(route('crm.onboarding'))
            ->assertRedirect(route('crm.websites.edit', $site->uuid));
    }
}
