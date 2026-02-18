<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tables with a simple organization_id column (nullable, with index).
     *
     * @var array<string>
     */
    private array $simpleTables = [
        'ad_sets',
        'ads',
        'call_sessions',
        'campaigns',
        'lead_activities',
        'lead_forms',
        'lead_service_assignments',
        'lead_sources',
        'offices',
        'saved_filters',
        'service_user',
        'services',
        'statuses',
        'tasks',
        'workflows',
        'zones',
    ];

    public function up(): void
    {
        // 1. Drop organization_user pivot table entirely
        Schema::dropIfExists('organization_user');

        // 2. Handle Spatie roles table (only if organization_id exists)
        if (Schema::hasColumn('roles', 'organization_id')) {
            DB::statement('ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_organization_id_name_guard_name_unique');
            DB::statement('DROP INDEX IF EXISTS roles_team_foreign_key_index');
            Schema::table('roles', function (Blueprint $table) {
                $table->dropColumn('organization_id');
            });
            // Only add the unique if it doesn't already exist
            DB::statement('
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = \'roles_name_guard_name_unique\') THEN
                        ALTER TABLE roles ADD CONSTRAINT roles_name_guard_name_unique UNIQUE (name, guard_name);
                    END IF;
                END $$;
            ');
        }

        // 3. Handle model_has_permissions (only if organization_id exists)
        if (Schema::hasColumn('model_has_permissions', 'organization_id')) {
            DB::statement('ALTER TABLE model_has_permissions DROP CONSTRAINT IF EXISTS model_has_permissions_pkey');
            DB::statement('DROP INDEX IF EXISTS model_has_permissions_team_foreign_key_index');
            // Deduplicate rows before adding new PK
            DB::statement('
                DELETE FROM model_has_permissions a USING model_has_permissions b
                WHERE a.ctid < b.ctid
                  AND a.permission_id = b.permission_id
                  AND a.model_id = b.model_id
                  AND a.model_type = b.model_type
            ');
            Schema::table('model_has_permissions', function (Blueprint $table) {
                $table->dropColumn('organization_id');
            });
            DB::statement('ALTER TABLE model_has_permissions ADD PRIMARY KEY (permission_id, model_id, model_type)');
        }

        // 4. Handle model_has_roles (only if organization_id exists)
        if (Schema::hasColumn('model_has_roles', 'organization_id')) {
            DB::statement('ALTER TABLE model_has_roles DROP CONSTRAINT IF EXISTS model_has_roles_pkey');
            DB::statement('DROP INDEX IF EXISTS model_has_roles_team_foreign_key_index');
            // Deduplicate rows before adding new PK
            DB::statement('
                DELETE FROM model_has_roles a USING model_has_roles b
                WHERE a.ctid < b.ctid
                  AND a.role_id = b.role_id
                  AND a.model_id = b.model_id
                  AND a.model_type = b.model_type
            ');
            Schema::table('model_has_roles', function (Blueprint $table) {
                $table->dropColumn('organization_id');
            });
            DB::statement('ALTER TABLE model_has_roles ADD PRIMARY KEY (role_id, model_id, model_type)');
        }

        // 5. Drop organization_id column and its index from all simple tables
        foreach ($this->simpleTables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'organization_id')) {
                DB::statement("DROP INDEX IF EXISTS idx_{$tableName}_org_id");
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropColumn('organization_id');
                });
            }
        }

        // 6. Drop the organizations table
        Schema::dropIfExists('organizations');
    }

    public function down(): void
    {
        // Recreate organizations table
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        // Recreate organization_user pivot
        Schema::create('organization_user', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('user_id');
            $table->unique(['organization_id', 'user_id']);
        });

        // Re-add organization_id to simple tables
        foreach ($this->simpleTables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    $table->unsignedBigInteger('organization_id')->nullable();
                    $table->index('organization_id', "idx_{$tableName}_org_id");
                });
            }
        }

        // Re-add to Spatie tables
        if (! Schema::hasColumn('roles', 'organization_id')) {
            DB::statement('ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_guard_name_unique');
            Schema::table('roles', function (Blueprint $table) {
                $table->unsignedBigInteger('organization_id')->nullable();
                $table->unique(['organization_id', 'name', 'guard_name']);
                $table->index('organization_id', 'roles_team_foreign_key_index');
            });
        }

        if (! Schema::hasColumn('model_has_permissions', 'organization_id')) {
            DB::statement('ALTER TABLE model_has_permissions DROP CONSTRAINT IF EXISTS model_has_permissions_pkey');
            Schema::table('model_has_permissions', function (Blueprint $table) {
                $table->unsignedBigInteger('organization_id')->default(0);
            });
            DB::statement('ALTER TABLE model_has_permissions ADD PRIMARY KEY (organization_id, permission_id, model_id, model_type)');
            DB::statement('CREATE INDEX model_has_permissions_team_foreign_key_index ON model_has_permissions (organization_id)');
        }

        if (! Schema::hasColumn('model_has_roles', 'organization_id')) {
            DB::statement('ALTER TABLE model_has_roles DROP CONSTRAINT IF EXISTS model_has_roles_pkey');
            Schema::table('model_has_roles', function (Blueprint $table) {
                $table->unsignedBigInteger('organization_id')->default(0);
            });
            DB::statement('ALTER TABLE model_has_roles ADD PRIMARY KEY (organization_id, role_id, model_id, model_type)');
            DB::statement('CREATE INDEX model_has_roles_team_foreign_key_index ON model_has_roles (organization_id)');
        }
    }
};
