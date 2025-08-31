<?php

namespace App\Services;

use FacebookAds\Api;
use FacebookAds\Object\Page;
use FacebookAds\Object\LeadgenForm;
use FacebookAds\Object\Lead;
use FacebookAds\Object\User;
use FacebookAds\Object\Fields\LeadFields;
use FacebookAds\Object\Fields\LeadgenFormFields;
use FacebookAds\Object\Fields\PageFields;
use FacebookAds\Object\Fields\UserFields;
use FacebookAds\Object\Values\LeadgenFormStatusValues;
use FacebookAds\Logger\LoggerInterface;
use FacebookAds\Exception\Exception as FacebookException;
use FacebookAds\Http\RequestInterface;
use Illuminate\Support\Facades\Log;
use Exception;

class FacebookSdkService
{
    protected Api $api;
    protected string $apiVersion;
    protected ?LoggerInterface $logger = null;

    public function __construct()
    {
        $this->apiVersion = config('services.facebook.api_version', 'v23.0');
    }

    /**
     * Initialize the Facebook API with credentials
     * @throws Exception
     */
    public function initializeApi(string $appId, string $appSecret, string $accessToken): void
    {
        try {
            Api::init($appId, $appSecret, $accessToken, true);
            $this->api = Api::instance();

            if ($this->logger) {
                $this->api->setLogger($this->logger);
            }

            Log::info('Facebook SDK initialized successfully', [
                'app_id' => $appId,
                'api_version' => $this->apiVersion
            ]);
        } catch (FacebookException $e) {
            Log::error('Failed to initialize Facebook SDK', [
                'error' => $e->getMessage(),
                'app_id' => $appId
            ]);
            throw new Exception('Failed to initialize Facebook SDK: ' . $e->getMessage());
        }
    }

    /**
     * Set logger for debugging
     */
    public function setLogger(LoggerInterface $logger): self
    {
        $this->logger = $logger;
        if (isset($this->api)) {
            $this->api->setLogger($logger);
        }
        return $this;
    }

    /**
     * Verify credentials by testing API access
     */
    public function verifyCredentials(array $credentials): array
    {
        try {
            $this->initializeApi(
                $credentials['app_id'],
                $credentials['app_secret'],
                $credentials['access_token']
            );

            // Test user access - use Graph API request instead of User object for "me" endpoint
            $response = $this->api->call('/me', RequestInterface::METHOD_GET, [
                'fields' => 'id,name,email'
            ]);
            $userData = $response->getContent();

            // Test page access if page_id provided
            $pageInfo = null;
            if (!empty($credentials['page_id'])) {
                $pageInfo = $this->getPageInfo($credentials['page_id']);
            }

            return [
                'verified' => true,
                'user_info' => $userData,
                'page_info' => $pageInfo
            ];

        } catch (FacebookException $e) {
            Log::error('Facebook credential verification failed', [
                'error' => $e->getMessage(),
                'code' => $e->getCode()
            ]);

            return [
                'verified' => false,
                'error' => $this->parseFacebookError($e)
            ];
        } catch (Exception $e) {
            Log::error('Credential verification failed', [
                'error' => $e->getMessage()
            ]);

            return [
                'verified' => false,
                'error' => 'Failed to verify credentials with Facebook'
            ];
        }
    }

    /**
     * Get user's pages
     * @throws Exception
     */
    public function getUserPages(string $accessToken): array
    {
        try {
            // Use Graph API request to get pages
            $response = $this->api->call('/me/accounts', RequestInterface::METHOD_GET, [
                'fields' => 'id,name,category,access_token,tasks,picture'
            ]);
            $responseData = $response->getContent();

            return $responseData['data'] ?? [];

        } catch (FacebookException $e) {
            Log::error('Failed to get user pages', [
                'error' => $e->getMessage(),
                'code' => $e->getCode()
            ]);
            throw new Exception('Failed to get user pages: ' . $this->parseFacebookError($e));
        }
    }

