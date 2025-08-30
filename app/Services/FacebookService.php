<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\LeadForm;
use App\Models\LeadSource;
use App\Models\User;
use Carbon\Carbon;
use DB;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\SocialPost;
use App\Models\SocialMessage;
use App\Models\SocialComment;
use App\Events\FacebookConnected;
use App\Events\FacebookDisconnected;
use App\Events\FacebookWebhookReceived;
use App\Events\FacebookDataSynced;
use App\Events\FacebookErrorOccurred;
use App\Events\FacebookHealthStatusChanged;
use App\Events\FacebookLeadProcessed;
use Exception;

class FacebookService
{
    private string $apiVersion;
    private string $baseUrl;

    private $facebookLeadSourceId;

    public function __construct()
    {
        $this->apiVersion = config('services.facebook.api_version', 'v23.0');
        $this->baseUrl = "https://graph.facebook.com/{$this->apiVersion}";
        $this->facebookLeadSourceId = $this->getFacebookLeadSourceId();
    }

    /**
     * Verify Facebook credentials
     */
    public function verifyCredentials(array $credentials): array
    {
        try {
            $accessToken = $credentials['accessToken'];
            $pageId = $credentials['pageId'];

            // Test the access token
            $response = Http::get("{$this->baseUrl}/me", [
                'access_token' => $accessToken
            ]);

            if (!$response->successful()) {
                return [
                    'verified' => false,
                    'error' => 'Invalid access token or app credentials'
                ];
            }

            // Test page access
            $pageResponse = Http::get("{$this->baseUrl}/{$pageId}", [
                'access_token' => $accessToken,
                'fields' => 'id,name,category,followers_count,fan_count'
            ]);

            if (!$pageResponse->successful()) {
                return [
                    'verified' => false,
                    'error' => 'Cannot access the specified page. Check page ID and token permissions.'
                ];
            }

            return [
                'verified' => true,
                'user_info' => $response->json(),
                'page_info' => $pageResponse->json()
            ];

        } catch (Exception $e) {
            Log::error('Facebook verification error: ' . $e->getMessage());

            return [
                'verified' => false,
                'error' => 'Failed to verify credentials with Facebook'
            ];
        }
    }

    /**
     * Run connection tests
     */
    public function runConnectionTests(string $accessToken, array $config): array
    {
        $tests = [];

        // Test 1: Basic API connectivity
        try {
            $response = Http::get("{$this->baseUrl}/me", [
                'access_token' => $accessToken
            ]);

            $tests['api_connectivity'] = [
                'status' => $response->successful() ? 'passed' : 'failed',
                'message' => $response->successful() ? 'API connection successful' : 'API connection failed',
                'details' => $response->successful() ? null : $response->json()
            ];
        } catch (Exception $e) {
            $tests['api_connectivity'] = [
                'status' => 'failed',
                'message' => 'API connection failed',
                'details' => $e->getMessage()
            ];
        }

        // Test 2: Page access
        try {
            $pageId = $config['page_id'];
            $response = Http::get("{$this->baseUrl}/{$pageId}", [
                'access_token' => $accessToken,
                'fields' => 'id,name,access_token'
            ]);

            $tests['page_access'] = [
                'status' => $response->successful() ? 'passed' : 'failed',
                'message' => $response->successful() ? 'Page access successful' : 'Cannot access page',
                'details' => $response->json()
            ];
        } catch (Exception $e) {
            $tests['page_access'] = [
                'status' => 'failed',
                'message' => 'Page access failed',
                'details' => $e->getMessage()
            ];
        }

        // Test 3: Messaging permissions (if enabled)
        if ($config['features']['messaging'] ?? false) {
            try {
                $response = Http::get("{$this->baseUrl}/{$config['page_id']}/conversations", [
                    'access_token' => $accessToken,
                    'limit' => 1
                ]);

                $tests['messaging_permissions'] = [
                    'status' => $response->successful() ? 'passed' : 'failed',
                    'message' => $response->successful() ? 'Messaging permissions OK' : 'Messaging permissions denied',
                    'details' => $response->successful() ? null : $response->json()
                ];
            } catch (Exception $e) {
                $tests['messaging_permissions'] = [
                    'status' => 'failed',
                    'message' => 'Messaging permissions test failed',
                    'details' => $e->getMessage()
                ];
            }
        }

        // Test 4: Posts permissions (if enabled)
        if ($config['features']['posts'] ?? false) {
            try {
                $response = Http::get("{$this->baseUrl}/{$config['page_id']}/posts", [
                    'access_token' => $accessToken,
                    'limit' => 1
                ]);

                $tests['posts_permissions'] = [
                    'status' => $response->successful() ? 'passed' : 'failed',
                    'message' => $response->successful() ? 'Posts permissions OK' : 'Posts permissions denied',
                    'details' => $response->successful() ? null : $response->json()
                ];
            } catch (Exception $e) {
                $tests['posts_permissions'] = [
                    'status' => 'failed',
                    'message' => 'Posts permissions test failed',
                    'details' => $e->getMessage()
                ];
            }
        }

        return $tests;
    }

