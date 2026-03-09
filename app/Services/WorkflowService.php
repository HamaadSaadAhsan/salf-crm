<?php

namespace App\Services;

use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowFieldMapping;
use App\Models\WorkflowStep;
use App\Models\WorkflowStepConnection;
use Illuminate\Support\Facades\DB;

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
                'metadata' => $data['metadata'] ?? [],
            ]);

            // Create workflow steps (if provided)
            $stepIdMapping = [];
            if (! empty($data['steps'])) {
                foreach ($data['steps'] as $stepData) {
                    $step = $this->createWorkflowStep($workflow, $stepData);
                    $tempKey = $stepData['temp_id'] ?? $stepData['id'] ?? $step->id;
                    $stepIdMapping[$tempKey] = $step->id;
                }

                // Create step connections
                if (isset($data['connections'])) {
                    foreach ($data['connections'] as $connectionData) {
                        $fromId = $stepIdMapping[$connectionData['from_step_temp_id']] ?? null;
                        $toId = $stepIdMapping[$connectionData['to_step_temp_id']] ?? null;
                        if ($fromId && $toId) {
                            $this->createStepConnection($fromId, $toId, $connectionData);
                        }
                    }
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
            'enabled' => $stepData['enabled'] ?? true,
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
                    'required' => $mappingData['required'] ?? false,
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
            'conditions' => $connectionData['conditions'] ?? [],
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
                'metadata' => $data['metadata'] ?? $workflow->metadata,
                'canvas_data' => $data['canvas_data'] ?? $workflow->canvas_data,
            ]);

            // If steps are provided, replace all steps
            if (isset($data['steps'])) {
                // Delete existing steps (cascade will handle connections and mappings)
                $workflow->steps()->delete();

                // Create new steps
                $stepIdMapping = [];
                foreach ($data['steps'] as $stepData) {
                    $step = $this->createWorkflowStep($workflow, $stepData);
                    $tempKey = $stepData['temp_id'] ?? $stepData['id'] ?? $step->id;
                    $stepIdMapping[$tempKey] = $step->id;
                }

                // Create new connections
                if (isset($data['connections'])) {
                    foreach ($data['connections'] as $connectionData) {
                        $fromId = $stepIdMapping[$connectionData['from_step_temp_id']] ?? null;
                        $toId = $stepIdMapping[$connectionData['to_step_temp_id']] ?? null;
                        if ($fromId && $toId) {
                            $this->createStepConnection($fromId, $toId, $connectionData);
                        }
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

    public function duplicateWorkflow(Workflow $originalWorkflow, User $user): Workflow
    {
        return DB::transaction(function () use ($originalWorkflow, $user) {
            // Load the original workflow with all relationships
            $originalWorkflow->load(['steps.fieldMappings', 'steps.outgoingConnections']);

            // Create the duplicated workflow
            $duplicatedWorkflow = Workflow::create([
                'name' => $originalWorkflow->name.' (Copy)',
                'description' => $originalWorkflow->description,
                'status' => 'draft',
                'user_id' => $user->id,
                'metadata' => $originalWorkflow->metadata,
            ]);

            // Create a mapping of old step IDs to new step IDs
            $stepIdMapping = [];

            // Duplicate all steps
            foreach ($originalWorkflow->steps as $originalStep) {
                $newStep = WorkflowStep::create([
                    'workflow_id' => $duplicatedWorkflow->id,
                    'step_type' => $originalStep->step_type,
                    'service' => $originalStep->service,
                    'operation' => $originalStep->operation,
                    'order' => $originalStep->order,
                    'configuration' => $originalStep->configuration,
                    'enabled' => $originalStep->enabled,
                ]);

                $stepIdMapping[$originalStep->id] = $newStep->id;

                // Duplicate field mappings
                foreach ($originalStep->fieldMappings as $originalMapping) {
                    WorkflowFieldMapping::create([
                        'workflow_step_id' => $newStep->id,
                        'source_field' => $originalMapping->source_field,
                        'target_field' => $originalMapping->target_field,
                        'field_type' => $originalMapping->field_type,
                        'transformation_rules' => $originalMapping->transformation_rules,
                        'required' => $originalMapping->required,
                    ]);
                }
            }

            // Duplicate step connections
            foreach ($originalWorkflow->steps as $originalStep) {
                foreach ($originalStep->outgoingConnections as $originalConnection) {
                    WorkflowStepConnection::create([
                        'from_step_id' => $stepIdMapping[$originalConnection->from_step_id],
                        'to_step_id' => $stepIdMapping[$originalConnection->to_step_id],
                        'conditions' => $originalConnection->conditions,
                    ]);
                }
            }

            return $duplicatedWorkflow->load(['steps.fieldMappings', 'steps.outgoingConnections']);
        });
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
        if (! $triggerStep) {
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
                    throw new \Exception('Facebook Lead Ads step requires page_id and form_id');
                }
                break;
            case 'webhook':
                // Webhook no longer requires URL - data is automatically mapped to leads
                // Field mappings are required instead
                if (empty($step->fieldMappings) || $step->fieldMappings->count() === 0) {
                    throw new \Exception('Webhook step requires at least one field mapping');
                }
                break;
        }
    }
}
