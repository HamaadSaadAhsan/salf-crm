<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Service>
 */
class ServiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(3, true),
            'detail' => fake()->optional()->sentence(),
            'country_code' => fake()->optional()->countryCode(),
            'country_name' => fake()->optional()->country(),
            'parent_id' => null,
            'sort_order' => fake()->numberBetween(0, 100),
            'status' => fake()->randomElement(['active', 'inactive', 'draft', 'archived']),
        ];
    }

    /**
     * Indicate that the service is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }
}
