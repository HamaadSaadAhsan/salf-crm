<?php

namespace App\Listeners;

use App\Events\LeadRequalified;
use App\Notifications\LeadRequalifiedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendLeadRequalifiedNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(LeadRequalified $event): void
    {
        // Send notification to the CRO who originally qualified this lead
        $qualifiedBy = $event->lead->qualifiedBy;

        if ($qualifiedBy) {
            $qualifiedBy->notify(
                new LeadRequalifiedNotification(
                    lead: $event->lead,
                    requalifiedBy: $event->requalifiedBy,
                    reason: $event->reason
                )
            );
        }
    }
}
