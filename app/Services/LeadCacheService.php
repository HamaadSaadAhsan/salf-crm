<?php

namespace App\Services;

use App\Models\Lead;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class LeadCacheService
{
    private const CACHE_TTL = 900; // 15 minutes
    private const STATS_TTL = 1800; // 30 minutes
    private const DETAIL_TTL = 3600; // 1 hour

    private const TAGS = [
        'leads',
        'leads_list',
        'leads_stats'
    ];

    /**
     * Check if tagged cache exists - more reliable approach
     */
    public static function hasWithTags(string $key, array $tags = []): bool
    {
        try {
            if (self::supportsTagging() && !empty($tags)) {
                // Try to get the actual value instead of just checking existence
                $value = Cache::tags($tags)->get($key);
                return $value !== null;
            }

            return self::has($key);
        } catch (Exception $e) {
            Log::warning('Cache has with tags check failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Alternative method - try to retrieve and check if data exists
     */
    public static function existsWithTags(string $key, array $tags = []): bool
    {
        try {
            if (self::supportsTagging() && !empty($tags)) {
                // Use remember with a very short TTL to check existence
                $exists = false;

                Cache::tags($tags)->remember($key . ':exists_check', 1, function () use (&$exists, $key, $tags) {
                    // If this callback runs, the key doesn't exist
                    $exists = false;
                    return 'not_found';
                });

                // If remember didn't run the callback, the key exists
                $value = Cache::tags($tags)->get($key);
                return $value !== null;
            }

            return Cache::has($key);
        } catch (Exception $e) {
            Log::warning('Cache exists check failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Most reliable method - directly check Redis structure
     */
    public static function hasTaggedCache(string $key, array $tags = []): bool
    {
        if (config('cache.default') !== 'redis' || empty($tags)) {
            return self::has($key);
        }

        try {
            $redis = Redis::connection();
            $prefix = config('cache.prefix', config('cache.stores.redis.prefix', 'laravel_database'));

            // Build possible Redis key patterns
            $patterns = [
                $prefix . '*:' . implode(':', $tags) . ':*' . $key . '*',
                $prefix . '*:' . $key,
                $key,
            ];

            foreach ($patterns as $pattern) {
                $keys = $redis->keys($pattern);
                if (!empty($keys)) {
                    // Check if any of these keys have actual data
                    foreach ($keys as $redisKey) {
                        if ($redis->exists($redisKey)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        } catch (Exception $e) {
            Log::warning('Redis cache check failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get cache value and check existence in one operation
     */
    public static function getWithExistenceCheck(string $key, array $tags = []): array
    {
        try {
            if (self::supportsTagging() && !empty($tags)) {
                $value = Cache::tags($tags)->get($key);
                return [
                    'exists' => $value !== null,
                    'value' => $value,
                ];
            }

            $value = Cache::get($key);
            return [
                'exists' => $value !== null,
                'value' => $value,
            ];
        } catch (Exception $e) {
            Log::warning('Cache get with existence check failed: ' . $e->getMessage());
            return [
                'exists' => false,
                'value' => null,
            ];
        }
    }

    // ... rest of your existing methods ...

    public function invalidateLeadCache(Lead $lead): void
    {
        $tags = [
            'leads',
            'leads_list',
            "lead:{$lead->id}",
            'leads_stats'
        ];

        Cache::tags($tags)->flush();
        $this->invalidateSpecificKeys($lead);
    }

    public static function has(string $key): bool
    {
        try {
            return Cache::has($key);
        } catch (Exception $e) {
            Log::warning('Cache has check failed: ' . $e->getMessage());
            return false;
        }
    }

    private static function supportsTagging(): bool
    {
        $driver = config('cache.default');
        $supportedDrivers = ['redis', 'memcached'];
        return in_array($driver, $supportedDrivers);
    }

    public function invalidateListCache(): void
    {
        Cache::tags(['leads', 'leads_list'])->flush();
    }

    public function invalidateStatsCache(): void
    {
        Cache::tags(['leads_stats'])->flush();
    }

    public function getTTL(): int
    {
        return self::CACHE_TTL;
    }

    private function invalidateSpecificKeys(Lead $lead): void
    {
        $keysToInvalidate = [
            "lead:{$lead->id}:full",
            "lead:{$lead->id}:activities",
            "lead:{$lead->id}:notes",
            "user:{$lead->assigned_to}:leads"
        ];

        foreach ($keysToInvalidate as $key) {
            Cache::forget($key);
        }
    }

    private function calculateHitRatio(): float
    {
        $redis = Redis::connection();
        $info = $redis->info('stats');

        $hits = $info['keyspace_hits'] ?? 0;
        $misses = $info['keyspace_misses'] ?? 0;
        $total = $hits + $misses;

        return $total > 0 ? round(($hits / $total) * 100, 2) : 0;
    }

    public function getCacheInfo(): array
    {
        $redis = Redis::connection();

        return [
            'leads_cache_keys' => $redis->keys('*leads*'),
            'memory_usage' => $redis->info('memory')['used_memory_human'] ?? 'N/A',
            'cache_hit_ratio' => $this->calculateHitRatio(),
        ];
    }

    public function warmUpCache(array $filters = []): void
    {
        $commonFilters = [
            ['status' => 'new'],
            ['status' => 'contacted'],
            ['priority' => 'high'],
            ['hot_leads' => true],
            ['active_only' => true],
        ];

        foreach ($commonFilters as $filter) {
            $cacheKey = Lead::getListCacheKey($filter);
            if (!Cache::tags(['leads'])->has($cacheKey)) {
                WarmLeadsCacheJob::dispatch($filter);
            }
        }
    }

    public function getPopularSearchTerms(): array
    {
        return Cache::remember('leads:popular_searches', now()->addDay(), function () {
            return [
                'manager' => 45,
                'ceo' => 32,
                'director' => 28,
                'software' => 24,
                'marketing' => 19
            ];
        });
    }
}
