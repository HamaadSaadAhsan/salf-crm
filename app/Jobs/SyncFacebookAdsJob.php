<?php

namespace App\Jobs;

use App\Services\FacebookAdsSyncService;
use App\Models\AdSet;
use App\Models\Campaign;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Meilisearch\Endpoints\Delegates\HandlesBatches;

class SyncFacebookAdsJob implements ShouldQueue
{
    use Queueable, SerializesModels, InteractsWithQueue, Dispatchable, Batchable, HandlesBatches;

    public $timeout = 300; // 5 minutes
    public $tries = 5; // Increased tries for foreign key issues
    public $maxExceptions = 3;
    public $backoff = [30, 60, 120, 300, 600]; // Progressive backoff

    protected $campaignId;
    protected $accessToken;
    protected $userId;
    protected $adsetId; // Optional: sync ads for a specific adset

    public function __construct(string $campaignId, string $accessToken, string $userId = null, string $adsetId = null)
    {
        $this->campaignId = $campaignId;
        $this->accessToken = $accessToken;
        $this->userId = $userId;
        $this->adsetId = $adsetId;
    }

    public function handle(FacebookAdsSyncService $adsSyncService)
    {
        $lockKey = $this->adsetId
            ? "facebook_ads_sync_adset_{$this->adsetId}"
            : "facebook_ads_sync_campaign_{$this->campaignId}";

        // Prevent duplicate processing
        if (Cache::has($lockKey)) {
            Log::info("Skipping duplicate ads sync for " . ($this->adsetId ? "adset: {$this->adsetId}" : "campaign: {$this->campaignId}"));
            return;
        }

        try {
            Cache::put($lockKey, true, 300); // 5 minute lock

            $logContext = $this->adsetId ? "adset: {$this->adsetId}" : "campaign: {$this->campaignId}";
            Log::info("Starting ads sync for {$logContext}", [
                'attempt' => $this->attempts()
            ]);

            // Validate dependencies before processing
            $this->validateDependencies();

            // Get ads from Facebook API
            if ($this->adsetId) {
                $adsData = $adsSyncService->getAdsFromAdSet($this->adsetId, $this->accessToken);
            } else {
                $adsData = $adsSyncService->getAdsFromCampaign($this->campaignId, $this->accessToken);
            }

            if (empty($adsData)) {
                Log::info("No ads found for {$logContext}");
                return;
            }

            // Process ads with enhanced error handling
            $results = $adsSyncService->processAds($adsData, $this->userId);

            Log::info("Completed ads sync for {$logContext}", [
                'created' => $results['created'],
                'updated' => $results['updated'],
                'skipped' => $results['skipped'] ?? 0,
                'errors' => count($results['errors'])
            ]);

            // If there are errors, log them
            if (!empty($results['errors'])) {
                Log::warning("Ads sync had errors for {$logContext}", [
                    'errors' => $results['errors'],
                    'attempt' => $this->attempts()
                ]);

                // If we have foreign key violations and haven't reached max attempts, fail to retry
                if ($this->hasForeignKeyErrors($results['errors']) && $this->attempts() < $this->tries) {
                    throw new \Exception("Foreign key violations detected, retrying...");
                }
            }

        } catch (\Exception $e) {
            $logContext = $this->adsetId ? "adset: {$this->adsetId}" : "campaign: {$this->campaignId}";

            Log::error("Failed to sync ads for {$logContext}", [
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
                'trace' => $e->getTraceAsString()
            ]);

            // Don't retry if we've exceeded our attempts
            if ($this->attempts() >= $this->tries) {
                Log::error("Max attempts reached for ads sync: {$logContext}");
            }

            throw $e;
        } finally {
            Cache::forget($lockKey);
        }
    }

    /**
     * Validate that required dependencies exist
     */
    private function validateDependencies(): void
    {
        // If syncing by adset, ensure adset exists
        if ($this->adsetId) {
            $adsetExists = AdSet::where('external_id', $this->adsetId)->exists();
            if (!$adsetExists) {
                Log::warning("AdSet {$this->adsetId} not found, may need dependency sync");

                // Don't throw immediately on first attempt, let the service handle it
                if ($this->attempts() > 2) {
                    throw new \Exception("AdSet {$this->adsetId} does not exist after multiple attempts");
                }
            }
        }

        // Always ensure campaign exists
        $campaignExists = Campaign::where('external_id', $this->campaignId)->exists();
        if (!$campaignExists) {
            Log::warning("Campaign {$this->campaignId} not found, may need dependency sync");

            if ($this->attempts() > 2) {
                throw new \Exception("Campaign {$this->campaignId} does not exist after multiple attempts");
            }
        }
    }

    /**
     * Check if errors contain foreign key violations
     */
    private function hasForeignKeyErrors(array $errors): bool
    {
        foreach ($errors as $error) {
            if (isset($error['error']) && (
                    strpos($error['error'], 'Foreign key violation') !== false ||
                    strpos($error['error'], 'violates foreign key constraint') !== false ||
                    strpos($error['error'], 'SQLSTATE[23503]') !== false
                )) {
                return true;
            }
        }
        return false;
    }

    /**
     * Determine the delay before retrying
     */
    public function backoff(): array
    {
        return $this->backoff;
    }

    /**
     * Handle job failure
     */
    public function failed(\Throwable $exception)
    {
        $logContext = $this->adsetId ? "adset: {$this->adsetId}" : "campaign: {$this->campaignId}";

        Log::error("SyncFacebookAdsJob permanently failed for {$logContext}", [
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts(),
            'campaign_id' => $this->campaignId,
            'adset_id' => $this->adsetId,
            'trace' => $exception->getTraceAsString()
        ]);

        // Could send notification or trigger manual review here
        // event(new FacebookSyncFailed($this->campaignId, $this->adsetId, $exception));
    }

    /**
     * Determine if the job should be retried based on the exception
     */
    public function retryUntil(): \DateTime
    {
        return now()->addMinutes(30); // Retry for up to 30 minutes
    }
}
