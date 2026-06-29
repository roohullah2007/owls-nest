<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DealControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Pipeline $pipeline;
    private PipelineStage $stage;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->pipeline = Pipeline::create([
            'user_id' => $this->user->id,
            'name' => 'Buyer Pipeline',
            'lead_type' => 'buyer',
            'is_default' => true,
            'position' => 0,
        ]);
        $this->stage = PipelineStage::create([
            'pipeline_id' => $this->pipeline->id,
            'name' => 'New Lead',
            'type' => 'open',
            'color' => '#3B82F6',
            'position' => 0,
        ]);
    }

    // ── Index ───────────────────────────────────────────────────────

    public function test_index_requires_auth(): void
    {
        $this->get(route('crm.deals.index'))->assertRedirect(route('login'));
    }

    public function test_index_displays_deals(): void
    {
        $this->user->deals()->create([
            'title' => 'Dream Home Purchase',
            'pipeline_id' => $this->pipeline->id,
            'pipeline_stage_id' => $this->stage->id,
            'type' => 'buy',
            'value' => 450000,
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.deals.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Crm/Deals/Index')
                ->has('deals.data', 1)
                ->where('deals.data.0.title', 'Dream Home Purchase')
        );
    }

    public function test_index_isolates_by_user(): void
    {
        $otherUser = User::factory()->create();
        $otherPipeline = Pipeline::create([
            'user_id' => $otherUser->id, 'name' => 'Other',
            'lead_type' => 'buyer', 'is_default' => true, 'position' => 0,
        ]);
        $otherStage = PipelineStage::create([
            'pipeline_id' => $otherPipeline->id, 'name' => 'Start',
            'type' => 'open', 'color' => '#000', 'position' => 0,
        ]);
        $otherUser->deals()->create([
            'title' => 'Not My Deal',
            'pipeline_id' => $otherPipeline->id,
            'pipeline_stage_id' => $otherStage->id,
            'type' => 'buy',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.deals.index'));

        $response->assertInertia(fn ($page) =>
            $page->has('deals.data', 0)
        );
    }

    // ── Store ───────────────────────────────────────────────────────

    public function test_store_creates_deal(): void
    {
        $response = $this->actingAs($this->user)->post(route('crm.deals.store'), [
            'title' => 'New Listing Deal',
            'pipeline_id' => $this->pipeline->id,
            'pipeline_stage_id' => $this->stage->id,
            'type' => 'sell',
            'value' => 350000,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('deals', [
            'user_id' => $this->user->id,
            'title' => 'New Listing Deal',
            'value' => 350000.00,
            'type' => 'sell',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)->post(route('crm.deals.store'), []);

        $response->assertSessionHasErrors(['title', 'pipeline_id', 'pipeline_stage_id', 'type']);
    }

    public function test_store_with_contacts(): void
    {
        $contact = $this->user->contacts()->create([
            'first_name' => 'Deal', 'last_name' => 'Contact',
            'type' => 'buyer', 'source' => 'website',
        ]);

        $this->actingAs($this->user)->post(route('crm.deals.store'), [
            'title' => 'Contact Deal',
            'pipeline_id' => $this->pipeline->id,
            'pipeline_stage_id' => $this->stage->id,
            'type' => 'buy',
            'contacts' => [$contact->id],
        ]);

        $deal = $this->user->deals()->where('title', 'Contact Deal')->first();
        $this->assertCount(1, $deal->contacts);
    }

    // ── Show ────────────────────────────────────────────────────────

    public function test_show_displays_deal(): void
    {
        $deal = $this->user->deals()->create([
            'title' => 'Show Deal',
            'pipeline_id' => $this->pipeline->id,
            'pipeline_stage_id' => $this->stage->id,
            'type' => 'buy',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.deals.show', $deal));

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Crm/Deals/Show')
                ->where('deal.title', 'Show Deal')
        );
    }

    public function test_show_rejects_other_users_deal(): void
    {
        $otherUser = User::factory()->create();
        $otherPipeline = Pipeline::create([
            'user_id' => $otherUser->id, 'name' => 'Other',
            'lead_type' => 'buyer', 'is_default' => true, 'position' => 0,
        ]);
        $otherStage = PipelineStage::create([
            'pipeline_id' => $otherPipeline->id, 'name' => 'Start',
            'type' => 'open', 'color' => '#000', 'position' => 0,
        ]);
        $deal = $otherUser->deals()->create([
            'title' => 'Private Deal',
            'pipeline_id' => $otherPipeline->id,
            'pipeline_stage_id' => $otherStage->id,
            'type' => 'buy',
        ]);

        $response = $this->actingAs($this->user)->get(route('crm.deals.show', $deal));

        $response->assertForbidden();
    }

    // ── Update ──────────────────────────────────────────────────────

    public function test_update_modifies_deal(): void
    {
        $deal = $this->user->deals()->create([
            'title' => 'Original Title',
            'pipeline_id' => $this->pipeline->id,
            'pipeline_stage_id' => $this->stage->id,
            'type' => 'buy',
            'value' => 200000,
        ]);

        $response = $this->actingAs($this->user)->put(route('crm.deals.update', $deal), [
            'title' => 'Updated Title',
            'pipeline_id' => $this->pipeline->id,
            'pipeline_stage_id' => $this->stage->id,
            'type' => 'sell',
            'value' => 500000,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('deals', [
            'id' => $deal->id,
            'title' => 'Updated Title',
            'value' => 500000.00,
        ]);
    }

    // ── Stage move ──────────────────────────────────────────────────

    public function test_move_deal_to_new_stage(): void
    {
        $newStage = PipelineStage::create([
            'pipeline_id' => $this->pipeline->id,
            'name' => 'Qualified',
            'type' => 'open',
            'color' => '#22C55E',
            'position' => 1,
        ]);

        $deal = $this->user->deals()->create([
            'title' => 'Moving Deal',
            'pipeline_id' => $this->pipeline->id,
            'pipeline_stage_id' => $this->stage->id,
            'type' => 'buy',
        ]);

        $response = $this->actingAs($this->user)->patch(route('crm.deals.stage', $deal), [
            'pipeline_stage_id' => $newStage->id,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('deals', [
            'id' => $deal->id,
            'pipeline_stage_id' => $newStage->id,
        ]);
    }

    // ── Delete ──────────────────────────────────────────────────────

    public function test_destroy_soft_deletes_deal(): void
    {
        $deal = $this->user->deals()->create([
            'title' => 'Delete Me',
            'pipeline_id' => $this->pipeline->id,
            'pipeline_stage_id' => $this->stage->id,
            'type' => 'buy',
        ]);

        $response = $this->actingAs($this->user)->delete(route('crm.deals.destroy', $deal));

        $response->assertRedirect();
        $this->assertSoftDeleted('deals', ['id' => $deal->id]);
    }
}
