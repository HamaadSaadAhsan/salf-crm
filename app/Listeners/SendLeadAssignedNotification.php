<?php

namespace App\Listeners;

use App\Events\LeadAssigned;
use App\Notifications\LeadAssignedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendLeadAssignedNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(LeadAssigned $event): void
    {
        // Send notification to the assigned user
        $event->assignee->notify(
            new LeadAssignedNotification(
                lead: $event->lead,
                assignmentType: $event->assignmentType,
                assignedBy: $event->assignedBy
            )
        );
    }
}
