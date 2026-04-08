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
        DB::statement('ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_inquiry_status_check');
    }

    public function down(): void
    {
        //
    }
};
