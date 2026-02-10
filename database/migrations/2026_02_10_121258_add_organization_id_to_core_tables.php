<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tables that need organization_id added.
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
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, 'organization_id')) {
                Schema::table($table, function (Blueprint $blueprint) use ($table) {
                    $blueprint->foreignId('organization_id')
                        ->nullable()
                        ->after('id')
                        ->constrained('organizations')
                        ->cascadeOnDelete();

                    $blueprint->index('organization_id', "idx_{$table}_org_id");
                });
            }
        }

        // Add composite index for high-volume leads table
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'organization_id')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->index(
                    ['organization_id', 'inquiry_status'],
                    'idx_leads_org_status'
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop composite index on leads first
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'organization_id')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropIndex('idx_leads_org_status');
            });
        }

        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'organization_id')) {
                Schema::table($table, function (Blueprint $blueprint) use ($table) {
                    $blueprint->dropIndex("idx_{$table}_org_id");
                    $blueprint->dropConstrainedForeignId('organization_id');
                });
            }
        }
    }
};
