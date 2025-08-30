<?php

namespace App\Http\Controllers\Api\Leads;

use App\Http\Controllers\Controller;
use App\Http\Requests\LeadFilterRequest;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use App\Services\LeadCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Laravel\Scout\Builder;
use Throwable;

class LeadController extends Controller
{
    public function __construct(
        private LeadCacheService $cacheService
    )
    {
    }

    public function index(LeadFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $cacheKey = Lead::getListCacheKey($filters);
        $tags = ['leads', 'leads_list'];

        if (!empty($filters['search'])) {
            $result = $this->buildSearchQuery($filters);
            $fromCache = false;
        } else {
            // Use flexible TTL based on filter type
            $cacheTTL = $this->getCacheTTL($filters);
            $bypassCache = $this->shouldBypassCache($filters);

            if ($bypassCache) {
                // Bypass cache completely
                $result = $this->buildLeadsQuery($filters);
                $fromCache = false;
            } else {
                // Try cache with appropriate TTL
                $result = Cache::tags($tags)->remember($cacheKey, now()->addSeconds($cacheTTL), function () use ($filters) {
                    return $this->buildLeadsQuery($filters);
                });

                // Check if this was served from cache
                $fromCache = Cache::tags($tags)->has($cacheKey);
            }
        }

        return response()->json([
            'data' => $result['data'],
            'meta' => $result['meta'],
            'search_info' => $result['search_info'] ?? null,
            'cache_info' => [
                'cached' => $fromCache,
                'cache_key' => $cacheKey,
                'ttl_used' => $cacheTTL ?? 0,
                'bypass_reason' => $bypassCache ? 'real_time_required' : null,
                'expires_at' => $cacheTTL ?? $this->cacheService->getTTL(),
            ]
        ]);
    }

    /**
     * Build a search query using Meilisearch
     */
    private function buildSearchQuery(array $filters): array
    {
        $startTime = microtime(true);
        $searchTerm = trim($filters['search']);
        $perPage = min((int)($filters['per_page'] ?? 25), 100);
        $page = (int)($filters['page'] ?? 1);

        // Start with Meilisearch
        $searchQuery = Lead::search($searchTerm);

        // Apply Meilisearch filters
        $this->applySearchFilters($searchQuery, $filters);

        // Apply sorting
        $this->applySearchSorting($searchQuery, $filters);

        // Execute search with pagination
        $results = $searchQuery->paginate($perPage, 'page', $page);

        // Get the actual models with relationships
        $leadIds = $results->pluck('id')->toArray();
        $leads = Lead::with([
            'service:id,name',
            'source:id,name,slug',
            'assignedTo:id,name,email',
            'createdBy:id,name',
        ])
            ->whereIn('id', $leadIds)
            ->get()
            ->keyBy('id');

        // Maintain search result order
        $orderedLeads = collect($leadIds)->map(function ($id) use ($leads) {
            return $leads->get($id);
        })->filter();

        return [
            'data' => LeadResource::collection($orderedLeads),
            'meta' => [
                'current_page' => $results->currentPage(),
                'per_page' => $results->perPage(),
                'total' => $results->total(),
                'last_page' => $results->lastPage(),
                'from' => $results->firstItem(),
                'to' => $results->lastItem(),
                'has_more' => $results->hasMorePages(),
                'filters_applied' => array_filter($filters),
                'query_time' => round((microtime(true) - $startTime) * 1000, 2),
            ],
            'search_info' => [
                'engine' => 'meilisearch',
                'query' => $searchTerm,
                'total_hits' => $results->total(),
                'processing_time' => round((microtime(true) - $startTime) * 1000, 2),
            ]
        ];
    }

    /**
     * Apply filters to Meilisearch query
     */
    private function applySearchFilters(Builder $query, array $filters): void
    {
        $filterConditions = [];

        // Status filter
        if (!empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $statusFilter = 'inquiry_status IN [' . implode(', ', array_map(fn($s) => '"' . $s . '"', $filters['status'])) . ']';
                $filterConditions[] = $statusFilter;
            } else {
                $filterConditions[] = 'inquiry_status = "' . $filters['status'] . '"';
            }
        }

        // Priority filter
        if (!empty($filters['priority'])) {
            $filterConditions[] = 'priority = "' . $filters['priority'] . '"';
        }

