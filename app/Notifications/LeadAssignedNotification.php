<?php

namespace App\Notifications;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class LeadAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Lead $lead,
        public string $assignmentType,
        public ?User $assignedBy = null
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification for database.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'lead_assigned',
            'title' => $this->getTitle(),
            'message' => $this->getMessage(),
            'lead_id' => $this->lead->id,
            'lead_name' => $this->lead->name,
            'lead_email' => $this->lead->email,
            'assignment_type' => $this->assignmentType,
            'assigned_by_id' => $this->assignedBy?->id,
            'assigned_by_name' => $this->assignedBy?->name,
            'action_url' => "/leads/{$this->lead->id}",
            'timestamp' => now()->toISOString(),
        ];
    }

    private function getTitle(): string
    {
        $role = $this->assignmentType === 'advisor' ? 'Advisor' : 'CRO';

        return "New lead assigned to you as {$role}";
    }

    private function getMessage(): string
    {
        $parts = [];

        if ($this->lead->name) {
            $parts[] = $this->lead->name;
        }

        if ($this->lead->email) {
            $parts[] = $this->lead->email;
        }

        $leadInfo = implode(' - ', $parts) ?: 'Lead #'.$this->lead->id;

        if ($this->assignedBy) {
            return "{$leadInfo} (assigned by {$this->assignedBy->name})";
        }

        return $leadInfo;
    }
}
