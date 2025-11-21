<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Task $task
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('tasks'),
        ];

        if ($this->task->assigned_to_id) {
            $channels[] = new PrivateChannel('user.'.$this->task->assigned_to_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'task.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->task->id,
            'title' => $this->task->title,
            'description' => $this->task->description,
            'status' => $this->task->status->value,
            'priority' => $this->task->priority->value,
            'due_at' => $this->task->due_at?->toISOString(),
            'assigned_to' => $this->task->assignedTo ? [
                'id' => $this->task->assignedTo->id,
                'name' => $this->task->assignedTo->name,
                'email' => $this->task->assignedTo->email,
            ] : null,
            'created_at' => $this->task->created_at->toISOString(),
        ];
    }
}
