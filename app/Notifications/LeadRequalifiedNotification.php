<?php

namespace App\Notifications;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class LeadRequalifiedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Lead $lead,
        public User $requalifiedBy,
        public string $reason = ''
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
            'type' => 'lead_requalified',
            'title' => $this->getTitle(),
            'message' => $this->getMessage(),
            'lead_id' => $this->lead->id,
            'lead_name' => $this->lead->name,
            'lead_email' => $this->lead->email,
            'requalified_by_id' => $this->requalifiedBy->id,
            'requalified_by_name' => $this->requalifiedBy->name,
            'reason' => $this->reason,
            'action_url' => "/leads/{$this->lead->id}",
            'timestamp' => now()->toISOString(),
        ];
    }

    private function getTitle(): string
    {
        return 'Lead sent back for requalification';
    }

    private function getMessage(): string
    {
        $leadInfo = $this->lead->name ?: "Lead #{$this->lead->id}";
        $message = "{$leadInfo} sent back by {$this->requalifiedBy->name}.";

        if ($this->reason) {
            $message .= " Reason: {$this->reason}";
        }

        return $message;
    }
}
