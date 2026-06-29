<?php

namespace Database\Factories;

use App\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactFactory extends Factory
{
    protected $model = Contact::class;

    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'type' => fake()->randomElement(['buyer', 'seller', 'both', 'investor']),
            'status' => 'active',
            'source' => fake()->randomElement(['website', 'referral', 'open_house', 'manual']),
            'city' => fake()->city(),
            'state_province' => 'FL',
            'postal_code' => fake()->postcode(),
            'country' => 'US',
        ];
    }

    public function lead(): static
    {
        return $this->state(['type' => 'lead', 'status' => 'new_lead']);
    }
}
