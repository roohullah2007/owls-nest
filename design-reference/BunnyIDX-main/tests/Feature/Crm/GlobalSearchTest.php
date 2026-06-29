<?php

namespace Tests\Feature\Crm;

use App\Models\Contact;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_short_queries_return_empty_results(): void
    {
        Contact::factory()->create(['user_id' => $this->user->id, 'first_name' => 'Alice', 'last_name' => 'Anderson']);

        $this->actingAs($this->user)
            ->getJson(route('crm.search', ['q' => 'a']))
            ->assertOk()
            ->assertExactJson(['contacts' => [], 'deals' => []]);
    }

    public function test_finds_own_contact_by_name(): void
    {
        $contact = Contact::factory()->create([
            'user_id' => $this->user->id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
        ]);

        $this->actingAs($this->user)
            ->getJson(route('crm.search', ['q' => 'Jane Doe']))
            ->assertOk()
            ->assertJsonPath('contacts.0.id', $contact->id)
            ->assertJsonPath('contacts.0.label', 'Jane Doe');
    }

    public function test_finds_own_contact_by_email(): void
    {
        $contact = Contact::factory()->create([
            'user_id' => $this->user->id,
            'email' => 'unique.lead@example.com',
        ]);

        $this->actingAs($this->user)
            ->getJson(route('crm.search', ['q' => 'unique.lead']))
            ->assertOk()
            ->assertJsonPath('contacts.0.id', $contact->id);
    }

    public function test_does_not_return_another_users_contacts(): void
    {
        $other = User::factory()->create();
        Contact::factory()->create([
            'user_id' => $other->id,
            'first_name' => 'Secret',
            'last_name' => 'Person',
        ]);

        $this->actingAs($this->user)
            ->getJson(route('crm.search', ['q' => 'Secret']))
            ->assertOk()
            ->assertJsonCount(0, 'contacts');
    }

    public function test_finds_own_deal_by_title(): void
    {
        $pipeline = Pipeline::create([
            'user_id' => $this->user->id,
            'name' => 'Buyer Pipeline',
            'lead_type' => 'buyer',
            'is_default' => true,
            'position' => 0,
        ]);
        $stage = PipelineStage::create([
            'pipeline_id' => $pipeline->id,
            'name' => 'New Lead',
            'type' => 'open',
            'color' => '#3B82F6',
            'position' => 0,
        ]);
        $deal = $this->user->deals()->create([
            'title' => 'Sunset Villa Acquisition',
            'pipeline_id' => $pipeline->id,
            'pipeline_stage_id' => $stage->id,
            'type' => 'buy',
            'value' => 450000,
        ]);

        $this->actingAs($this->user)
            ->getJson(route('crm.search', ['q' => 'Sunset Villa']))
            ->assertOk()
            ->assertJsonPath('deals.0.id', $deal->id)
            ->assertJsonPath('deals.0.label', 'Sunset Villa Acquisition');
    }

    public function test_search_requires_authentication(): void
    {
        $this->getJson(route('crm.search', ['q' => 'Jane']))
            ->assertUnauthorized();
    }
}
