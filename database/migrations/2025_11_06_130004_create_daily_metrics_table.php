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
        Schema::create('daily_metrics', function (Blueprint $table) {
            $table->id();
            $table->date('metric_date')->unique();

            // Lead Metrics
            $table->integer('total_leads')->default(0);
            $table->integer('new_leads_today')->default(0);
            $table->integer('qualified_leads')->default(0);
            $table->integer('converted_leads')->default(0);
            $table->decimal('overall_conversion_rate', 5, 2)->default(0);
            $table->decimal('lead_conversion_score', 5, 2)->default(0);

            // Business Performance
            $table->decimal('total_revenue', 15, 2)->default(0);
            $table->decimal('average_deal_value', 15, 2)->default(0);
            $table->integer('average_lifecycle_days')->default(0);

            // User Activity
            $table->integer('active_users')->default(0);
            $table->integer('total_registered_users')->default(0);
            $table->decimal('system_adoption_rate', 5, 2)->default(0);

            // Task Metrics
            $table->integer('total_tasks')->default(0);
            $table->integer('completed_tasks')->default(0);
            $table->integer('overdue_tasks')->default(0);
            $table->decimal('task_completion_rate', 5, 2)->default(0);

            // Response Times (in minutes)
            $table->integer('avg_first_response_time')->nullable();
            $table->integer('avg_qualification_time')->nullable();
            $table->integer('avg_conversion_time')->nullable();

            $table->timestamps();

            $table->index('metric_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_metrics');
    }
};
