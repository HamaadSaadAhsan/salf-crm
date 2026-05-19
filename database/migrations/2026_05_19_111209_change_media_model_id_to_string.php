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
        DB::statement('ALTER TABLE media ALTER COLUMN model_id TYPE VARCHAR(255)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE media ALTER COLUMN model_id TYPE UUID USING model_id::uuid');
    }
};
