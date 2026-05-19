<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Revert model_id back to UUID so UUID-keyed models (Lead) work correctly.
        // Integer-keyed models (Team) must NOT use Spatie media library.
        DB::statement('ALTER TABLE media ALTER COLUMN model_id TYPE UUID USING model_id::uuid');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE media ALTER COLUMN model_id TYPE VARCHAR(255)');
    }
};