        // Assigned user filter
        if (!empty($filters['assigned_to'])) {
            $filterConditions[] = 'assigned_to = ' . $filters['assigned_to'];
        }

        // Source filter
        if (!empty($filters['source_id'])) {
            $filterConditions[] = 'lead_source_id = ' . $filters['source_id'];
        }

        // Inquiry type filter
        if (!empty($filters['inquiry_type'])) {
            $filterConditions[] = 'inquiry_type = "' . $filters['inquiry_type'] . '"';
        }

        // Inquiry country filter
        if (!empty($filters['inquiry_country'])) {
            $filterConditions[] = 'inquiry_country = "' . $filters['inquiry_country'] . '"';
        }

        // Budget filters
        if (!empty($filters['min_budget'])) {
            $filterConditions[] = 'budget_amount >= ' . $filters['min_budget'];
        }
        if (!empty($filters['max_budget'])) {
            $filterConditions[] = 'budget_amount <= ' . $filters['max_budget'];
        }
        if (!empty($filters['budget_currency'])) {
            $filterConditions[] = 'budget_currency = "' . $filters['budget_currency'] . '"';
        }

        // Service filter
        if (!empty($filters['service_id'])) {
            $filterConditions[] = 'service_id = ' . $filters['service_id'];
        }

        // Date range filter (using timestamps)
        if (!empty($filters['date_from'])) {
            $timestamp = strtotime($filters['date_from']);
            $filterConditions[] = 'created_at_timestamp >= ' . $timestamp;
        }
        if (!empty($filters['date_to'])) {
            $timestamp = strtotime($filters['date_to'] . ' 23:59:59');
            $filterConditions[] = 'created_at_timestamp <= ' . $timestamp;
        }

        // Score range filter
        if (!empty($filters['min_score'])) {
            $filterConditions[] = 'lead_score >= ' . $filters['min_score'];
        }
        if (!empty($filters['max_score'])) {
            $filterConditions[] = 'lead_score <= ' . $filters['max_score'];
        }

        // Location filter with geographic support
        if (!empty($filters['country'])) {
            $filterConditions[] = 'country = "' . $filters['country'] . '"';
        }
        if (!empty($filters['city'])) {
            $filterConditions[] = 'city = "' . $filters['city'] . '"';
        }

        // Geographic radius filter (if coordinates provided)
        if (!empty($filters['lat']) && !empty($filters['lng']) && !empty($filters['radius'])) {
            // Note: Meilisearch doesn't have built-in geo search, so we'd need to
            // either pre-calculate distance ranges or fall back to database for this filter
            // For now, we'll add a placeholder that could be implemented with custom logic
        }

        // Assignment filters
        if (!empty($filters['unassigned'])) {
            $filterConditions[] = 'assigned_to IS NULL';
        }
        if (!empty($filters['assigned_date_from'])) {
            $timestamp = strtotime($filters['assigned_date_from']);
            $filterConditions[] = 'assigned_date_timestamp >= ' . $timestamp;
        }
        if (!empty($filters['assigned_date_to'])) {
            $timestamp = strtotime($filters['assigned_date_to'] . ' 23:59:59');
            $filterConditions[] = 'assigned_date_timestamp <= ' . $timestamp;
        }

        // Follow-up filters
        if (!empty($filters['has_follow_up'])) {
            $filterConditions[] = 'next_follow_up_at_timestamp IS NOT NULL';
        }
        if (!empty($filters['overdue_follow_ups'])) {
            $filterConditions[] = 'is_overdue = true';
        }
        if (!empty($filters['follow_up_date_from'])) {
            $timestamp = strtotime($filters['follow_up_date_from']);
            $filterConditions[] = 'next_follow_up_at_timestamp >= ' . $timestamp;
        }
        if (!empty($filters['follow_up_date_to'])) {
            $timestamp = strtotime($filters['follow_up_date_to'] . ' 23:59:59');
            $filterConditions[] = 'next_follow_up_at_timestamp <= ' . $timestamp;
        }

