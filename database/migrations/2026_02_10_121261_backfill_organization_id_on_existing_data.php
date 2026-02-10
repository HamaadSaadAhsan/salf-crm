<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tables that need organization_id backfilled and made NOT NULL.
     *
     * @var list<string>
     */
    private array $tables = [
        'leads',
        'zones',
        'offices',
        'services',
        'service_user',
        'lead_service_assignments',
        'lead_sources',
        'lead_activities',
        'lead_forms',
        'tasks',
        'campaigns',
        'ad_sets',
        'ads',
        'statuses',
        'saved_filters',
        'call_sessions',
        'sip_accounts',
        'workflows',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create default "Primary" organization (idempotent)
        $orgId = DB::table('organizations')->where('slug', 'primary')->value('id');

        if (! $orgId) {
            $orgId = DB::table('organizations')->insertGetId([
                'name' => 'Primary',
                'slug' => 'primary',
                'settings' => '{}',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Assign all existing users to the default organization (skip already assigned)
        $userIds = DB::table('users')->pluck('id');
        $alreadyAssigned = DB::table('organization_user')
            ->where('organization_id', $orgId)
            ->pluck('user_id');

        $newUserIds = $userIds->diff($alreadyAssigned);
        $pivotRows = $newUserIds->map(fn ($userId) => [
            'organization_id' => $orgId,
            'user_id' => $userId,
            'role' => 'member',
            'is_default' => true,
            'joined_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ])->toArray();

        if (! empty($pivotRows)) {
            DB::table('organization_user')->insert($pivotRows);
        }

        // Set first user as owner if not already set
        $firstUser = $userIds->first();
        if ($firstUser) {
            DB::table('organizations')
                ->where('id', $orgId)
                ->whereNull('owner_id')
                ->update(['owner_id' => $firstUser]);
        }

        // 3. Backfill organization_id on all existing records
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'organization_id')) {
                DB::table($table)
                    ->whereNull('organization_id')
                    ->update(['organization_id' => $orgId]);
            }
        }

        // 4. Backfill organization_id on permission tables
        $permissionTables = ['roles', 'model_has_roles', 'model_has_permissions'];
        $teamForeignKey = config('permission.column_names.team_foreign_key', 'organization_id');

        foreach ($permissionTables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, $teamForeignKey)) {
                DB::table($table)
                    ->whereNull($teamForeignKey)
                    ->update([$teamForeignKey => $orgId]);
            }
        }

        // 5. Make organization_id NOT NULL on core tables
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'organization_id')) {
                Schema::table($table, function (Blueprint $blueprint) {
                    $blueprint->foreignId('organization_id')->nullable(false)->change();
                });
            }
        }

        // 6. Rebuild primary keys on permission pivot tables now that data is backfilled
        $tableNames = config('permission.table_names');

        if (Schema::hasColumn($tableNames['model_has_roles'], $teamForeignKey)) {
            Schema::table($tableNames['model_has_roles'], function (Blueprint $table) {
                $table->dropPrimary('model_has_roles_role_model_type_primary');
            });

            Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($teamForeignKey) {
                $table->primary(
                    [$teamForeignKey, 'role_id', 'model_id', 'model_type'],
                    'model_has_roles_role_model_type_primary'
                );
            });
        }

        if (Schema::hasColumn($tableNames['model_has_permissions'], $teamForeignKey)) {
            Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) {
                $table->dropPrimary('model_has_permissions_permission_model_type_primary');
            });

            Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($teamForeignKey) {
                $table->primary(
                    [$teamForeignKey, 'permission_id', 'model_id', 'model_type'],
                    'model_has_permissions_permission_model_type_primary'
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tableNames = config('permission.table_names');
        $teamForeignKey = config('permission.column_names.team_foreign_key', 'organization_id');

        // Restore original primary keys on permission pivot tables
        if (Schema::hasColumn($tableNames['model_has_permissions'], $teamForeignKey)) {
            Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) {
                $table->dropPrimary('model_has_permissions_permission_model_type_primary');
            });

            Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) {
                $table->primary(
                    ['permission_id', 'model_id', 'model_type'],
                    'model_has_permissions_permission_model_type_primary'
                );
            });
        }

        if (Schema::hasColumn($tableNames['model_has_roles'], $teamForeignKey)) {
            Schema::table($tableNames['model_has_roles'], function (Blueprint $table) {
                $table->dropPrimary('model_has_roles_role_model_type_primary');
            });

            Schema::table($tableNames['model_has_roles'], function (Blueprint $table) {
                $table->primary(
                    ['role_id', 'model_id', 'model_type'],
                    'model_has_roles_role_model_type_primary'
                );
            });
        }

        // Make columns nullable again
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'organization_id')) {
                Schema::table($table, function (Blueprint $blueprint) {
                    $blueprint->foreignId('organization_id')->nullable()->change();
                });
            }
        }

        // Remove organization_user records for 'Primary' org
        $orgId = DB::table('organizations')->where('slug', 'primary')->value('id');
        if ($orgId) {
            DB::table('organization_user')->where('organization_id', $orgId)->delete();
            DB::table('organizations')->where('id', $orgId)->delete();
        }
    }
};
