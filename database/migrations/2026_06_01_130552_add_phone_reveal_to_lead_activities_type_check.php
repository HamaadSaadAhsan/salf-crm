<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE lead_activities DROP CONSTRAINT lead_activities_type_check');
        DB::statement("ALTER TABLE lead_activities ADD CONSTRAINT lead_activities_type_check CHECK (type::text = ANY (ARRAY['call','email','meeting','note','message','task','follow_up','status_change','assignment_change','attribute_change','phone_reveal']::text[]))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE lead_activities DROP CONSTRAINT lead_activities_type_check');
        DB::statement("ALTER TABLE lead_activities ADD CONSTRAINT lead_activities_type_check CHECK (type::text = ANY (ARRAY['call','email','meeting','note','message','task','follow_up','status_change','assignment_change','attribute_change']::text[]))");
    }
};
