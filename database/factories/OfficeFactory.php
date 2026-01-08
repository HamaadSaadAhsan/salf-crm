<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Office>
 */
class OfficeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'zone_id' => \App\Models\Zone::factory(),
            'name' => fake()->company().' Office',
            'code' => fake()->unique()->lexify('OFF-???'),
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'country_code' => fake()->countryCode(),
            'postal_code' => fake()->postcode(),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->companyEmail(),
            'is_active' => true,
            'metadata' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function forZone(int $zoneId): static
    {
        return $this->state(fn (array $attributes) => [
            'zone_id' => $zoneId,
        ]);
    }
}
