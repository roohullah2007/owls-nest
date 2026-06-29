<?php

namespace Database\Factories;

use App\Models\Deal;
use Illuminate\Database\Eloquent\Factories\Factory;

class DealFactory extends Factory
{
    protected $model = Deal::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'value' => fake()->randomFloat(2, 50000, 1000000),
            'currency' => 'USD',
            'type' => fake()->randomElement(['buy', 'sell', 'lease']),
            'property_address' => fake()->streetAddress(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
