<?php

// app/Http/Controllers/Api/WorkflowController.php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWorkflowRequest;
use App\Http\Requests\UpdateWorkflowRequest;
use App\Http\Resources\WorkflowResource;
use App\Models\Lead;
use App\Models\Workflow;
use App\Services\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class WorkflowController extends Controller
{
    protected WorkflowService $workflowService;

    public function __construct(WorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    public function index(Request $request)
    {
        $workflows = Workflow::with(['steps.fieldMappings', 'steps.outgoingConnections'])
            ->where('user_id', $request->user()->id)
            ->withCount('executions')
            ->latest()
            ->get()
            ->map(function ($workflow) {
                return [
                    'id' => $workflow->id,
                    'name' => $workflow->name,
                    'description' => $workflow->description,
                    'status' => $workflow->status,
                    'webhook_url' => $workflow->webhook_url,
                    'webhook_token' => $workflow->webhook_token,
                    'canvas_data' => $workflow->canvas_data,
                    'created_at' => $workflow->created_at->toISOString(),
                    'updated_at' => $workflow->updated_at->toISOString(),
                    'executions_count' => $workflow->executions_count,
                    'last_execution' => $workflow->executions()->latest()->first()?->created_at?->toISOString(),
                    'steps' => $workflow->steps->map(function ($step) {
                        return [
                            'id' => $step->id,
                            'step_type' => $step->step_type,
                            'service' => $step->service,
                            'operation' => $step->operation,
                            'order' => $step->order,
                            'enabled' => $step->enabled,
                            'configuration' => $step->configuration,
                            'field_mappings' => $step->fieldMappings,
                        ];
                    }),
                ];
            });

        return Inertia::render('workflows/index', [
            'workflows' => $workflows,
        ]);
    }

    public function createNew(Request $request)
    {
        $workflow = $this->workflowService->createWorkflow([
            'name' => 'Untitled Workflow',
            'description' => '',
            'status' => 'draft',
            'metadata' => ['is_new' => true],
            'steps' => [],
        ], $request->user());

        return redirect()->route('workflows.show', $workflow);
    }

    public function store(StoreWorkflowRequest $request)
    {
        try {
            $workflow = $this->workflowService->createWorkflow(
                $request->validated(),
                $request->user()
            );

            return redirect()->route('workflows.show', $workflow)
                ->with('success', 'Workflow created successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'message' => 'Failed to create workflow: '.$e->getMessage(),
            ]);
        }
    }

    public function show(Workflow $workflow)
    {
        $this->authorize('view', $workflow);

        $workflow->load(['steps.fieldMappings', 'steps.outgoingConnections.toStep']);
        $workflow->loadCount('executions');

        return Inertia::render('workflows/show', [
            'workflow' => [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'description' => $workflow->description,
                'status' => $workflow->status,
                'webhook_url' => $workflow->webhook_url,
                'webhook_token' => $workflow->webhook_token,
                'canvas_data' => $workflow->canvas_data,
                'created_at' => $workflow->created_at->toISOString(),
                'updated_at' => $workflow->updated_at->toISOString(),
                'executions_count' => $workflow->executions_count,
                'last_execution' => $workflow->executions()->latest()->first()?->created_at?->toISOString(),
                'steps' => $workflow->steps->map(function ($step) {
                    return [
                        'id' => $step->id,
                        'step_type' => $step->step_type,
                        'service' => $step->service,
                        'operation' => $step->operation,
                        'order' => $step->order,
                        'enabled' => $step->enabled,
                        'configuration' => $step->configuration,
                        'field_mappings' => $step->fieldMappings,
                    ];
                }),
            ],
        ]);
    }

    public function edit(Workflow $workflow)
    {
        $this->authorize('update', $workflow);

        $workflow->load(['steps.fieldMappings', 'steps.outgoingConnections.toStep']);

        return Inertia::render('workflows/edit', [
            'workflow' => [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'description' => $workflow->description,
                'status' => $workflow->status,
                'webhook_url' => $workflow->webhook_url,
                'webhook_token' => $workflow->webhook_token,
                'canvas_data' => $workflow->canvas_data,
                'created_at' => $workflow->created_at->toISOString(),
                'updated_at' => $workflow->updated_at->toISOString(),
                'steps' => $workflow->steps->map(function ($step) {
                    return [
                        'id' => $step->id,
                        'step_type' => $step->step_type,
                        'service' => $step->service,
                        'operation' => $step->operation,
                        'order' => $step->order,
                        'enabled' => $step->enabled,
                        'configuration' => $step->configuration,
                        'field_mappings' => $step->fieldMappings,
                    ];
                }),
            ],
        ]);
    }

    public function update(UpdateWorkflowRequest $request, Workflow $workflow)
    {
        $this->authorize('update', $workflow);

        try {
            // Handle status updates (PATCH requests)
            if ($request->has('status') && $request->method() === 'PATCH') {
                $workflow->update(['status' => $request->validated()['status']]);

                return redirect()->back()->with('success', 'Workflow status updated successfully');
            }

            // Handle full workflow updates (PUT requests)
            $validated = $request->validated();
            $previousStatus = $workflow->status;

            // Validate before saving when activating/publishing
            $newStatus = $validated['status'] ?? $previousStatus;
            if ($newStatus === 'active' && $previousStatus !== 'active') {
                // Temporarily apply steps to validate, then save
                $this->workflowService->validateWorkflowSteps($validated['steps'] ?? [], $newStatus);
            }

            $workflow = $this->workflowService->updateWorkflow($workflow, $validated);

            return redirect()->back()
                ->with('success', 'Workflow updated successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'message' => 'Failed to update workflow: '.$e->getMessage(),
            ]);
        }
    }

    public function destroy(Workflow $workflow)
    {
        $this->authorize('delete', $workflow);

        try {
            $this->workflowService->deleteWorkflow($workflow);

            return redirect()->back()->with('success', 'Workflow deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'message' => 'Failed to delete workflow: '.$e->getMessage(),
            ]);
        }
    }

    public function duplicate(Workflow $workflow)
    {
        $this->authorize('view', $workflow);

        try {
            $duplicatedWorkflow = $this->workflowService->duplicateWorkflow($workflow, auth()->user());

            return redirect()->back()->with('success', 'Workflow duplicated successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'message' => 'Failed to duplicate workflow: '.$e->getMessage(),
            ]);
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
                'data' => new WorkflowResource($workflow),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to activate workflow',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getLeadSchema(): JsonResponse
    {
        $leadModel = new Lead;
        $fillableFields = $leadModel->getFillable();
        $tableColumns = Schema::getColumns('leads');

        $fields = collect($tableColumns)
            ->filter(function ($column) use ($fillableFields) {
                return in_array($column['name'], $fillableFields);
            })
            ->map(function ($column) {
                $type = $this->mapDatabaseTypeToFieldType($column['type']);

                return [
                    'id' => $column['name'],
                    'label' => $this->formatFieldLabel($column['name']),
                    'type' => $type,
                    'description' => $this->getFieldDescription($column['name']),
                    'required' => $column['nullable'] === false,
                ];
            })
            ->values()
            ->toArray();

        return response()->json([
            'success' => true,
            'fields' => $fields,
        ]);
    }

    public function testWorkflow(Request $request, Workflow $workflow): JsonResponse
    {
        $this->authorize('update', $workflow);

        try {
            $triggerStep = $workflow->steps()->where('step_type', 'trigger')->first();
            $webhookStep = $workflow->steps()->where('step_type', 'action')->where('service', 'webhook')->first();

            if (! $triggerStep || ! $webhookStep) {
                return response()->json([
                    'success' => false,
                    'message' => 'Workflow must have both trigger and webhook steps configured',
                ], 400);
            }

            $testData = $request->input('lead_data');

            if (! $testData) {
                return response()->json([
                    'success' => false,
                    'message' => 'No test data provided',
                ], 400);
            }

            // Map fields and create lead
            $leadData = $this->mapFieldsToLead($testData, $webhookStep->fieldMappings);

            $lead = Lead::create($leadData['mapped']);

            return response()->json([
                'success' => true,
                'message' => 'Lead created successfully',
                'lead' => [
                    'id' => $lead->id,
                    'name' => $lead->name,
                    'email' => $lead->email,
                    'phone' => $lead->phone,
                    'custom_fields' => $lead->custom_fields,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to test workflow',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    protected function mapFieldsToLead(array $facebookData, $fieldMappings): array
    {
        $mapped = [];
        $unmapped = [];

        // Process field_data from Facebook lead
        if (isset($facebookData['field_data']) && is_array($facebookData['field_data'])) {
            foreach ($facebookData['field_data'] as $field) {
                $fieldName = $field['name'];
                $fieldValue = is_array($field['values']) ? implode(', ', $field['values']) : $field['values'];

                // Check if there's a mapping for this field
                $mapping = collect($fieldMappings)->firstWhere('target_field', $fieldName);

                if ($mapping && ! empty($mapping['source_field'])) {
                    // Map to lead field
                    $mapped[$mapping['source_field']] = $fieldValue;
                } else {
                    // Store in unmapped for custom_fields
                    $unmapped[$fieldName] = $fieldValue;
                }
            }
        }

        // Add Facebook metadata
        $unmapped['facebook_lead_id'] = $facebookData['id'] ?? null;
        $unmapped['facebook_ad_id'] = $facebookData['ad_id'] ?? null;
        $unmapped['facebook_form_id'] = $facebookData['form_id'] ?? null;
        $unmapped['facebook_created_time'] = $facebookData['created_time'] ?? null;

        // Merge custom_fields
        $mapped['custom_fields'] = array_merge($mapped['custom_fields'] ?? [], $unmapped);
        $mapped['external_id'] = $facebookData['id'] ?? null;

        return [
            'mapped' => $mapped,
            'unmapped' => $unmapped,
        ];
    }

    protected function mapDatabaseTypeToFieldType(string $dbType): string
    {
        return match (true) {
            str_contains($dbType, 'int') => 'number',
            str_contains($dbType, 'varchar') => 'text',
            str_contains($dbType, 'text') => 'textarea',
            str_contains($dbType, 'bool') => 'boolean',
            str_contains($dbType, 'date') => 'date',
            str_contains($dbType, 'timestamp') => 'datetime',
            str_contains($dbType, 'decimal') => 'number',
            str_contains($dbType, 'float') => 'number',
            str_contains($dbType, 'json') => 'json',
            default => 'text',
        };
    }

    protected function formatFieldLabel(string $fieldName): string
    {
        return ucwords(str_replace('_', ' ', $fieldName));
    }

    protected function getFieldDescription(string $fieldName): string
    {
        $descriptions = [
            'name' => 'Lead full name',
            'email' => 'Email address',
            'phone' => 'Phone number',
            'occupation' => 'Job title or occupation',
            'address' => 'Street address',
            'country' => 'Country',
            'city' => 'City',
            'detail' => 'Additional details or notes',
            'budget' => 'Budget information',
            'inquiry_type' => 'Type of inquiry',
            'inquiry_country' => 'Country of inquiry',
            'inquiry_status' => 'Current status of the inquiry',
            'priority' => 'Priority level',
            'service_id' => 'Associated service',
            'lead_source_id' => 'Lead source',
            'assigned_to' => 'Assigned user',
            'custom_fields' => 'Additional custom data',
        ];

        return $descriptions[$fieldName] ?? '';
    }

    /**
     * Get the authenticated user's full Facebook connection status (account-level)
     */
    public function facebookTokenStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        $hasToken = $user->hasFacebookToken();
        $isExpired = $hasToken && $user->isFacebookTokenExpired();

        $pages = \App\Models\MetaPage::where('user_id', $user->id)->get();
        $hasPages = $pages->isNotEmpty();

        // Build per-page subscription status
        $pageStatuses = $pages->map(fn ($p) => [
            'id' => $p->page_id,
            'name' => $p->name,
            'webhook_subscribed' => $p->webhook_subscribed_at !== null,
            'app_subscribed' => $p->app_subscribed_at !== null,
            'fully_subscribed' => $p->isFullySubscribed(),
        ]);

        // Check if at least one page is fully set up
        $anyPageFullySetup = $pages->contains(fn ($p) => $p->isFullySubscribed());

        return response()->json([
            'connected' => $hasToken && ! $isExpired,
            'has_token' => $hasToken,
            'is_expired' => $isExpired,
            'has_pages' => $hasPages,
            'pages_synced' => $hasPages,
            'webhook_subscribed' => $pages->contains(fn ($p) => $p->webhook_subscribed_at !== null),
            'app_subscribed' => $pages->contains(fn ($p) => $p->app_subscribed_at !== null),
            'fully_setup' => $hasToken && ! $isExpired && $anyPageFullySetup,
            'connected_at' => $user->facebook_connected_at?->toISOString(),
            'expires_at' => $user->facebook_token_expires_at?->toISOString(),
            'pages' => $pageStatuses,
        ]);
    }

    /**
     * Get synced Facebook pages for the authenticated user
     */
    public function getPages(Request $request, Workflow $workflow): JsonResponse
    {
        $this->authorize('view', $workflow);

        $pages = \App\Models\MetaPage::where('user_id', $request->user()->id)
            ->select('page_id as id', 'name')
            ->get()
            ->toArray();

        return response()->json(['pages' => $pages]);
    }

    /**
     * Auto-subscribe workflow's dynamic webhook to Facebook
     */
    public function subscribeWebhook(Request $request, Workflow $workflow): JsonResponse
    {
        $this->authorize('update', $workflow);

        try {
            if (! $workflow->webhook_token) {
                return response()->json(['success' => false, 'message' => 'Workflow has no webhook token'], 400);
            }

            $user = $request->user();
            $accessToken = $user->getFacebookAccessToken();

            if (! $accessToken) {
                return response()->json(['success' => false, 'message' => 'No Facebook access token. Complete OAuth first.'], 400);
            }

            $pageQuery = \App\Models\MetaPage::where('user_id', $user->id)
                ->whereNotNull('access_token')
                ->where('access_token', '!=', '');

            if ($request->input('page_id')) {
                $pageQuery->where('page_id', $request->input('page_id'));
            }

            $page = $pageQuery->first();

            if (! $page) {
                return response()->json(['success' => false, 'message' => 'No Facebook pages found. Run Page Sync first.'], 400);
            }

            $facebookService = app(\App\Services\FacebookService::class);

            $result = $facebookService->subscribeToWebhook(
                $page->access_token,
                $page->page_id,
                ['leadgen', 'feed'],
                $workflow->webhook_url,
                $workflow->webhook_token,
            );

            if ($result['success']) {
                $workflow->update([
                    'metadata' => array_merge($workflow->metadata ?? [], [
                        'webhook_verify_token' => $workflow->webhook_token,
                        'webhook_subscribed_at' => now()->toISOString(),
                        'webhook_page_id' => $page->page_id,
                    ]),
                ]);

                // Persist subscription status at the page level (account-wide)
                $page->update(['webhook_subscribed_at' => now()]);
            }

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Workflow webhook subscription failed', [
                'workflow_id' => $workflow->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to subscribe webhook: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Auto-subscribe app to page events for a workflow
     */
    public function subscribeApp(Request $request, Workflow $workflow): JsonResponse
    {
        $this->authorize('update', $workflow);

        try {
            $user = $request->user();
            $accessToken = $user->getFacebookAccessToken();

            if (! $accessToken) {
                return response()->json(['success' => false, 'message' => 'No Facebook access token. Complete OAuth first.'], 400);
            }

            $pageQuery = \App\Models\MetaPage::where('user_id', $user->id)
                ->whereNotNull('access_token')
                ->where('access_token', '!=', '');

            if ($request->input('page_id')) {
                $pageQuery->where('page_id', $request->input('page_id'));
            }

            $page = $pageQuery->first();

            if (! $page) {
                return response()->json(['success' => false, 'message' => 'No Facebook pages found. Run Page Sync first.'], 400);
            }

            $apiVersion = config('services.facebook.api_version', 'v23.0');

            $response = Http::post(
                "https://graph.facebook.com/{$apiVersion}/{$page->page_id}/subscribed_apps",
                [
                    'access_token' => $page->access_token,
                    'subscribed_fields' => 'leadgen,feed',
                ]
            );

            if (! $response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to subscribe app to page',
                    'details' => $response->json(),
                ], 400);
            }

            $workflow->update([
                'metadata' => array_merge($workflow->metadata ?? [], [
                    'app_subscribed_at' => now()->toISOString(),
                    'app_subscribed_page_id' => $page->page_id,
                ]),
            ]);

            // Persist subscription status at the page level (account-wide)
            $page->update(['app_subscribed_at' => now()]);

            return response()->json([
                'success' => true,
                'message' => 'App subscribed to page events',
                'data' => $response->json(),
            ]);
        } catch (\Exception $e) {
            Log::error('Workflow app subscription failed', [
                'workflow_id' => $workflow->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to subscribe app: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync Facebook pages for a workflow
     */
    public function syncPages(Request $request, Workflow $workflow): JsonResponse
    {
        $this->authorize('update', $workflow);

        try {
            $user = $request->user();
            $accessToken = $user->getFacebookAccessToken();

            if (! $accessToken) {
                return response()->json(['success' => false, 'message' => 'No Facebook access token. Complete OAuth first.'], 400);
            }

            $apiVersion = config('services.facebook.api_version', 'v23.0');

            $response = Http::get("https://graph.facebook.com/{$apiVersion}/me/accounts", [
                'access_token' => $accessToken,
                'fields' => 'id,name,category,access_token,picture',
            ]);

            if (! $response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch pages from Facebook',
                ], 400);
            }

            $pages = $response->json('data', []);

            // Store pages in meta_pages table
            foreach ($pages as $pageData) {
                \App\Models\MetaPage::updateOrCreate(
                    ['user_id' => $user->id, 'page_id' => $pageData['id']],
                    [
                        'name' => $pageData['name'],
                        'access_token' => $pageData['access_token'] ?? '',
                        'last_updated' => now(),
                    ]
                );
            }

            return response()->json([
                'success' => true,
                'message' => count($pages).' pages synced',
                'pages' => collect($pages)->map(fn ($p) => [
                    'id' => $p['id'],
                    'name' => $p['name'],
                    'category' => $p['category'] ?? null,
                ])->toArray(),
            ]);
        } catch (\Exception $e) {
            Log::error('Workflow page sync failed', [
                'workflow_id' => $workflow->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync pages: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Dispatch background job to run full Facebook setup after OAuth:
     * sync pages → subscribe webhooks → subscribe app (skips already-subscribed pages).
     * Progress is broadcast via Reverb on the workflow channel.
     */
    public function autoSetupFacebook(Request $request, Workflow $workflow): JsonResponse
    {
        $this->authorize('update', $workflow);

        $user = $request->user();

        if (! $user->hasFacebookToken()) {
            return response()->json(['success' => false, 'message' => 'No Facebook access token.'], 400);
        }

        \App\Jobs\AutoSetupFacebookJob::dispatch($user->id, $workflow->id);

        return response()->json([
            'success' => true,
            'message' => 'Facebook setup started — progress will be broadcast via WebSocket.',
        ], 202);
    }

    /**
     * Get lead gen forms for a specific page
     */
    public function getLeadForms(Request $request, Workflow $workflow): JsonResponse
    {
        $this->authorize('view', $workflow);

        $request->validate(['page_id' => 'required|string']);

        try {
            $user = $request->user();
            $page = \App\Models\MetaPage::where('user_id', $user->id)
                ->where('page_id', $request->input('page_id'))
                ->whereNotNull('access_token')
                ->where('access_token', '!=', '')
                ->firstOrFail();

            $apiVersion = config('services.facebook.api_version', 'v23.0');

            $response = Http::get(
                "https://graph.facebook.com/{$apiVersion}/{$page->page_id}/leadgen_forms",
                [
                    'access_token' => $page->access_token,
                    'fields' => 'id,name,status,questions',
                ]
            );

            if (! $response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch lead forms from Facebook',
                ], 400);
            }

            $forms = collect($response->json('data', []))->map(fn ($f) => [
                'id' => $f['id'],
                'name' => $f['name'] ?? 'Untitled Form',
                'status' => $f['status'] ?? 'ACTIVE',
                'questions' => collect($f['questions'] ?? [])->map(fn ($q) => [
                    'key' => $q['key'] ?? $q['id'] ?? '',
                    'label' => $q['label'] ?? $q['key'] ?? '',
                    'type' => $q['type'] ?? 'CUSTOM',
                ])->toArray(),
            ]);

            return response()->json(['success' => true, 'forms' => $forms]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch lead forms', [
                'workflow_id' => $workflow->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch lead forms: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a test lead on Facebook and fetch the response data
     */
    public function testTrigger(Request $request, Workflow $workflow): JsonResponse
    {
        $this->authorize('update', $workflow);

        $request->validate([
            'page_id' => 'required|string',
            'form_id' => 'required|string',
        ]);

        try {
            $user = $request->user();
            $page = \App\Models\MetaPage::where('user_id', $user->id)
                ->where('page_id', $request->input('page_id'))
                ->whereNotNull('access_token')
                ->where('access_token', '!=', '')
                ->firstOrFail();

            $apiVersion = config('services.facebook.api_version', 'v23.0');
            $formId = $request->input('form_id');

            // Delete existing test leads first (Facebook only allows one per form)
            $existingResponse = Http::get(
                "https://graph.facebook.com/{$apiVersion}/{$formId}/test_leads",
                ['access_token' => $page->access_token]
            );

            if ($existingResponse->successful()) {
                foreach ($existingResponse->json('data', []) as $existing) {
                    Http::delete(
                        "https://graph.facebook.com/{$apiVersion}/{$existing['id']}",
                        ['access_token' => $page->access_token]
                    );
                }
            }

            // Create a new test lead
            $createResponse = Http::post(
                "https://graph.facebook.com/{$apiVersion}/{$formId}/test_leads",
                ['access_token' => $page->access_token]
            );

            if (! $createResponse->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create test lead on Facebook',
                    'details' => $createResponse->json(),
                ], 400);
            }

            $leadId = $createResponse->json('id');

            if (! $leadId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No lead ID returned from Facebook',
                ], 400);
            }

            // Fetch the test lead data
            $leadResponse = Http::get(
                "https://graph.facebook.com/{$apiVersion}/{$leadId}",
                [
                    'access_token' => $page->access_token,
                    'fields' => 'id,created_time,field_data,ad_id,form_id,campaign_id',
                ]
            );

            if (! $leadResponse->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch test lead data',
                ], 400);
            }

            $leadData = $leadResponse->json();

            // Extract field names from the response
            $fields = collect($leadData['field_data'] ?? [])->map(fn ($f) => [
                'name' => $f['name'],
                'values' => $f['values'] ?? [],
            ])->toArray();

            return response()->json([
                'success' => true,
                'lead_id' => $leadId,
                'lead_data' => $leadData,
                'fields' => $fields,
            ]);
        } catch (\Exception $e) {
            Log::error('Test trigger failed', [
                'workflow_id' => $workflow->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to test trigger: '.$e->getMessage(),
            ], 500);
        }
    }
}
