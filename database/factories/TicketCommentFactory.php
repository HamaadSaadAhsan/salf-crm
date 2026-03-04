<?php

namespace Database\Factories;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TicketComment>
 */
class TicketCommentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'ticket_id' => Ticket::factory(),
            'user_id' => User::factory(),
            'body' => fake()->paragraph(),
            'is_admin_reply' => false,
        ];
    }

    public function adminReply(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_admin_reply' => true,
        ]);
    }
}
