<?php

namespace App\Console\Commands;

use App\Services\LeadCacheService;
use Illuminate\Console\Command;

class WarmLeadsCache extends Command
{
    protected $signature = 'leads:warm-cache
                          {--stats : Warm up statistics cache}
                          {--all : Warm up all cache types}';

    protected $description = 'Warm up leads cache for commonly accessed data';

    public function handle(LeadCacheService $cacheService): int
    {
        $this->info('Starting lead cache warming...');

        $startTime = microtime(true);

        try {
            if ($this->option('stats') || $this->option('all')) {
                $this->info('Warming up statistics cache...');
                $cacheService->warmUpStats();
                $this->info('✓ Statistics cache warmed');
            }

            if (! $this->option('stats') || $this->option('all')) {
                $this->info('Warming up leads list cache...');
                $cacheService->warmUpCache();
                $this->info('✓ Leads list cache warming dispatched to queue');
            }

            $endTime = microtime(true);
            $duration = round($endTime - $startTime, 2);

            $this->info("Cache warming completed in {$duration} seconds");

            // Display cache info
            if ($this->option('all')) {
                $this->newLine();
                $this->info('Current cache statistics:');
                $info = $cacheService->getCacheInfo();
                $this->table(
                    ['Metric', 'Value'],
                    [
                        ['Total lead cache keys', count($info['leads_cache_keys'] ?? [])],
                        ['Memory usage', $info['memory_usage'] ?? 'N/A'],
                        ['Cache hit ratio', $info['cache_hit_ratio'].'%'],
                    ]
                );
            }

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to warm cache: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
