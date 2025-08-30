<?php

namespace App\Jobs;

use App\Services\FacebookAdsSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SyncFacebookAdsPerformanceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 600; // 10 minutes
    public $tries = 2;

    protected $adIds;
    protected $accessToken;
    protected $fields;

    public function __construct(array $adIds, string $accessToken, array $fields = null)
    {
        $this->adIds = $adIds;
        $this->accessToken = $accessToken;
        $this->fields = $fields;
    }

    public function handle(FacebookAdsSyncService $adsSyncService)
    {
        try {
            Log::info("Starting performance sync for " . count($this->adIds) . " ads");

            $performanceData = $adsSyncService->getAdsPerformance(
                $this->adIds,
                $this->accessToken,
                $this->fields
            );

            // Store performance data (you can extend this based on your needs)
            $this->storePerformanceData($performanceData);

            Log::info("Completed performance sync for " . count($this->adIds) . " ads");

        } catch (\Exception $e) {
            Log::error("Failed to sync ads performance", [
                'error' => $e->getMessage(),
                'ad_count' => count($this->adIds)
            ]);

            throw $e;
        }
    }

    private function storePerformanceData(array $performanceData): void
    {
        foreach ($performanceData as $adId => $data) {
            if (isset($data['error'])) {
                continue; // Skip ads with errors
            }

            // You can create a separate AdPerformance model or store in cache
            // For now, we'll just cache the data
            Cache::put("ad_performance_{$adId}", $data, now()->addHours(24));
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error("SyncFacebookAdsPerformanceJob failed", [
            'error' => $exception->getMessage(),
            'ad_count' => count($this->adIds)
        ]);
    }
}
