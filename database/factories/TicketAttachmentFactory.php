<?php

namespace Database\Factories;

use App\Models\Ticket;
use App\Models\TicketAttachment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TicketAttachment>
 */
class TicketAttachmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'ticket_id' => Ticket::factory(),
            'ticket_comment_id' => null,
            'file_path' => 'ticket-attachments/'.fake()->uuid().'.png',
            'file_name' => fake()->word().'.png',
            'file_size' => fake()->numberBetween(1024, 10485760),
            'mime_type' => 'image/png',
        ];
    }
}
