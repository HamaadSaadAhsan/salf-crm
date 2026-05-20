<?php

namespace Database\Factories\Forms;

use App\Enums\Forms\ApplicationStatus;
use App\Models\Forms\Application;
use App\Models\Forms\Program;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'program_id' => Program::factory(),
            'application_code' => 'APP-'.now()->year.'-'.str_pad((string) $this->faker->unique()->numberBetween(1, 99999), 5, '0', STR_PAD_LEFT),
            'main_applicant_name' => $this->faker->name(),
            'main_applicant_passport' => strtoupper($this->faker->bothify('??#######')),
            'status' => ApplicationStatus::DRAFT,
            'data' => ['main_applicant' => ['name' => $this->faker->name()]],
            'created_by_user_id' => User::factory(),
            'assigned_to_user_id' => null,
            'submitted_at' => null,
        ];
    }

    public function submitted(): static
    {
        return $this->state(fn () => [
            'status' => ApplicationStatus::SUBMITTED,
            'submitted_at' => now(),
        ]);
    }
}
