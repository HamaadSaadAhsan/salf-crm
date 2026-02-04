<?php

namespace App\Http\Controllers\Leads;

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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Laravel\Scout\Builder;
use Throwable;

class LeadController extends Controller
{
    public function __construct(
        private LeadCacheService $cacheService
    ) {}

    public function index(LeadFilterRequest $request)
    {
        $filters = $request->validated();

        // Set default pagination values and ensure they're integers
        $filters['page'] = max(1, (int) ($filters['page'] ?? 1));
        $filters['per_page'] = max(1, min(100, (int) ($filters['per_page'] ?? 25)));

        // CROs and Advisors should only see leads assigned to them
        // Roles that require lead filtering: support-agent, senior-support-agent, sales-rep, senior-sales-rep
        $user = auth()->user();
        $restrictedRoles = ['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'];
        $adminRoles = ['super-admin', 'admin', 'manager', 'team-lead'];

        if ($user->hasAnyRole($restrictedRoles) && ! $user->hasAnyRole($adminRoles)) {
            $filters['assigned_to'] = $user->id;
        }

        $cacheKey = Lead::getListCacheKey($filters);
        $tags = ['leads', 'leads_list'];
        $bypassCache = '';

        if (! empty($filters['search'])) {
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
                // Use flexible caching with stale-while-revalidate pattern
                // Fresh for TTL/2, stale for full TTL
                $result = cache()->tags($tags)->flexible(
                    $cacheKey,
                    [$cacheTTL / 2, $cacheTTL],
                    fn () => $this->buildLeadsQuery($filters)
                );

                // Check if this was served from cache
                $fromCache = cache()->tags($tags)->has($cacheKey);
            }
        }

