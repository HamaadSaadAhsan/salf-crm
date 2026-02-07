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
        'leads_stats',
    ];

    /**
     * Check if tagged cache exists - more reliable approach
     */
    public static function hasWithTags(string $key, array $tags = []): bool
    {
        try {
            if (self::supportsTagging() && ! empty($tags)) {
                // Try to get the actual value instead of just checking existence
                $value = cache()->tags($tags)->get($key);

                return $value !== null;
            }

            return self::has($key);
        } catch (Exception $e) {
            Log::warning('Cache has with tags check failed: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Alternative method - try to retrieve and check if data exists
     */
    public static function existsWithTags(string $key, array $tags = []): bool
    {
        try {
            if (self::supportsTagging() && ! empty($tags)) {
                // Use remember with a very short TTL to check existence
                $exists = false;

                cache()->tags($tags)->remember($key.':exists_check', 1, function () use (&$exists) {
                    // If this callback runs, the key doesn't exist
                    $exists = false;

                    return 'not_found';
                });

                // If remember didn't run the callback, the key exists
                $value = cache()->tags($tags)->get($key);

                return $value !== null;
            }

            return cache()->has($key);
        } catch (Exception $e) {
            Log::warning('Cache exists check failed: '.$e->getMessage());

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
                $prefix.'*:'.implode(':', $tags).':*'.$key.'*',
                $prefix.'*:'.$key,
                $key,
            ];

            foreach ($patterns as $pattern) {
                $keys = $redis->keys($pattern);
                if (! empty($keys)) {
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
            Log::warning('Redis cache check failed: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Get cache value and check existence in one operation
     */
    public static function getWithExistenceCheck(string $key, array $tags = []): array
    {
        try {
            if (self::supportsTagging() && ! empty($tags)) {
                $value = cache()->tags($tags)->get($key);

                return [
                    'exists' => $value !== null,
                    'value' => $value,
                ];
            }

            $value = cache()->get($key);

            return [
                'exists' => $value !== null,
                'value' => $value,
            ];
        } catch (Exception $e) {
            Log::warning('Cache get with existence check failed: '.$e->getMessage());

            return [
                'exists' => false,
                'value' => null,
            ];
        }
    }

    // ... rest of your existing methods ...

    /** Fields that affect which filtered lists a lead appears in. */
    private const LIST_FIELDS = [
        'inquiry_status',
        'priority',
        'assigned_to',
        'service_id',
        'lead_source_id',
        'city',
        'country',
        'advisor_stage',
    ];

    /** Fields that affect dashboard stats / aggregate counts. */
    private const STATS_FIELDS = [
        'inquiry_status',
        'priority',
        'assigned_to',
    ];

    /**
     * Invalidate lead cache with tiered strategy based on changed fields.
     *
     * Tier 1 (detail only): name, email, tags, notes, custom_fields, etc.
     * Tier 2 (detail + lists): status, priority, assigned_to, service, city, country
     * Tier 3 (detail + lists + stats): inquiry_status, priority, assigned_to
     *
     * @param  array<string>  $changedFields  Dirty field names. Empty = flush all (legacy behaviour).
     */
    public function invalidateLeadCache(Lead $lead, array $changedFields = []): void
    {
        // Always invalidate the specific lead's detail cache
        cache()->tags(["lead:{$lead->id}"])->flush();
        $this->invalidateSpecificKeys($lead);

        // When no fields specified, flush everything (backward-compatible)
        if (empty($changedFields)) {
            cache()->tags(['leads', 'leads_list'])->flush();
            cache()->tags(['leads_stats'])->flush();

            return;
        }

        $affectsList = ! empty(array_intersect($changedFields, self::LIST_FIELDS));
        $affectsStats = ! empty(array_intersect($changedFields, self::STATS_FIELDS));

        if ($affectsList) {
            cache()->tags(['leads', 'leads_list'])->flush();
        }

        if ($affectsStats) {
            cache()->tags(['leads_stats'])->flush();
        }
    }

    public static function has(string $key): bool
    {
        try {
            return cache()->has($key);
        } catch (Exception $e) {
            Log::warning('Cache has check failed: '.$e->getMessage());

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
        cache()->tags(['leads', 'leads_list'])->flush();
    }

    public function invalidateStatsCache(): void
    {
        cache()->tags(['leads_stats'])->flush();
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
            "user:{$lead->assigned_to}:leads",
        ];

        foreach ($keysToInvalidate as $key) {
            cache()->forget($key);
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

    /**
     * Warm up cache with commonly accessed lead data
     * Dispatches jobs to background for async processing
     */
    public function warmUpCache(array $additionalFilters = []): void
    {
        $commonFilters = [
            // Status-based filters
            ['inquiry_status' => 'new'],
            ['inquiry_status' => 'contacted'],
            ['inquiry_status' => 'qualified'],
            ['inquiry_status' => 'assigned_to_advisor'],

            // Priority-based filters
            ['priority' => 'high'],
            ['priority' => 'urgent'],

            // Hot leads
            ['hot_leads' => true],

            // Active leads (not won/lost)
            ['active_only' => true],

            // Assigned vs unassigned
            ['is_assigned' => true],
            ['is_assigned' => false],

            // Overdue follow-ups
            ['overdue_follow_ups' => true],

            // Recent leads (last 7 days)
            ['created_within_days' => 7],

            // High scoring leads
            ['min_lead_score' => 70],
        ];

        // Merge with any additional filters provided
        $allFilters = array_merge($commonFilters, $additionalFilters);

        foreach ($allFilters as $filter) {
            $cacheKey = Lead::getListCacheKey($filter);

            // Only dispatch job if cache doesn't exist
            if (! $this->hasTaggedCache($cacheKey, ['leads', 'leads_list'])) {
                \App\Jobs\WarmLeadsCacheJob::dispatch($filter);
            }
        }
    }

    /**
     * Warm up individual lead details cache
     * Useful for frequently accessed leads
     */
    public function warmUpLeadDetails(Lead $lead): void
    {
        $cacheKey = $lead->getCacheKey('full');

        if (! cache()->tags(["lead:{$lead->id}"])->has($cacheKey)) {
            cache()->tags(["lead:{$lead->id}"])->put(
                $cacheKey,
                $lead->load([
                    'service',
                    'source',
                    'assignedTo',
                    'createdBy',
                    'qualifiedBy',
                    'activities' => function ($query) {
                        $query->latest()->limit(50);
                    },
                    'callSessions' => function ($query) {
                        $query->latest()->limit(20);
                    },
                    'notes' => function ($query) {
                        $query->latest()->limit(30);
                    },
                    'tasks' => function ($query) {
                        $query->latest()->limit(20);
                    },
                ]),
                self::DETAIL_TTL
            );
        }
    }

    /**
     * Warm up lead statistics cache
     */
    public function warmUpStats(): void
    {
        $statsKey = 'leads:stats:overview';

        if (! cache()->tags(['leads_stats'])->has($statsKey)) {
            cache()->tags(['leads_stats'])->put(
                $statsKey,
                [
                    'total_leads' => Lead::count(),
                    'active_leads' => Lead::active()->count(),
                    'hot_leads' => Lead::hotLeads()->count(),
                    'new_leads' => Lead::where('inquiry_status', 'new')->count(),
                    'contacted_leads' => Lead::where('inquiry_status', 'contacted')->count(),
                    'qualified_leads' => Lead::where('inquiry_status', 'qualified')->count(),
                    'won_leads' => Lead::where('inquiry_status', 'won')->count(),
                    'lost_leads' => Lead::where('inquiry_status', 'lost')->count(),
                    'avg_lead_score' => Lead::avg('lead_score'),
                    'overdue_follow_ups' => Lead::where('next_follow_up_at', '<', now())->count(),
                    'unassigned_leads' => Lead::whereNull('assigned_to')->count(),
                    'by_priority' => [
                        'low' => Lead::where('priority', 'low')->count(),
                        'medium' => Lead::where('priority', 'medium')->count(),
                        'high' => Lead::where('priority', 'high')->count(),
                        'urgent' => Lead::where('priority', 'urgent')->count(),
                    ],
                ],
                self::STATS_TTL
            );
        }
    }

    public function getPopularSearchTerms(): array
    {
        // Use flexible caching - fresh for 12 hours, stale for 24 hours
        return cache()->flexible('leads:popular_searches', [43200, 86400], fn () => [
            'manager' => 45,
            'ceo' => 32,
            'director' => 28,
            'software' => 24,
            'marketing' => 19,
        ]);
    }
}
