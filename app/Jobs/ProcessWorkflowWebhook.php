<?php

namespace App\Jobs;

use App\Models\Workflow;
use App\Services\WorkflowExecutionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessWorkflowWebhook implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(
        public int $workflowId,
        public array $payload,
        public array $context = [],
    ) {
        $this->onQueue('webhooks');
    }

    public function handle(WorkflowExecutionService $executionService): void
    {
        $workflow = Workflow::with(['steps.fieldMappings'])
            ->find($this->workflowId);

        if (! $workflow || $workflow->status !== 'active') {
            return;
        }

        $executionService->execute($workflow, $this->payload, $this->context);
    }
}