        return Inertia::render('leads/index', [
            'leads' => $result['data'],
            'meta' => $result['meta'],
            'filters' => $filters,
            'search_info' => $result['search_info'] ?? null,
            'cache_info' => [
                'cached' => $fromCache,
                'cache_key' => $cacheKey,
                'ttl_used' => $cacheTTL ?? 0,
                'bypass_reason' => $bypassCache ? 'real_time_required' : null,
                'expires_at' => $cacheTTL ?? $this->cacheService->getTTL(),
            ],
        ]);
    }

    /**
     * Build a search query using Meilisearch
     */
    private function buildSearchQuery(array $filters): array
    {
        $startTime = microtime(true);
        $searchTerm = trim($filters['search'] ?? '');
        $perPage = max(1, min(100, (int) ($filters['per_page'] ?? 25)));
        $page = max(1, (int) ($filters['page'] ?? 1));

        // Start with Meilisearch
        $searchQuery = Lead::search($searchTerm);

        // Apply Meilisearch filters
        $this->applySearchFilters($searchQuery, $filters);

        // Apply sorting
        $this->applySearchSorting($searchQuery, $filters);

        // Execute search with pagination
        $results = $searchQuery->paginate($perPage, 'page', $page);

        // Get the actual models with relationships
        $leadIds = [];
        if ($results && method_exists($results, 'getCollection')) {
            $leadIds = $results->getCollection()->pluck('id')->toArray();
        } elseif ($results && is_iterable($results)) {
            foreach ($results as $result) {
                if (isset($result['id'])) {
                    $leadIds[] = $result['id'];
                } elseif (is_object($result) && property_exists($result, 'id')) {
                    $leadIds[] = $result->id;
                }
            }
        }

        if (empty($leadIds)) {
            return [
                'data' => [],
                'meta' => [
                    'current_page' => $results ? ($results->currentPage() ?? 1) : 1,
                    'per_page' => $perPage,
                    'total' => 0,
                    'last_page' => 1,
                    'from' => null,
                    'to' => null,
                    'has_more' => false,
                    'filters_applied' => array_filter($filters),
                    'query_time' => round((microtime(true) - $startTime) * 1000, 2),
                ],
                'search_info' => [
                    'engine' => 'meilisearch',
                    'query' => $searchTerm,
                    'total_hits' => 0,
                    'processing_time' => round((microtime(true) - $startTime) * 1000, 2),
                ],
            ];
        }

        $leads = Lead::with([
            'service' => function ($query) {
                $query->select('id', 'name')->withCount('children');
            },
            'source:id,name,slug',
            'assignedTo:id,name,email',
            'createdBy:id,name',
            'activities' => function ($query) {
                $query->select('id', 'lead_id', 'user_id', 'type', 'status', 'subject', 'created_at', 'description', 'category', 'attachments')
                    ->with('user:id,name,email')
                    ->latest()
                    ->limit(5);
            },
        ])
            ->whereIn('id', $leadIds)
            ->get()
            ->keyBy('id');

        // Maintain search result order
        $orderedLeads = collect($leadIds)->map(function ($id) use ($leads) {
            return $leads->get($id);
        })->filter()->values();

        return [
            'data' => LeadResource::collection($orderedLeads)->resolve(),
            'meta' => [
                'current_page' => $results ? ($results->currentPage() ?? 1) : 1,
                'per_page' => $perPage,
                'total' => $results ? ($results->total() ?? 0) : 0,
                'last_page' => $results ? ($results->lastPage() ?? 1) : 1,
                'from' => $results ? $results->firstItem() : null,
                'to' => $results ? $results->lastItem() : null,
                'has_more' => $results ? ($results->hasMorePages() ?? false) : false,
                'filters_applied' => array_filter($filters),
                'query_time' => round((microtime(true) - $startTime) * 1000, 2),
            ],
            'search_info' => [
                'engine' => 'meilisearch',
                'query' => $searchTerm,
                'total_hits' => $results ? ($results->total() ?? 0) : 0,
                'processing_time' => round((microtime(true) - $startTime) * 1000, 2),
            ],
        ];
    }

    /**
     * Apply filters to Meilisearch query
     */
    private function applySearchFilters(Builder $query, array $filters): void
    {
        $filterConditions = [];

        // Status filter
        if (! empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $statusFilter = 'inquiry_status IN ['.implode(', ', array_map(fn ($s) => '"'.$s.'"', $filters['status'])).']';
                $filterConditions[] = $statusFilter;
            } else {
                $filterConditions[] = 'inquiry_status = "'.$filters['status'].'"';
            }
        }

        // Priority filter
        if (! empty($filters['priority'])) {
            $filterConditions[] = 'priority = "'.$filters['priority'].'"';
        }

        // Assigned user filter
        if (! empty($filters['assigned_to'])) {
            $filterConditions[] = 'assigned_to = '.$filters['assigned_to'];
        }

        // Source filter
        if (! empty($filters['source_id'])) {
            $filterConditions[] = 'lead_source_id = '.$filters['source_id'];
        }

        // Inquiry type filter
        if (! empty($filters['inquiry_type'])) {
            $filterConditions[] = 'inquiry_type = "'.$filters['inquiry_type'].'"';
        }

        // Inquiry country filter
        if (! empty($filters['inquiry_country'])) {
            $filterConditions[] = 'inquiry_country = "'.$filters['inquiry_country'].'"';
        }

        // Budget filters
        if (! empty($filters['min_budget'])) {
            $filterConditions[] = 'budget_amount >= '.$filters['min_budget'];
        }
        if (! empty($filters['max_budget'])) {
            $filterConditions[] = 'budget_amount <= '.$filters['max_budget'];
        }
        if (! empty($filters['budget_currency'])) {
            $filterConditions[] = 'budget_currency = "'.$filters['budget_currency'].'"';
        }

        // Service filter
        if (! empty($filters['service_id'])) {
            $filterConditions[] = 'service_id = '.$filters['service_id'];
        }

        // Date range filter (using timestamps)
        if (! empty($filters['date_from'])) {
            $timestamp = strtotime($filters['date_from']);
            $filterConditions[] = 'created_at_timestamp >= '.$timestamp;
        }
        if (! empty($filters['date_to'])) {
            $timestamp = strtotime($filters['date_to'].' 23:59:59');
            $filterConditions[] = 'created_at_timestamp <= '.$timestamp;
        }

        // Score range filter
        if (! empty($filters['min_score'])) {
            $filterConditions[] = 'lead_score >= '.$filters['min_score'];
        }
        if (! empty($filters['max_score'])) {
            $filterConditions[] = 'lead_score <= '.$filters['max_score'];
        }

        // Location filter with geographic support
        if (! empty($filters['country'])) {
            $filterConditions[] = 'country = "'.$filters['country'].'"';
        }
        if (! empty($filters['city'])) {
            $filterConditions[] = 'city = "'.$filters['city'].'"';
        }

        // Geographic radius filter (if coordinates provided)
        if (! empty($filters['lat']) && ! empty($filters['lng']) && ! empty($filters['radius'])) {
            // Note: Meilisearch doesn't have built-in geo search, so we'd need to
            // either pre-calculate distance ranges or fall back to database for this filter
            // For now, we'll add a placeholder that could be implemented with custom logic
        }

        // Assignment filters
        if (! empty($filters['unassigned'])) {
            $filterConditions[] = 'assigned_to IS NULL';
        }
        if (! empty($filters['assigned_date_from'])) {
            $timestamp = strtotime($filters['assigned_date_from']);
            $filterConditions[] = 'assigned_date_timestamp >= '.$timestamp;
        }
        if (! empty($filters['assigned_date_to'])) {
            $timestamp = strtotime($filters['assigned_date_to'].' 23:59:59');
            $filterConditions[] = 'assigned_date_timestamp <= '.$timestamp;
        }

        // Follow-up filters
        if (! empty($filters['has_follow_up'])) {
            $filterConditions[] = 'next_follow_up_at_timestamp IS NOT NULL';
        }
        if (! empty($filters['overdue_follow_ups'])) {
            $filterConditions[] = 'is_overdue = true';
        }
        if (! empty($filters['follow_up_date_from'])) {
            $timestamp = strtotime($filters['follow_up_date_from']);
            $filterConditions[] = 'next_follow_up_at_timestamp >= '.$timestamp;
        }
        if (! empty($filters['follow_up_date_to'])) {
            $timestamp = strtotime($filters['follow_up_date_to'].' 23:59:59');
            $filterConditions[] = 'next_follow_up_at_timestamp <= '.$timestamp;
        }

        // Activity-based filters
        if (! empty($filters['recent_activity_days'])) {
            $timestamp = now()->subDays($filters['recent_activity_days'])->timestamp;
            $filterConditions[] = 'last_activity_at_timestamp >= '.$timestamp;
        }
        if (! empty($filters['no_activity_days'])) {
            $timestamp = now()->subDays($filters['no_activity_days'])->timestamp;
            $filterConditions[] = 'last_activity_at_timestamp <= '.$timestamp;
        }

        // Hot leads filter (lead_score >= 80 OR (priority = high AND status in new,contacted))
        if (! empty($filters['hot_leads'])) {
            $filterConditions[] = 'is_hot_lead = true';
        }

        // Active leads only
        if (! empty($filters['active_only'])) {
            $filterConditions[] = 'inquiry_status NOT IN ["won", "lost"]';
        }

        // Days in the current status filter
        if (! empty($filters['max_days_in_status'])) {
            $filterConditions[] = 'days_in_current_status <= '.$filters['max_days_in_status'];
        }
        if (! empty($filters['min_days_in_status'])) {
            $filterConditions[] = 'days_in_current_status >= '.$filters['min_days_in_status'];
        }

        // Apply all filters
        if (! empty($filterConditions)) {
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
            'days_in_current_status' => 'days_in_current_status',
        ];

        $meilisearchField = $sortFieldMap[$sortBy] ?? 'created_at_timestamp';

        if (! in_array(strtolower($sortOrder), ['asc', 'desc'])) {
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
                'service' => function ($query) {
                    $query->select('id', 'name')->withCount('children');
                },
                'source:id,name,slug',
                'assignedTo:id,name,email',
                'createdBy:id,name',
                'activities' => function ($query) {
                    $query->select('id', 'lead_id', 'user_id', 'type', 'status', 'subject', 'created_at', 'description', 'attachments')
                        ->latest()
                        ->limit(5);
                },
            ])
            ->select([
                'id', 'name', 'email', 'phone', 'occupation', 'address', 'city', 'country',
                'latitude', 'longitude', 'detail', 'budget', 'custom_fields',
                'inquiry_status', 'priority', 'inquiry_type', 'inquiry_country',
                'lead_score', 'service_id', 'lead_source_id', 'assigned_to', 'created_by',
                'assigned_date', 'ticket_id', 'ticket_date', 'created_at', 'updated_at',
                'last_activity_at', 'next_follow_up_at', 'tags',
            ]);

        // Apply filters
        $this->applyDatabaseFilters($query, $filters);

        // Apply sorting
        $this->applyDatabaseSorting($query, $filters);

        // Get paginated results
        $perPage = min((int) ($filters['per_page'] ?? 25), 100);
        $page = (int) ($filters['page'] ?? 1);
        $leads = $query->paginate($perPage, ['*'], 'page', $page);

        return [
            'data' => LeadResource::collection($leads->items())->resolve(),
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
            ],
        ];
    }

    /**
     * Apply filters to a database query
     */
    private function applyDatabaseFilters($query, array $filters): void
    {
        // Status filter
        if (! empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $query->whereIn('inquiry_status', $filters['status']);
            } else {
                $query->where('inquiry_status', $filters['status']);
            }
        }

        // Priority filter
        if (! empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        // Assigned user filter
        if (! empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        // Source filter
        if (! empty($filters['source_id'])) {
            $query->where('lead_source_id', $filters['source_id']);
        }

        // Inquiry type filter
        if (! empty($filters['inquiry_type'])) {
            $query->where('inquiry_type', $filters['inquiry_type']);
        }

        // Inquiry country filter
        if (! empty($filters['inquiry_country'])) {
            $query->where('inquiry_country', $filters['inquiry_country']);
        }

        // Budget filters
        if (! empty($filters['min_budget'])) {
            $query->whereRaw("CAST(budget->>'amount' AS NUMERIC) >= ?", [$filters['min_budget']]);
        }
        if (! empty($filters['max_budget'])) {
            $query->whereRaw("CAST(budget->>'amount' AS NUMERIC) <= ?", [$filters['max_budget']]);
        }
        if (! empty($filters['budget_currency'])) {
            $query->whereRaw("budget->>'currency' = ?", [$filters['budget_currency']]);
        }

        // Service filter
        if (! empty($filters['service_id'])) {
            $query->where('service_id', $filters['service_id']);
        }

        // Date range filter
        if (! empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to'].' 23:59:59');
        }

        // Score range filter
        if (! empty($filters['min_score'])) {
            $query->where('lead_score', '>=', $filters['min_score']);
        }
        if (! empty($filters['max_score'])) {
            $query->where('lead_score', '<=', $filters['max_score']);
        }

        // Location filter
        if (! empty($filters['country'])) {
            $query->where('country', $filters['country']);
        }
        if (! empty($filters['city'])) {
            $query->where('city', 'ilike', '%'.$filters['city'].'%');
        }

        // Geographic radius filter
        if (! empty($filters['lat']) && ! empty($filters['lng']) && ! empty($filters['radius'])) {
            $query->nearLocation($filters['lat'], $filters['lng'], $filters['radius']);
        }

        // Assignment filters
        if (! empty($filters['unassigned'])) {
            $query->whereNull('assigned_to');
        }
        if (! empty($filters['assigned_date_from'])) {
            $query->where('assigned_date', '>=', $filters['assigned_date_from']);
        }
        if (! empty($filters['assigned_date_to'])) {
            $query->where('assigned_date', '<=', $filters['assigned_date_to'].' 23:59:59');
        }

        // Follow-up filters
        if (! empty($filters['has_follow_up'])) {
            $query->whereNotNull('next_follow_up_at');
        }
        if (! empty($filters['overdue_follow_ups'])) {
            $query->where('next_follow_up_at', '<', now());
        }
        if (! empty($filters['follow_up_date_from'])) {
            $query->where('next_follow_up_at', '>=', $filters['follow_up_date_from']);
        }
        if (! empty($filters['follow_up_date_to'])) {
            $query->where('next_follow_up_at', '<=', $filters['follow_up_date_to'].' 23:59:59');
        }

        // Activity-based filters
        if (! empty($filters['recent_activity_days'])) {
            $query->where('last_activity_at', '>=', now()->subDays($filters['recent_activity_days']));
        }
        if (! empty($filters['no_activity_days'])) {
            $query->where('last_activity_at', '<=', now()->subDays($filters['no_activity_days']));
        }

        // Hot leads filter
        if (! empty($filters['hot_leads'])) {
            $query->hotLeads();
        }

        // Active leads only
        if (! empty($filters['active_only'])) {
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
            'assigned_date', 'days_since_created', 'days_in_current_status',
        ];

        if (! in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'created_at';
        }

        if (! in_array(strtolower($sortOrder), ['asc', 'desc'])) {
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
        return ! empty($filters['real_time']) ||
            ! empty($filters['no_cache']) ||
            ! empty($filters['force_refresh']) ||
            // Bypass for very recent activity filters (last few minutes)
            (! empty($filters['updated_after']) && $this->isVeryRecent($filters['updated_after'])) ||
            // Bypass for admin users doing bulk operations
            (! empty($filters['bulk_operation']) && auth()->user()->hasRole('admin'));
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
        if (! empty($filters['assigned_to']) || ! empty($filters['hot_leads'])) {
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
                'timestamp' => now(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to reindex leads',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a single lead with related data
     */
    public function show(Lead $lead)
    {
        // CROs and Advisors can only view leads assigned to them
        $user = auth()->user();
        $restrictedRoles = ['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'];
        $adminRoles = ['super-admin', 'admin', 'manager', 'team-lead'];

        if ($user->hasAnyRole($restrictedRoles) && ! $user->hasAnyRole($adminRoles)) {
            if ($lead->assigned_to !== $user->id) {
                abort(403, 'You are not authorized to view this lead.');
            }
        }

        $cacheKey = $lead->getCacheKey('full');

        // Use flexible caching with stale-while-revalidate pattern
        // Fresh for 5 minutes, stale for 15 minutes
        $resourceData = cache()->tags(['leads', "lead:$lead->id"])
            ->flexible($cacheKey, [300, 900], function () use ($lead) {
                $leadData = Lead::select([
                    'id', 'name', 'email', 'phone', 'occupation', 'address', 'city', 'country',
                    'latitude', 'longitude', 'detail', 'budget', 'custom_fields',
                    'inquiry_status', 'priority', 'inquiry_type', 'inquiry_country',
                    'lead_score', 'service_id', 'lead_source_id', 'assigned_to', 'created_by',
                    'assigned_date', 'ticket_id', 'ticket_date', 'created_at', 'updated_at',
                    'last_activity_at', 'next_follow_up_at', 'tags',
                ])
                    ->with([
                        'service' => function ($query) {
                            $query->select('id', 'name')->withCount('children');
                        },
                        'source:id,name,slug',
                        'assignedTo:id,name,email',
                        'assignedTo.roles:id,name,guard_name',
                        'createdBy:id,name',
                        // Activities are loaded via API for server-side pagination
                        'tasks' => function ($query) {
                            $query->with([
                                'assignedTo:id,name,email',
                                'createdBy:id,name,email',
                                'collaborators:id,name,email',
                            ])
                                ->orderByRaw('completed_at IS NULL DESC')
                                ->orderBy('due_at')
                                ->orderBy('completed_at', 'desc')
                                ->limit(10);
                        },
                    ])->find($lead->id);

                return (new LeadResource($leadData))->toArray(request());
            });

        // Get CRO users for collaborators selection (only for CROs)
        $user = auth()->user();
        $croUsers = [];
        if ($user->hasAnyRole(['support-agent', 'senior-support-agent'])) {
            $croUsers = \App\Models\User::select('id', 'name', 'email')
                ->with('roles:id,name,guard_name')
                ->whereHas('roles', function ($query) {
                    $query->whereIn('name', ['support-agent', 'senior-support-agent']);
                })
                ->where('id', '!=', $user->id)
                ->orderBy('name')
                ->get()
                ->toArray();
        }

        return Inertia::render('leads/show', [
            'lead' => $resourceData,
            'users' => $croUsers,
            'permissions' => [
                'can_edit' => $this->canEdit($lead),
                'can_assign' => $this->canAssign($lead),
                'can_delete' => $this->canDelete($lead),
            ],
        ]);
    }

    /**
     * Get leads statistics
     */
    public function stats(Request $request): JsonResponse
    {
        $cacheKey = 'leads:stats:'.md5(serialize($request->query()));

        // Use flexible caching - fresh for 10 minutes, stale for 30 minutes
        $stats = cache()->tags(['leads', 'leads_stats'])
            ->flexible($cacheKey, [600, 1800], fn () => $this->calculateStats($request));

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
            'estimated_time' => '2-5 minutes',
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
     *
     * @throws Throwable
     */
    public function update(Request $request, Lead $lead)
    {
        if (! $request->user()->hasPermissionTo('edit leads')) {
            abort(403, 'Unauthorized');
        }

        $user = $request->user();
        $restrictedRoles = ['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'];
        $adminRoles = ['super-admin', 'admin', 'manager', 'team-lead'];
        $isCRO = $user->hasAnyRole($restrictedRoles) && ! $user->hasAnyRole($adminRoles);

        // CROs cannot edit lead details when lead is assigned to an advisor
        if ($isCRO && $lead->inquiry_status === 'assigned_to_advisor') {
            // Only allow status changes (requalify, won, lost)
            $allowedFields = ['inquiry_status', '_method', '_token'];
            $requestFields = array_keys($request->all());
            $disallowedFields = array_diff($requestFields, $allowedFields);

            // Reject if any non-status fields are being updated
            if (! empty($disallowedFields)) {
                abort(403, 'You cannot edit lead details while it is assigned to an advisor. Only status changes (requalify, won, lost) are allowed.');
            }

            // Validate status transition - only allow requalify, won, lost
            if ($request->has('inquiry_status')) {
                $allowedStatusTransitions = ['requalify', 'won', 'lost'];
                if (! in_array($request->input('inquiry_status'), $allowedStatusTransitions)) {
                    abort(403, 'You can only change status to requalify, won, or lost for a lead assigned to an advisor.');
                }
            }
        }

        try {
            // Build allowed inquiry statuses - include assigned_to_advisor only if lead already has it
            $allowedStatuses = ['new', 'assigned_to_cro', 'contacted', 'qualified', 'proposal', 'converted', 'won', 'lost', 'unqualified', 'requalify', 'nurturing'];
            if ($lead->inquiry_status === 'assigned_to_advisor') {
                $allowedStatuses[] = 'assigned_to_advisor';
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|max:255',
                'phone' => 'sometimes|string|max:50',
                'occupation' => 'sometimes|string|max:100',
                'city' => 'sometimes|nullable|string|max:100',
                'country' => 'sometimes|nullable|string|max:100',
                'detail' => 'sometimes|nullable|string',
                'priority' => 'sometimes|nullable|string|in:low,medium,high,urgent',
                'status' => 'sometimes|string|in:new,contacted,qualified,lost,converted',
                'inquiry_status' => ['sometimes', 'string', Rule::in($allowedStatuses)], // Note: assigned_to_advisor is auto-assigned by system, only allowed if already set

                // Validate IDs for relations
                'service_id' => 'sometimes|nullable|exists:services,id',
                'lead_source_id' => 'sometimes|nullable|exists:lead_sources,id',

                // Validate nested objects (for backward compatibility)
                'service' => 'sometimes|nullable|array',
                'service.id' => 'required_with:service|exists:services,id',

                'lead_source' => 'sometimes|nullable|array',
                'lead_source.id' => 'required_with:lead_source|exists:lead_sources,id',

                // assigned_to can be: integer ID, object {id: X}, or null
                'assigned_to' => 'sometimes|nullable',
                'assigned_to.id' => 'sometimes|exists:users,id',
                'next_follow_up_at' => 'sometimes|nullable|date',

                'custom_fields' => 'sometimes|nullable|array',

                // Validate budget
                'budget' => 'sometimes|nullable|array',
                'budget.amount' => 'required_with:budget|numeric|min:0',
                'budget.currency' => 'sometimes|string|max:3',

                // Validate tags (accept objects or strings)
                'tags' => 'sometimes|array',
                'tags.*' => 'nullable',
                'tags.*.label' => 'sometimes|string',
                'tags.*.value' => 'sometimes|string',
                'tags.*.color' => 'nullable|string',
            ]);

            DB::beginTransaction();

            // Check if status is changing to 'qualified' to trigger event
            $isQualifying = isset($validated['inquiry_status']) &&
                $validated['inquiry_status'] === 'qualified' &&
                $lead->inquiry_status !== 'qualified';

            // Update the lead with validated data
            $updateData = collect($validated)->except(['service', 'lead_source', 'assigned_to'])->toArray();

            // Normalize tags if provided: accept strings or objects and convert to canonical {label,value,color}
            if (array_key_exists('tags', $updateData)) {
                $updateData['tags'] = $this->normalizeTags($updateData['tags'] ?? []);
            }

            // Normalize budget: ensure currency is set if amount is provided
            if (array_key_exists('budget', $updateData)) {
                if ($updateData['budget'] === null) {
                    // Explicitly set to null to clear budget
                    $updateData['budget'] = null;
                } elseif (is_array($updateData['budget'])) {
                    if (isset($updateData['budget']['amount']) && $updateData['budget']['amount'] > 0) {
                        // Preserve existing currency if updating amount only, otherwise default to USD
                        if (!isset($updateData['budget']['currency'])) {
                            $updateData['budget']['currency'] = $lead->budget['currency'] ?? 'USD';
                        }
                    } else {
                        // If amount is 0 or not set, set budget to null
                        $updateData['budget'] = null;
                    }
                }
            }

            $lead->update($updateData);

            // Update relations if provided
            if (isset($validated['service_id'])) {
                $lead->service_id = $validated['service_id'];
            }
            if (isset($validated['lead_source_id'])) {
                $lead->lead_source_id = $validated['lead_source_id'];
            }
            if (isset($validated['service']['id'])) {
                $lead->service_id = $validated['service']['id'];
            }
            if (isset($validated['lead_source']['id'])) {
                $lead->lead_source_id = $validated['lead_source']['id'];
            }
            // Handle assigned_to - can be: integer ID, object {id: X}, or null
            if (array_key_exists('assigned_to', $validated)) {
                $assignedTo = $validated['assigned_to'];
                if (is_array($assignedTo) && isset($assignedTo['id'])) {
                    $lead->assigned_to = $assignedTo['id'];
                    $lead->assigned_date = now();
                } elseif (is_numeric($assignedTo)) {
                    $lead->assigned_to = (int) $assignedTo;
                    $lead->assigned_date = now();
                } elseif ($assignedTo === null) {
                    $lead->assigned_to = null;
                    $lead->assigned_date = null;
                }
            }
            $lead->save();

            // Fire LeadQualified event if status changed to qualified
            if ($isQualifying) {
                event(new \App\Events\LeadQualified($lead->fresh(), $request->user()));
            }

            // Clear related caches
            $this->cacheService->invalidateLeadCache($lead);

            DB::commit();

            // Reload with fresh data using flexible caching
            $cacheKey = $lead->getCacheKey('full');
            $resourceData = cache()->tags(['leads', "lead:$lead->id"])
                ->flexible($cacheKey, [300, 900], function () use ($lead) {
                    $leadData = Lead::select([
                        'id', 'name', 'email', 'phone', 'occupation', 'address', 'city', 'country',
                        'latitude', 'longitude', 'detail', 'budget', 'custom_fields',
                        'inquiry_status', 'priority', 'inquiry_type', 'inquiry_country',
                        'lead_score', 'service_id', 'lead_source_id', 'assigned_to', 'created_by',
                        'assigned_date', 'ticket_id', 'ticket_date', 'created_at', 'updated_at',
                        'last_activity_at', 'next_follow_up_at', 'tags',
                    ])
                        ->with([
                            'service' => function ($query) {
                                $query->select('id', 'name')->withCount('children');
                            },
                            'source:id,name,slug',
                            'assignedTo:id,name,email',
                            'createdBy:id,name',
                            'activities' => function ($query) {
                                $query->select('id', 'lead_id', 'user_id', 'status', 'subject', 'created_at', 'description', 'category', 'type', 'attachments')
                                    ->with('user:id,name,email')
                                    ->orderBy('created_at', 'desc')
                                    ->limit(5);
                            },
                            'tasks' => function ($query) {
                                $query->pending()
                                    ->whereNotNull('due_at')
                                    ->with(['assignedTo:id,name,email', 'createdBy:id,name,email'])
                                    ->orderBy('due_at')
                                    ->limit(1);
                            },
                        ])->find($lead->id);

                    return (new LeadResource($leadData))->toArray(request());
                });

            $responseData = [
                'lead' => $resourceData,
                'success' => 'Lead updated successfully',
            ];

            // Add assignment info if lead was qualified
            if ($isQualifying && $lead->assigned_to) {
                $assignedAdvisor = \App\Models\User::with('roles')->find($lead->assigned_to);
                $responseData['assigned_advisor'] = [
                    'id' => $assignedAdvisor->id,
                    'name' => $assignedAdvisor->name,
                    'email' => $assignedAdvisor->email,
                    'roles' => $assignedAdvisor->roles->pluck('name')->toArray(),
                ];
            }

            // Return JSON for API requests, redirect for browser requests
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json($responseData, 200);
            }

            return back()->with($responseData);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lead update failed: '.$e->getMessage());

            // Return JSON error for API requests
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update lead',
                    'error' => app()->environment('local') ? $e->getMessage() : null,
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to update lead']);
        }
    }

    /**
     * Normalize a mixed tags payload into a canonical array of objects.
     * Each tag will be in the shape: ['label' => string, 'value' => string, 'color' => string]
     */
    private function normalizeTags(array $tags): array
    {
        // Remove null/empty entries and reindex
        $list = array_values(array_filter($tags, function ($item) {
            return ! is_null($item) && $item !== '';
        }));

        $normalized = [];

        foreach ($list as $item) {
            // If item is a string, convert to object
            if (is_string($item)) {
                $label = trim($item);
                if ($label === '') {
                    continue;
                }
                $value = Str::slug($label);
                if ($value === '') {
                    continue;
                }
                $normalized[] = [
                    'label' => ucwords(str_replace('-', ' ', $value)),
                    'value' => $value,
                    'color' => 'gray',
                ];

                continue;
            }

            // If it's already an array/object-like, coerce fields
            if (is_array($item)) {
                $valueRaw = $item['value'] ?? ($item['label'] ?? null);
                if ($valueRaw === null) {
                    continue;
                }
                $value = Str::slug((string) $valueRaw);
                if ($value === '') {
                    continue;
                }

                $label = isset($item['label'])
                    ? preg_replace('/\s+/', ' ', trim($item['label']))
                    : ucwords(str_replace('-', ' ', $value));
                $color = $item['color'] ?? 'gray';

                $normalized[] = [
                    'label' => (string) $label,
                    'value' => $value,
                    'color' => (string) $color,
                ];
            }
        }

        // Dedupe by value, keeping first occurrence
        $unique = [];
        foreach ($normalized as $tag) {
            if (! isset($unique[$tag['value']])) {
                $unique[$tag['value']] = $tag;
            }
        }

        return array_values($unique);
    }
}
