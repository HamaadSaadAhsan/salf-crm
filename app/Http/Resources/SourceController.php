<?php

namespace App\Http\Resources;

use App\Http\Controllers\Controller;
use App\Http\Requests\StatusFilterRequest;
use App\Models\LeadSource;
use App\Services\CacheService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SourceController extends Controller
{
    public function __construct(
        private CacheService $cacheService
    ) {}

    /**
     * Display a listing of the resource.
     */
    public function index(StatusFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $cacheKey = LeadSource::getListCacheKey($filters);

        // Try to get from the cache first
        $result = $this->cacheService->remember($cacheKey, function () use ($filters) {
            return $this->buildStatusQuery($filters);
        }, now()->addMinutes(15)->diffInSeconds(), ['lead_sources', 'lead_sources_list']);

        // Real-time data for critical updates
        if ($this->shouldBypassCache($filters)) {
            $result = $this->buildStatusQuery($filters);
        }

        return response()->json([
            'data' => $result['data'],
            'meta' => $result['meta'],
            'cache_info' => [
                'cached' => $this->cacheService->hasWithTags($cacheKey, ['lead_sources', 'lead_sources_list']),
                'cache_key' => $cacheKey,
                'expires_at' => $this->cacheService->getTTL(),
            ],
        ]);
    }

    /**
     * Build an optimized query with filters
     */
    private function buildStatusQuery(array $filters): array
    {
        $startTime = microtime(true);

        $query = LeadSource::query()
            ->select([
                'id', 'name', 'source_score',
            ]);

        // Apply filters
        $this->applyFilters($query, $filters);

        // Apply sorting
        $this->applySorting($query, $filters);

        // Get paginated results
        $perPage = min($filters['per_page'] ?? 25, 100); // Max 100 items per page
        $statuses = $query->paginate($perPage);

        return [
            'data' => LeadSourceResource::collection($statuses->items()),
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
            ],
        ];
    }

    /**
     * Apply filters to a query
     */
    private function applyFilters($query, array $filters): void
    {
        // Date range filter
        if (! empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->where('created_at', '<=', Carbon::parse($filters['date_to'])->endOfDay());
        }

        // Search filter
        if (! empty($filters['search'])) {
            $searchTerm = trim($filters['search']);
            // Use LIKE search for shorter terms
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'ilike', '%'.$searchTerm.'%')
                    ->orWhere('color', 'ilike', '%'.$searchTerm.'%');
            });
        }
    }

    /**
     * Apply sorting to query
     */
    private function applySorting($query, array $filters): void
    {
        $sortBy = $filters['sort_by'] ?? 'name';
        $sortOrder = $filters['sort_order'] ?? 'asc';

        // Validate sort fields against existing columns
        $allowedSortFields = [
            'created_at', 'updated_at', 'name', 'id',
        ];

        if (! in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'name';
        }

        if (! in_array(strtolower($sortOrder), ['asc', 'desc'])) {
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
        return ! empty($filters['real_time']) ||
            (! empty($filters['assigned_to']) && $filters['assigned_to'] === auth()->id());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:lead_sources,slug',
            'identifier' => 'nullable|string|max:255|unique:lead_sources,identifier',
            'status' => 'required|in:active,inactive',
            'source_score' => 'nullable|integer|min:0|max:10',
        ]);

        $source = LeadSource::create($validated);

        return response()->json([
            'data' => new LeadSourceResource($source),
            'message' => 'Lead source created successfully.',
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, LeadSource $source): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:lead_sources,slug,'.$source->id,
            'identifier' => 'nullable|string|max:255|unique:lead_sources,identifier,'.$source->id,
            'status' => 'sometimes|required|in:active,inactive',
            'source_score' => 'sometimes|nullable|integer|min:0|max:10',
        ]);

        $source->update($validated);

        return response()->json([
            'data' => new LeadSourceResource($source->fresh()),
            'message' => 'Lead source updated successfully.',
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(LeadSource $source): JsonResponse
    {
        // Check if source has leads
        if ($source->leads()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete lead source that has associated leads.',
            ], 422);
        }

        $source->delete();

        return response()->json([
            'message' => 'Lead source deleted successfully.',
        ]);
    }
}
