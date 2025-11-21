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
        // User Performance Snapshots - add user_id index (already has snapshot_date in composite)
        Schema::table('user_performance_snapshots', function (Blueprint $table) {
            $table->index('user_id');
        });

        // Lead Conversion Metrics - add foreign key indexes for better join performance
        Schema::table('lead_conversion_metrics', function (Blueprint $table) {
            $table->index('service_id');
            $table->index('lead_source_id');
            $table->index('user_id');
            $table->index('metric_date');
        });

        // Department Handoff Metrics - add composite for user-specific queries
        Schema::table('department_handoff_metrics', function (Blueprint $table) {
            $table->index(['metric_date', 'user_id']);
        });

        // System Adoption Metrics already has metric_date index from creation
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // User Performance Snapshots
        Schema::table('user_performance_snapshots', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });

        // Lead Conversion Metrics
        Schema::table('lead_conversion_metrics', function (Blueprint $table) {
            $table->dropIndex(['service_id']);
            $table->dropIndex(['lead_source_id']);
            $table->dropIndex(['user_id']);
            $table->dropIndex(['metric_date']);
        });

        // Department Handoff Metrics
        Schema::table('department_handoff_metrics', function (Blueprint $table) {
            $table->dropIndex(['metric_date', 'user_id']);
        });
    }
};
