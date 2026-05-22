<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\LeadFolder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadFolder>
 */
class LeadFolderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'lead_id' => Lead::factory(),
            'name' => fake()->word(),
        ];
    }
}
