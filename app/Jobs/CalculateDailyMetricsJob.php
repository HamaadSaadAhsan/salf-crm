<?php

namespace App\Jobs;

use App\Services\CacheService;
use App\Services\DashboardMetricsService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CalculateDailyMetricsJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public ?Carbon $date = null
    ) {
        // Calculate metrics for yesterday by default
        $this->date = $date ?? Carbon::yesterday();
    }

    /**
     * Execute the job.
     */
    public function handle(
        DashboardMetricsService $metricsService,
        CacheService $cacheService
    ): void {
        Log::info("CalculateDailyMetricsJob started for date: {$this->date->toDateString()}");

        try {
            // Calculate all metrics for the specified date
            $metricsService->calculateDailyMetrics($this->date);

            // Clear dashboard-related cache after metrics calculation
            $cacheService->flush('dashboard');
            $cacheService->flush('metrics');

            Log::info("CalculateDailyMetricsJob completed successfully for date: {$this->date->toDateString()}");
        } catch (\Exception $e) {
            Log::error("CalculateDailyMetricsJob failed for date: {$this->date->toDateString()}", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }
}
