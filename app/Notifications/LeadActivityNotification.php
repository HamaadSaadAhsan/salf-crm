<?php

namespace App\Notifications;

use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class LeadActivityNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public LeadActivity $activity,
        public Lead $lead,
        public string $action = 'created'
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification for database.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'lead_activity',
            'title' => $this->getTitle(),
            'message' => $this->getMessage(),
            'lead_id' => $this->lead->id,
            'lead_name' => $this->lead->name,
            'activity_id' => $this->activity->id,
            'activity_type' => $this->activity->type,
            'action' => $this->action,
            'action_url' => "/leads/{$this->lead->id}",
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id,
            'type' => 'lead_activity',
            'title' => $this->getTitle(),
            'description' => $this->getMessage(),
            'lead_id' => $this->lead->id,
            'lead_name' => $this->lead->name,
            'activity_id' => $this->activity->id,
            'activity_type' => $this->activity->type,
            'action' => $this->action,
            'action_url' => "/leads/{$this->lead->id}",
            'timestamp' => now()->diffForHumans(),
            'created_at' => now()->toISOString(),
            'read' => false,
        ]);
    }

    private function getTitle(): string
    {
        $activityType = ucfirst(str_replace('_', ' ', $this->activity->type));

        return match ($this->action) {
            'created' => "New {$activityType} for {$this->lead->name}",
            'completed' => "{$activityType} completed for {$this->lead->name}",
            'overdue' => "{$activityType} is overdue for {$this->lead->name}",
            default => "{$activityType} updated for {$this->lead->name}",
        };
    }

    private function getMessage(): string
    {
        return $this->activity->subject ?? $this->activity->description ?? '';
    }
}
