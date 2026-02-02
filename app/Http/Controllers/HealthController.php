<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    /**
     * Health check endpoint for deployment verification.
     *
     * Checks:
     * - Database connectivity
     * - Cache connectivity
     * - Application status
     */
    public function __invoke(): JsonResponse
    {
        $checks = [
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'checks' => [],
        ];

        // Database check
        try {
            DB::connection()->getPdo();
            $checks['checks']['database'] = [
                'status' => 'healthy',
                'connection' => config('database.default'),
            ];
        } catch (Throwable $e) {
            $checks['status'] = 'unhealthy';
            $checks['checks']['database'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }

        // Cache check
        try {
            $cacheKey = 'health_check_'.time();
            Cache::put($cacheKey, true, 10);
            $cacheResult = Cache::get($cacheKey);
            Cache::forget($cacheKey);

            if ($cacheResult === true) {
                $checks['checks']['cache'] = [
                    'status' => 'healthy',
                    'driver' => config('cache.default'),
                ];
            } else {
                throw new \RuntimeException('Cache write/read failed');
            }
        } catch (Throwable $e) {
            $checks['status'] = 'unhealthy';
            $checks['checks']['cache'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }

        // Application info
        $checks['app'] = [
            'name' => config('app.name'),
            'environment' => config('app.env'),
            'debug' => config('app.debug'),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
        ];

        $statusCode = $checks['status'] === 'healthy' ? 200 : 503;

        return response()->json($checks, $statusCode);
    }
}
