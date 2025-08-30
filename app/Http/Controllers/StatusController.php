<?php

namespace App\Http\Controllers;

use App\Http\Requests\StatusFilterRequest;
use App\Http\Resources\StatusResource;
use App\Models\Status;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatusController extends Controller
{
    public function __construct(
        private CacheService $cacheService
    )
    {
    }

    /**
     * Display a listing of the resource.
     */
    public function index(StatusFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $cacheKey = Status::getListCacheKey($filters);

        // Try to get from the cache first
        $result = $this->cacheService->remember($cacheKey, function () use ($filters) {
            return $this->buildStatusQuery($filters);
        }, now()->addMinutes(15)->diffInSeconds(), ['statuses', 'statuses_list']);

        // Real-time data for critical updates
        if ($this->shouldBypassCache($filters)) {
            $result = $this->buildStatusQuery($filters);
        }

        return response()->json([
            'data' => $result['data'],
            'meta' => $result['meta'],
            'cache_info' => [
                'cached' => $this->cacheService->hasWithTags($cacheKey, ['statuses', 'statuses_list']),
                'cache_key' => $cacheKey,
                'expires_at' => $this->cacheService->getTTL(),
            ]
        ]);
    }


    /**
     * Build an optimized query with filters
     */
    private function buildStatusQuery(array $filters): array
    {
        $startTime = microtime(true);

        $query = Status::query()
            ->select([
                'id', 'name',
                'order', 'color'
            ]);

        // Apply filters
        $this->applyFilters($query, $filters);

        // Apply sorting
        $this->applySorting($query, $filters);

        // Get paginated results
        $perPage = min($filters['per_page'] ?? 25, 100); // Max 100 items per page
        $statuses = $query->paginate($perPage);

        return [
            'data' => StatusResource::collection($statuses->items()),
            'meta' => [
                'current_page' => $statuses->currentPage(),
                'per_page' => $statuses->perPage(),
                'total' => $statuses->total(),
                'last_page' => $statuses->lastPage(),
                'from' => $statuses->firstItem(),
                'to' => $statuses->lastItem(),
                'has_more' => $statuses->hasMorePages(),
                'filters_applied' => array_filter($filters),
                'query_time' => round((microtime(true) - $startTime) * 1000, 2), // milliseconds
            ]
        ];
    }

    /**
     * Apply filters to a query
     */
    private function applyFilters($query, array $filters): void
    {
        // Date range filter
        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to'] . ' 23:59:59');
        }

        // Search filter
        if (!empty($filters['search'])) {
            $searchTerm = trim($filters['search']);
            // Use LIKE search for shorter terms
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'ilike', '%' . $searchTerm . '%')
                    ->orWhere('color', 'ilike', '%' . $searchTerm . '%');
            });
        }
    }

    /**
     * Apply sorting to query
     */
    private function applySorting($query, array $filters): void
    {
        $sortBy = $filters['sort_by'] ?? 'order';
        $sortOrder = $filters['sort_order'] ?? 'asc';

        // Validate sort fields
        $allowedSortFields = [
            'created_at', 'updated_at', 'name', 'order', 'color'
        ];

        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'order';
        }

        if (!in_array(strtolower($sortOrder), ['asc', 'desc'])) {
            $sortOrder = 'asc';
        }

        $query->orderBy($sortBy, $sortOrder);

        // Secondary sort for consistency
        if ($sortBy !== 'id') {
            $query->orderBy('id', 'desc');
        }
    }


    /**
     * Determine if the cache should be bypassed
     */
    private function shouldBypassCache(array $filters): bool
    {
        // Bypass cache for real-time requirements
        return !empty($filters['real_time']) ||
            (!empty($filters['assigned_to']) && $filters['assigned_to'] === auth()->id());
    }
}
