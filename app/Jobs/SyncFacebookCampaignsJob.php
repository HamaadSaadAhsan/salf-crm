<?php

namespace App\Jobs;

use App\Models\MetaPage;
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

class SyncFacebookCampaignsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable, HandlesBatches;

    public $timeout = 300; // 5 minutes
    public $tries = 3;
    public $backoff = [30, 60, 120];

    protected $pageId;
    protected $accessToken;
    protected $userId;

    public function __construct(string $pageId, string $accessToken, string $userId = null)
    {
        $this->pageId = $pageId;
        $this->accessToken = $accessToken;
        $this->userId = $userId;
    }

    public function handle(FacebookAdsSyncService $adsSyncService)
    {
        $lockKey = "facebook_campaigns_sync_{$this->pageId}";

        // Prevent duplicate processing
        if (Cache::has($lockKey)) {
            Log::info("Skipping duplicate campaigns sync for page: {$this->pageId}");
            return;
        }

        try {
            Cache::put($lockKey, true, 300); // 5 minute lock

            Log::info("Starting campaigns sync for page: {$this->pageId}");

            // Get Facebook page
            $page = MetaPage::where('page_id', $this->pageId)->first();
            if (!$page) {
                throw new \Exception("Page not found: {$this->pageId}");
            }

            // Get campaigns from Facebook API
            $campaignsData = $adsSyncService->getCampaignsFromPage($page);

            if (empty($campaignsData)) {
                Log::info("No campaigns found for page: {$this->pageId}");
                return;
            }

            // Process campaigns
            $results = $adsSyncService->processCampaigns($campaignsData, $this->userId);

            Log::info("Completed campaigns sync for page: {$this->pageId}", [
                'created' => $results['created'],
                'updated' => $results['updated'],
                'errors' => count($results['errors'])
            ]);

            // If there are errors, log them
            if (!empty($results['errors'])) {
                Log::warning("Campaigns sync had errors for page: {$this->pageId}", [
                    'errors' => $results['errors']
                ]);
            }

        } catch (\Exception $e) {
            Log::error("Failed to sync campaigns for page: {$this->pageId}", [
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
        Log::error("SyncFacebookCampaignsJob failed for page: {$this->pageId}", [
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);
    }
}
