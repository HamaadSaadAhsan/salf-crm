<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Replicate each user's roles and direct permissions to all their assigned organizations.
     *
     * With Spatie Permission teams enabled, model_has_roles and model_has_permissions
     * are scoped by organization_id. This ensures users have consistent roles/permissions
     * across all organizations they belong to.
     */
    public function up(): void
    {
        $teamsKey = config('permission.column_names.team_foreign_key', 'organization_id');

        // Get all users with their organization memberships
        $userOrgs = DB::table('organization_user')
            ->select('user_id', DB::raw('array_agg(organization_id) as org_ids'))
            ->groupBy('user_id')
            ->get();

        foreach ($userOrgs as $row) {
            $userId = $row->user_id;
            $orgIds = array_map('intval', explode(',', trim($row->org_ids, '{}')));

            if (count($orgIds) <= 1) {
                continue;
            }

            // Sync roles
            $roleIds = DB::table('model_has_roles')
                ->where('model_id', $userId)
                ->where('model_type', 'App\\Models\\User')
                ->pluck('role_id')
                ->unique();

            foreach ($orgIds as $orgId) {
                foreach ($roleIds as $roleId) {
                    DB::table('model_has_roles')->updateOrInsert(
                        [
                            'role_id' => $roleId,
                            'model_id' => $userId,
                            'model_type' => 'App\\Models\\User',
                            $teamsKey => $orgId,
                        ],
                        [
                            'role_id' => $roleId,
                            'model_id' => $userId,
                            'model_type' => 'App\\Models\\User',
                            $teamsKey => $orgId,
                        ]
                    );
                }
            }

            // Sync direct permissions
            $permissionIds = DB::table('model_has_permissions')
                ->where('model_id', $userId)
                ->where('model_type', 'App\\Models\\User')
                ->pluck('permission_id')
                ->unique();

            foreach ($orgIds as $orgId) {
                foreach ($permissionIds as $permissionId) {
                    DB::table('model_has_permissions')->updateOrInsert(
                        [
                            'permission_id' => $permissionId,
                            'model_id' => $userId,
                            'model_type' => 'App\\Models\\User',
                            $teamsKey => $orgId,
                        ],
                        [
                            'permission_id' => $permissionId,
                            'model_id' => $userId,
                            'model_type' => 'App\\Models\\User',
                            $teamsKey => $orgId,
                        ]
                    );
                }
            }
        }
    }

    public function down(): void
    {
        // Cannot safely reverse — entries from before the migration are indistinguishable
    }
};
