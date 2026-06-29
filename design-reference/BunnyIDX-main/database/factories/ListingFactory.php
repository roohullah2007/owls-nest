<?php

namespace Database\Factories;

use App\Models\Listing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ListingFactory extends Factory
{
    protected $model = Listing::class;

    public function definition(): array
    {
        $cities = ['Miami', 'Coral Gables', 'Miami Beach', 'Homestead', 'Hialeah', 'Doral', 'Aventura', 'Kendall'];
        $types = ['residential', 'commercial', 'land', 'rental'];
        $statuses = ['active', 'pending', 'sold', 'expired', 'withdrawn'];

        return [
            'user_id' => User::factory(),
            'listing_type' => fake()->randomElement($types),
            'status' => fake()->randomElement($statuses),
            'title' => fake()->streetAddress() . ', ' . fake()->randomElement($cities) . ' FL',
            'address' => fake()->streetAddress(),
            'city' => fake()->randomElement($cities),
            'state_province' => 'FL',
            'postal_code' => fake()->numerify('331##'),
            'country' => 'US',
            'mls_number' => fake()->unique()->numerify('A#######'),
            'price' => fake()->numberBetween(150000, 2500000),
            'bedrooms' => fake()->numberBetween(1, 6),
            'bathrooms' => fake()->randomFloat(1, 1, 5),
            'sqft' => fake()->numberBetween(800, 5000),
            'year_built' => fake()->numberBetween(1960, 2025),
            'description' => fake()->paragraphs(2, true),
            'listed_at' => fake()->dateTimeBetween('-6 months', 'now'),
        ];
    }

    public function fromMls(string $mlsSlug = 'miamire'): static
    {
        return $this->state(fn () => [
            'mls_slug' => $mlsSlug,
            'mls_listing_id' => fake()->unique()->numerify('MIA######'),
            'synced_at' => now(),
            'sync_status' => 'synced',
        ]);
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => 'active']);
    }

    public function sold(): static
    {
        return $this->state(fn () => [
            'status' => 'sold',
            'sold_at' => fake()->dateTimeBetween('-3 months', 'now'),
        ]);
    }

    public function residential(): static
    {
        return $this->state(fn () => ['listing_type' => 'residential']);
    }
}
