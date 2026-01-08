<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_inquiry_status_check');

        DB::statement("
                ALTER TABLE leads ADD CONSTRAINT leads_inquiry_status_check
                CHECK (inquiry_status IN (
                    'new',
                    'assigned_to_cro',
                    'contacted',
                    'qualified',
                    'assigned_to_advisor',
                    'proposal',
                    'converted',
                    'won',
                    'lost',
                    'unqualified',
                    'requalify',
                    'nurturing'
                ))
            ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_inquiry_status_check');

        DB::statement("
                ALTER TABLE leads ADD CONSTRAINT leads_inquiry_status_check
                CHECK (inquiry_status IN (
                    'new',
                    'contacted',
                    'qualified',
                    'proposal',
                    'won',
                    'lost',
                    'nurturing'
                ))
            ");
    }
};
