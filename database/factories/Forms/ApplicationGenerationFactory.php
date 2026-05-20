<?php

namespace Database\Factories\Forms;

use App\Enums\Forms\GenerationStatus;
use App\Models\Forms\Application;
use App\Models\Forms\ApplicationGeneration;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApplicationGeneration>
 */
class ApplicationGenerationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'application_id' => Application::factory(),
            'generated_by_user_id' => User::factory(),
            'output_path' => null,
            'file_count' => 0,
            'generation_log' => null,
            'status' => GenerationStatus::PENDING,
            'started_at' => null,
            'completed_at' => null,
            'error_message' => null,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => GenerationStatus::COMPLETED,
            'started_at' => now()->subMinutes(2),
            'completed_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn () => [
            'status' => GenerationStatus::FAILED,
            'started_at' => now()->subMinutes(1),
            'completed_at' => now(),
            'error_message' => 'Generation failed.',
        ]);
    }
}
