<?php

// app/Http/Controllers/Api/WorkflowController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WorkflowService;
use App\Http\Requests\StoreWorkflowRequest;
use App\Http\Requests\UpdateWorkflowRequest;
use App\Http\Resources\WorkflowResource;
use App\Models\Workflow;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WorkflowController extends Controller
{
    protected WorkflowService $workflowService;

    public function __construct(WorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    public function index(Request $request): JsonResponse
    {
        $startTime = microtime(true);

        $workflows = Workflow::with(['steps.fieldMappings', 'steps.outgoingConnections'])
            ->where('user_id', $request->user()->id)
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => WorkflowResource::collection($workflows->items()),
            'meta' => [
                'current_page' => $workflows->currentPage(),
                'per_page' => $workflows->perPage(),
                'total' => $workflows->total(),
                'last_page' => $workflows->lastPage(),
                'from' => $workflows->firstItem(),
                'to' => $workflows->lastItem(),
                'has_more' => $workflows->hasMorePages(),
                'query_time' => round((microtime(true) - $startTime) * 1000, 2),
            ]
        ]);
    }

    public function store(StoreWorkflowRequest $request): JsonResponse
    {
        try {
            $workflow = $this->workflowService->createWorkflow(
                $request->validated(),
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => 'Workflow created successfully',
                'data' => new WorkflowResource($workflow)
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create workflow',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Workflow $workflow): JsonResponse
    {
        request()->user()->can('view', $workflow);

        $workflow->load(['steps.fieldMappings', 'steps.outgoingConnections.toStep']);

        return response()->json([
            'success' => true,
            'data' => new WorkflowResource($workflow)
        ]);
    }

    public function update(UpdateWorkflowRequest $request, Workflow $workflow): JsonResponse
    {
        $this->authorize('update', $workflow);

        try {
            $workflow = $this->workflowService->updateWorkflow(
                $workflow,
                $request->validated()
            );

            return response()->json([
                'success' => true,
                'message' => 'Workflow updated successfully',
                'data' => new WorkflowResource($workflow)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update workflow',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Workflow $workflow): JsonResponse
    {
        $this->authorize('delete', $workflow);

        try {
            $this->workflowService->deleteWorkflow($workflow);

            return response()->json([
                'success' => true,
                'message' => 'Workflow deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete workflow',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function activate(Workflow $workflow): JsonResponse
    {
        $this->authorize('update', $workflow);

        try {
            $workflow = $this->workflowService->activateWorkflow($workflow);

            return response()->json([
                'success' => true,
                'message' => 'Workflow activated successfully',
                'data' => new WorkflowResource($workflow)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to activate workflow',
                'error' => $e->getMessage()
            ], 500);
        }
    }

}
