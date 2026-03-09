<?php

namespace App\Services;

use App\Events\WorkflowStepExecuted;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use Illuminate\Support\Facades\Log;

class WorkflowExecutionService
{
    public function execute(Workflow $workflow, array $payload, array $context = []): WorkflowExecution
    {
        $execution = WorkflowExecution::create([
            'workflow_id' => $workflow->id,
            'status' => 'running',
            'input_data' => $payload,
            'started_at' => now(),
        ]);

        // Broadcast execution started
        $this->broadcastStepStatus($workflow->id, $execution->id, 'execution', 'running', [
            'message' => 'Workflow execution started',
        ]);

        try {
            $triggerStep = $workflow->getTriggerStep();

            if (! $triggerStep) {
                throw new \RuntimeException('No trigger step configured');
            }

            // Broadcast each step as it runs
            $sortedSteps = $workflow->steps->sortBy('order');

            foreach ($sortedSteps as $step) {
                $nodeId = "step-{$step->id}";

                $this->broadcastStepStatus($workflow->id, $execution->id, $nodeId, 'running', [
                    'service' => $step->service,
                    'operation' => $step->operation,
                ]);
            }

            $result = $this->processPayload($workflow, $triggerStep, $payload);

            // Mark all steps as success
            foreach ($sortedSteps as $step) {
                $nodeId = "step-{$step->id}";

                $this->broadcastStepStatus($workflow->id, $execution->id, $nodeId, 'success', [
                    'service' => $step->service,
                ]);
            }

            $execution->update([
                'status' => 'completed',
                'output_data' => $result,
                'completed_at' => now(),
            ]);

            $this->broadcastStepStatus($workflow->id, $execution->id, 'execution', 'completed', [
                'message' => 'Workflow execution completed',
            ]);
        } catch (\Exception $e) {
            Log::error('Workflow execution failed', [
                'workflow_id' => $workflow->id,
                'execution_id' => $execution->id,
                'error' => $e->getMessage(),
            ]);

            $execution->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            $this->broadcastStepStatus($workflow->id, $execution->id, 'execution', 'failed', [
                'message' => $e->getMessage(),
            ]);
        }

        return $execution;
    }

    private function broadcastStepStatus(int $workflowId, int $executionId, string $nodeId, string $status, array $data = []): void
    {
        broadcast(new WorkflowStepExecuted($workflowId, $executionId, $nodeId, $status, $data));
    }

    /**
     * Process the incoming payload based on trigger type
     */
    private function processPayload(Workflow $workflow, $triggerStep, array $payload): array
    {
        return match ($triggerStep->service) {
            'facebook_lead_ads' => $this->processFacebookLeadAds($workflow, $payload),
            default => ['raw_payload' => $payload],
        };
    }

    private function processFacebookLeadAds(Workflow $workflow, array $payload): array
    {
        $results = [];

        if (isset($payload['entry'])) {
            foreach ($payload['entry'] as $entry) {
                if (isset($entry['changes'])) {
                    foreach ($entry['changes'] as $change) {
                        if (($change['field'] ?? '') === 'leadgen') {
                            $leadgenData = $change['value'] ?? [];
                            $results[] = $this->processLeadgenEntry($workflow, $leadgenData);
                        }
                    }
                }
            }
        }

        return ['leads_processed' => count($results), 'results' => $results];
    }

    private function processLeadgenEntry(Workflow $workflow, array $leadgenData): array
    {
        $actionSteps = $workflow->getActionSteps();
        $result = ['leadgen_id' => $leadgenData['leadgen_id'] ?? null];

        foreach ($actionSteps as $step) {
            if (! $step->enabled) {
                continue;
            }

            $result['actions'][] = [
                'service' => $step->service,
                'operation' => $step->operation,
                'status' => 'processed',
            ];
        }

        return $result;
    }
}
