<?php

// Job: SyncFacebookAdSetsJob.php
namespace App\Jobs;

use App\Services\FacebookAdsSyncService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Meilisearch\Endpoints\Delegates\HandlesBatches;

class SyncFacebookAdSetsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable, HandlesBatches;

    public $timeout = 300; // 5 minutes
    public $tries = 3;
    public $backoff = [30, 60, 120];

    protected $campaignId;
    protected $accessToken;
    protected $userId;

    public function __construct(string $campaignId, string $accessToken, string $userId = null)
    {
        $this->campaignId = $campaignId;
        $this->accessToken = $accessToken;
        $this->userId = $userId;
    }

    public function handle(FacebookAdsSyncService $adsSyncService)
    {
        $lockKey = "facebook_adsets_sync_{$this->campaignId}";

        // Prevent duplicate processing
        if (Cache::has($lockKey)) {
            Log::info("Skipping duplicate adsets sync for campaign: {$this->campaignId}");
            return;
        }

        try {
            Cache::put($lockKey, true, 300); // 5 minute lock

            Log::info("Starting adsets sync for campaign: {$this->campaignId}");

            // Get adsets from Facebook API
            $adsetsData = $adsSyncService->getAdSetsFromCampaign($this->campaignId, $this->accessToken);

            if (empty($adsetsData)) {
                Log::info("No adsets found for campaign: {$this->campaignId}");
                return;
            }

            // Process adsets
            $results = $adsSyncService->processAdSets($adsetsData, $this->userId);

            Log::info("Completed adsets sync for campaign: {$this->campaignId}", [
                'created' => $results['created'],
                'updated' => $results['updated'],
                'errors' => count($results['errors'])
            ]);

            // If there are errors, log them
            if (!empty($results['errors'])) {
                Log::warning("AdSets sync had errors for campaign: {$this->campaignId}", [
                    'errors' => $results['errors']
                ]);
            }

        } catch (\Exception $e) {
            Log::error("Failed to sync adsets for campaign: {$this->campaignId}", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        } finally {
            Cache::forget($lockKey);
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error("SyncFacebookAdSetsJob failed for campaign: {$this->campaignId}", [
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);
    }
}

// Job: CleanupInactiveFacebookAdsJob.php

