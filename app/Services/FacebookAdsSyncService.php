<?php

namespace App\Services;

use App\Models\Ad;
use App\Models\AdSet;
use App\Models\Campaign;
use App\Models\MetaPage;
use App\Jobs\SyncFacebookAdsJob;
use App\Jobs\SyncFacebookAdSetsJob;
use App\Jobs\SyncFacebookCampaignsJob;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Bus;
use Carbon\Carbon;

class FacebookAdsSyncService
{
    private string $graphApiUrl = 'https://graph.facebook.com/v23.0/';
    private int $maxRetries = 5; // Increased for rate limit handling
    private int $baseRetryDelay = 30; // Start with 30 seconds

    // Rate limiting configuration
    private int $maxRequestsPerHour = 150; // Conservative limit per ad account
    private int $maxRequestsPerMinute = 5; // Very conservative per-minute limit
    private int $requestDelay = 1000000; // 1 second delay between requests (microseconds)

    public function getUserAccessToken(): string
    {
        return User::role('super-admin')->first()->getFacebookAccessToken();
    }

    /**
     * Sync all campaigns, ads and adsets with aggressive rate limiting
     */
    public function syncAllPagesAdsAndAdSets(): void
    {
        $activePages = MetaPage::all();

        foreach ($activePages as $page) {
            try {
                // Add delay between pages to respect rate limits
                if ($activePages->first() !== $page) {
                    Log::info("Waiting 60 seconds before next page to respect rate limits...");
                    sleep(60);
                }

                $this->syncPageWithRateLimit($page);
            } catch (\Exception $e) {
                Log::error("Failed to sync ads for page: {$page->page_id}", [
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Sync page with aggressive rate limiting
     * @throws \Exception
     */
    public function syncPageWithRateLimit(MetaPage $page): void
    {
        try {
            $userId = User::role('super-admin')->first()?->id;

            Log::info("Starting rate-limited sync for page: {$page->page_id}");

            // Use synchronous approach with rate limiting instead of job chaining
            // This gives us better control over API call frequency
            $this->syncPageSynchronouslyWithRateLimit($page, $userId);

        } catch (\Exception $e) {
            Log::error("Failed to sync page with rate limit: {$page->page_id}", [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Synchronous sync with aggressive rate limiting
     * @throws \Exception
     */
    private function syncPageSynchronouslyWithRateLimit(MetaPage $page, string $userId): void
    {
        try {
            // Step 1: Get and sync campaigns with rate limiting
            Log::info("Fetching campaigns for page: {$page->page_id}");
            $campaigns = $this->getCampaignsFromPageWithRateLimit($page);

            if (empty($campaigns)) {
                Log::info("No campaigns found for page: {$page->page_id}");
                return;
            }

            $campaignResults = $this->processCampaigns($campaigns, $userId);
            Log::info("Campaigns processed", [
                'page_id' => $page->page_id,
                'created' => $campaignResults['created'],
                'updated' => $campaignResults['updated'],
                'errors' => count($campaignResults['errors'])
            ]);

            // Step 2: Process each campaign with delays
            foreach ($campaigns as $index => $campaignData) {
                try {
                    // Add delay between campaigns
                    if ($index > 0) {
                        Log::info("Rate limit delay: waiting 30 seconds before next campaign...");
                        sleep(30);
                    }

                    $this->syncCampaignDataWithRateLimit($campaignData, $page->access_token, $userId);

                } catch (\Exception $e) {
                    Log::error("Failed to sync campaign: {$campaignData['id']}", [
                        'error' => $e->getMessage()
                    ]);

                    // If rate limited, wait longer
                    if ($this->isRateLimitError($e)) {
                        Log::warning("Rate limit hit for campaign, waiting 5 minutes...");
                        sleep(300); // 5 minutes
                    }
                }
            }

        } catch (\Exception $e) {
            Log::error("Failed synchronous sync for page: {$page->page_id}", [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Sync individual campaign data with rate limiting
     * @throws \Exception
     */
    private function syncCampaignDataWithRateLimit(array $campaignData, string $accessToken, string $userId): void
    {
        Log::info("Syncing campaign: {$campaignData['name']} ({$campaignData['id']})");

        // Step 1: Get adsets for this campaign
        $adSets = $this->getAdSetsFromCampaignWithRateLimit($campaignData['id'], $accessToken);

        if (!empty($adSets)) {
            $adSetResults = $this->processAdSets($adSets, $userId);
            Log::info("AdSets processed for campaign: {$campaignData['id']}", [
                'created' => $adSetResults['created'],
                'updated' => $adSetResults['updated'],
                'errors' => count($adSetResults['errors'])
            ]);

            // Step 2: Process ads for each adset with delays
            foreach ($adSets as $adSetIndex => $adSetData) {
                try {
                    // Add delay between adsets
                    if ($adSetIndex > 0) {
                        Log::info("Rate limit delay: waiting 15 seconds before next adset...");
                        sleep(15);
                    }

                    $ads = $this->getAdsFromAdSetWithRateLimit($adSetData['id'], $accessToken);

                    if (!empty($ads)) {
                        $adsResults = $this->processAds($ads, $userId);
                        Log::info("Ads processed for adset: {$adSetData['id']}", [
                            'created' => $adsResults['created'],
                            'updated' => $adsResults['updated'],
                            'errors' => count($adsResults['errors'])
                        ]);
                    }

                } catch (\Exception $e) {
                    Log::error("Failed to sync ads for adset: {$adSetData['id']}", [
                        'error' => $e->getMessage()
                    ]);

                    // If rate limited, wait longer
                    if ($this->isRateLimitError($e)) {
                        Log::warning("Rate limit hit for adset, waiting 3 minutes...");
                        sleep(180); // 3 minutes
                    }
                }
            }
        }
    }

    /**
     * Check if error is a rate limit error
     */
    private function isRateLimitError(\Exception $e): bool
    {
        $message = $e->getMessage();
        return str_contains($message, 'request limit reached') ||
            str_contains($message, 'rate limit') ||
            str_contains($message, 'too many calls') ||
            str_contains($message, 'code":17') ||
            str_contains($message, 'code":4');
    }

    /**
     * Get campaigns with rate limiting
     * @throws \Exception
     */
    public function getCampaignsFromPageWithRateLimit(MetaPage $page): array
    {
        try {
            $adAccounts = $this->getAdAccountsFromPageWithRateLimit($page);
            $allCampaigns = [];

            foreach ($adAccounts as $index => $adAccount) {
                // Add delay between ad accounts
                if ($index > 0) {
                    sleep(10);
                }

                $campaigns = $this->getCampaignsFromAdAccountWithRateLimit($adAccount['id'], $this->getUserAccessToken());
                $allCampaigns = array_merge($allCampaigns, $campaigns);
            }

            return $allCampaigns;
        } catch (\Exception $e) {
            Log::error("Failed to get campaigns from page: {$page->page_id}", [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get ad accounts with rate limiting
     * @throws \Exception
     */
    public function getAdAccountsFromPageWithRateLimit(MetaPage $page): array
    {
        $params = [
            'access_token' => $this->getUserAccessToken(),
            'fields' => 'id,name,account_status,currency,timezone_name'
        ];

        $response = $this->makeApiRequestWithRateLimit("/me/adaccounts", $params);
        return $response['data'] ?? [];
    }

    /**
     * Get campaigns with rate limiting
     * @throws \Exception
     */
    public function getCampaignsFromAdAccountWithRateLimit(string $adAccountId, string $accessToken): array
    {
        $params = [
            'access_token' => $accessToken,
            'fields' => 'id,name,status,objective,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget,bid_strategy,buying_type,spend_cap,budget_remaining,configured_status,effective_status',
            'limit' => 50 // Reduced batch size
        ];

        $campaigns = $this->makeApiRequestWithRateLimit("/{$adAccountId}/campaigns", $params);
        return $campaigns['data'] ?? [];
    }

    /**
     * Get adsets with rate limiting
     * @throws \Exception
     */
    public function getAdSetsFromCampaignWithRateLimit(string $campaignId, string $accessToken): array
    {
        $params = [
            'access_token' => $this->getUserAccessToken(),
            'fields' => 'id,name,campaign_id,status,created_time,updated_time,optimization_goal,billing_event,bid_amount,daily_budget,lifetime_budget,start_time,end_time,configured_status,effective_status',
            'limit' => 50 // Reduced batch size
        ];

        $adsets = $this->makeApiRequestWithRateLimit("/{$campaignId}/adsets", $params);
        return $adsets['data'] ?? [];
    }

    /**
     * Get ads with rate limiting
     * @throws \Exception
     */
    public function getAdsFromAdSetWithRateLimit(string $adsetId, string $accessToken): array
    {
        $params = [
            'access_token' => $this->getUserAccessToken(),
            'fields' => 'id,name,campaign_id,adset_id,status,created_time,updated_time,configured_status,effective_status,creative{id,name,object_story_spec,title,body}',
            'limit' => 50 // Reduced batch size
        ];

        $ads = $this->makeApiRequestWithRateLimit("/{$adsetId}/ads", $params);
        return $ads['data'] ?? [];
    }

    /**
     * Make API request with aggressive rate limiting
     * @throws \Exception
     */
    private function makeApiRequestWithRateLimit(string $endpoint, array $params): array
    {
        // Check if we should throttle requests
        $this->enforceRateLimit();

        $attempt = 0;
        $lastException = null;

        while ($attempt < $this->maxRetries) {
            try {
                // Add delay before each request
                if ($attempt > 0) {
                    $delay = $this->calculateBackoffDelay($attempt);
                    Log::info("API request retry #{$attempt}, waiting {$delay} seconds...");
                    sleep($delay);
                }

                // Make the request with longer timeout
                $response = Http::timeout(60)
                    ->get($this->graphApiUrl . ltrim($endpoint, '/'), $params);

                // Track this request for rate limiting
                $this->trackApiRequest();

                if ($response->successful()) {
                    // Add delay after successful request
                    usleep($this->requestDelay); // 1 second delay
                    return $response->json();
                }

                // Handle API errors
                $error = $response->json();
                if (isset($error['error']['code'])) {
                    $errorCode = $error['error']['code'];
                    $errorMessage = $error['error']['message'];

                    switch ($errorCode) {
                        case 4: // Rate limit exceeded
                        case 17: // User request limit reached
                            $waitTime = $this->calculateRateLimitDelay($error, $attempt);
                            Log::warning("Facebook API rate limit hit", [
                                'code' => $errorCode,
                                'message' => $errorMessage,
                                'wait_time' => $waitTime,
                                'attempt' => $attempt
                            ]);
                            sleep($waitTime);
                            break;

                        case 190: // Invalid access token
                            Log::error("Invalid Facebook access token", ['error' => $error]);
                            throw new \Exception("Invalid access token: {$errorMessage}");

                        case 100: // Invalid parameter
                            Log::error("Invalid Facebook API parameter", ['error' => $error, 'params' => $params]);
                            throw new \Exception("Invalid parameter: {$errorMessage}");

                        default:
                            Log::error("Facebook Ads API error", ['error' => $error, 'params' => $params]);
                            throw new \Exception("Facebook API error (Code {$errorCode}): {$errorMessage}");
                    }
                } else {
                    throw new \Exception("HTTP {$response->status()}: {$response->body()}");
                }

            } catch (\Exception $e) {
                $lastException = $e;
                $attempt++;

                // If it's a rate limit error, wait longer
                if ($this->isRateLimitError($e) && $attempt < $this->maxRetries) {
                    $waitTime = $this->calculateRateLimitDelay(null, $attempt);
                    Log::warning("Rate limit exception, waiting {$waitTime} seconds before retry...");
                    sleep($waitTime);
                }
            }
        }

        throw $lastException ?? new \Exception("Max retries exceeded");
    }

    /**
     * Calculate backoff delay for retries
     */
    private function calculateBackoffDelay(int $attempt): int
    {
        // Exponential backoff: 30s, 60s, 120s, 240s, 480s
        return min($this->baseRetryDelay * pow(2, $attempt - 1), 480);
    }

    /**
     * Calculate delay for rate limit errors
     */
    private function calculateRateLimitDelay(?array $error, int $attempt): int
    {
        // For rate limit errors, use progressive delays
        $baseDelay = 300; // 5 minutes base

        // If error provides retry-after or similar hint, use it
        if ($error && isset($error['error']['error_subcode'])) {
            return match ($error['error']['error_subcode']) {
                2446079 => 900 + ($attempt * 300),
                default => $baseDelay + ($attempt * 180),
            };
        }

        return $baseDelay + ($attempt * 180); // Default progressive delay
    }

    /**
     * Enforce rate limiting before making requests
     */
    private function enforceRateLimit(): void
    {
        $hourKey = 'facebook_api_hourly_' . date('Y-m-d-H');
        $minuteKey = 'facebook_api_minute_' . date('Y-m-d-H-i');

        // Check hourly limit
        $hourlyRequests = Cache::get($hourKey, 0);
        if ($hourlyRequests >= $this->maxRequestsPerHour) {
            $waitTime = 3600 - (time() % 3600);
            Log::warning("Hourly rate limit reached, waiting {$waitTime} seconds...");
            sleep($waitTime);
        }

        // Check per-minute limit
        $minuteRequests = Cache::get($minuteKey, 0);
        if ($minuteRequests >= $this->maxRequestsPerMinute) {
            $waitTime = 60 - (time() % 60);
            Log::warning("Per-minute rate limit reached, waiting {$waitTime} seconds...");
            sleep($waitTime);
        }
    }

    /**
     * Track API requests for rate limiting
     */
    private function trackApiRequest(): void
    {
        $hourKey = 'facebook_api_hourly_' . date('Y-m-d-H');
        $minuteKey = 'facebook_api_minute_' . date('Y-m-d-H-i');

        Cache::increment($hourKey);
        Cache::increment($minuteKey);
        Cache::put($hourKey, Cache::get($hourKey), 3600);
        Cache::put($minuteKey, Cache::get($minuteKey), 60);
    }

    // Keep all your existing process methods (processCampaigns, processAdSets, processAds, etc.)
    // These don't make API calls so don't need rate limiting changes

    public function processCampaigns(array $campaignsData, string $userId = null): array
    {
        $results = [
            'created' => 0,
            'updated' => 0,
            'errors' => []
        ];

        foreach ($campaignsData as $campaignData) {
            try {
                $result = $this->processCampaign($campaignData, $userId);
                $results[$result['action']]++;
            } catch (\Exception $e) {
                $results['errors'][] = [
                    'campaign_id' => $campaignData['id'],
                    'error' => $e->getMessage()
                ];
                Log::error("Failed to process campaign: {$campaignData['id']}", [
                    'error' => $e->getMessage(),
                    'campaign_data' => $campaignData
                ]);
            }
        }

        return $results;
    }

    public function processAdSets(array $adsetsData, string $userId = null): array
    {
        $results = [
            'created' => 0,
            'updated' => 0,
            'errors' => []
        ];

        foreach ($adsetsData as $adsetData) {
            try {
                $result = $this->processAdSet($adsetData, $userId);
                $results[$result['action']]++;
            } catch (\Exception $e) {
                $results['errors'][] = [
                    'adset_id' => $adsetData['id'],
                    'error' => $e->getMessage()
                ];
                Log::error("Failed to process adset: {$adsetData['id']}", [
                    'error' => $e->getMessage(),
                    'adset_data' => $adsetData
                ]);
            }
        }

        return $results;
    }

    public function processAds(array $adsData, string $userId = null): array
    {
        $results = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => []
        ];

        foreach ($adsData as $adData) {
            try {
                $result = $this->processAdWithRetry($adData, $userId);
                $results[$result['action']]++;
            } catch (\Exception $e) {
                $results['errors'][] = [
                    'ad_id' => $adData['id'],
                    'error' => $e->getMessage()
                ];
                Log::error("Failed to process ad: {$adData['id']}", [
                    'error' => $e->getMessage(),
                    'ad_data' => $adData
                ]);
            }
        }

        return $results;
    }

    // Keep all your existing helper methods
    private function processAdWithRetry(array $adData, string $userId = null, int $attempt = 1): array
    {
        $maxAttempts = 3;

        try {
            return $this->processAdWithValidation($adData, $userId);
        } catch (QueryException $e) {
            if ($this->isForeignKeyViolation($e) && $attempt < $maxAttempts) {
                Log::warning("Foreign key violation for ad {$adData['id']}, attempt {$attempt}. Retrying...");
                sleep($attempt * 5);
                $this->syncMissingDependencies($adData, $userId);
                return $this->processAdWithRetry($adData, $userId, $attempt + 1);
            }
            throw $e;
        }
    }

    private function isForeignKeyViolation(\Exception $e): bool
    {
        return str_contains($e->getMessage(), 'Foreign key violation') ||
            str_contains($e->getMessage(), 'violates foreign key constraint') ||
            str_contains($e->getMessage(), 'SQLSTATE[23503]');
    }

    private function syncMissingDependencies(array $adData, string $userId): void
    {
        // Implementation for syncing missing dependencies
        // (Keep your existing implementation)
    }

    private function processAdWithValidation(array $adData, string $userId = null): array
    {
        // Keep your existing implementation
        $existingAd = Ad::where('external_id', $adData['id'])->first();

        $adAttributes = [
            'user_id' => $userId,
            'external_id' => $adData['id'],
            'name' => $adData['name'],
            'campaign_external_id' => $adData['campaign_id'],
            'ad_set_external_id' => $adData['adset_id'],
            'status' => $adData['status'],
            'configured_status' => $adData['configured_status'] ?? null,
            'effective_status' => $adData['effective_status'] ?? null,
            'creative_id' => $adData['creative']['id'] ?? null,
            'creative_title' => $adData['creative']['title'] ?? null,
            'creative_body' => $adData['creative']['body'] ?? null,
            'created_at' => Carbon::parse($adData['created_time']),
            'last_synced' => now(),
        ];

        if ($existingAd) {
            $existingAd->update($adAttributes);
            return ['action' => 'updated', 'ad_id' => $existingAd->id];
        } else {
            $ad = Ad::create($adAttributes);
            return ['action' => 'created', 'ad_id' => $ad->id];
        }
    }

    private function processCampaign(array $campaignData, string $userId = null): array
    {
        // Keep your existing implementation
        $existingCampaign = Campaign::where('external_id', $campaignData['id'])->first();

        $campaignAttributes = [
            'user_id' => $userId,
            'external_id' => $campaignData['id'],
            'name' => $campaignData['name'],
            'status' => $campaignData['status'],
            'objective' => $campaignData['objective'] ?? null,
            'buying_type' => $campaignData['buying_type'] ?? null,
            'bid_strategy' => $campaignData['bid_strategy'] ?? null,
            'daily_budget' => isset($campaignData['daily_budget']) ? $campaignData['daily_budget'] / 100 : null,
            'lifetime_budget' => isset($campaignData['lifetime_budget']) ? $campaignData['lifetime_budget'] / 100 : null,
            'spend_cap' => isset($campaignData['spend_cap']) ? $campaignData['spend_cap'] / 100 : null,
            'budget_remaining' => isset($campaignData['budget_remaining']) ? $campaignData['budget_remaining'] / 100 : null,
            'configured_status' => $campaignData['configured_status'] ?? null,
            'effective_status' => $campaignData['effective_status'] ?? null,
            'start_time' => isset($campaignData['start_time']) ? Carbon::parse($campaignData['start_time']) : null,
            'stop_time' => isset($campaignData['stop_time']) ? Carbon::parse($campaignData['stop_time']) : null,
            'created_at' => Carbon::parse($campaignData['created_time']),
            'last_synced' => now(),
        ];

        if ($existingCampaign) {
            $existingCampaign->update($campaignAttributes);
            return ['action' => 'updated', 'campaign_id' => $existingCampaign->id];
        } else {
            $campaign = Campaign::create($campaignAttributes);
            return ['action' => 'created', 'campaign_id' => $campaign->id];
        }
    }

    private function processAdSet(array $adsetData, string $userId = null): array
    {
        // Keep your existing implementation
        $existingAdSet = AdSet::where('external_id', $adsetData['id'])->first();

        $adsetAttributes = [
            'user_id' => $userId,
            'external_id' => $adsetData['id'],
            'name' => $adsetData['name'],
            'campaign_external_id' => $adsetData['campaign_id'],
            'status' => $adsetData['status'],
            'optimization_goal' => $adsetData['optimization_goal'] ?? null,
            'billing_event' => $adsetData['billing_event'] ?? null,
            'bid_amount' => isset($adsetData['bid_amount']) ? $adsetData['bid_amount'] / 100 : null,
            'daily_budget' => isset($adsetData['daily_budget']) ? $adsetData['daily_budget'] / 100 : null,
            'lifetime_budget' => isset($adsetData['lifetime_budget']) ? $adsetData['lifetime_budget'] / 100 : null,
            'configured_status' => $adsetData['configured_status'] ?? null,
            'effective_status' => $adsetData['effective_status'] ?? null,
            'start_time' => isset($adsetData['start_time']) ? Carbon::parse($adsetData['start_time']) : null,
            'end_time' => isset($adsetData['end_time']) ? Carbon::parse($adsetData['end_time']) : null,
            'created_at' => Carbon::parse($adsetData['created_time']),
            'last_synced' => now(),
        ];

        if ($existingAdSet) {
            $existingAdSet->update($adsetAttributes);
            return ['action' => 'updated', 'adset_id' => $existingAdSet->id];
        } else {
            $adset = AdSet::create($adsetAttributes);
            return ['action' => 'created', 'adset_id' => $adset->id];
        }
    }
}