        // Activity-based filters
        if (!empty($filters['recent_activity_days'])) {
            $timestamp = now()->subDays($filters['recent_activity_days'])->timestamp;
            $filterConditions[] = 'last_activity_at_timestamp >= ' . $timestamp;
        }
        if (!empty($filters['no_activity_days'])) {
            $timestamp = now()->subDays($filters['no_activity_days'])->timestamp;
            $filterConditions[] = 'last_activity_at_timestamp <= ' . $timestamp;
        }

        // Hot leads filter (lead_score >= 80 OR (priority = high AND status in new,contacted))
        if (!empty($filters['hot_leads'])) {
            $filterConditions[] = 'is_hot_lead = true';
        }

        // Active leads only
        if (!empty($filters['active_only'])) {
            $filterConditions[] = 'inquiry_status NOT IN ["won", "lost"]';
        }

        // Days in the current status filter
        if (!empty($filters['max_days_in_status'])) {
            $filterConditions[] = 'days_in_current_status <= ' . $filters['max_days_in_status'];
        }
        if (!empty($filters['min_days_in_status'])) {
            $filterConditions[] = 'days_in_current_status >= ' . $filters['min_days_in_status'];
        }

        // Apply all filters
        if (!empty($filterConditions)) {
            $query->where(implode(' AND ', $filterConditions));
        }
    }

    /**
     * Apply sorting to Meilisearch query
     */
    private function applySearchSorting(Builder $query, array $filters): void
    {
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';

        // Map database fields to Meilisearch fields
        $sortFieldMap = [
            'created_at' => 'created_at_timestamp',
            'updated_at' => 'updated_at_timestamp',
            'last_activity_at' => 'last_activity_at_timestamp',
            'next_follow_up_at' => 'next_follow_up_at_timestamp',
            'assigned_date' => 'assigned_date_timestamp',
            'name' => 'name',
            'email' => 'email',
            'lead_score' => 'lead_score',
            'inquiry_status' => 'inquiry_status',
            'priority' => 'priority',
            'budget_amount' => 'budget_amount',
            'days_since_created' => 'days_since_created',
            'days_in_current_status' => 'days_in_current_status'
        ];

        $meilisearchField = $sortFieldMap[$sortBy] ?? 'created_at_timestamp';

        if (!in_array(strtolower($sortOrder), ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $query->orderBy($meilisearchField, $sortOrder);
    }

    /**
     * Build database query (fallback for non-search requests)
     */
    private function buildLeadsQuery(array $filters): array
    {
        $startTime = microtime(true);

        $query = Lead::query()
            ->with([
                'service:id,name',
                'source:id,name,slug',
                'assignedTo:id,name,email',
                'createdBy:id,name',
            ])
            ->select([
                'id', 'name', 'email', 'phone', 'occupation', 'address', 'city', 'country',
                'latitude', 'longitude', 'detail', 'budget', 'custom_fields',
                'inquiry_status', 'priority', 'inquiry_type', 'inquiry_country',
                'lead_score', 'service_id', 'lead_source_id', 'assigned_to', 'created_by',
                'assigned_date', 'ticket_id', 'ticket_date', 'created_at', 'updated_at',
                'last_activity_at', 'next_follow_up_at', 'tags'
            ]);

        // Apply filters
        $this->applyDatabaseFilters($query, $filters);

        // Apply sorting
        $this->applyDatabaseSorting($query, $filters);

        // Get paginated results
        $perPage = min((int) $filters['per_page'] ?? 25, 100);
        $leads = $query->paginate($perPage);

        return [
            'data' => LeadResource::collection($leads->items()),
            'meta' => [
                'current_page' => $leads->currentPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
                'last_page' => $leads->lastPage(),
                'from' => $leads->firstItem(),
                'to' => $leads->lastItem(),
                'has_more' => $leads->hasMorePages(),
                'filters_applied' => array_filter($filters),
                'query_time' => round((microtime(true) - $startTime) * 1000, 2),
            ]
        ];
    }

    /**
     * Apply filters to a database query
     */
    private function applyDatabaseFilters($query, array $filters): void
    {
        // Status filter
        if (!empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $query->whereIn('inquiry_status', $filters['status']);
            } else {
                $query->where('inquiry_status', $filters['status']);
            }
        }

        // Priority filter
        if (!empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        // Assigned user filter
        if (!empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        // Source filter
        if (!empty($filters['source_id'])) {
            $query->where('lead_source_id', $filters['source_id']);
        }

        // Inquiry type filter
        if (!empty($filters['inquiry_type'])) {
            $query->where('inquiry_type', $filters['inquiry_type']);
        }

        // Inquiry country filter
        if (!empty($filters['inquiry_country'])) {
            $query->where('inquiry_country', $filters['inquiry_country']);
        }

        // Budget filters
        if (!empty($filters['min_budget'])) {
            $query->whereRaw("CAST(budget->>'amount' AS NUMERIC) >= ?", [$filters['min_budget']]);
        }
        if (!empty($filters['max_budget'])) {
            $query->whereRaw("CAST(budget->>'amount' AS NUMERIC) <= ?", [$filters['max_budget']]);
        }
        if (!empty($filters['budget_currency'])) {
            $query->whereRaw("budget->>'currency' = ?", [$filters['budget_currency']]);
        }

        // Service filter
        if (!empty($filters['service_id'])) {
            $query->where('service_id', $filters['service_id']);
        }

        // Date range filter
        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to'] . ' 23:59:59');
        }

        // Score range filter
        if (!empty($filters['min_score'])) {
            $query->where('lead_score', '>=', $filters['min_score']);
        }
        if (!empty($filters['max_score'])) {
            $query->where('lead_score', '<=', $filters['max_score']);
        }

        // Location filter
        if (!empty($filters['country'])) {
            $query->where('country', $filters['country']);
        }
        if (!empty($filters['city'])) {
            $query->where('city', 'ilike', '%' . $filters['city'] . '%');
        }

        // Geographic radius filter
        if (!empty($filters['lat']) && !empty($filters['lng']) && !empty($filters['radius'])) {
            $query->nearLocation($filters['lat'], $filters['lng'], $filters['radius']);
        }

        // Assignment filters
        if (!empty($filters['unassigned'])) {
            $query->whereNull('assigned_to');
        }
        if (!empty($filters['assigned_date_from'])) {
            $query->where('assigned_date', '>=', $filters['assigned_date_from']);
        }
        if (!empty($filters['assigned_date_to'])) {
            $query->where('assigned_date', '<=', $filters['assigned_date_to'] . ' 23:59:59');
        }

        // Follow-up filters
        if (!empty($filters['has_follow_up'])) {
            $query->whereNotNull('next_follow_up_at');
        }
        if (!empty($filters['overdue_follow_ups'])) {
            $query->where('next_follow_up_at', '<', now());
        }
        if (!empty($filters['follow_up_date_from'])) {
            $query->where('next_follow_up_at', '>=', $filters['follow_up_date_from']);
        }
        if (!empty($filters['follow_up_date_to'])) {
            $query->where('next_follow_up_at', '<=', $filters['follow_up_date_to'] . ' 23:59:59');
        }

        // Activity-based filters
        if (!empty($filters['recent_activity_days'])) {
            $query->where('last_activity_at', '>=', now()->subDays($filters['recent_activity_days']));
        }
        if (!empty($filters['no_activity_days'])) {
            $query->where('last_activity_at', '<=', now()->subDays($filters['no_activity_days']));
        }

        // Hot leads filter
        if (!empty($filters['hot_leads'])) {
            $query->hotLeads();
        }

        // Active leads only
        if (!empty($filters['active_only'])) {
            $query->active();
        }
    }

    /**
     * Apply sorting to a database query
     */
    private function applyDatabaseSorting($query, array $filters): void
    {
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';

        $allowedSortFields = [
            'created_at', 'updated_at', 'name', 'email', 'lead_score',
            'inquiry_status', 'priority', 'last_activity_at', 'next_follow_up_at',
            'assigned_date', 'days_since_created', 'days_in_current_status'
        ];

        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'created_at';
        }

        if (!in_array(strtolower($sortOrder), ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $query->orderBy($sortBy, $sortOrder);

        if ($sortBy !== 'id') {
            $query->orderBy('id', 'desc');
        }
    }

    /**
     * Determine if the cache should be bypassed
     */
    private function shouldBypassCache(array $filters): bool
    {
        // Only bypass cache for truly real-time scenarios
        return !empty($filters['real_time']) ||
            !empty($filters['no_cache']) ||
            !empty($filters['force_refresh']) ||
            // Bypass for very recent activity filters (last few minutes)
            (!empty($filters['updated_after']) && $this->isVeryRecent($filters['updated_after'])) ||
            // Bypass for admin users doing bulk operations
            (!empty($filters['bulk_operation']) && auth()->user()->hasRole('admin'));
    }

    /**
     * Check if the timestamp is very recent (within last 2 minutes)
     */
    private function isVeryRecent($timestamp): bool
    {
        if (is_string($timestamp)) {
            $timestamp = strtotime($timestamp);
        }

        return $timestamp && ($timestamp > (time() - 120)); // 2 minutes
    }

    /**
     * Alternative: Different TTL for different filter types
     */
    private function getCacheTTL(array $filters): int
    {
        // Shorter cache for filters that change more frequently
        if (!empty($filters['assigned_to']) || !empty($filters['hot_leads'])) {
            return 300; // 5 minutes
        }

        // Standard cache for general lists
        if (empty($filters) || count($filters) <= 2) {
            return 900; // 15 minutes
        }

        // Medium cache for complex filters
        return 600; // 10 minutes
    }

    /**
     * Reindex all leads in Meilisearch
     */
    public function reindex(): JsonResponse
    {
        try {
            Lead::removeAllFromSearch();
            Lead::makeAllSearchable();

            return response()->json([
                'message' => 'Leads reindex successfully',
                'timestamp' => now()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to reindex leads',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single lead with related data
     */
    public function show(Lead $lead): JsonResponse
    {
        $cacheKey = $lead->getCacheKey('full');

        // Cache the resource output instead of the model
        $resourceData = Cache::tags(['leads', "lead:$lead->id"])
            ->remember($cacheKey, now()->addMinutes(15), function () use ($lead) {
                $leadData = Lead::select([
                    'id', 'name', 'email', 'phone', 'occupation', 'address', 'city', 'country',
                    'latitude', 'longitude', 'detail', 'budget', 'custom_fields',
                    'inquiry_status', 'priority', 'inquiry_type', 'inquiry_country',
                    'lead_score', 'service_id', 'lead_source_id', 'assigned_to', 'created_by',
                    'assigned_date', 'ticket_id', 'ticket_date', 'created_at', 'updated_at',
                    'last_activity_at', 'next_follow_up_at', 'tags'
                ])
                    ->with([
                        'service:id,name',
                        'source:id,name,slug',
                        'assignedTo:id,name,email',
                        'createdBy:id,name',
                    ])->find($lead->id);

                return (new LeadResource($leadData))->toArray(request());
            });

        return response()->json([
            'data' => $resourceData,
            'meta' => [
                'permissions' => [
                    'can_edit' => $this->canEdit($lead),
                    'can_assign' => $this->canAssign($lead),
                    'can_delete' => $this->canDelete($lead),
                ]
            ]
        ]);
    }

    /**
     * Get leads statistics
     */
    public function stats(Request $request): JsonResponse
    {
        $cacheKey = 'leads:stats:' . md5(serialize($request->query()));

        $stats = Cache::tags(['leads', 'leads_stats'])
            ->remember($cacheKey, now()->addMinutes(30), function () use ($request) {
                return $this->calculateStats($request);
            });

        return response()->json(['data' => $stats]);
    }

    /**
     * Calculate comprehensive statistics
     */
    private function calculateStats(Request $request): array
    {
        $dateFrom = $request->get('date_from', now()->subDays(30));
        $dateTo = $request->get('date_to', now());

        return [
            'total_leads' => Lead::count(),
            'period_leads' => Lead::createdBetween($dateFrom, $dateTo)->count(),
            'status_breakdown' => Lead::select('inquiry_status', DB::raw('count(*) as count'))
                ->groupBy('inquiry_status')
                ->pluck('count', 'inquiry_status')
                ->toArray(),
            'priority_breakdown' => Lead::select('priority', DB::raw('count(*) as count'))
                ->groupBy('priority')
                ->pluck('count', 'priority')
                ->toArray(),
            'source_breakdown' => Lead::with('source:id,name')
                ->select('source_id', DB::raw('count(*) as count'))
                ->whereNotNull('source_id')
                ->groupBy('source_id')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->source?->name ?? 'Unknown' => $item->count];
                })
                ->toArray(),
            'avg_lead_score' => round(Lead::avg('lead_score') ?? 0, 2),
            'hot_leads_count' => Lead::hotLeads()->count(),
            'unassigned_count' => Lead::whereNull('assigned_to')->count(),
            'conversion_rate' => $this->calculateConversionRate($dateFrom, $dateTo),
            'daily_trend' => $this->getDailyTrend($dateFrom, $dateTo),
        ];
    }

    /**
     * Calculate conversion rate
     */
    private function calculateConversionRate($dateFrom, $dateTo): float
    {
        $totalLeads = Lead::createdBetween($dateFrom, $dateTo)->count();
        $convertedLeads = Lead::createdBetween($dateFrom, $dateTo)
            ->where('inquiry_status', 'won')
            ->count();

        return $totalLeads > 0 ? round(($convertedLeads / $totalLeads) * 100, 2) : 0;
    }

    /**
     * Get a daily lead creation trend
     */
    private function getDailyTrend($dateFrom, $dateTo): array
    {
        return Lead::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('COUNT(*) as count')
        )
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->pluck('count', 'date')
            ->toArray();
    }

    /**
     * Export leads to various formats
     */
    public function export(LeadFilterRequest $request): JsonResponse
    {
        $format = $request->get('format', 'csv');
        $filters = $request->validated();

        // Remove pagination for export
        unset($filters['page'], $filters['per_page']);

        // Create export job (you'll need to create this job class)
        // $job = ExportLeadsJob::dispatch($filters, $format, auth()->user());

        return response()->json([
            'message' => 'Export functionality not yet implemented',
            // 'job_id' => $job->getJobId(),
            'estimated_time' => '2-5 minutes'
        ]);
    }

    /**
     * Permission checks
     */
    private function canEdit(Lead $lead): bool
    {
        return Gate::allows('update', $lead);
    }

    private function canAssign(Lead $lead): bool
    {
        return Gate::allows('assign', $lead);
    }

    private function canDelete(Lead $lead): bool
    {
        return Gate::allows('delete', $lead);
    }

    /**
     * Update the specified lead
     * @throws Throwable
     */
    public function update(Request $request, Lead $lead): JsonResponse
    {
        if (!$this->canEdit($lead)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|max:255',
                'phone' => 'sometimes|string|max:50',
                'occupation' => 'sometimes|string|max:100',
                'city' => 'sometimes|string|max:100',
                'country' => 'sometimes|string|max:100',
                'detail' => 'sometimes|string',
                'inquiry_status' => 'sometimes|string|exists:statuses,name',

                // Validate nested objects
                'service' => 'sometimes|nullable|array',
                'service.id' => 'required_with:service|exists:services,id',

                'lead_source' => 'sometimes|nullable|array',
                'lead_source.id' => 'required_with:lead_source|exists:lead_sources,id',

                'assigned_to' => 'sometimes|nullable|array',
                'assigned_to.id' => 'required_with:assigned_to|exists:users,id',
                'next_follow_up_at' => 'sometimes|nullable|date',

                'custom_fields' => 'sometimes|nullable|array',

                // Validate tags directly
                'tags' => 'sometimes|array',
                'tags.*.label' => 'required|string',
                'tags.*.value' => 'required|string',
                'tags.*.color' => 'nullable|string',
            ]);

            DB::beginTransaction();

            // Update the lead with validated data
            $updateData = collect($validated)->except(['service', 'lead_source', 'assigned_to'])->toArray();
            $lead->update($updateData);

            // Update relations if provided
            if (isset($validated['service'])) {
                $lead->service()->associate($validated['service']['id']);
            }
            if (isset($validated['lead_source'])) {
                $lead->source()->associate($validated['lead_source']['id']);
            }
            if (isset($validated['assigned_to'])) {
                $lead->assignedTo()->associate($validated['assigned_to']['id']);
            }
            $lead->save();

            // Clear related caches
            $this->cacheService->invalidateLeadCache($lead);

            DB::commit();

            $lead = $lead
                ->fresh()
                ->load([
                    'service:id,name',
                    'source:id,name,slug',
                    'assignedTo:id,name,email',
                    'createdBy:id,name',
                ]);

            return response()->json([
                'message' => 'Lead updated successfully',
                'data' => new LeadResource($lead)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lead update failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to update lead'], 500);
        }
    }
}
