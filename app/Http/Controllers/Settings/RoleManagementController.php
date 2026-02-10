<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleManagementController extends Controller
{
    public function index(): Response
    {
        $roles = Role::query()
            ->with('permissions:id,name')
            ->withCount(['users', 'permissions'])
            ->orderBy('name')
            ->get()
            ->map(fn ($role) => [
                'id' => $role->id,
                'name' => $role->name,
                'guard_name' => $role->guard_name,
                'users_count' => $role->users_count,
                'permissions_count' => $role->permissions_count,
                'permissions' => $role->permissions->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                ]),
            ]);

        $permissions = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('settings/management/roles/index', [
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }
}
