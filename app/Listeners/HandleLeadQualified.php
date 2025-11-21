<?php

namespace App\Listeners;

use App\Events\LeadQualified;
use App\Services\IntelligentAssignmentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class HandleLeadQualified implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct(
        private IntelligentAssignmentService $assignmentService
    ) {}

    /**
     * Handle the event.
     */
    public function handle(LeadQualified $event): void
    {
        try {
            $this->assignmentService->assignToAdvisor($event->lead, $event->qualifiedBy);

            $this->assignmentService->updateMetricsOnQualification($event->qualifiedBy);
        } catch (\Exception $e) {
            Log::error("Failed to auto-assign qualified lead {$event->lead->id} to Advisor: ".$e->getMessage());
            $this->fail($e);
        }
    }
}
