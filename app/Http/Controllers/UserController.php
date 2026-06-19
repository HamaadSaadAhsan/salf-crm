<?php

namespace App\Http\Controllers;

use App\Events\RolePermissionsUpdated;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\UserFilterRequest;
use App\Http\Resources\UserResource;
use App\Models\LeadActivity;
use App\Models\Office;
use App\Models\Service;
use App\Models\Team;
use App\Models\User;
use App\Models\Zone;
use App\Services\CacheService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class UserController extends Controller
{
    public function __construct(
        private CacheService $cacheService
    ) {}

    private function getSubordinateRole(User $user): ?string
    {
        return match (true) {
            $user->hasRole('senior-support-agent') => 'support-agent',
            $user->hasRole('senior-sales-rep') => 'sales-rep',
            default => null,
        };
    }

    /**
     * Display the users management page
     */
    public function page(UserFilterRequest $request): Response
    {
        $filters = $request->validated();

        $authUser = auth()->user();
        if (! $authUser->hasRole('super-admin') && $authUser->hasPermissionTo('manage team agents')) {
            $subordinateRole = $this->getSubordinateRole($authUser);
            if ($subordinateRole) {
                $filters['role'] = $subordinateRole;
            }
        }

        $result = $this->buildUsersQuery($filters);

        // Load zones, offices, and services for edit dialogs
        $zones = Zone::query()
            ->select(['id', 'name', 'code', 'description', 'is_active'])
            ->orderBy('name')
            ->get();

        $offices = Office::query()
            ->with('zone:id,name,code')
            ->select(['id', 'name', 'code', 'zone_id', 'is_active'])
            ->orderBy('name')
            ->get();

        $services = Service::query()
            ->with('children:id,name,detail,country_code,country_name,parent_id')
            ->whereNull('parent_id') // Only get parent services
            ->select(['id', 'name', 'detail', 'country_code', 'country_name', 'parent_id'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $roles = Role::query()
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();

        $teams = Team::query()
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();

        return Inertia::render('users/index', [
            'users' => [
                'data' => $result['data']->resolve(),
                'meta' => $result['meta'],
            ],
            'zones' => $zones,
            'offices' => $offices,
            'services' => $services,
            'roles' => $roles,
            'teams' => $teams,
        ]);
    }

    /**
     * Get users list (API endpoint)
     */
    public function index(UserFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $authUser = auth()->user();

        // Senior agents can only see their subordinates + themselves
        if (! $authUser->hasRole('super-admin') && $authUser->hasPermissionTo('manage team agents')) {
            $subordinateRole = $this->getSubordinateRole($authUser);
            $subordinateIds = $subordinateRole ? User::role($subordinateRole)->pluck('id')->toArray() : [];
            $allowedIds = array_unique(array_merge($subordinateIds, [$authUser->id]));
            $filters['allowed_ids'] = $allowedIds;
            unset($filters['role']); // Role scoping is handled by allowed_ids
        }

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
            ],
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
                'zone:id,name,code',
                'office:id,name,code,zone_id',
                'office.zone:id,name,code',
            ])
            ->withCount([
                'activeServices',
                'leads',
                'leads as active_leads_count' => function ($q) {
                    $q->whereNotIn('inquiry_status', ['won', 'lost', 'closed']);
                },
            ])
            ->select([
                'id',
                'name',
                'email',
                'email_verified_at',
                'zone_id',
                'office_id',
                'extension',
                'created_at',
                'updated_at',
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
            ],
        ];
    }

    private function applyFilters($query, array $filters): void
    {
        // Restrict to allowed IDs (used for team-scoped access)
        if (! empty($filters['allowed_ids'])) {
            $query->whereIn('id', $filters['allowed_ids']);
        }

        // Email verification status filter
        if (! empty($filters['email_verified'])) {
            if ($filters['email_verified'] === 'verified') {
                $query->whereNotNull('email_verified_at');
            } else {
                $query->whereNull('email_verified_at');
            }
        }

        // Role filter
        if (! empty($filters['role'])) {
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
        if (! empty($filters['permission'])) {
            $query->whereHas('roles.permissions', function ($q) use ($filters) {
                $q->where('name', $filters['permission']);
            });
        }

        // Service assignment filter
        if (! empty($filters['service_id'])) {
            if (is_array($filters['service_id'])) {
                $query->whereHas('activeServices', function ($q) use ($filters) {
                    $q->whereIn('service_id', $filters['service_id']);
                });
            } else {
                $serviceId = $filters['service_id'];

                // Include child services if filtering by parent
                if (! empty($filters['include_child_services'])) {
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
        if (! empty($filters['service_country'])) {
            $query->whereHas('activeServices', function ($q) use ($filters) {
                $q->where('country_code', $filters['service_country']);
            });
        }

        // Users without any services
        if (! empty($filters['no_services'])) {
            $query->doesntHave('activeServices');
        }

        // Users with minimum number of services
        if (! empty($filters['min_services'])) {
            $query->has('activeServices', '>=', (int) $filters['min_services']);
        }

        // Service assignment status filter
        if (! empty($filters['service_status'])) {
            $query->whereHas('services', function ($q) use ($filters) {
                $q->wherePivot('status', $filters['service_status']);
            });
        }

        // Service assignment metadata filter
        if (! empty($filters['service_role'])) {
            $query->whereHas('services', function ($q) use ($filters) {
                $q->whereRaw("service_user.metadata ->> 'role' = ?", [$filters['service_role']]);
            });
        }

        // Date range filter (user creation)
        if (! empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->where('created_at', '<=', Carbon::parse($filters['date_to'])->endOfDay());
        }

        // Email verification date range
        if (! empty($filters['verified_from'])) {
            $query->where('email_verified_at', '>=', $filters['verified_from']);
        }
        if (! empty($filters['verified_to'])) {
            $query->where('email_verified_at', '<=', Carbon::parse($filters['verified_to'])->endOfDay());
        }

        // Users with leads filter
        if (! empty($filters['has_leads'])) {
            if ($filters['has_leads'] === 'yes') {
                $query->has('leads');
            } else {
                $query->doesntHave('leads');
            }
        }

        // Users with active leads
        if (! empty($filters['has_active_leads'])) {
            $query->whereHas('leads', function ($q) {
                $q->whereNotIn('inquiry_status', ['won', 'lost', 'closed']);
            });
        }

        // Lead count filter
        if (! empty($filters['min_leads'])) {
            $query->has('leads', '>=', (int) $filters['min_leads']);
        }
        if (! empty($filters['max_leads'])) {
            $query->has('leads', '<=', (int) $filters['max_leads']);
        }

        // Search filter - Enhanced with PostgreSQL full-text search
        if (! empty($filters['search'])) {
            $searchTerm = trim($filters['search']);

            if (strlen($searchTerm) >= 3) {
                // Use PostgreSQL full-text search for longer terms
                $query->where(function ($q) use ($searchTerm) {
                    $q->whereRaw("to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, '')) @@ plainto_tsquery('english', ?)", [$searchTerm])
                        ->orWhere('email', 'ilike', '%'.$searchTerm.'%')
                        ->orWhere('name', 'ilike', '%'.$searchTerm.'%');
                });
            } else {
                // Use LIKE search for shorter terms
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('name', 'ilike', '%'.$searchTerm.'%')
                        ->orWhere('email', 'ilike', '%'.$searchTerm.'%');
                });
            }
        }

        // Active users only (if you have a status field)
        if (! empty($filters['active_only'])) {
            // Assuming you might add a status field later
            // $query->where('status', 'active');

            // For now, filter out users without email verification if needed
            $query->whereNotNull('email_verified_at');
        }

        // Recently created users
        if (! empty($filters['recent_days'])) {
            $recentDays = (int) $filters['recent_days'];
            $recentDate = now()->subDays($recentDays);
            $query->where('created_at', '>=', $recentDate);
        }

        // Users by domain
        if (! empty($filters['email_domain'])) {
            $query->where('email', 'ilike', '%@'.$filters['email_domain']);
        }

        // Exclude specific users
        if (! empty($filters['exclude_ids'])) {
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
            'leads_count', 'active_leads_count',
        ];

        if (! in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'created_at';
        }

        if (! in_array(strtolower($sortOrder), ['asc', 'desc'])) {
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
        return ! empty($filters['real_time']) ||
            (! empty($filters['assigned_to']) && $filters['assigned_to'] === auth()->id());
    }

    /**
     * Store a newly created user
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $validated = $request->validated();

            // Create the user
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);

            // Assign roles if provided
            if (! empty($validated['roles'])) {
                $user->syncRoles($validated['roles']);
            }

            // Add to team if provided
            if (! empty($validated['team_id'])) {
                $team = Team::find($validated['team_id']);
                if ($team) {
                    $team->members()->attach($user->id, ['role' => 'member']);
                    $user->forceFill(['current_team_id' => $team->id])->save();
                }
            }

            // Assign services if provided
            if (! empty($validated['services'])) {
                foreach ($validated['services'] as $serviceId) {
                    $service = Service::find($serviceId);
                    if ($service) {
                        $metadata = $validated['service_metadata'][$serviceId] ?? [];
                        $service->assignToUser($user, ['metadata' => json_encode($metadata)]);
                    }
                }
            }

            DB::commit();

            // Clear cache
            CacheService::flush('users');

            // Load relationships for response
            $user->load(['roles', 'activeServices']);

            return response()->json([
                'message' => 'User created successfully.',
                'data' => new UserResource($user),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to create user.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the user detail page
     */
    public function showPage(User $user): Response
    {
        $authUser = auth()->user();
        if (! $authUser->hasRole('super-admin') && $authUser->hasPermissionTo('manage team agents')) {
            $subordinateRole = $this->getSubordinateRole($authUser);
            abort_unless(
                $subordinateRole && $user->hasRole($subordinateRole),
                403,
                'You can only view profiles of your team members.'
            );
        }

        $user->load([
            'roles',
            'permissions',
            'activeServices',
            'activeServices.parent',
            'services' => function ($q) {
                $q->withPivot(['assigned_at', 'status', 'notes', 'metadata']);
            },
            'leads' => function ($q) {
                $q->latest()->limit(10);
            },
            'leads.service',
            'zone',
            'office',
            'office.zone',
        ]);

        $user->loadCount([
            'leads',
            'leads as active_leads_count' => function ($q) {
                $q->whereNotIn('inquiry_status', ['won', 'lost', 'closed']);
            },
            'activeServices',
        ]);

        // Get available roles for editing
        $roles = Role::query()
            ->select(['id', 'name', 'guard_name'])
            ->orderBy('name')
            ->get();

        // Get zones and offices for editing
        $zones = Zone::query()
            ->select(['id', 'name', 'code', 'is_active'])
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $offices = Office::query()
            ->with('zone:id,name,code')
            ->select(['id', 'name', 'code', 'zone_id', 'is_active'])
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $services = Service::query()
            ->with('children:id,name,detail,country_code,country_name,parent_id')
            ->whereNull('parent_id')
            ->select(['id', 'name', 'detail', 'country_code', 'country_name', 'parent_id'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $allPermissions = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('users/show', [
            'user' => (new UserResource($user))->resolve(),
            'roles' => $roles,
            'zones' => $zones,
            'offices' => $offices,
            'services' => $services,
            'allPermissions' => $allPermissions,
        ]);
    }

    /**
     * Display the specified user
     */
    public function show(User $user): JsonResponse
    {
        $user->load([
            'roles',
            'activeServices',
            'activeServices.parent',
            'services' => function ($q) {
                $q->withPivot(['assigned_at', 'status', 'notes', 'metadata']);
            },
            'leads',
            'leads.service',
        ]);

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    /**
     * Update the specified user
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        try {
            DB::beginTransaction();

            $validated = $request->validated();

            // Update basic user information
            $updateData = [];
            if (isset($validated['name'])) {
                $updateData['name'] = $validated['name'];
            }
            if (isset($validated['email'])) {
                $updateData['email'] = $validated['email'];
            }
            if (isset($validated['password'])) {
                $updateData['password'] = $validated['password'];
            }
            if (array_key_exists('extension', $validated)) {
                $updateData['extension'] = $validated['extension'];
            }

            if (! empty($updateData)) {
                $user->update($updateData);
            }

            // Update roles if provided
            if (isset($validated['roles'])) {
                $user->syncRoles($validated['roles']);
            }

            // Update services if provided
            if (isset($validated['services'])) {
                // Detach all existing services
                $user->services()->detach();

                // Attach new services
                foreach ($validated['services'] as $serviceId) {
                    $service = Service::find($serviceId);
                    if ($service) {
                        $metadata = $validated['service_metadata'][$serviceId] ?? [];
                        $service->assignToUser($user, ['metadata' => json_encode($metadata)]);
                    }
                }
            }

            DB::commit();

            // Clear cache
            CacheService::flush('users');

            // Load relationships for response
            $user->fresh(['roles', 'activeServices', 'activeServices.parent']);

            return response()->json([
                'message' => 'User updated successfully.',
                'data' => new UserResource($user),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to update user.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified user
     */
    public function destroy(User $user): JsonResponse
    {
        try {
            // Check if user has leads assigned
            if ($user->leads()->exists()) {
                return response()->json([
                    'message' => 'Cannot delete user with assigned leads. Please reassign the leads first.',
                ], 422);
            }

            // Detach all relationships
            $user->services()->detach();
            $user->roles()->detach();

            // Delete the user
            $user->delete();

            // Clear cache
            CacheService::flush('users');

            return response()->json([
                'message' => 'User deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete user.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update user's office
     */
    public function updateOffice(User $user, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'office_id' => 'nullable|exists:offices,id',
            ]);

            $user->update([
                'office_id' => $validated['office_id'],
            ]);

            // Clear cache
            CacheService::flush('users');

            // Load relationships for response
            $user->fresh(['office', 'office.zone']);

            return response()->json([
                'message' => 'Office updated successfully.',
                'data' => new UserResource($user),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update office.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update user's zone
     */
    public function updateZone(User $user, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'zone_id' => 'nullable|exists:zones,id',
            ]);

            $user->update([
                'zone_id' => $validated['zone_id'],
            ]);

            // Clear cache
            CacheService::flush('users');

            // Load relationships for response
            $user->fresh(['zone']);

            return response()->json([
                'message' => 'Zone updated successfully.',
                'data' => new UserResource($user),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update zone.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update user's availability
     */
    public function updateAvailability(User $user, Request $request): JsonResponse
    {
        $authUser = auth()->user();
        if (! $authUser->hasRole('super-admin')) {
            abort_unless($authUser->hasPermissionTo('manage team agents'), 403, 'Unauthorized.');
            $subordinateRole = $this->getSubordinateRole($authUser);
            abort_unless(
                $subordinateRole && $user->hasRole($subordinateRole),
                403,
                'You can only manage availability of your team members.'
            );
        }

        try {
            $validated = $request->validate([
                'availability' => 'required|boolean',
            ]);

            $user->update([
                'availability' => $validated['availability'],
            ]);

            // Clear cache
            CacheService::flush('users');

            return response()->json([
                'message' => 'Availability updated successfully.',
                'data' => new UserResource($user),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update availability.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update user's services
     */
    public function updateServices(User $user, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'service_ids' => 'required|array',
                'service_ids.*' => 'exists:services,id',
            ]);

            // Sync services with user
            $syncData = [];
            foreach ($validated['service_ids'] as $serviceId) {
                $syncData[$serviceId] = [
                    'assigned_at' => now(),
                    'status' => 'active',
                ];
            }

            $user->services()->sync($syncData);

            // Clear cache
            CacheService::flush('users');

            // Load relationships for response
            $user->fresh(['activeServices', 'activeServices.parent']);

            return response()->json([
                'message' => 'Services updated successfully.',
                'data' => new UserResource($user),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update services.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update user's direct permissions
     */
    public function updatePermissions(User $user, Request $request): JsonResponse|Response
    {
        $validated = $request->validate([
            'permission_ids' => 'present|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $permissions = Permission::whereIn('id', $validated['permission_ids'])->get();
        $user->syncPermissions($permissions);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        broadcast(new RolePermissionsUpdated('direct-permissions', [$user->id]))->toOthers();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Permissions updated successfully.',
            ]);
        } else {
            return Inertia::render('settings/management/permissions/permission-matrix', [
                'message' => __('Permissions updated successfully.'),
            ]);
        }
    }

    /**
     * Get user's activity heatmap data
     */
    public function activityHeatmap(User $user, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'nullable|integer|in:7,14,30',
        ]);

        $period = $validated['period'] ?? 30;
        $cacheKey = "user:{$user->id}:activity_heatmap:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($user, $period) {
            return $this->getUserActivityHeatmapData($user, $period);
        }, 300, ['users', "user:{$user->id}"]);

        return response()->json($data);
    }

    protected function getUserActivityHeatmapData(User $user, int $days): array
    {
        $startDate = Carbon::now()->subDays($days);

        // Get all activities for leads assigned to this user within the period
        $activities = LeadActivity::whereHas('lead', function ($query) use ($user) {
            $query->where('assigned_to', $user->id);
        })
            ->where('created_at', '>=', $startDate)
            ->get();

        // Initialize heatmap data structure (7 days x 24 hours)
        $heatmap = [];
        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        foreach ($dayNames as $dayIndex => $dayName) {
            for ($hour = 0; $hour < 24; $hour++) {
                $heatmap[] = [
                    'day' => $dayName,
                    'hour' => $hour,
                    'count' => 0,
                ];
            }
        }

        // Count activities by day and hour
        foreach ($activities as $activity) {
            $dayOfWeek = $activity->created_at->dayOfWeek;
            $hour = $activity->created_at->hour;

            $index = ($dayOfWeek * 24) + $hour;
            if (isset($heatmap[$index])) {
                $heatmap[$index]['count']++;
            }
        }

        // Find max count for normalization
        $maxCount = max(array_column($heatmap, 'count'));

        // Calculate intensity (0-1)
        $heatmap = array_map(function ($item) use ($maxCount) {
            $item['intensity'] = $maxCount > 0 ? $item['count'] / $maxCount : 0;

            return $item;
        }, $heatmap);

        return [
            'heatmap_data' => $heatmap,
            'period_days' => $days,
            'total_activities' => $activities->count(),
            'max_count' => $maxCount,
        ];
    }
}