    /**
     * Get page information
     */
    public function getPageInfo(string $pageId): array
    {
        try {
            $page = new Page($pageId);
            $pageData = $page->getSelf([
                PageFields::ID,
                PageFields::NAME,
                PageFields::CATEGORY,
                PageFields::FAN_COUNT,
                PageFields::FOLLOWERS_COUNT,
                PageFields::COVER,
                PageFields::WEBSITE,
                PageFields::ABOUT
            ]);

            return $pageData->getData();

        } catch (FacebookException $e) {
            Log::error('Failed to get page info', [
                'page_id' => $pageId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to get page info: ' . $this->parseFacebookError($e));
        }
    }

    /**
     * Get page lead forms
     */
    public function getPageLeadForms(string $pageId): array
    {
        try {
            $page = new Page($pageId);
            $leadForms = $page->getLeadgenForms([
                LeadgenFormFields::ID,
                LeadgenFormFields::NAME,
                LeadgenFormFields::STATUS,
                LeadgenFormFields::CREATED_TIME,
                LeadgenFormFields::QUESTIONS,
                'thank_you_page',
                'privacy_policy_url',
                'context_card'
            ]);

            $formsData = [];
            foreach ($leadForms as $form) {
                $formData = $form->getData();
                // Only include active forms
                if ($formData['status'] === LeadgenFormStatusValues::ACTIVE) {
                    $formsData[] = $formData;
                }
            }

            return $formsData;

        } catch (FacebookException $e) {
            Log::error('Failed to get page lead forms', [
                'page_id' => $pageId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to get lead forms: ' . $this->parseFacebookError($e));
        }
    }

    /**
     * Get leads from a specific form
     */
    public function getFormLeads(string $formId, array $params = []): array
    {
        try {
            $leadForm = new LeadgenForm($formId);
            $leads = $leadForm->getLeads([
                LeadFields::ID,
                LeadFields::CREATED_TIME,
                LeadFields::AD_ID,
                LeadFields::FORM_ID,
                LeadFields::FIELD_DATA,
                LeadFields::IS_ORGANIC
            ], $params);

            $leadsData = [];
            foreach ($leads as $lead) {
                $leadsData[] = $lead->getData();
            }

            return $leadsData;

        } catch (FacebookException $e) {
            Log::error('Failed to get form leads', [
                'form_id' => $formId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to get leads: ' . $this->parseFacebookError($e));
        }
    }

    /**
     * Get page insights/analytics
     */
    public function getPageInsights(string $pageId, array $metrics = [], array $params = []): array
    {
        try {
            $page = new Page($pageId);

            $defaultMetrics = [
                'page_impressions',
                'page_engaged_users',
                'page_views_total',
                'page_likes'
            ];

            $metricsToFetch = !empty($metrics) ? $metrics : $defaultMetrics;

            $insights = $page->getInsights($metricsToFetch, $params);

            $insightsData = [];
            foreach ($insights as $insight) {
                $insightsData[] = $insight->getData();
            }

            return $insightsData;

        } catch (FacebookException $e) {
            Log::error('Failed to get page insights', [
                'page_id' => $pageId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to get page insights: ' . $this->parseFacebookError($e));
        }
    }

    /**
     * Get page posts
     */
    public function getPagePosts(string $pageId, array $params = []): array
    {
        try {
            $page = new Page($pageId);

            $defaultFields = [
                'id',
                'message',
                'created_time',
                'type',
                'link',
                'picture',
                'likes.summary(true)',
                'comments.summary(true)',
                'shares'
            ];

            $posts = $page->getPosts($defaultFields, $params);

            $postsData = [];
            foreach ($posts as $post) {
                $postsData[] = $post->getData();
            }

            return $postsData;

        } catch (FacebookException $e) {
            Log::error('Failed to get page posts', [
                'page_id' => $pageId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to get page posts: ' . $this->parseFacebookError($e));
        }
    }

    /**
     * Create a post on the page
     */
    public function createPagePost(string $pageId, array $postData): array
    {
        try {
            $page = new Page($pageId);

            $params = [
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

            $post = $page->createFeed($params);

            return $post->getData();

        } catch (FacebookException $e) {
            Log::error('Failed to create page post', [
                'page_id' => $pageId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to create post: ' . $this->parseFacebookError($e));
        }
    }

    /**
     * Subscribe to webhook events
     */
    public function subscribeToWebhook(string $pageId, array $subscribedFields): array
    {
        try {
            $page = new Page($pageId);

            $result = $page->createSubscribedApps([
                'subscribed_fields' => implode(',', $subscribedFields)
            ]);

            return [
                'success' => true,
                'data' => $result->getData()
            ];

        } catch (FacebookException $e) {
            Log::error('Failed to subscribe to webhook', [
                'page_id' => $pageId,
                'fields' => $subscribedFields,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $this->parseFacebookError($e)
            ];
        }
    }

    /**
     * Test connection by making a simple API call
     */
    public function testConnection(): array
    {
        try {
            // Use Graph API request to test connection
            $response = $this->api->call('/me', RequestInterface::METHOD_GET, [
                'fields' => 'id,name'
            ]);
            $userData = $response->getContent();

            Log::info('Facebook API connection test successful', [
                'user_id' => $userData['id'],
                'user_name' => $userData['name']
            ]);

            return [
                'success' => true,
                'message' => 'Connection successful',
                'data' => $userData
            ];

        } catch (FacebookException $e) {
            Log::error('Facebook API connection test failed', [
                'error' => $e->getMessage(),
                'code' => $e->getCode()
            ]);
            return [
                'success' => false,
                'message' => 'Connection failed: ' . $this->parseFacebookError($e)
            ];
        }
    }

    /**
     * Parse Facebook error into user-friendly message
     */
    protected function parseFacebookError(FacebookException $e): string
    {
        $message = $e->getMessage();
        $code = $e->getCode();

        // Common Facebook error codes and messages
        return match ($code) {
            190 => 'Access token expired or invalid. Please re-authenticate.',
            200 => 'Insufficient permissions. Please grant required permissions.',
            100 => 'Invalid parameter provided to Facebook API.',
            613 => 'Rate limit exceeded. Please try again later.',
            default => "Facebook API error: {$message}",
        };
    }

    /**
     * Get long-lived page access token
     */
    public function getLongLivedPageToken(string $userAccessToken, string $pageId): string
    {
        try {
            // First get long-lived user access token
            $extendedToken = $this->api->getOAuth()->getLongLivedAccessToken($userAccessToken);

            // Initialize API with extended token
            $this->api->setAccessToken($extendedToken);

            // Get page access token using long-lived user token
            $response = $this->api->call('/me/accounts', RequestInterface::METHOD_GET, [
                'fields' => 'id,access_token'
            ]);
            $responseData = $response->getContent();

            foreach ($responseData['data'] ?? [] as $pageData) {
                if ($pageData['id'] === $pageId) {
                    return $pageData['access_token'];
                }
            }

            throw new Exception('Page access token not found for page ID: ' . $pageId);

        } catch (FacebookException $e) {
            Log::error('Failed to get long-lived page token', [
                'page_id' => $pageId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to get long-lived page token: ' . $this->parseFacebookError($e));
        }
    }

    /**
     * Exchange authorization code for access token
     */
    public function exchangeCodeForToken(string $code, string $redirectUri): array
    {
        try {
            $helper = $this->api->getRedirectLoginHelper();
            $accessToken = $helper->getAccessToken($redirectUri);

            if (!$accessToken) {
                throw new Exception('Failed to obtain access token');
            }

            return [
                'access_token' => (string) $accessToken,
                'expires_in' => $accessToken->getExpiresAt() ?
                    $accessToken->getExpiresAt()->getTimestamp() - time() : null
            ];

        } catch (FacebookException $e) {
            Log::error('Failed to exchange code for token', [
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to exchange code for token: ' . $this->parseFacebookError($e));
        }
    }
}
