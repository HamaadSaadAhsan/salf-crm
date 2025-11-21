<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $taskId,
        public ?int $assignedToId = null
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('tasks'),
        ];

        if ($this->assignedToId) {
            $channels[] = new PrivateChannel('user.'.$this->assignedToId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'task.deleted';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->taskId,
        ];
    }
}