    /**
     * Get page insights
     */
    public function getPageInsights(string $accessToken, string $pageId, array $params = []): array
    {
        try {
            $cacheKey = "facebook_insights_{$pageId}_" . md5(serialize($params));

            return Cache::remember($cacheKey, 300, function () use ($accessToken, $pageId, $params) {
                $queryParams = [
                    'access_token' => $accessToken,
                    'metric' => $params['metric'] ?? 'page_impressions,page_engaged_users',
                    'period' => $params['period'] ?? 'day'
                ];

                if (isset($params['since'])) {
                    $queryParams['since'] = $params['since'];
                }
                if (isset($params['until'])) {
                    $queryParams['until'] = $params['until'];
                }

                $response = Http::get("{$this->baseUrl}/{$pageId}/insights", $queryParams);

                if (!$response->successful()) {
                    throw new Exception('Failed to fetch insights: ' . $response->body());
                }

                return $response->json()['data'] ?? [];
            });

        } catch (Exception $e) {
            Log::error('Facebook insights error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get page posts
     */
    public function getPagePosts(string $accessToken, string $pageId, array $params = []): array
    {
        try {
            $queryParams = [
                'access_token' => $accessToken,
                'fields' => 'id,message,created_time,type,link,picture,likes.summary(true),comments.summary(true),shares',
                'limit' => $params['limit'] ?? 25
            ];

            if (isset($params['since'])) {
                $queryParams['since'] = $params['since'];
            }
            if (isset($params['until'])) {
                $queryParams['until'] = $params['until'];
            }

            $response = Http::get("{$this->baseUrl}/{$pageId}/posts", $queryParams);

            if (!$response->successful()) {
                throw new Exception('Failed to fetch posts: ' . $response->body());
            }

            return $response->json()['data'] ?? [];

        } catch (Exception $e) {
            Log::error('Facebook posts error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Create a Facebook post
     */
    public function createPost(string $accessToken, string $pageId, array $postData): array
    {
        try {
            $params = [
                'access_token' => $accessToken,
                'message' => $postData['message']
            ];

            if (isset($postData['link'])) {
                $params['link'] = $postData['link'];
            }

            if (isset($postData['scheduled_publish_time'])) {
                $params['scheduled_publish_time'] = strtotime($postData['scheduled_publish_time']);
                $params['published'] = false;
            } else {
                $params['published'] = $postData['published'] ?? true;
            }

            $response = Http::post("{$this->baseUrl}/{$pageId}/feed", $params);

            if (!$response->successful()) {
                throw new Exception('Failed to create post: ' . $response->body());
            }

            $result = $response->json();

            // Store in database
            SocialPost::create([
                'provider' => 'facebook',
                'provider_id' => $result['id'],
                'content' => $postData['message'],
                'author_id' => $pageId,
                'author_name' => null, // Will be filled by sync job
                'timestamp' => now(),
                'metadata' => [
                    'link' => $postData['link'] ?? null,
                    'scheduled' => isset($postData['scheduled_publish_time']),
                    'published' => $params['published']
                ]
            ]);

            return $result;

        } catch (Exception $e) {
            Log::error('Facebook create post error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Subscribe to webhook
     */
    public function subscribeToWebhook(string $pageAccessToken, string $pageId, array $subscribedFields, string $webhookUrl, string $verifyToken): array
    {
        try {
            $appId = config('services.facebook.app_id');

            // Step 1: Get app access token
            $appAccessTokenResponse = Http::get("{$this->baseUrl}/oauth/access_token", [
                'client_id' => config('services.facebook.app_id'),
                'client_secret' => config('services.facebook.app_secret'),
                'grant_type' => 'client_credentials'
            ]);

            if (!$appAccessTokenResponse->successful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to get app access token'
                ];
            }

            $appAccessToken = $appAccessTokenResponse->json('access_token');

            // Step 2: Create an app subscription
            $response = $this->createFacebookWebhookSubscription($appId, $appAccessToken, $subscribedFields, $webhookUrl, $verifyToken);

            if (!$response->successful()) {
                throw new Exception('Failed to create Facebook webhook subscription: ' . $response->body());
            }

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to create app subscription with Facebook',
                    'details' => $response->json()
                ];
            }

            // Step 3: Subscribe page to app
            $pageSubscriptionResponse = Http::post("{$this->baseUrl}/{$pageId}/subscribed_apps", [
                'access_token' => $pageAccessToken,
                'subscribed_fields' => implode(',', $subscribedFields)
            ]);

            if (!$pageSubscriptionResponse->successful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to subscribe page to app',
                    'details' => $pageSubscriptionResponse->json()
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'app_subscription' => $response->json(),
                    'page_subscription' => $pageSubscriptionResponse->json()
                ]
            ];

        } catch (Exception $e) {
            Log::error('Facebook webhook subscription error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    // Method 1: Simple curl execution

    /**
     * @throws Exception
     */
    function createFacebookWebhookSubscription($appId, $appAccessToken, $subscribedFields, $webhookUrl, $verifyToken): Response
    {
        return Http::withQueryParameters([
            'verify_token' => $verifyToken,
            'fields' => $subscribedFields,
            'callback_url' => $webhookUrl,
            'include_values' => true,
            'object' => 'page',
            'access_token' => $appAccessToken,
        ])->post("https://graph.facebook.com/v23.0/{$appId}/subscriptions");
    }

    /**
     * Sync posts to database
     */
    public function syncPosts(string $accessToken, string $pageId, int $limit = 100): int
    {
        try {
            $posts = $this->getPagePosts($accessToken, $pageId, ['limit' => $limit]);
            $syncedCount = 0;

            foreach ($posts as $postData) {
                SocialPost::updateOrCreate(
                    [
                        'provider' => 'facebook',
                        'provider_id' => $postData['id']
                    ],
                    [
                        'content' => $postData['message'] ?? '',
                        'author_id' => $pageId,
                        'timestamp' => $postData['created_time'],
                        'metadata' => [
                            'type' => $postData['type'] ?? null,
                            'link' => $postData['link'] ?? null,
                            'picture' => $postData['picture'] ?? null,
                            'likes_count' => $postData['likes']['summary']['total_count'] ?? 0,
                            'comments_count' => $postData['comments']['summary']['total_count'] ?? 0,
                            'shares_count' => $postData['shares']['count'] ?? 0
                        ]
                    ]
                );
                $syncedCount++;
            }

            return $syncedCount;

        } catch (Exception $e) {
            Log::error('Facebook sync posts error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * @throws Exception
     */
    public function syncForms(string $accessToken, string $pageId, int $limit = 100): int
    {
        try {
            $forms = $this->getPageForms($accessToken, $pageId, ['limit' => $limit]);
            $syncedCount = 0;

            foreach ($forms as $form) {
                LeadForm::updateOrCreate(
                    [
                        'external_id' => $form['id'],
                        'page_id' => $pageId,
                    ],
                    [
                        'name' => $form['name'],
                        'user_id' => User::role('super-admin')->first()->id,
                        'external_id' => $form['id'],
                        'page_id' => $pageId,
                        'questions' => $form['questions'],
                        'status' => 'active',
                        'created_at' => $form['created_time'],
                        'last_synced' => now()
                    ]);

                $syncedCount++;
            }

            return $syncedCount;
        } catch (Exception $e) {
            Log::error('Facebook sync forms error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send a message to user
     */
    public function sendMessage(string $accessToken, string $pageId, string $recipientId, string $message): array
    {
        try {
            $response = Http::post("{$this->baseUrl}/{$pageId}/messages", [
                'access_token' => $accessToken,
                'messaging_type' => 'RESPONSE',
                'recipient' => ['id' => $recipientId],
                'message' => ['text' => $message]
            ]);

            if (!$response->successful()) {
                throw new Exception('Failed to send message: ' . $response->body());
            }

            $result = $response->json();

            // Store in database
            SocialMessage::create([
                'provider' => 'facebook',
                'provider_id' => $result['message_id'] ?? uniqid(),
                'message' => $message,
                'timestamp' => now(),
                'metadata' => [
                    'recipient_id' => $recipientId,
                    'messaging_type' => 'RESPONSE',
                    'direction' => 'outbound'
                ]
            ]);

            return $result;

        } catch (Exception $e) {
            Log::error('Facebook send message error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * @throws Exception
     */
    public function getPageForms(string $pageAccessToken, string $pageId, array $params = []): array
    {
        try {
            $queryParams = [
                'access_token' => $pageAccessToken,
                'fields' => 'id,name,questions,created_time',
                'limit' => $params['limit'] ?? 25
            ];

            if (isset($params['since'])) {
                $queryParams['since'] = $params['since'];
            }
            if (isset($params['until'])) {
                $queryParams['until'] = $params['until'];
            }

            $response = Http::get("{$this->baseUrl}/{$pageId}/leadgen_forms", $queryParams);

            if (!$response->successful()) {
                throw new Exception('Failed to fetch posts: ' . $response->body());
            }

            Log::info('Facebook forms', $response->json());

            return $response->json()['data'] ?? [];

        } catch (ConnectionException $e) {
            return [
                'error' => 'Failed to fetch forms: ' . $e->getMessage()
            ];
        }
    }

    /**
     * @throws Exception
     */
    public function getPageLeads(string $pageAccessToken, string $formId, array $params = []): array
    {
        try {
            $queryParams = [
                'access_token' => $pageAccessToken,
                'fields' => 'created_time,id,ad_id,form_id,field_data',
                'limit' => $params['limit'] ?? 25,
            ];

            if (isset($params['since'])) {
                $queryParams['from_date'] = $params['since'];
            }
            if (isset($params['until'])) {
                $queryParams['to_date'] = $params['until'];
            }

            $response = Http::get("{$this->baseUrl}/{$formId}/leads", $queryParams);

            if (!$response->successful()) {
                throw new Exception('Failed to fetch leads: ' . $response->body());
            }

            return $response->json()['data'] ?? [];

        } catch (ConnectionException $e) {
            return [
                'error' => 'Failed to fetch leads: ' . $e->getMessage()
            ];
        }
    }

    /**
     * @throws Exception
     */
    public function syncLeads(string $pageAccessToken, string $formId, int $limit = 100): int
    {
        $startTime = microtime(true);
        $leads = $this->getPageLeads($pageAccessToken, $formId, ['limit' => $limit]);
        $syncedCount = 0;

        try {
            foreach ($leads as $lead) {
                $this->processLead($lead);
                $syncedCount++;
            }

            $duration = round(microtime(true) - $startTime, 2);

            // Emit data synced event
            FacebookDataSynced::dispatch(
                'facebook', // Will be updated with proper integration ID in controller
                [
                    'sync_type' => 'leads',
                    'synced_count' => $syncedCount,
                    'duration' => $duration,
                    'form_id' => $formId
                ]
            );

        } catch (Exception $e) {
            FacebookErrorOccurred::dispatch(
                'facebook',
                [
                    'error_type' => 'SYNC_ERROR',
                    'error_message' => $e->getMessage(),
                    'severity' => 'error',
                    'sync_type' => 'leads'
                ]
            );
            throw $e;
        }

        return $syncedCount;
    }

    public function processLead(array $leadData, ?int $syncJobId = null): array
    {
        $result = [
            'action' => 'none',
            'lead_id' => null,
            'errors' => []
        ];

        try {
            DB::beginTransaction();

            $facebookLeadId = $leadData['id'];
            $formId = $leadData['form_id'];

            // Find the form
            $form = LeadForm::where('external_id', $formId)->first();
            if (!$form) {
                throw new \Exception("Form not found: {$formId}");
            }

            // Check if lead already exists by Facebook ID first
            $existingLead = Lead::where('external_id', $facebookLeadId)->first();

            if ($existingLead) {
                $result = $this->handleExistingLead($existingLead, $leadData, 'external_id');
            } else {
                // Check for existing lead by phone number pattern
                $existingLead = $this->findExistingLeadByPhone($leadData);

                if ($existingLead) {
                    $result = $this->handleExistingLead($existingLead, $leadData, 'phone_match');
                } else {
                    // Check for existing lead by email
                    $existingLead = $this->findExistingLeadByEmail($leadData);

                    if ($existingLead) {
                        $result = $this->handleExistingLead($existingLead, $leadData, 'email_match');
                    } else {
                        $result = $this->createNewLead($leadData, $form);
                    }
                }
            }

//            // Log the processing
//            $this->logProcessing($facebookLeadId, $result['action'], $leadData, $result['lead_id']);
//
//            // Update sync job stats
//            if ($syncJobId) {
//                $this->updateSyncJobStats($syncJobId, $result['action']);
//            }

            DB::commit();

            // Emit lead processed event
            if ($result['action'] !== 'none') {
                FacebookLeadProcessed::dispatch(
                    $form->integration_id ?? 'unknown',
                    [
                        'lead_id' => $result['lead_id'],
                        'facebook_lead_id' => $facebookLeadId,
                        'form_name' => $form->name ?? 'Unknown Form',
                        'action' => $result['action']
                    ]
                );
            }

        } catch (\Exception $e) {
            DB::rollBack();

            $result = [
                'action' => 'error',
                'lead_id' => null,
                'errors' => [$e->getMessage()]
            ];

            // Emit error event
            FacebookErrorOccurred::dispatch(
                $form->integration_id ?? 'unknown',
                [
                    'error_type' => 'LEAD_PROCESSING_ERROR',
                    'error_message' => $e->getMessage(),
                    'severity' => 'error',
                    'facebook_lead_id' => $leadData['id'] ?? null
                ]
            );

            Log::error("Lead processing failed", [
                'facebook_lead_id' => $leadData['id'],
                'error' => $e->getMessage()
            ]);
        }

        return $result;
    }

    /**
     * Find existing lead by phone number pattern matching
     */
    private function findExistingLeadByPhone(array $leadData): ?Lead
    {
        $phoneNumber = $this->extractPhoneFromLeadData($leadData);

        if (!$phoneNumber) {
            return null;
        }

        // Clean and normalize phone number
        $cleanPhone = $this->cleanPhoneNumber($phoneNumber);

        if (strlen($cleanPhone) < 7) { // Minimum viable phone number length
            return null;
        }

        // Try the exact match first
        $existingLead = Lead::where('phone', $phoneNumber)->first();
        if ($existingLead) {
            return $existingLead;
        }

        // Try cleaned phone number match
        $existingLead = Lead::whereRaw("regexp_replace(phone, '[^0-9]', '', 'g') = ?", [$cleanPhone])->first();
        if ($existingLead) {
            return $existingLead;
        }

        // Try a partial match for international numbers (last 10 digits)
        if (strlen($cleanPhone) >= 10) {
            $lastTenDigits = substr($cleanPhone, -10);
            $existingLead = Lead::whereRaw("regexp_replace(phone, '[^0-9]', '', 'g') LIKE ?", ['%' . $lastTenDigits])
                ->first();
            if ($existingLead) {
                return $existingLead;
            }
        }

        return null;
    }

    /**
     * Find existing lead by email address
     */
    private function findExistingLeadByEmail(array $leadData): ?Lead
    {
        $email = $this->extractEmailFromLeadData($leadData);

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return Lead::where('email', strtolower(trim($email)))->first();
    }

    /**
     * Extract phone number from Facebook lead data
     */
    private function extractPhoneFromLeadData(array $leadData): ?string
    {
        foreach ($leadData['field_data'] as $field) {
            $fieldName = strtolower(trim($field['name']));
            if (in_array($fieldName, ['phone', 'phone_number', 'mobile', 'telephone'])) {
                return trim($field['values'][0] ?? '');
            }
        }
        return null;
    }

    /**
     * Extract email from Facebook lead data
     */
    private function extractEmailFromLeadData(array $leadData): ?string
    {
        foreach ($leadData['field_data'] as $field) {
            $fieldName = strtolower(trim($field['name']));
            if ($fieldName === 'email') {
                return trim($field['values'][0] ?? '');
            }
        }
        return null;
    }

    /**
     * Clean phone number for matching
     */
    private function cleanPhoneNumber(string $phone): string
    {
        // Remove all non-digit characters
        $cleaned = preg_replace('/[^0-9]/', '', $phone);

        // Remove the leading 1 for US numbers if length is 11
        if (strlen($cleaned) === 11 && $cleaned[0] === '1') {
            $cleaned = substr($cleaned, 1);
        }

        // Remove leading country codes for common countries
        $countryCodes = ['92', '91', '44', '61', '1']; // Pakistan, India, UK, Australia, US/Canada
        foreach ($countryCodes as $code) {
            if (strpos($cleaned, $code) === 0 && strlen($cleaned) > strlen($code) + 7) {
                $withoutCode = substr($cleaned, strlen($code));
                if (strlen($withoutCode) >= 10) {
                    return $withoutCode;
                }
            }
        }

        return $cleaned;
    }

    private function handleExistingLead(Lead $existingLead, array $leadData, string $matchType = 'external_id'): array
    {
        // Check if this is a genuine update or just a re-sync
        $facebookCreatedAt = Carbon::parse($leadData['created_time']);

        // If matched by Facebook ID and same creation time, handle as duplicate
        if ($matchType === 'external_id') {
            // Same lead, check if it was already contacted
            if (in_array($existingLead->inquiry_status, ['contacted', 'qualified', 'proposal', 'won'])) {
                // Add a tag to mark it as contacted again
                $existingLead->addTag([
                    'label' => 'Contacted Again',
                    'value' => 'contacted_again'
                ]);

                // Update activity timestamp
                $existingLead->update([
                    'last_activity_at' => now()
                ]);

                $existingLead->save();

                return [
                    'action' => 'marked_contacted_again',
                    'lead_id' => $existingLead->id,
                    'errors' => []
                ];
            }

            return [
                'action' => 'duplicate_skipped',
                'lead_id' => $existingLead->id,
                'errors' => []
            ];
        }

        // If matched by phone or email, this is a new Facebook lead from same person
        if (in_array($matchType, ['phone_match', 'email_match'])) {
            // Update the existing lead with Facebook data if it doesn't have it
            if (!$existingLead->external_id) {
                $leadAttributes = $this->extractLeadAttributes($leadData);

                // Only update specific fields, preserve existing lead data
                $updateData = [
                    'is_organic' => $leadAttributes['is_organic'],
                    'external_id' => $leadData['id'],
                    'form_external_id' => $leadData['form_id'],
                    'ad_external_id' => $leadData['ad_id'] ?? null,
                    'last_activity_at' => now(),
                ];

                $existingLead->update($updateData);
            }

            // Add tags to indicate this is a multichannel lead
            $existingLead->addTag([
                'label' => 'Multi-Channel Lead',
                'value' => 'multi_channel'
            ]);

            $existingLead->addTag([
                'label' => 'Facebook Lead',
                'value' => 'facebook_lead'
            ]);

            // If previously contacted, mark as contacted again
            if (in_array($existingLead->inquiry_status, ['contacted', 'qualified', 'proposal', 'won'])) {
                $existingLead->addTag([
                    'label' => 'Contacted Again',
                    'value' => 'contacted_again'
                ]);
            }

            $existingLead->save();

            return [
                'action' => 'merged_with_existing',
                'lead_id' => $existingLead->id,
                'errors' => []
            ];
        }

        // Update existing lead with new data (genuine update)
        $leadAttributes = $this->extractLeadAttributes($leadData);
        $existingLead->update($leadAttributes);

        return [
            'action' => 'updated',
            'lead_id' => $existingLead->id,
            'errors' => []
        ];
    }

    private function createNewLead(array $leadData, LeadForm $form): array
    {
        $leadAttributes = $this->extractLeadAttributes($leadData);
        $leadAttributes['lead_source_id'] = $form->lead_source_id ?? $this->facebookLeadSourceId;
        $leadAttributes['inquiry_type'] = 'web'; //
        $leadAttributes['inquiry_status'] = 'new';

        // Set external IDs for tracking
        $leadAttributes['external_id'] = $leadData['id'];
        $leadAttributes['form_external_id'] = $leadData['form_id'];
        $leadAttributes['ad_external_id'] = $leadData['ad_id'] ?? null;

        $lead = Lead::create($leadAttributes);

        // Calculate and set a lead score using your existing method
        $lead->updateScore();

        // Add Facebook tag
        $lead->addTag([
            'label' => 'Facebook Lead',
            'value' => 'facebook_lead'
        ]);

        // Add organic tag if applicable
        if ($leadData['is_organic']) {
            $lead->addTag([
                'label' => 'Organic',
                'value' => 'organic'
            ]);
        }

        $lead->save();

        return [
            'action' => 'created',
            'lead_id' => $lead->id,
            'errors' => []
        ];
    }

    private function extractLeadAttributes(array $leadData): array
    {
        $attributes = [
            'is_organic' => $leadData['is_organic'] ?? false,
        ];

        // Extract structured data from field_data and map to your existing fields
        $fieldMapping = $this->mapFieldData($leadData['field_data']);
        return array_merge($attributes, $fieldMapping);
    }

    private function mapFieldData(array $fieldData): array
    {
        $mapping = [
            'name' => null,
            'email' => null,
            'phone' => null,
            'occupation' => null,
            'address' => null,
            'city' => null,
            'country' => null,
            'detail' => null,
            'custom_fields' => []
        ];

        foreach ($fieldData as $field) {
            $fieldName = strtolower(trim($field['name']));
            $fieldValue = trim($field['values'][0] ?? '');

            if (empty($fieldValue)) {
                continue;
            }

            // Map Facebook field names to your existing database columns
            switch ($fieldName) {
                case 'first_name':
                case 'name':
                case 'full_name':
                case 'given_name':
                    $mapping['name'] = $fieldValue;
                    break;
                case 'last_name':
                case 'family_name':
                    $mapping['name'] = trim(($mapping['name'] ?? '') . ' ' . $fieldValue);
                    break;
                case 'email':
                    $mapping['email'] = $fieldValue;
                    break;
                case 'phone':
                case 'phone_number':
                    $mapping['phone'] = $fieldValue;
                    break;
                case 'job_title':
                case 'occupation':
                case 'work_title':
                    $mapping['occupation'] = $fieldValue;
                    break;
                case 'address':
                case 'street_address':
                    $mapping['address'] = $fieldValue;
                    break;
                case 'city':
                    $mapping['city'] = $fieldValue;
                    break;
                case 'country':
                    $mapping['country'] = $fieldValue;
                    break;
                case 'message':
                case 'comments':
                case 'additional_info':
                case 'description':
                    $mapping['detail'] = $fieldValue;
                    break;
                case 'company':
                case 'company_name':
                    $mapping['custom_fields']['company'] = $fieldValue;
                    break;
                case 'budget':
                case 'budget_range':
                    $this->processBudgetField($fieldValue, $mapping);
                    break;
                default:
                    // Store unmapped fields in custom_fields
                    $mapping['custom_fields'][$fieldName] = $fieldValue;
                    break;
            }
        }

        // Clean up empty values
        return array_filter($mapping, function ($value) {
            return $value !== null && $value !== '';
        });
    }

    private function processBudgetField(string $budgetValue, array &$mapping): void
    {
        // Extract budget amount and currency from Facebook budget field
        if (preg_match('/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*([A-Z]{3})?/', $budgetValue, $matches)) {
            $amount = (float)str_replace(',', '', $matches[1]);
            $currency = $matches[2] ?? 'USD';

            $mapping['budget'] = [
                'amount' => $amount,
                'currency' => $currency
            ];
        } else {
            // Store as text in custom fields if we can't parse it
            $mapping['custom_fields']['budget_text'] = $budgetValue;
        }
    }

    private function getFacebookLeadSourceId(): ?string
    {
        $facebookSource = LeadSource::where('name', 'Facebook Ads')->first();
        return $facebookSource?->id;
    }

    /**
     * Get lead forms from a Facebook page
     */
    public function getLeadForms(string $accessToken, string $pageId): array
    {
        try {
            $response = Http::get("{$this->baseUrl}/{$pageId}/leadgen_forms", [
                'access_token' => $accessToken,
                'fields' => 'id,name,status,created_time,questions,thank_you_page,privacy_policy_url,context_card'
            ]);

            if (!$response->successful()) {
                throw new Exception('Failed to fetch lead forms: ' . $response->body());
            }

            return $response->json()['data'] ?? [];

        } catch (Exception $e) {
            Log::error('Failed to get lead forms: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Sync lead forms to database
     */
    public function syncLeadForms(array $forms, string $pageId): int
    {
        $startTime = microtime(true);
        $syncedCount = 0;

        try {
            foreach ($forms as $form) {
                try {
                    LeadForm::updateOrCreate(
                        ['external_id' => $form['id']],
                        [
                            'page_id' => $pageId,
                            'name' => $form['name'],
                            'status' => $form['status'],
                            'created_time' => isset($form['created_time']) ? Carbon::parse($form['created_time']) : now(),
                            'questions' => $form['questions'] ?? null,
                            'config' => [
                                'thank_you_page' => $form['thank_you_page'] ?? null,
                                'privacy_policy_url' => $form['privacy_policy_url'] ?? null,
                                'context_card' => $form['context_card'] ?? null,
                            ]
                        ]
                    );

                    $syncedCount++;
                } catch (Exception $e) {
                    Log::error('Failed to sync lead form: ' . $e->getMessage(), [
                        'form_id' => $form['id'],
                        'form_name' => $form['name'] ?? 'Unknown'
                    ]);

                    FacebookErrorOccurred::dispatch(
                        'facebook',
                        [
                            'error_type' => 'FORM_SYNC_ERROR',
                            'error_message' => $e->getMessage(),
                            'severity' => 'warning',
                            'form_id' => $form['id']
                        ]
                    );
                }
            }

            $duration = round(microtime(true) - $startTime, 2);

            // Emit data synced event
            FacebookDataSynced::dispatch(
                'facebook',
                [
                    'sync_type' => 'lead_forms',
                    'synced_count' => $syncedCount,
                    'duration' => $duration,
                    'page_id' => $pageId
                ]
            );

        } catch (Exception $e) {
            FacebookErrorOccurred::dispatch(
                'facebook',
                [
                    'error_type' => 'SYNC_ERROR',
                    'error_message' => $e->getMessage(),
                    'severity' => 'error',
                    'sync_type' => 'lead_forms'
                ]
            );
            throw $e;
        }

        return $syncedCount;
    }
}
