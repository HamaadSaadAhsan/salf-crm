<?php

namespace App\Jobs;

use App\Services\FacebookAdsSyncService;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Meilisearch\Endpoints\Delegates\HandlesBatches;

class SyncAllFacebookAdsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable, HandlesBatches;

    public $timeout = 900; // 15 minutes (increased for job chaining)
    public $tries = 2; // Reduced since we're using job chaining
    public $maxExceptions = 2;

    protected $userId;
    protected $useJobChaining;

    public function __construct(string $userId = null, bool $useJobChaining = true)
    {
        $this->userId = $userId;
        $this->useJobChaining = $useJobChaining;
    }

    public function handle(FacebookAdsSyncService $adsSyncService)
    {
        Log::info("Starting sync of all Facebook ads and adsets", [
            'user_id' => $this->userId,
            'use_job_chaining' => $this->useJobChaining,
            'attempt' => $this->attempts()
        ]);

        try {
            if ($this->useJobChaining) {
                // Use the new job chaining approach for better dependency management
                $adsSyncService->syncAllPagesAdsAndAdSets();
                Log::info("Successfully dispatched job chains for all Facebook pages");
            } else {
                // Fallback to the legacy synchronous approach
                Log::warning("Using legacy synchronous sync method");
                $this->syncLegacyMethod($adsSyncService);
            }

        } catch (\Exception $e) {
            Log::error("Failed to sync all Facebook ads and adsets", [
                'error' => $e->getMessage(),
                'user_id' => $this->userId,
                'attempt' => $this->attempts(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }

    /**
     * Legacy synchronous sync method (fallback)
     */
    private function syncLegacyMethod(FacebookAdsSyncService $adsSyncService): void
    {
        try {
            // Get all pages
            $activePages = \App\Models\MetaPage::all();

            foreach ($activePages as $page) {
                try {
                    Log::info("Starting legacy sync for page: {$page->page_id}");

                    // Sync synchronously for each page
                    $this->syncPageLegacy($adsSyncService, $page);

                    Log::info("Completed legacy sync for page: {$page->page_id}");

                } catch (\Exception $e) {
                    Log::error("Failed legacy sync for page: {$page->page_id}", [
                        'error' => $e->getMessage()
                    ]);
                    // Continue with other pages
                }
            }

        } catch (\Exception $e) {
            Log::error("Failed legacy sync method", [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Legacy sync for a single page (synchronous)
     */
    private function syncPageLegacy(FacebookAdsSyncService $adsSyncService, \App\Models\MetaPage $page): void
    {
        $userId = $this->userId ?? \App\Models\User::role('super-admin')->first()?->id;

        // Step 1: Sync campaigns
        $campaigns = $adsSyncService->getCampaignsFromPage($page);
        if (!empty($campaigns)) {
            $adsSyncService->processCampaigns($campaigns, $userId);
        }

        // Step 2: Sync adsets for each campaign
        foreach ($campaigns as $campaignData) {
            try {
                $adSets = $adsSyncService->getAdSetsFromCampaign($campaignData['id'], $page->access_token);
                if (!empty($adSets)) {
                    $adsSyncService->processAdSets($adSets, $userId);
                }

                // Step 3: Sync ads for each adset
                foreach ($adSets as $adSetData) {
                    try {
                        $ads = $adsSyncService->getAdsFromAdSet($adSetData['id'], $page->access_token);
                        if (!empty($ads)) {
                            $adsSyncService->processAds($ads, $userId);
                        }
                    } catch (\Exception $e) {
                        Log::error("Failed to sync ads for adset: {$adSetData['id']}", [
                            'error' => $e->getMessage()
                        ]);
                    }
                }

            } catch (\Exception $e) {
                Log::error("Failed to sync adsets for campaign: {$campaignData['id']}", [
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Handle job failure
     */
    public function failed(\Throwable $exception)
    {
        Log::error("SyncAllFacebookAdsJob permanently failed", [
            'error' => $exception->getMessage(),
            'user_id' => $this->userId,
            'attempts' => $this->attempts(),
            'use_job_chaining' => $this->useJobChaining,
            'trace' => $exception->getTraceAsString()
        ]);

        // Could send notification here
        // event(new AllFacebookSyncFailed($this->userId, $exception));
    }

    /**
     * Determine retry delay
     */
    public function backoff(): array
    {
        return [120, 300]; // 2 minutes, then 5 minutes
    }

    /**
     * Determine how long to keep retrying
     */
    public function retryUntil(): \DateTime
    {
        return now()->addHours(2); // Stop retrying after 2 hours
    }
}
