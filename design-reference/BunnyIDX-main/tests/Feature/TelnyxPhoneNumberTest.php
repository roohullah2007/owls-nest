<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\PhoneNumber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelnyxPhoneNumberTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        // Pro grants the phone feature and includes one phone number (the
        // plan's phone_number_limit), so the first purchase is within plan.
        $this->user = User::factory()->create(['subscription_tier' => 'pro']);
        config([
            'telnyx.api_key' => 'KEYtest',
            'telnyx.messaging_profile_id' => 'mp_test',
        ]);
    }

    public function test_search_returns_normalized_numbers(): void
    {
        Http::fake([
            '*available_phone_numbers*' => Http::response([
                'data' => [[
                    'phone_number' => '+13055551234',
                    'locality' => 'Miami',
                    'region_information' => [['region_name' => 'FL']],
                    'cost_information' => ['monthly_cost' => '1.00'],
                    'features' => ['sms', 'voice'],
                ]],
            ], 200),
        ]);

        $this->actingAs($this->user)
            ->getJson(route('crm.phone-numbers.search', ['area_code' => '305']))
            ->assertOk()
            ->assertJsonPath('numbers.0.phone_number', '+13055551234')
            ->assertJsonPath('numbers.0.region', 'FL');
    }

    public function test_purchase_stores_number_scoped_to_user_as_default(): void
    {
        Http::fake([
            '*number_orders*' => Http::response([
                'data' => [
                    'id' => 'order_1',
                    'phone_numbers' => [['id' => 'num_1', 'phone_number' => '+13055551234']],
                ],
            ], 200),
        ]);

        $this->actingAs($this->user)
            ->postJson(route('crm.phone-numbers.purchase'), ['phone_number' => '+13055551234'])
            ->assertCreated();

        $this->assertDatabaseHas('phone_numbers', [
            'phone_number' => '+13055551234',
            'user_id' => $this->user->id,
            'status' => 'active',
            'is_default' => true,
            'telnyx_phone_number_id' => 'num_1',
        ]);
    }

    public function test_purchase_surfaces_telnyx_error_without_storing(): void
    {
        Http::fake([
            '*number_orders*' => Http::response(['errors' => [['detail' => 'unauthorized']]], 401),
        ]);

        $this->actingAs($this->user)
            ->postJson(route('crm.phone-numbers.purchase'), ['phone_number' => '+13055559999'])
            ->assertStatus(500)
            ->assertJsonPath('error', 'Failed to purchase number from Telnyx.');

        $this->assertDatabaseMissing('phone_numbers', ['phone_number' => '+13055559999']);
    }

    public function test_purchase_rejects_already_provisioned_number(): void
    {
        Http::fake();

        PhoneNumber::create([
            'user_id' => $this->user->id,
            'phone_number' => '+13055550000',
            'status' => 'active',
        ]);

        $this->actingAs($this->user)
            ->postJson(route('crm.phone-numbers.purchase'), ['phone_number' => '+13055550000'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'Number already provisioned.');

        Http::assertNothingSent();
    }
}
