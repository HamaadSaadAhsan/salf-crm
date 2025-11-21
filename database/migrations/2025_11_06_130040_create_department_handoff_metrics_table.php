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
        Schema::create('department_handoff_metrics', function (Blueprint $table) {
            $table->id();
            $table->date('metric_date');

            // Department Handoff
            $table->string('from_department'); // 'marketing', 'cro', 'advisor', 'processing'
            $table->string('to_department'); // 'cro', 'advisor', 'processing', 'closed'

            // Timing Metrics (in minutes)
            $table->integer('avg_handoff_time')->default(0);
            $table->integer('min_handoff_time')->default(0);
            $table->integer('max_handoff_time')->default(0);
            $table->integer('median_handoff_time')->default(0);

            // Volume Metrics
            $table->integer('total_handoffs')->default(0);
            $table->integer('handoffs_under_1hour')->default(0);
            $table->integer('handoffs_under_24hours')->default(0);
            $table->integer('handoffs_over_24hours')->default(0);

            // Quality Metrics
            $table->decimal('success_rate', 5, 2)->default(0); // % of successful handoffs
            $table->integer('returned_leads')->default(0); // leads sent back

            // User-specific (optional)
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->timestamps();

            $table->index(['metric_date', 'from_department', 'to_department']);
            $table->index(['from_department', 'to_department']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('department_handoff_metrics');
    }
};
