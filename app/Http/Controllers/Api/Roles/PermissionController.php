<?php

namespace App\Http\Controllers\Api\Roles;

use App\Http\Controllers\Controller;
use App\Http\Resources\PermissionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionController extends Controller
{
    private const CACHE_TTL = 3600;
    private const CACHE_KEYS = [
        'permissions.all',
        'permissions.matrix',
        'roles.all'
    ];

    public function index(): AnonymousResourceCollection
    {
        $permissions = Cache::remember('permissions.all', self::CACHE_TTL, function () {
            return Permission::query()
                ->orderBy('name')
                ->get();
        });

        return PermissionResource::collection($permissions);
    }

    public function matrix(): JsonResponse
    {
        $matrix = Cache::remember('permissions.matrix', self::CACHE_TTL, function () {
            return Permission::query()
                ->orderBy('name')
                ->get();
        });

        return response()->json(['data' => $matrix]);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'role_permissions' => 'required|array',
            'role_permissions.*.role_id' => 'required|exists:roles,id',
            'role_permissions.*.permission_ids' => 'required|array',
            'role_permissions.*.permission_ids.*' => 'exists:permissions,id'
        ]);

        try {
            DB::transaction(function () use ($request) {
                foreach ($request->role_permissions as $rolePermission) {
                    Role::findOrFail($rolePermission['role_id'])
                        ->permissions()
                        ->sync($rolePermission['permission_ids']);
                }
            });

            $this->clearPermissionCache();

            return response()->json(['message' => 'Permissions updated successfully']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to update permissions'], 500);
        }
    }

    private function clearPermissionCache(): void
    {
        foreach (self::CACHE_KEYS as $key) {
            Cache::forget($key);
        }
    }
}
