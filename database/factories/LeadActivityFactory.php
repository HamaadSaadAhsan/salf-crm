<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadActivity>
 */
class LeadActivityFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = $this->faker->randomElement(['call', 'email', 'meeting', 'note', 'task', 'follow_up']);
        $scheduledAt = $this->faker->optional(0.5)->dateTimeBetween('-30 days', '-1 day');

        // Ensure completed_at is after scheduled_at to satisfy the constraint
        $completedAt = null;
        if ($scheduledAt && $this->faker->boolean(60)) {
            $completedAt = $this->faker->dateTimeBetween($scheduledAt, 'now');
        }

        return [
            'lead_id' => Lead::factory(),
            'user_id' => User::factory(),
            'type' => $type,
            'status' => $this->faker->randomElement(['pending', 'completed', 'cancelled']),
            'subject' => $this->faker->sentence(),
            'description' => $this->faker->paragraph(),
            'priority' => $this->faker->randomElement(['low', 'medium', 'high', 'urgent']),
            'category' => $this->faker->optional()->word(),
            'duration_minutes' => $this->faker->optional()->numberBetween(5, 120),
            'notes' => $this->faker->optional()->paragraph(),
            'scheduled_at' => $scheduledAt,
            'completed_at' => $completedAt,
            'due_at' => $this->faker->optional()->dateTimeBetween('-15 days', '+15 days'),
        ];
    }
}
