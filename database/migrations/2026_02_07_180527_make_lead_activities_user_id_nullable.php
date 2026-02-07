<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('DROP VIEW IF EXISTS active_lead_activities');

        DB::statement('ALTER TABLE lead_activities ALTER COLUMN user_id DROP NOT NULL');

        DB::statement('
            CREATE VIEW active_lead_activities AS
            SELECT a.id, a.lead_id, a.user_id, a.type, a.status, a.subject,
                   a.description, a.metadata, a.scheduled_at, a.completed_at,
                   a.due_at, a.priority, a.category, a.duration_minutes, a.cost,
                   a.outcome, a.notes, a.attachments, a.external_id, a.source_system,
                   a.created_at, a.updated_at, a.deleted_at,
                   l.name AS lead_name, l.email AS lead_email,
                   u.name AS user_name
            FROM lead_activities a
            JOIN leads l ON a.lead_id = l.id
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.deleted_at IS NULL
            ORDER BY a.scheduled_at DESC
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS active_lead_activities');

        DB::statement('ALTER TABLE lead_activities ALTER COLUMN user_id SET NOT NULL');

        DB::statement('
            CREATE VIEW active_lead_activities AS
            SELECT a.id, a.lead_id, a.user_id, a.type, a.status, a.subject,
                   a.description, a.metadata, a.scheduled_at, a.completed_at,
                   a.due_at, a.priority, a.category, a.duration_minutes, a.cost,
                   a.outcome, a.notes, a.attachments, a.external_id, a.source_system,
                   a.created_at, a.updated_at, a.deleted_at,
                   l.name AS lead_name, l.email AS lead_email,
                   u.name AS user_name
            FROM lead_activities a
            JOIN leads l ON a.lead_id = l.id
            JOIN users u ON a.user_id = u.id
            WHERE a.deleted_at IS NULL
            ORDER BY a.scheduled_at DESC
        ');
    }
};
