<?php

namespace Database\Factories;

use App\Models\License;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LicenseFactory extends Factory
{
    protected $model = License::class;

    public function definition(): array
    {
        $charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        $segment = fn () => collect(range(1, 4))->map(fn () => $charset[random_int(0, strlen($charset) - 1)])->implode('');

        return [
            'user_id' => User::factory(),
            'key' => 'IDX-' . $segment() . '-' . $segment() . '-' . $segment(),
            'email' => fake()->safeEmail(),
            'purchase_ref' => 'cs_test_' . Str::random(24),
            'purchase_source' => 'stripe',
            'status' => 'active',
            'note' => null,
        ];
    }

    public function revoked(): static
    {
        return $this->state(fn () => [
            'status' => 'revoked',
            'revoked_at' => now(),
            'revoked_reason' => 'Test revocation',
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => [
            'status' => 'inactive',
        ]);
    }
}
