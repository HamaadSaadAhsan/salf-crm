<?php

namespace App\Jobs;

use App\Http\Controllers\Api\DashboardController;
use App\Models\User;
use App\Services\CacheService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class WarmDashboardCacheJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(
        public int $userId
    ) {
        $this->onQueue('default');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $user = User::with('roles')->find($this->userId);

            if (! $user) {
                Log::warning('WarmDashboardCacheJob: User not found', ['user_id' => $this->userId]);

                return;
            }

            $cacheKey = "dashboard:overview:{$this->userId}:".now()->format('Y-m-d');

            $dashboardController = app(DashboardController::class);
            $data = match (true) {
                $user->hasAnyRole(['super-admin', 'admin']) => $dashboardController->getSuperAdminDashboard($user),
                $user->hasAnyRole(['manager', 'team-lead']) => $dashboardController->getManagerDashboard($user),
                $user->hasAnyRole(['support-agent', 'senior-support-agent']) => $dashboardController->getCRODashboard($user),
                $user->hasAnyRole(['sales-rep', 'senior-sales-rep']) => $dashboardController->getAdvisorDashboard($user),
                default => $dashboardController->getBasicDashboard($user),
            };

            CacheService::put($cacheKey, $data, 3600);

            Log::info('Dashboard cache warmed successfully', [
                'user_id' => $this->userId,
                'cache_key' => $cacheKey,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to warm dashboard cache', [
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('WarmDashboardCacheJob failed permanently', [
            'user_id' => $this->userId,
            'error' => $exception->getMessage(),
        ]);
    }
}
