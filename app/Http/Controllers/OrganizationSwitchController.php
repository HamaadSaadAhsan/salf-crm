<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

class OrganizationSwitchController extends Controller
{
    public function switch(Request $request): RedirectResponse
    {
        $request->validate([
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
        ]);

        $user = $request->user();
        $user->loadMissing('organizations');
        $orgId = $request->integer('organization_id');

        if (! $user->organizations->contains('id', $orgId)) {
            abort(403, 'You are not a member of this organization.');
        }

        // Replicate user's existing roles and direct permissions to the target organization
        $this->ensureRolesExistForOrganization($user, $orgId);
        $this->ensureDirectPermissionsExistForOrganization($user, $orgId);

        session(['current_organization_id' => $orgId]);

        // Clear cached permission relations for team switch
        $user->unsetRelation('roles')->unsetRelation('permissions');
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return back();
    }

    /**
     * Ensure the user's Spatie roles from any organization are replicated to the target org.
     */
    private function ensureRolesExistForOrganization(\App\Models\User $user, int $organizationId): void
    {
        $teamsKey = config('permission.column_names.team_foreign_key');

        $roleIds = DB::table('model_has_roles')
            ->where('model_id', $user->id)
            ->where('model_type', get_class($user))
            ->pluck('role_id')
            ->unique();

        foreach ($roleIds as $roleId) {
            DB::table('model_has_roles')->updateOrInsert(
                [
                    'role_id' => $roleId,
                    'model_id' => $user->id,
                    'model_type' => get_class($user),
                    $teamsKey => $organizationId,
                ],
                [
                    'role_id' => $roleId,
                    'model_id' => $user->id,
                    'model_type' => get_class($user),
                    $teamsKey => $organizationId,
                ]
            );
        }
    }

    /**
     * Ensure the user's direct permissions from any organization are replicated to the target org.
     */
    private function ensureDirectPermissionsExistForOrganization(\App\Models\User $user, int $organizationId): void
    {
        $teamsKey = config('permission.column_names.team_foreign_key');

        $permissionIds = DB::table('model_has_permissions')
            ->where('model_id', $user->id)
            ->where('model_type', get_class($user))
            ->pluck('permission_id')
            ->unique();

        foreach ($permissionIds as $permissionId) {
            DB::table('model_has_permissions')->updateOrInsert(
                [
                    'permission_id' => $permissionId,
                    'model_id' => $user->id,
                    'model_type' => get_class($user),
                    $teamsKey => $organizationId,
                ],
                [
                    'permission_id' => $permissionId,
                    'model_id' => $user->id,
                    'model_type' => get_class($user),
                    $teamsKey => $organizationId,
                ]
            );
        }
    }

    public function index(Request $request)
    {
        return $request->user()
            ->organizations()
            ->select(['organizations.id', 'organizations.name', 'organizations.slug', 'organizations.logo'])
            ->get();
    }
}
