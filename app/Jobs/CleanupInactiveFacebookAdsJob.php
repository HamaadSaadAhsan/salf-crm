<?php

namespace App\Jobs;

use App\Services\FacebookAdsSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CleanupInactiveFacebookAdsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300;

    protected $userId;

    public function __construct(string $userId = null)
    {
        $this->userId = $userId;
    }

    public function handle(FacebookAdsSyncService $adsSyncService)
    {
        try {
            // Get all current active ad IDs from Facebook
            // This is a simplified version - you'd need to implement getting all active IDs
            $activeAdIds = []; // You'd populate this from Facebook API
            $activeAdSetIds = []; // You'd populate this from Facebook API

            // Clean up inactive ads
            $deletedAds = $adsSyncService->cleanupInactiveAds($activeAdIds, $this->userId);
            $deletedAdSets = $adsSyncService->cleanupInactiveAdSets($activeAdSetIds, $this->userId);

            Log::info("Cleaned up inactive Facebook ads and adsets", [
                'deleted_ads' => $deletedAds,
                'deleted_adsets' => $deletedAdSets,
                'user_id' => $this->userId
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to cleanup inactive Facebook ads", [
                'error' => $e->getMessage(),
                'user_id' => $this->userId
            ]);
        }
    }
}
