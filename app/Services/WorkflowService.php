<?php

namespace App\Services;

use App\Models\Workflow;
use App\Models\WorkflowStep;
use App\Models\WorkflowStepConnection;
use App\Models\WorkflowFieldMapping;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WorkflowService
{
    public function createWorkflow(array $data, User $user): Workflow
    {
        return DB::transaction(function () use ($data, $user) {
            // Create the workflow
            $workflow = Workflow::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? 'draft',
                'user_id' => $user->id,
                'metadata' => $data['metadata'] ?? []
            ]);

            // Create workflow steps
            $stepIdMapping = [];
            foreach ($data['steps'] as $stepData) {
                $step = $this->createWorkflowStep($workflow, $stepData);
                $stepIdMapping[$stepData['temp_id']] = $step->id;
            }

            // Create step connections
            if (isset($data['connections'])) {
                foreach ($data['connections'] as $connectionData) {
                    $this->createStepConnection(
                        $stepIdMapping[$connectionData['from_step_temp_id']],
                        $stepIdMapping[$connectionData['to_step_temp_id']],
                        $connectionData
                    );
                }
            }

            return $workflow->load(['steps.fieldMappings', 'steps.outgoingConnections']);
        });
    }

    protected function createWorkflowStep(Workflow $workflow, array $stepData): WorkflowStep
    {
        $step = WorkflowStep::create([
            'workflow_id' => $workflow->id,
            'step_type' => $stepData['step_type'],
            'service' => $stepData['service'],
            'operation' => $stepData['operation'],
            'order' => $stepData['order'],
            'configuration' => $stepData['configuration'] ?? [],
            'enabled' => $stepData['enabled'] ?? true
        ]);

        // Create field mappings if present
        if (isset($stepData['field_mappings'])) {
            foreach ($stepData['field_mappings'] as $mappingData) {
                WorkflowFieldMapping::create([
                    'workflow_step_id' => $step->id,
                    'source_field' => $mappingData['source_field'],
                    'target_field' => $mappingData['target_field'],
                    'field_type' => $mappingData['field_type'] ?? 'text',
                    'transformation_rules' => $mappingData['transformation_rules'] ?? [],
                    'required' => $mappingData['required'] ?? false
                ]);
            }
        }

        return $step;
    }

    protected function createStepConnection(int $fromStepId, int $toStepId, array $connectionData): WorkflowStepConnection
    {
        return WorkflowStepConnection::create([
            'from_step_id' => $fromStepId,
            'to_step_id' => $toStepId,
            'conditions' => $connectionData['conditions'] ?? []
        ]);
    }

    public function updateWorkflow(Workflow $workflow, array $data): Workflow
    {
        return DB::transaction(function () use ($workflow, $data) {
            // Update workflow details
            $workflow->update([
                'name' => $data['name'] ?? $workflow->name,
                'description' => $data['description'] ?? $workflow->description,
                'status' => $data['status'] ?? $workflow->status,
                'metadata' => $data['metadata'] ?? $workflow->metadata
            ]);

            // If steps are provided, replace all steps
            if (isset($data['steps'])) {
                // Delete existing steps (cascade will handle connections and mappings)
                $workflow->steps()->delete();

                // Create new steps
                $stepIdMapping = [];
                foreach ($data['steps'] as $stepData) {
                    $step = $this->createWorkflowStep($workflow, $stepData);
                    $stepIdMapping[$stepData['temp_id']] = $step->id;
                }

                // Create new connections
                if (isset($data['connections'])) {
                    foreach ($data['connections'] as $connectionData) {
                        $this->createStepConnection(
                            $stepIdMapping[$connectionData['from_step_temp_id']],
                            $stepIdMapping[$connectionData['to_step_temp_id']],
                            $connectionData
                        );
                    }
                }
            }

            return $workflow->load(['steps.fieldMappings', 'steps.outgoingConnections']);
        });
    }

    public function deleteWorkflow(Workflow $workflow): bool
    {
        return $workflow->delete();
    }

    public function activateWorkflow(Workflow $workflow): Workflow
    {
        // Validate workflow before activation
        $this->validateWorkflowForActivation($workflow);

        $workflow->update(['status' => 'active']);

        return $workflow;
    }

    protected function validateWorkflowForActivation(Workflow $workflow): void
    {
        // Check if workflow has at least one trigger
        $triggerStep = $workflow->getTriggerStep();
        if (!$triggerStep) {
            throw new \Exception('Workflow must have at least one trigger step');
        }

        // Check if all required configurations are present
        foreach ($workflow->steps as $step) {
            $this->validateStepConfiguration($step);
        }
    }

    protected function validateStepConfiguration(WorkflowStep $step): void
    {
        $config = $step->configuration;

        switch ($step->service) {
            case 'facebook_lead_ads':
                if (empty($config['page_id']) || empty($config['form_id'])) {
                    throw new \Exception("Facebook Lead Ads step requires page_id and form_id");
                }
                break;
            case 'webhook':
                if (empty($config['url'])) {
                    throw new \Exception("Webhook step requires URL");
                }
                break;
        }
    }
}
