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
        DB::statement('ALTER TABLE lead_activities DROP CONSTRAINT lead_activities_type_check');

        DB::statement("ALTER TABLE lead_activities ADD CONSTRAINT lead_activities_type_check CHECK (type IN ('call', 'email', 'meeting', 'note', 'message', 'task', 'follow_up', 'status_change', 'assignment_change', 'attribute_change'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE lead_activities DROP CONSTRAINT lead_activities_type_check');

        DB::statement("ALTER TABLE lead_activities ADD CONSTRAINT lead_activities_type_check CHECK (type IN ('call', 'email', 'meeting', 'note', 'message', 'task', 'follow_up', 'status_change', 'assignment_change'))");
    }
};
