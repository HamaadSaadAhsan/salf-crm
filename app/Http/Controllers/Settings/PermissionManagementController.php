<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionManagementController extends Controller
{
    public function index(): Response
    {
        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn ($role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('id')->toArray(),
            ]);

        $permissions = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('settings/management/permissions/index', [
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }
}
