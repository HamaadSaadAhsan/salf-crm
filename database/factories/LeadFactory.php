<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Lead>
 */
class LeadFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'phone' => $this->faker->optional()->phoneNumber(),
            'occupation' => $this->faker->optional()->jobTitle(),
            'address' => $this->faker->optional()->address(),
            'city' => $this->faker->optional()->city(),
            'country' => $this->faker->optional()->countryISOAlpha3(),
            'detail' => $this->faker->optional()->paragraph(),
            'inquiry_status' => $this->faker->randomElement(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'nurturing']),
            'priority' => $this->faker->randomElement(['low', 'medium', 'high', 'urgent']),
            'inquiry_type' => $this->faker->optional()->randomElement(['phone', 'email', 'web', 'referral', 'social', 'advertisement']),
            'lead_score' => $this->faker->numberBetween(0, 100),
            'service_id' => \App\Models\Service::inRandomOrder()->first()?->id,
            'lead_source_id' => \App\Models\LeadSource::inRandomOrder()->first()?->id,
        ];
    }
}
