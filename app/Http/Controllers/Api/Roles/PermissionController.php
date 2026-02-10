<?php

namespace App\Http\Controllers\Api\Roles;

use App\Events\RolePermissionsUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePermissionRequest;
use App\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionController extends Controller
{
    private const CACHE_TTL = 3600;

    private const CACHE_KEYS = [
        'permissions.all',
        'permissions.matrix',
        'roles.all',
    ];

    public function index(): AnonymousResourceCollection
    {
        // Use memo for request-scoped caching
        $permissions = cache()->memo('permissions.all', fn () => Permission::query()
            ->orderBy('name')
            ->get()
        );

        return PermissionResource::collection($permissions);
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $permission = Permission::create([
            'name' => $request->validated('name'),
            'guard_name' => 'web',
        ]);

        $this->clearPermissionCache();

        return response()->json([
            'message' => 'Permission created successfully',
            'data' => new PermissionResource($permission),
        ], 201);
    }

    public function matrix(): JsonResponse
    {
        // Use memo for request-scoped caching
        $matrix = cache()->memo('permissions.matrix', fn () => Permission::query()
            ->orderBy('name')
            ->get()
        );

        return response()->json(['data' => $matrix]);
    }

    public function bulkUpdate(Request $request): mixed
    {
        $request->validate([
            'role_permissions' => 'required|array',
            'role_permissions.*.role_id' => 'required|exists:roles,id',
            'role_permissions.*.permission_ids' => 'required|array',
            'role_permissions.*.permission_ids.*' => 'exists:permissions,id',
        ]);

        try {
            $affectedRoleIds = collect($request->role_permissions)->pluck('role_id')->toArray();

            DB::transaction(function () use ($request) {
                foreach ($request->role_permissions as $rolePermission) {
                    Role::findOrFail($rolePermission['role_id'])
                        ->permissions()
                        ->sync($rolePermission['permission_ids']);
                }
            });

            $this->clearPermissionCache();
            $this->broadcastPermissionsUpdated($affectedRoleIds);

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Permissions updated successfully']);
            } else {
                return redirect()->back()->with('success', 'Permissions updated successfully');
            }
        } catch (\Throwable $e) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Failed to update permissions'], 500);
            } else {
                return redirect()->back()->with('success', 'Permissions updated successfully');
            }
        }
    }

    private function clearPermissionCache(): void
    {
        foreach (self::CACHE_KEYS as $key) {
            cache()->forget($key);
        }
        // Clear Spatie's internal permission cache so getAllPermissions() returns fresh data
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * @param  array<int>  $roleIds
     */
    private function broadcastPermissionsUpdated(array $roleIds): void
    {
        $roles = Role::whereIn('id', $roleIds)->with('users:id')->get();

        foreach ($roles as $role) {
            $userIds = $role->users->pluck('id')->toArray();

            if (count($userIds) > 0) {
                RolePermissionsUpdated::dispatch($role->name, $userIds);
            }
        }
    }
}
