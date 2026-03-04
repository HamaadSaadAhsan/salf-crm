<?php

namespace Database\Factories;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Enums\TicketType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Ticket>
 */
class TicketFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => fake()->randomElement(TicketType::cases())->value,
            'status' => TicketStatus::Open->value,
            'priority' => fake()->randomElement(TicketPriority::cases())->value,
            'subject' => fake()->sentence(),
            'description' => fake()->paragraphs(2, true),
        ];
    }

    public function bugReport(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => TicketType::BugReport->value,
        ]);
    }

    public function featureRequest(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => TicketType::FeatureRequest->value,
        ]);
    }

    public function open(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TicketStatus::Open->value,
        ]);
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TicketStatus::InProgress->value,
        ]);
    }

    public function resolved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TicketStatus::Resolved->value,
            'resolved_at' => now(),
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TicketStatus::Closed->value,
            'closed_at' => now(),
        ]);
    }

    public function critical(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => TicketPriority::Critical->value,
        ]);
    }

    public function assigned(): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_to_id' => User::factory(),
        ]);
    }
}
