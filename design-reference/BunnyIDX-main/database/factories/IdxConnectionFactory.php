<?php

namespace Database\Factories;

use App\Models\IdxConnection;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class IdxConnectionFactory extends Factory
{
    protected $model = IdxConnection::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'provider' => 'bridge',
            'mls_slug' => 'miamire',
            'display_name' => 'Miami Association of REALTORS',
            'api_key' => null,
            'agent_id' => null,
            'office_id' => null,
            'is_active' => true,
            'last_tested_at' => now(),
            'test_status' => 'passed',
        ];
    }

    public function bridge(string $slug = 'miamire', string $name = 'Miami Association of REALTORS'): static
    {
        return $this->state(fn () => [
            'provider' => 'bridge',
            'mls_slug' => $slug,
            'display_name' => $name,
            'api_key' => null,
        ]);
    }

    public function repliers(): static
    {
        return $this->state(fn () => [
            'provider' => 'repliers',
            'mls_slug' => 'repliers',
            'display_name' => 'Repliers (Canadian MLS)',
            'api_key' => 'test-repliers-key-' . fake()->uuid(),
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => [
            'is_active' => false,
            'test_status' => null,
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn () => [
            'test_status' => 'failed',
        ]);
    }
}
