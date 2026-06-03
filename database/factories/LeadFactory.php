<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
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
            'phone' => $this->faker->phoneNumber(),
            'occupation' => $this->faker->optional()->jobTitle(),
            'address' => $this->faker->optional()->address(),
            'city' => $this->faker->optional()->city(),
            'country' => $this->faker->optional()->countryISOAlpha3(),
            'detail' => $this->faker->optional()->paragraph(),
            'inquiry_status' => $this->faker->randomElement(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'nurturing']),
            'priority' => $this->faker->randomElement(['low', 'medium', 'high', 'urgent']),
            'inquiry_type' => $this->faker->optional()->randomElement(['phone', 'email', 'web', 'referral', 'social', 'advertisement']),
            'lead_score' => $this->faker->numberBetween(0, 100),
            'service_id' => Service::inRandomOrder()->first()?->id,
            'lead_source_id' => LeadSource::inRandomOrder()->first()?->id,
        ];
    }
}
