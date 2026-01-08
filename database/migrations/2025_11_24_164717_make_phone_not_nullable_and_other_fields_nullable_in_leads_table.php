<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $useSqlite = config('database.default') === 'sqlite' || app()->environment('testing');

        // Drop the view temporarily (PostgreSQL only)
        if (! $useSqlite) {
            DB::statement('DROP VIEW IF EXISTS active_lead_activities');
        }

        Schema::table('leads', function (Blueprint $table) {
            // Make phone NOT nullable (only required field)
            $table->string('phone')->nullable(false)->change();

            // Make all other fields nullable
            $table->string('name')->nullable()->change();
            $table->string('email')->nullable()->change();
            $table->string('inquiry_status')->nullable()->change();
            $table->string('priority')->nullable()->change();
            $table->integer('lead_score')->nullable()->change();
            $table->integer('pending_activities_count')->nullable()->change();
        });

        // Recreate the view (PostgreSQL only)
        if (! $useSqlite) {
            DB::statement('
                CREATE OR REPLACE VIEW active_lead_activities AS
                SELECT a.id,
                    a.lead_id,
                    a.user_id,
                    a.type,
                    a.status,
                    a.subject,
                    a.description,
                    a.metadata,
                    a.scheduled_at,
                    a.completed_at,
                    a.due_at,
                    a.priority,
                    a.category,
                    a.duration_minutes,
                    a.cost,
                    a.outcome,
                    a.notes,
                    a.attachments,
                    a.external_id,
                    a.source_system,
                    a.created_at,
                    a.updated_at,
                    a.deleted_at,
                    l.name AS lead_name,
                    l.email AS lead_email,
                    u.name AS user_name
                FROM lead_activities a
                JOIN leads l ON a.lead_id = l.id
                JOIN users u ON a.user_id = u.id
                WHERE a.deleted_at IS NULL
                ORDER BY a.scheduled_at DESC
            ');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $useSqlite = config('database.default') === 'sqlite' || app()->environment('testing');

        // Drop the view temporarily (PostgreSQL only)
        if (! $useSqlite) {
            DB::statement('DROP VIEW IF EXISTS active_lead_activities');
        }

        Schema::table('leads', function (Blueprint $table) {
            // Reverse the changes
            $table->string('phone')->nullable()->change();
            $table->string('name')->nullable(false)->change();
            $table->string('email')->nullable(false)->change();
            $table->string('inquiry_status')->nullable(false)->change();
            $table->string('priority')->nullable(false)->change();
            $table->integer('lead_score')->nullable(false)->change();
            $table->integer('pending_activities_count')->nullable(false)->change();
        });

        // Recreate the view (PostgreSQL only)
        if (! $useSqlite) {
            DB::statement('
                CREATE OR REPLACE VIEW active_lead_activities AS
                SELECT a.id,
                    a.lead_id,
                    a.user_id,
                    a.type,
                    a.status,
                    a.subject,
                    a.description,
                    a.metadata,
                    a.scheduled_at,
                    a.completed_at,
                    a.due_at,
                    a.priority,
                    a.category,
                    a.duration_minutes,
                    a.cost,
                    a.outcome,
                    a.notes,
                    a.attachments,
                    a.external_id,
                    a.source_system,
                    a.created_at,
                    a.updated_at,
                    a.deleted_at,
                    l.name AS lead_name,
                    l.email AS lead_email,
                    u.name AS user_name
                FROM lead_activities a
                JOIN leads l ON a.lead_id = l.id
                JOIN users u ON a.user_id = u.id
                WHERE a.deleted_at IS NULL
                ORDER BY a.scheduled_at DESC
            ');
        }
    }
};
