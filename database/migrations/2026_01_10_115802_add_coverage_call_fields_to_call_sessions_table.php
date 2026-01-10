<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('call_sessions', function (Blueprint $table) {
            // Who actually answered the call (may differ from intended CRO for coverage calls)
            $table->foreignId('answered_by_user_id')
                ->nullable()
                ->after('caller_id')
                ->constrained('users')
                ->nullOnDelete();

            // The originally assigned CRO who should have received the call
            $table->foreignId('intended_for_user_id')
                ->nullable()
                ->after('answered_by_user_id')
                ->constrained('users')
                ->nullOnDelete();

            // Flag indicating if this was a coverage call (answered by non-assigned CRO)
            $table->boolean('is_coverage_call')
                ->default(false)
                ->after('intended_for_user_id');

            // Index for querying coverage calls
            $table->index(['intended_for_user_id', 'is_coverage_call']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('call_sessions', function (Blueprint $table) {
            $table->dropForeign(['answered_by_user_id']);
            $table->dropForeign(['intended_for_user_id']);
            $table->dropIndex(['intended_for_user_id', 'is_coverage_call']);
            $table->dropColumn(['answered_by_user_id', 'intended_for_user_id', 'is_coverage_call']);
        });
    }
};
