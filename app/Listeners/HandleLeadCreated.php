<?php

namespace App\Listeners;

use App\Models\Lead;
use App\Services\LeadAssignmentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Events\ModelCreated;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class HandleLeadCreated implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct(
        private LeadAssignmentService $assignmentService
    ) {}

    /**
     * Handle the event.
     */
    public function handle(ModelCreated $event): void
    {
        $model = $event->model;

        if (! $model instanceof Lead) {
            return;
        }

        if ($model->assigned_to !== null) {
            return;
        }

        if (! in_array($model->inquiry_status, ['new', null])) {
            return;
        }

        try {
            $this->assignmentService->assignToCRO($model);
        } catch (\Exception $e) {
            Log::error("Failed to auto-assign lead {$model->id} to CRO: ".$e->getMessage());
            $this->fail($e);
        }
    }
}
