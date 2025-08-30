<?php

namespace App\Http\Controllers\Api\Roles;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    private const CACHE_TTL = 3600; // 1 hour

    public function index(): AnonymousResourceCollection
    {
        $roles = CacheService::remember('roles.all', function () {
            return Role::with(['permissions:id,name'])
                ->withCount(['permissions'])
                ->orderBy('name')
                ->get();
        }, self::CACHE_TTL, ['roles']);

        return RoleResource::collection($roles);
    }

    public function show(Role $role): RoleResource
    {
        $role = Cache::remember("roles.{$role->id}", self::CACHE_TTL, function () use ($role) {
            return $role->load(['permissions', 'users:id,name,email']);
        });

        return new RoleResource($role);
    }

    /**
     * @throws \Throwable
     */
    public function store(StoreRoleRequest $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $role = Role::create($request->validated());

            if ($request->has('permissions')) {
                $role->permissions()->attach($request->permissions);
            }

            DB::commit();
            $this->clearRoleCache();

            return response()->json([
                'message' => 'Role created successfully',
                'data' => new RoleResource($role->load('permissions'))
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create role'], 500);
        }
    }

    /**
     * @throws \Throwable
     */
    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        DB::beginTransaction();
        try {
            $role->update($request->validated());

            if ($request->has('permissions')) {
                $role->permissions()->sync($request->permissions);
            }

            DB::commit();
            $this->clearRoleCache();

            return response()->json([
                'message' => 'Role updated successfully',
                'data' => new RoleResource($role->load('permissions'))
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update role'], 500);
        }
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($role->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete role with assigned users'
            ], 422);
        }

        $role->delete();
        $this->clearRoleCache();

        return response()->json(['message' => 'Role deleted successfully']);
    }

    public function assignPermissions(Role $role, Request $request): JsonResponse
    {
        $role->permissions()->sync($request->permission_ids);
        $this->clearRoleCache();

        return response()->json(['message' => 'Permissions assigned successfully']);
    }

    private function clearRoleCache(): void
    {
        Cache::forget('roles.all');
        Cache::forget('permissions.matrix');
        // Clear individual role caches
        Role::all()->each(function ($role) {
            Cache::forget("roles.{$role->id}");
        });
    }
}
