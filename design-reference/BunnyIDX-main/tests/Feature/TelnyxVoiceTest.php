<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\PhoneNumber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelnyxVoiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        // Voice calling is part of the paid Phone feature.
        $this->user = User::factory()->create(['subscription_tier' => 'pro']);
    }

    public function test_initiate_call_creates_call_record_from_default_number(): void
    {
        PhoneNumber::create([
            'user_id' => $this->user->id,
            'phone_number' => '+13055550001',
            'status' => 'active',
            'is_default' => true,
        ]);

        $this->actingAs($this->user)
            ->postJson(route('crm.voice.call'), ['to_number' => '+15551110000'])
            ->assertCreated()
            ->assertJsonPath('from_number', '+13055550001');

        $this->assertDatabaseHas('call_records', [
            'user_id' => $this->user->id,
            'to_number' => '+15551110000',
            'from_number' => '+13055550001',
            'direction' => 'outbound',
            'status' => 'initiated',
        ]);
    }

    public function test_initiate_call_without_active_number_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->postJson(route('crm.voice.call'), ['to_number' => '+15551110000'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'No active phone number.');

        $this->assertDatabaseCount('call_records', 0);
    }
}
