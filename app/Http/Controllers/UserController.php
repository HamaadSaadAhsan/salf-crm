<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserFilterRequest;
use App\Http\Resources\UserResource;
use App\Models\Service;
use App\Models\User;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function __construct(
        private CacheService $cacheService
    )
    {
    }

    public function index(UserFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $cacheKey = User::getListCacheKey($filters);

        // Try to get from the cache first
        $result = $this->cacheService->remember($cacheKey, function () use ($filters) {
            return $this->buildUsersQuery($filters);
        }, now()->addMinutes(15)->diffInSeconds(), ['users', 'users_list']);

        // Real-time data for critical updates
        if ($this->shouldBypassCache($filters)) {
            $result = $this->buildUsersQuery($filters);
        }

        return response()->json([
            'data' => $result['data'],
            'meta' => $result['meta'],
            'cache_info' => [
                'cached' => $this->cacheService->hasWithTags($cacheKey, ['users', 'users_list']),
                'cache_key' => $cacheKey,
                'expires_at' => $this->cacheService->getTTL(),
            ]
        ]);
    }

    private function buildUsersQuery(array $filters): array
    {
        $startTime = microtime(true);

        $query = User::query()
            ->with([
                'activeServices:id,name,country_code,country_name',
                'activeServices.parent:id,name', // Include parent service if hierarchical
                'services' => function ($q) {
                    $q->withPivot(['assigned_at', 'status', 'notes', 'metadata']);
                },
                'leads:id,name,email,service_id,assigned_to,inquiry_status,created_at',
                'leads.service:id,name',
                'roles:id,name',
            ])
            ->withCount([
                'activeServices',
                'leads',
                'leads as active_leads_count' => function ($q) {
                    $q->whereNotIn('inquiry_status', ['won', 'lost', 'closed']);
                }
            ])
            ->select([
                'id',
                'name',
                'email',
                'email_verified_at',
                'created_at',
                'updated_at'
            ]);

        // Apply filters
        $this->applyFilters($query, $filters);

        // Apply sorting
        $this->applySorting($query, $filters);

        // Get paginated results
        $perPage = min($filters['per_page'] ?? 25, 100); // Max 100 items per page
        $users = $query->paginate($perPage);

        return [
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'last_page' => $users->lastPage(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem(),
                'has_more' => $users->hasMorePages(),
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
        // Email verification status filter
        if (!empty($filters['email_verified'])) {
            if ($filters['email_verified'] === 'verified') {
                $query->whereNotNull('email_verified_at');
            } else {
                $query->whereNull('email_verified_at');
            }
        }

        // Role filter
        if (!empty($filters['role'])) {
            if (is_array($filters['role'])) {
                $query->whereHas('roles', function ($q) use ($filters) {
                    $q->whereIn('name', $filters['role']);
                });
            } else {
                $query->whereHas('roles', function ($q) use ($filters) {
                    $q->where('name', $filters['role']);
                });
            }
        }

        // Permission filter
        if (!empty($filters['permission'])) {
            $query->whereHas('roles.permissions', function ($q) use ($filters) {
                $q->where('name', $filters['permission']);
            });
        }

        // Service assignment filter
        if (!empty($filters['service_id'])) {
            if (is_array($filters['service_id'])) {
                $query->whereHas('activeServices', function ($q) use ($filters) {
                    $q->whereIn('service_id', $filters['service_id']);
                });
            } else {
                $serviceId = $filters['service_id'];

                // Include child services if filtering by parent
                if (!empty($filters['include_child_services'])) {
                    $service = Service::find($serviceId);
                    if ($service) {
                        $childServiceIds = $service->getAllDescendants()->pluck('id')->toArray();
                        $allServiceIds = array_merge([$serviceId], $childServiceIds);
                        $query->whereHas('activeServices', function ($q) use ($allServiceIds) {
                            $q->whereIn('service_id', $allServiceIds);
                        });
                    } else {
                        $query->whereHas('activeServices', function ($q) use ($serviceId) {
                            $q->where('service_id', $serviceId);
                        });
                    }
                } else {
                    $query->whereHas('activeServices', function ($q) use ($serviceId) {
                        $q->where('service_id', $serviceId);
                    });
                }
            }
        }

        // Service country filter
        if (!empty($filters['service_country'])) {
            $query->whereHas('activeServices', function ($q) use ($filters) {
                $q->where('country_code', $filters['service_country']);
            });
        }

        // Users without any services
        if (!empty($filters['no_services'])) {
            $query->doesntHave('activeServices');
        }

        // Users with minimum number of services
        if (!empty($filters['min_services'])) {
            $query->has('activeServices', '>=', (int) $filters['min_services']);
        }

        // Service assignment status filter
        if (!empty($filters['service_status'])) {
            $query->whereHas('services', function ($q) use ($filters) {
                $q->wherePivot('status', $filters['service_status']);
            });
        }

        // Service assignment metadata filter
        if (!empty($filters['service_role'])) {
            $query->whereHas('services', function ($q) use ($filters) {
                $q->whereRaw("service_user.metadata ->> 'role' = ?", [$filters['service_role']]);
            });
        }

        // Date range filter (user creation)
        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to'] . ' 23:59:59');
        }

        // Email verification date range
        if (!empty($filters['verified_from'])) {
            $query->where('email_verified_at', '>=', $filters['verified_from']);
        }
        if (!empty($filters['verified_to'])) {
            $query->where('email_verified_at', '<=', $filters['verified_to'] . ' 23:59:59');
        }

        // Users with leads filter
        if (!empty($filters['has_leads'])) {
            if ($filters['has_leads'] === 'yes') {
                $query->has('leads');
            } else {
                $query->doesntHave('leads');
            }
        }

        // Users with active leads
        if (!empty($filters['has_active_leads'])) {
            $query->whereHas('leads', function ($q) {
                $q->whereNotIn('inquiry_status', ['won', 'lost', 'closed']);
            });
        }

        // Lead count filter
        if (!empty($filters['min_leads'])) {
            $query->has('leads', '>=', (int) $filters['min_leads']);
        }
        if (!empty($filters['max_leads'])) {
            $query->has('leads', '<=', (int) $filters['max_leads']);
        }

        // Search filter - Enhanced with PostgreSQL full-text search
        if (!empty($filters['search'])) {
            $searchTerm = trim($filters['search']);

            if (strlen($searchTerm) >= 3) {
                // Use PostgreSQL full-text search for longer terms
                $query->where(function ($q) use ($searchTerm) {
                    $q->whereRaw("to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, '')) @@ plainto_tsquery('english', ?)", [$searchTerm])
                        ->orWhere('email', 'ilike', '%' . $searchTerm . '%')
                        ->orWhere('name', 'ilike', '%' . $searchTerm . '%');
                });
            } else {
                // Use LIKE search for shorter terms
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('name', 'ilike', '%' . $searchTerm . '%')
                        ->orWhere('email', 'ilike', '%' . $searchTerm . '%');
                });
            }
        }

        // Active users only (if you have a status field)
        if (!empty($filters['active_only'])) {
            // Assuming you might add a status field later
            // $query->where('status', 'active');

            // For now, filter out users without email verification if needed
            $query->whereNotNull('email_verified_at');
        }

        // Recently created users
        if (!empty($filters['recent_days'])) {
            $recentDays = (int) $filters['recent_days'];
            $recentDate = now()->subDays($recentDays);
            $query->where('created_at', '>=', $recentDate);
        }

        // Users by domain
        if (!empty($filters['email_domain'])) {
            $query->where('email', 'ilike', '%@' . $filters['email_domain']);
        }

        // Exclude specific users
        if (!empty($filters['exclude_ids'])) {
            if (is_array($filters['exclude_ids'])) {
                $query->whereNotIn('id', $filters['exclude_ids']);
            } else {
                $query->where('id', '!=', $filters['exclude_ids']);
            }
        }
    }

    private function applySorting($query, array $filters): void
    {
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';

        // Validate sort fields for User model
        $allowedSortFields = [
            'id', 'name', 'email', 'created_at', 'updated_at',
            'email_verified_at', 'active_services_count',
            'leads_count', 'active_leads_count'
        ];

        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'created_at';
        }

        if (!in_array(strtolower($sortOrder), ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        // Apply primary sorting
        $query->orderBy($sortBy, $sortOrder);

        // Secondary sort for consistency
        if ($sortBy !== 'id') {
            $query->orderBy('id', 'desc');
        }
    }

    private function shouldBypassCache(array $filters): bool
    {
        // Bypass cache for real-time requirements
        return !empty($filters['real_time']) ||
            (!empty($filters['assigned_to']) && $filters['assigned_to'] === auth()->id());
    }

}
