<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the existing check constraint
        DB::statement("ALTER TABLE lead_activities DROP CONSTRAINT lead_activities_type_check");
        
        // Add the new check constraint with 'message' included
        DB::statement("ALTER TABLE lead_activities ADD CONSTRAINT lead_activities_type_check CHECK (type IN ('call', 'email', 'meeting', 'note', 'message', 'task', 'follow_up', 'status_change', 'assignment_change'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the constraint and recreate without 'message'
        DB::statement("ALTER TABLE lead_activities DROP CONSTRAINT lead_activities_type_check");
        DB::statement("ALTER TABLE lead_activities ADD CONSTRAINT lead_activities_type_check CHECK (type IN ('call', 'email', 'meeting', 'note', 'task', 'follow_up', 'status_change', 'assignment_change'))");
    }
};
