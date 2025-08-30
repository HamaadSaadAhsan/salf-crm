<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CacheService
{
    private const DEFAULT_TTL = 3600; // 1 hour
    private const TAGS = [
        'roles' => 'crm.roles',
        'permissions' => 'crm.permissions',
        'settings' => 'crm.settings',
        'integrations' => 'crm.integrations',
        'users' => 'crm.users',
        'services' => 'crm.services',
    ];

    /**
     * Remember cached data with optional tags
     */
    public static function remember(string $key, callable $callback, int $ttl = self::DEFAULT_TTL, array $tags = [])
    {
        try {
            // Check if tags are supported and requested
            if (self::supportsTagging() && !empty($tags)) {
                $cacheTagNames = self::mapTags($tags);
                return Cache::tags($cacheTagNames)->remember($key, $ttl, $callback);
            }

            // Fallback to the regular cache
            return Cache::remember($key, $ttl, $callback);
        } catch (Exception $e) {
            Log::warning('Cache remember failed: ' . $e->getMessage());
            // Execute callback directly if cache fails
            return $callback();
        }
    }

    /**
     * Forget cached data with optional tags
     */
    public static function forget(string $key, array $tags = []): bool
    {
        try {
            if (self::supportsTagging() && !empty($tags)) {
                $cacheTagNames = self::mapTags($tags);
                return Cache::tags($cacheTagNames)->forget($key);
            }

            return Cache::forget($key);
        } catch (Exception $e) {
            Log::warning('Cache forget failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Flush cache by tag
     */
    public static function flush(string $tag): bool
    {
        try {
            if (self::supportsTagging()) {
                $tagName = self::TAGS[$tag] ?? $tag;
                return Cache::tags($tagName)->flush();
            }

            // Fallback: try to clear specific patterns
            return self::clearByPattern($tag);
        } catch (Exception $e) {
            Log::warning('Cache flush failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get available tags
     */
    public static function getTags(): array
    {
        return self::TAGS;
    }

    /**
     * Check if current cache driver supports tagging
     */
    private static function supportsTagging(): bool
    {
        $driver = config('cache.default');
        $supportedDrivers = ['redis', 'memcached'];

        return in_array($driver, $supportedDrivers);
    }

    /**
     * Map tag names to full tag names
     */
    private static function mapTags(array $tags): array
    {
        return array_map(function($tag) {
            return self::TAGS[$tag] ?? $tag;
        }, $tags);
    }

    /**
     * Clear cache by pattern (fallback for drivers without tagging)
     */
    private static function clearByPattern(string $pattern): bool
    {
        try {
            $driver = config('cache.default');

            switch ($driver) {
                case 'redis':
                    return self::clearRedisPattern($pattern);
                case 'file':
                    return self::clearFilePattern($pattern);
                case 'array':
                    // Array driver doesn't persist, so just return true
                    return true;
                default:
                    // For other drivers, try to clear all cache
                    Cache::flush();
                    return true;
            }
        } catch (Exception $e) {
            Log::warning('Clear by pattern failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Clear Redis cache by pattern
     */
    private static function clearRedisPattern(string $pattern): bool
    {
        try {
            $store = Cache::getStore();

            if (!method_exists($store, 'getRedis')) {
                return false;
            }

            $redis = $store->getRedis();
            $prefix = $store->getPrefix();
            $keys = $redis->keys($prefix . '*' . $pattern . '*');

            if (empty($keys)) {
                return true;
            }

            // Remove prefix from keys before deleting
            $keysWithoutPrefix = array_map(function($key) use ($prefix) {
                return str_replace($prefix, '', $key);
            }, $keys);

            return $redis->del($keysWithoutPrefix) > 0;
        } catch (Exception $e) {
            Log::warning('Redis pattern clear failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Clear file cache by pattern
     */
    private static function clearFilePattern(string $pattern): bool
    {
        try {
            // For file driver, we'll just clear all cache
            // as pattern matching is complex
            Cache::flush();
            return true;
        } catch (Exception $e) {
            Log::warning('File pattern clear failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Clear all cache
     */
    public static function clear(): bool
    {
        try {
            return Cache::flush();
        } catch (Exception $e) {
            Log::warning('Cache clear failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Put data in cache with optional tags
     */
    public static function put(string $key, $value, int $ttl = self::DEFAULT_TTL, array $tags = []): bool
    {
        try {
            if (self::supportsTagging() && !empty($tags)) {
                $cacheTagNames = self::mapTags($tags);
                return Cache::tags($cacheTagNames)->put($key, $value, $ttl);
            }

            return Cache::put($key, $value, $ttl);
        } catch (Exception $e) {
            Log::warning('Cache put failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get data from cache
     */
    public static function get(string $key, $default = null)
    {
        try {
            return Cache::get($key, $default);
        } catch (Exception $e) {
            Log::warning('Cache get failed: ' . $e->getMessage());
            return $default;
        }
    }

    /**
     * Check if key exists in cache
     */
    public static function has(string $key): bool
    {
        try {
            return Cache::has($key);
        } catch (Exception $e) {
            Log::warning('Cache has check failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if key exists in cache with tags
     */
    public static function hasWithTags(string $key, array $tags = []): bool
    {
        try {
            if (self::supportsTagging() && !empty($tags)) {
                $cacheTagNames = self::mapTags($tags);
                return Cache::tags($cacheTagNames)->has($key);
            }

            return self::has($key);
        } catch (Exception $e) {
            Log::warning('Cache has with tags check failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get default TTL value
     */
    public static function getTTL(): int
    {
        return self::DEFAULT_TTL;
    }
}
