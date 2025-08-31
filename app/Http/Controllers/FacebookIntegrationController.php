<?php

namespace App\Http\Controllers;

use App\Http\Requests\FacebookIntegrationRequest;
use App\Models\Integration;
use App\Models\FacebookWebhookConfig;
use App\Models\LeadForm;
use App\Models\MetaPage;
use App\Services\FacebookService;
use App\Services\FacebookSdkService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Exception;
use Inertia\Inertia;

class FacebookIntegrationController extends Controller
{
    protected FacebookService $facebookService;
    protected FacebookSdkService $facebookSdkService;

    public function __construct(FacebookService $facebookService, FacebookSdkService $facebookSdkService)
    {
        $this->facebookService = $facebookService;
        $this->facebookSdkService = $facebookSdkService;
    }

    /**
     * Get available integration templates
     */
    public function getTemplates(): JsonResponse
    {
        try {
            $templates = config('facebook_templates');

            return response()->json([
                'success' => true,
                'templates' => $templates
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get Facebook templates: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to load integration templates'
            ], 500);
        }
    }

    /**
     * Apply template configuration
     */
    public function applyTemplate(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'template_key' => 'required|string'
            ]);

            $templates = config('facebook_templates');
            $templateKey = $request->template_key;

            if (!isset($templates[$templateKey])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid template selected'
                ], 400);
            }

            $template = $templates[$templateKey];

            // Store template configuration in cache for the current user
            $userId = $request->user()->id;
            cache()->put("facebook_template_config_{$userId}", $template, 3600); // 1 hour

            return response()->json([
                'success' => true,
                'message' => "Applied {$template['name']} template successfully",
                'template' => $template
            ]);

        } catch (Exception $e) {
            Log::error('Failed to apply Facebook template: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to apply template configuration'
            ], 500);
        }
    }

    /**
     * Get Facebook integration configuration
     */
    public function index()
    {
        $integration = Integration::where('provider', 'facebook')->first();

        if (!$integration) {
            return response()->json([
                'success' => true,
                'exists' => false,
                'message' => 'Facebook integration not configured yet',
                'webhook_url' => $this->getWebhookUrlFromDatabase()
            ]);
        }

        $config = $integration->config;

        // Mask sensitive data
        $safeConfig = [
            'appId' => $config['app_id'] ?? '',
            'pageId' => $config['page_id'] ?? '',
            'enableMessaging' => $config['features']['messaging'] ?? false,
            'enablePosts' => $config['features']['posts'] ?? false,
            'enableInsights' => $config['features']['insights'] ?? false,
            'enableComments' => $config['features']['comments'] ?? false,
            'enableLeadGen' => $config['features']['leadgen'] ?? false,
            'webhookConfigured' => !empty($config['webhook_verify_token']),
            'webhook_verify_token' => $config['webhook_verify_token'] ?? '',
            'appSecret' => str_repeat('•', 16),
            'accessToken' => str_repeat('•', 16),
        ];

        return Inertia::render('integrations/facebook/index', [
            'success' => true,
            'exists' => true,
            'integration' => [
                'id' => $integration->id,
                'provider' => $integration->provider,
                'name' => $integration->name,
                'active' => $integration->active,
                'config' => $safeConfig,
                'created_at' => $integration->created_at,
                'updated_at' => $integration->updated_at,
            ],
            'webhook_url' => $this->getWebhookUrlFromDatabase()
        ]);
    }

    /**
     * Create or update Facebook integration
     */
    public function store(FacebookIntegrationRequest $request): JsonResponse
    {
        try {
            $validatedData = $request->validated();
            $userId = $request->user()->id;

            // Get template configuration if applied
            $templateConfig = cache()->get("facebook_template_config_{$userId}");

            // Use SDK for credential verification
            $verificationResult = $this->facebookSdkService->verifyCredentials([
                'app_id' => $validatedData['appId'],
                'app_secret' => $validatedData['appSecret'],
                'access_token' => auth()->user()->getFacebookAccessToken(),
                'page_id' => $validatedData['pageId'] ?? null
            ]);

            if (!$verificationResult['verified']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to verify Facebook credentials',
                    'error' => $verificationResult['error']
                ], 400);
            }

            // Merge template configuration with user input
            $features = [];
            if ($templateConfig) {
                $features = $templateConfig['features'];
            } else {
                // Fallback to individual toggles if no template applied
                $features = [
                    'messaging' => $validatedData['enableMessaging'] ?? false,
                    'posts' => $validatedData['enablePosts'] ?? false,
                    'insights' => $validatedData['enableInsights'] ?? false,
                    'comments' => $validatedData['enableComments'] ?? false,
                    'leadgen' => $validatedData['enableLeadGen'] ?? false,
                ];
            }

            $config = [
                'app_id' => $validatedData['appId'],
                'app_secret' => encrypt($validatedData['appSecret']),
                'page_id' => $validatedData['pageId'],
                'access_token' => encrypt(auth()->user()->getFacebookAccessToken()),
                'webhook_verify_token' => $validatedData['webhook_verify_token'] ?? null,
                'features' => $features,
                'template' => $templateConfig ? [
                    'name' => $templateConfig['name'],
                    'description' => $templateConfig['description'],
                    'applied_at' => now()
                ] : null,
                'page_info' => $verificationResult['page_info'] ?? null,
            ];

            $integration = Integration::updateOrCreate(
                ['provider' => 'facebook'],
                [
                    'name' => 'Facebook',
                    'config' => $config,
                    'active' => true,
                ]
            );

            // Setup webhook if verify token provided and template config exists
            if (!empty($validatedData['webhook_verify_token'])) {
                $webhookSubscriptions = $templateConfig['webhook_subscriptions'] ?? ['leadgen'];
                $this->setupWebhook($integration, $validatedData, $webhookSubscriptions);
            }

            // Clear any cached data including template config
            Cache::forget('facebook_integration');
            Cache::forget('facebook_pages');
            cache()->forget("facebook_template_config_{$userId}");

            return response()->json([
                'success' => true,
                'message' => 'Facebook integration configured successfully',
                'verified' => $verificationResult['verified'],
                'integration' => [
                    'id' => $integration->id,
                    'provider' => $integration->provider,
                    'name' => $integration->name,
                    'active' => $integration->active,
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Facebook integration configuration error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to configure Facebook integration'
            ], 500);
        }
    }

    /**
     * Get Facebook integration health status
     */
    public function getHealthStatus(): JsonResponse
    {
        try {
            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found or inactive',
                    'health_status' => [
                        'api' => false,
                        'webhooks' => false,
                        'permissions' => false,
                        'lastChecked' => now()->toISOString(),
                    ],
                    'connection_status' => 'disconnected',
                    'last_sync_at' => null,
                ]);
            }

            $config = $integration->config;
            $accessToken = decrypt($config['access_token']);

            // Test API connection
            $apiHealthy = false;
            $webhooksHealthy = false;
            $permissionsHealthy = false;

            try {
                $this->facebookSdkService->initializeApi(
                    $config['app_id'],
                    decrypt($config['app_secret']),
                    $accessToken
                );

                $connectionTest = $this->facebookSdkService->testConnection();
                $apiHealthy = $connectionTest['success'];

                if ($apiHealthy) {
                    // Test permissions by trying to get page info
                    try {
                        $pageInfo = $this->facebookSdkService->getPageInfo($config['page_id']);
                        $permissionsHealthy = !empty($pageInfo);
                    } catch (Exception $e) {
                        $permissionsHealthy = false;
                    }
                }
            } catch (Exception $e) {
                Log::error('Facebook API health check failed: ' . $e->getMessage());
                $apiHealthy = false;
            }

            // Check webhook configuration
            $webhookConfig = FacebookWebhookConfig::where('app_id', $config['app_id'])
                ->where('page_id', $config['page_id'])
                ->where('active', true)
                ->first();

            $webhooksHealthy = $webhookConfig !== null;

            // Get last sync timestamp
            $lastSync = $integration->updated_at;

            return response()->json([
                'success' => true,
                'health_status' => [
                    'api' => $apiHealthy,
                    'webhooks' => $webhooksHealthy,
                    'permissions' => $permissionsHealthy,
                    'lastChecked' => now()->toISOString(),
                ],
                'connection_status' => $apiHealthy ? 'connected' : 'error',
                'last_sync_at' => $lastSync ? $lastSync->toISOString() : null,
                'integration_info' => [
                    'id' => $integration->id,
                    'name' => $integration->name,
                    'active' => $integration->active,
                    'page_name' => $config['page_info']['name'] ?? null,
                    'features' => $config['features'] ?? [],
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get Facebook health status: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to get integration health status',
                'health_status' => [
                    'api' => false,
                    'webhooks' => false,
                    'permissions' => false,
                    'lastChecked' => now()->toISOString(),
                ],
                'connection_status' => 'error',
                'last_sync_at' => null,
            ], 500);
        }
    }

    /**
     * Test Facebook integration connection
     */
    public function testConnection(): JsonResponse
    {
        try {
            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found or inactive'
                ], 404);
            }

            $config = $integration->config;
            $accessToken = decrypt($config['access_token']);

            $testResults = $this->facebookService->runConnectionTests($accessToken, $config);

            return response()->json([
                'success' => true,
                'tests' => $testResults
            ]);

        } catch (Exception $e) {
            Log::error('Facebook connection test failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to test Facebook connection'
            ], 500);
        }
    }

    /**
     * Get Facebook page insights
     */
    public function getPageInsights(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'metric' => 'sometimes|string|in:page_views,page_likes,page_impressions,page_engaged_users',
                'period' => 'sometimes|string|in:day,week,days_28',
                'since' => 'sometimes|date',
                'until' => 'sometimes|date'
            ]);

            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found'
                ], 404);
            }

            $config = $integration->config;

            if (!($config['features']['insights'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook insights not enabled for this integration'
                ], 403);
            }

            $accessToken = decrypt($config['access_token']);
            $pageId = $config['page_id'];

            $insights = $this->facebookService->getPageInsights(
                $accessToken,
                $pageId,
                $request->only(['metric', 'period', 'since', 'until'])
            );

            return response()->json([
                'success' => true,
                'insights' => $insights
            ]);

        } catch (Exception $e) {
            Log::error('Failed to fetch Facebook insights: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch page insights'
            ], 500);
        }
    }

    /**
     * Get Facebook page posts
     */
    public function getPagePosts(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'limit' => 'sometimes|integer|min:1|max:100',
                'since' => 'sometimes|date',
                'until' => 'sometimes|date'
            ]);

            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found'
                ], 404);
            }

            $config = $integration->config;
            $accessToken = decrypt($config['access_token']);
            $pageId = $config['page_id'];

            $posts = $this->facebookService->getPagePosts(
                $accessToken,
                $pageId,
                $request->only(['limit', 'since', 'until'])
            );

            return response()->json([
                'success' => true,
                'posts' => $posts
            ]);

        } catch (Exception $e) {
            Log::error('Failed to fetch Facebook posts: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch page posts'
            ], 500);
        }
    }

    /**
     * Create a Facebook post
     */
    public function createPost(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'message' => 'required|string|max:8000',
                'link' => 'sometimes|url',
                'scheduled_publish_time' => 'sometimes|date|after:now',
                'published' => 'sometimes|boolean'
            ]);

            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found'
                ], 404);
            }

            $config = $integration->config;

            if (!($config['features']['posts'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook posting not enabled for this integration'
                ], 403);
            }

            $accessToken = decrypt($config['access_token']);
            $pageId = $config['page_id'];

            $post = $this->facebookService->createPost(
                $accessToken,
                $pageId,
                $request->all()
            );

            return response()->json([
                'success' => true,
                'message' => 'Post created successfully',
                'post' => $post
            ]);

        } catch (Exception $e) {
            Log::error('Failed to create Facebook post: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create post'
            ], 500);
        }
    }

    /**
     * Get webhook configuration
     */
    public function getWebhookConfig(): JsonResponse
    {
        try {
            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found'
                ], 404);
            }

            $webhookConfig = FacebookWebhookConfig::where('app_id', $integration->config['app_id'])
                ->where('page_id', $integration->config['page_id'])
                ->first();

            return response()->json([
                'success' => true,
                'webhook_configured' => !empty($integration->config['webhook_verify_token']),
                'webhook_url' => $this->getWebhookUrlFromDatabase(),
                'verify_token_set' => !empty($integration->config['webhook_verify_token']),
                'subscriptions' => $webhookConfig ? $webhookConfig->subscriptions : []
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get webhook config: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to get webhook configuration'
            ], 500);
        }
    }

    /**
     * Subscribe to webhook fields
     */
    public function subscribeWebhook(Request $request): JsonResponse
    {
        try {
            $allowedSubscriptions = [
                'feed, mention, name, picture, category, description, conversations, feature_access_list,
                inbox_labels, standby, message_mention, messages, message_reactions, messaging_account_linking,
                messaging_checkout_updates, messaging_customer_information, message_echoes, message_edits,
                message_deliveries, message_context, messaging_game_plays, messaging_optins, messaging_optouts,
                messaging_payments, messaging_postbacks, messaging_pre_checkouts, message_reads, messaging_referrals,
                messaging_handovers, messaging_policy_enforcement,
                marketing_message_delivery_failed, messaging_appointments,
                messaging_direct_sends,
                messaging_fblogin_account_linking, user_action, messaging_feedback, send_cart,
                group_feed, calls, call_permission_reply, response_feedback, messaging_integrity,
                messaging_in_thread_lead_form_submit,
                message_template_status_update,
                founded, company_overview, mission,
                products,
                 general_info, leadgen, leadgen_fat,
                 location, hours, parking, public_transit, page_about_story,
                 mcom_invoice_change, invoice_access_invoice_change, invoice_access_invoice_draft_change,
                 invoice_access_onboarding_status_active, invoice_access_bank_slip_events, local_delivery, phone, email, website, ratings,
                 attire, payment_options, culinary_team, general_manager, price_range, awards, hometown, current_location, bio, affiliation,
                 birthday, personal_info, personal_interests, members, checkins, page_upcoming_change, page_change_proposal, merchant_review,
                 product_review, videos, live_videos, video_text_question_responses, registration, payment_request_update, publisher_subscriptions,
                 invalid_topic_placeholder'
            ];

            $validated = $request->validate([
                'subscriptions' => 'required|array',
                'subscriptions.*' => 'boolean'
            ]);

            $invalidSubscriptions = array_diff($validated['subscriptions'], $allowedSubscriptions);
            if (empty($invalidSubscriptions)) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []),
                    ['subscriptions' => ['Invalid subscription types: ' . implode(', ', $invalidSubscriptions)]]
                );
            }

            $enabledSubscriptions = array_keys(array_filter($validated['subscriptions']));

            Log::info('Subscribing to webhook: ' . json_encode($enabledSubscriptions));

            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found'
                ], 404);
            }

            $config = $integration->config;

            $result = $this->facebookService->subscribeToWebhook(
                auth()->user()->getFacebookAccessToken(),
                $config['app_id'],
                $enabledSubscriptions,
                $this->getWebhookUrlFromDatabase(),
                $config['webhook_verify_token'] ?? null
            );

            if ($result['success']) {
                // Update webhook config in a database
                FacebookWebhookConfig::updateOrCreate(
                    [
                        'app_id' => $config['app_id'],
                        'page_id' => $config['page_id']
                    ],
                    [
                        'subscriptions' => $enabledSubscriptions,
                        'active' => true
                    ]
                );
            }

            return response()->json([
                'success' => $result['success'],
                'message' => $result['success'] ? 'Webhook subscribed successfully' : 'Failed to subscribe webhook',
                'subscriptions' => $enabledSubscriptions
            ]);

        } catch (Exception $e) {
            Log::error('Failed to subscribe webhook: ' . $e->getMessage() . $e->getCode());

            return response()->json([
                'success' => false,
                'message' => 'Failed to subscribe to webhook'
            ], 500);
        }
    }

    /**
     * Get page information and permissions
     */
    public function getPageInfo(): JsonResponse
    {
        try {
            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found'
                ], 404);
            }

            $config = $integration->config;
            $accessToken = decrypt($config['access_token']);

            $pageInfo = $this->facebookService->getPageInfo($accessToken, $config['page_id']);

            return response()->json([
                'success' => true,
                'page_info' => $pageInfo
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get page info: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to get page information'
            ], 500);
        }
    }

    public function getPages(Request $request): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 10);
            $pages = MetaPage::orderBy('last_updated')
                ->when($request->get('search'), function ($query, $search) {
                    $query->where('name', 'like', '%' . $search . '%');
                })
                ->paginate($perPage)->withQueryString();

            return response()->json([
                'success' => true,
                'pages' => $pages->items(),
                'meta' => [
                    'current_page' => $pages->currentPage(),
                    'per_page' => $pages->perPage(),
                    'total' => $pages->total(),
                    'last_page' => $pages->lastPage(),
                    'from' => $pages->firstItem(),
                    'to' => $pages->lastItem(),
                    'has_more' => $pages->hasMorePages(),
                ],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get pages'
            ]);
        }
    }

    public function getForms(Request $request): JsonResponse
    {
        $validatedRequest = $request->validate([
            'page_id' => 'required|string',
        ]);

        $pageId = $validatedRequest['page_id'];
        $page = MetaPage::where('id', $pageId)->first();

        if (!$page) {
            return response()->json([
                'message' => 'Page not found',
                'success' => false,
            ], 404);
        }

        try {
            $perPage = $request->get('per_page', 10);
            $pages = LeadForm::where('page_id', $page->page_id)
                ->when($request->get('search'), function ($query, $search) {
                    $query->where('name', 'like', '%' . $search . '%');
                })
                ->orderBy('created_at', 'desc')
                ->paginate($perPage)->withQueryString();

            return response()->json([
                'success' => true,
                'forms' => $pages->items(),
                'meta' => [
                    'current_page' => $pages->currentPage(),
                    'per_page' => $pages->perPage(),
                    'total' => $pages->total(),
                    'last_page' => $pages->lastPage(),
                    'from' => $pages->firstItem(),
                    'to' => $pages->lastItem(),
                    'has_more' => $pages->hasMorePages(),
                ],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get forms' . $e->getMessage()
            ]);
        }
    }

    public function getPageLeads(Request $request): JsonResponse
    {
        $validatedRequest = $request->validate([
            'page_id' => 'required|string',
            'form_id' => 'required|string',
            'limit' => 'sometimes|integer|min:1|max:1000',
        ]);

        $pageId = $validatedRequest['page_id'];
        $formId = $validatedRequest['form_id'];

        $page = MetaPage::where('id', $pageId)->first();

        if (!$page) {
            return response()->json([
                'message' => 'Page not found',
                'success' => false,
            ], 404);
        }

        $form = LeadForm::where('page_id', $page->page_id)
            ->where('id', $formId)
            ->first();

        if (!$form) {
            return response()->json([
                'message' => 'Form not found',
                'success' => false,
            ], 404);
        }

        try {
            if ($request->has('limit')) {
                $leads = $this->facebookService->getPageLeads($page->access_token, $form->external_id, ['limit' => $request->get('limit')]);
            } else {
                $leads = $this->facebookService->getPageLeads($page->access_token, $form->external_id);
            }

            return response()->json([
                'leads' => $leads,
                'success' => true,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get forms' . $e->getMessage()
            ]);
        }
    }

    /**
     * Sync page data (posts, comments, messages)
     */
    public function syncPageData(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'sync_posts' => 'sometimes|boolean',
                'sync_comments' => 'sometimes|boolean',
                'sync_messages' => 'sometimes|boolean',
                'limit' => 'sometimes|integer|min:1|max:1000'
            ]);

            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found'
                ], 404);
            }

            // Dispatch background job for data sync
            \App\Jobs\SyncFacebookPageData::dispatch(
                $integration->id,
                $request->only(['sync_posts', 'sync_comments', 'sync_messages', 'limit'])
            );

            return response()->json([
                'success' => true,
                'message' => 'Data sync started in background'
            ]);

        } catch (Exception $e) {
            Log::error('Failed to start sync: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to start data sync'
            ], 500);
        }
    }

    /**
     * Deactivate Facebook integration
     */
    public function deactivate(): JsonResponse
    {
        try {
            $integration = Integration::where('provider', 'facebook')->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found'
                ], 404);
            }

            $integration->update(['active' => false]);

            // Deactivate webhook configs
            FacebookWebhookConfig::where('app_id', $integration->config['app_id'])
                ->update(['active' => false]);

            // Clear cache
            Cache::forget('facebook_integration');

            return response()->json([
                'success' => true,
                'message' => 'Facebook integration deactivated successfully'
            ]);

        } catch (Exception $e) {
            Log::error('Failed to deactivate integration: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to deactivate integration'
            ], 500);
        }
    }

    /**
     * Delete Facebook integration
     */
    public function destroy(): JsonResponse
    {
        try {
            $integration = Integration::where('provider', 'facebook')->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found'
                ], 404);
            }

            // Delete webhook configs
            FacebookWebhookConfig::where('app_id', $integration->config['app_id'])->delete();

            // Delete integration
            $integration->delete();

            // Clear cache
            Cache::forget('facebook_integration');
            Cache::forget('facebook_pages');

            return response()->json([
                'success' => true,
                'message' => 'Facebook integration deleted successfully'
            ]);

        } catch (Exception $e) {
            Log::error('Failed to delete integration: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete integration'
            ], 500);
        }
    }

    /**
     * Setup webhook configuration
     */
    private function setupWebhook(Integration $integration, array $data, array $subscriptions = ['leadgen']): void
    {
        try {
            $config = $integration->config;
            $accessToken = decrypt($config['access_token']);

            // Use SDK for webhook subscription
            $this->facebookSdkService->initializeApi(
                $config['app_id'],
                decrypt($config['app_secret']),
                $accessToken
            );

            $result = $this->facebookSdkService->subscribeToWebhook(
                $config['page_id'],
                $subscriptions
            );

            if (!$result['success']) {
                Log::warning('Failed to subscribe to Facebook webhook', [
                    'page_id' => $config['page_id'],
                    'error' => $result['error']
                ]);
            }

            // Create a webhook config record
            FacebookWebhookConfig::updateOrCreate(
                [
                    'app_id' => $config['app_id'],
                    'page_id' => $config['page_id']
                ],
                [
                    'subscriptions' => $subscriptions,
                    'active' => true
                ]
            );

        } catch (Exception $e) {
            Log::error('Failed to setup webhook: ' . $e->getMessage());
        }
    }

    /**
     * Sync lead forms from Facebook
     */
    public function syncLeadForms(Request $request): JsonResponse
    {
        try {
            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found or inactive'
                ], 404);
            }

            $config = $integration->config;

            if (!($config['features']['leadgen'] ?? $config['features']['lead_generation'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lead generation not enabled for this integration'
                ], 403);
            }

            $accessToken = decrypt($config['access_token']);
            $pageId = $config['page_id'];

            $forms = $this->facebookService->getLeadForms($accessToken, $pageId);
            $syncedCount = $this->facebookService->syncLeadForms($forms, $pageId);

            // Emit specific event with correct integration ID
            \App\Events\FacebookDataSynced::dispatch(
                $integration->id,
                [
                    'sync_type' => 'lead_forms',
                    'synced_count' => $syncedCount,
                    'page_id' => $pageId
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Lead forms synced successfully',
                'count' => $syncedCount
            ]);

        } catch (Exception $e) {
            Log::error('Failed to sync lead forms: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync lead forms from Facebook'
            ], 500);
        }
    }

    /**
     * Sync leads from Facebook
     */
    public function syncLeads(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'form_id' => 'sometimes|string',
                'limit' => 'sometimes|integer|min:1|max:1000'
            ]);

            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facebook integration not found or inactive'
                ], 404);
            }

            $config = $integration->config;

            if (!($config['features']['leadgen'] ?? $config['features']['lead_generation'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lead generation not enabled for this integration'
                ], 403);
            }

            $accessToken = decrypt($config['access_token']);
            $limit = $request->get('limit', 100);
            $syncedCount = 0;

            if ($request->has('form_id')) {
                // Sync leads from specific form
                $syncedCount = $this->facebookService->syncLeads($accessToken, $request->get('form_id'), $limit);
            } else {
                // Sync leads from all forms
                $forms = LeadForm::where('page_id', $config['page_id'])->get();
                foreach ($forms as $form) {
                    $syncedCount += $this->facebookService->syncLeads($accessToken, $form->external_id, $limit);
                }
            }

            // Emit specific event with correct integration ID
            \App\Events\FacebookDataSynced::dispatch(
                $integration->id,
                [
                    'sync_type' => 'leads',
                    'synced_count' => $syncedCount,
                    'form_id' => $request->get('form_id'),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Leads synced successfully',
                'count' => $syncedCount
            ]);

        } catch (Exception $e) {
            Log::error('Failed to sync leads: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync leads from Facebook'
            ], 500);
        }
    }

    /**
     * Get webhook URL from the database integrations table
     */
    private function getWebhookUrlFromDatabase(): string
    {
        try {
            $integration = Integration::where('provider', 'facebook')->first();

            if (!$integration || empty($integration->config['webhook_url'])) {
                // Fallback to route-based URL if not configured in database
                return route('facebook.webhook');
            }

            return $integration->config['webhook_url'];
        } catch (Exception $e) {
            Log::error('Failed to get webhook URL from database: ' . $e->getMessage());

            // Fallback to route-based URL
            return route('facebook.webhook');
        }
    }
}
