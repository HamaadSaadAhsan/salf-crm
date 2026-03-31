<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Message>
 */
class MessageFactory extends Factory
{
    public function definition(): array
    {
        $sentAt = fake()->dateTimeBetween('-30 days');

        return [
            'sender_id' => User::factory(),
            'subject' => fake()->sentence(4),
            'body' => fake()->paragraphs(3, true),
            'type' => 'new',
            'is_draft' => false,
            'thread_id' => Str::uuid()->toString(),
            'sent_at' => $sentAt,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => [
            'is_draft' => true,
            'sent_at' => null,
        ]);
    }

    public function reply(): static
    {
        return $this->state(fn () => [
            'type' => 'reply',
        ]);
    }

    public function forward(): static
    {
        return $this->state(fn () => [
            'type' => 'forward',
        ]);
    }
}
