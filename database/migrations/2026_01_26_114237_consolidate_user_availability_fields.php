<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Consolidates the duplicate 'available' and 'availability' columns into just 'availability'.
     * - Syncs data: sets availability = true if either available OR availability was true
     * - Drops the redundant 'available' column
     */
    public function up(): void
    {
        // First, sync data: if 'available' is true, set 'availability' to true as well
        DB::table('users')
            ->where('available', true)
            ->update(['availability' => true]);

        // Drop the redundant 'available' column
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('available');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-add the 'available' column
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('available')->default(true)->after('email_verified_at');
        });

        // Sync data back: copy availability to available
        DB::table('users')->update([
            'available' => DB::raw('availability'),
        ]);
    }
};
