<?php

namespace App\Console\Commands;

use App\Jobs\WarmDashboardCacheJob;
use App\Models\User;
use Illuminate\Console\Command;

class WarmDashboardCacheCommand extends Command
{
    protected $signature = 'cache:warm-dashboards';

    protected $description = 'Pre-warm dashboard caches for all active users';

    public function handle(): int
    {
        $users = User::query()
            ->whereHas('roles', function ($query) {
                $query->whereIn('name', [
                    'super-admin', 'admin', 'manager', 'team-lead',
                    'support-agent', 'senior-support-agent',
                    'sales-rep', 'senior-sales-rep',
                ]);
            })
            ->pluck('id');

        if ($users->isEmpty()) {
            $this->info('No active users found to warm caches for.');

            return self::SUCCESS;
        }

        foreach ($users as $userId) {
            WarmDashboardCacheJob::dispatch($userId);
        }

        $this->info("Dispatched {$users->count()} dashboard cache warming jobs.");

        return self::SUCCESS;
    }
}
