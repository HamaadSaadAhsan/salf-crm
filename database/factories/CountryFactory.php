<?php

namespace Database\Factories;

use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Country>
 */
class CountryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->country(),
            'code' => strtoupper(fake()->unique()->lexify('???')),
            'iso2' => strtoupper(fake()->unique()->lexify('??')),
            'phone_code' => '+'.fake()->numberBetween(1, 999),
            'currency' => fake()->currencyCode(),
            'currency_symbol' => fake()->randomElement(['$', '€', '£', '¥', '₹', '₽']),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
