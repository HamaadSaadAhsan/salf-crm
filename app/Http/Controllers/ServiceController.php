<?php

namespace App\Http\Controllers;

use App\Http\Requests\ServiceFilterRequest;
use App\Http\Resources\LeadResource;
use App\Http\Resources\ServiceResource;
use App\Models\Lead;
use App\Models\Service;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ServiceController extends Controller
{
    public function __construct(
        private CacheService $cacheService
    )
    {
    }

    /**
     * Display a listing of the resource.
     */
    public function index(ServiceFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $cacheKey = Service::getListCacheKey($filters);

        // Try to get from the cache first
        $result = $this->cacheService->remember($cacheKey, function () use ($filters) {
            return $this->buildServicesQuery($filters);
        }, now()->addMinutes(15)->diffInSeconds(), ['services', 'services_list']);

        // Real-time data for critical updates
        if ($this->shouldBypassCache($filters)) {
            $result = $this->buildServicesQuery($filters);
        }

        return response()->json([
            'data' => $result['data'],
            'meta' => $result['meta'],
            'cache_info' => [
                'cached' => $this->cacheService->hasWithTags($cacheKey, ['services', 'services_list']),
                'cache_key' => $cacheKey,
                'expires_at' => $this->cacheService->getTTL(),
            ]
        ]);
    }

    /**
     * Build an optimized query with filters
    */
    private function buildServicesQuery(array $filters): array
    {
        $startTime = microtime(true);

        $query = Service::query()
            ->with([
                'parent:id,name',
                'children:id,name,parent_id',
                'users:id,name,email',
            ])
            ->select([
                'id', 'name', 'detail', 'country_code', 'country_name',
                'parent_id', 'sort_order', 'status',
                'created_at', 'updated_at'
            ]);

        // Apply filters
        $this->applyFilters($query, $filters);

        // Apply sorting
        $this->applySorting($query, $filters);

        // Get paginated results
        $perPage = min($filters['per_page'] ?? 25, 100); // Max 100 items per page
        $services = $query->paginate($perPage);

        return [
            'data' => ServiceResource::collection($services->items()),
            'meta' => [
                'current_page' => $services->currentPage(),
                'per_page' => $services->perPage(),
                'total' => $services->total(),
                'last_page' => $services->lastPage(),
                'from' => $services->firstItem(),
                'to' => $services->lastItem(),
                'has_more' => $services->hasMorePages(),
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
        // Status filter
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Parent filter
        if (!empty($filters['parent_id'])) {
            $query->where('parent_id', $filters['parent_id']);
        }

        // Country filter
        if (!empty($filters['country_code'])) {
            $query->where('country_code', $filters['country_code']);
        }

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
                    ->orWhere('detail', 'ilike', '%' . $searchTerm . '%');
            });
        }
    }

    /**
     * Apply sorting to query
     */
    private function applySorting($query, array $filters): void
    {
        $sortBy = $filters['sort_by'] ?? 'sort_order';
        $sortOrder = $filters['sort_order'] ?? 'asc';

        // Validate sort fields
        $allowedSortFields = [
            'created_at', 'updated_at', 'name', 'sort_order', 'status',
            'country_code', 'country_name'
        ];

        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'sort_order';
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


    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Service $service)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Service $service)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Service $service)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Service $service)
    {
        //
    }
}
