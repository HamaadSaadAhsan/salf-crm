<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskDueReminder implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Task $task,
        public string $reminderType
    ) {}

    public function broadcastOn(): array
    {
        // Broadcast to the user assigned to the task
        return [
            new PrivateChannel("users.{$this->task->assigned_to_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'task.due.reminder';
    }

    public function broadcastWith(): array
    {
        return [
            'task' => [
                'id' => $this->task->id,
                'title' => $this->task->title,
                'description' => $this->task->description,
                'priority' => [
                    'value' => $this->task->priority?->value,
                    'label' => $this->task->priority?->label(),
                    'color' => $this->task->priority?->color(),
                ],
                'due_at' => $this->task->due_at?->toISOString(),
                'due_at_formatted' => $this->task->due_at?->format('M d, Y g:i A'),
                'taskable_type' => $this->task->taskable_type,
                'taskable_id' => $this->task->taskable_id,
            ],
            'reminder_type' => $this->reminderType,
            'timestamp' => now()->toISOString(),
        ];
    }
}
