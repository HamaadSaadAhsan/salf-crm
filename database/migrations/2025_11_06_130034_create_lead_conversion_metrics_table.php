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
        Schema::create('lead_conversion_metrics', function (Blueprint $table) {
            $table->id();
            $table->date('metric_date');

            // Segmentation
            $table->string('dimension_type'); // 'service', 'source', 'user', 'status'
            $table->string('dimension_value'); // service name, source name, user id, status value
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('lead_source_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Conversion Metrics
            $table->integer('total_leads')->default(0);
            $table->integer('new_leads')->default(0);
            $table->integer('contacted_leads')->default(0);
            $table->integer('qualified_leads')->default(0);
            $table->integer('converted_leads')->default(0);
            $table->integer('lost_leads')->default(0);
            $table->decimal('conversion_rate', 5, 2)->default(0);
            $table->decimal('qualification_rate', 5, 2)->default(0);

            // Revenue
            $table->decimal('revenue_generated', 15, 2)->default(0);
            $table->decimal('average_deal_value', 15, 2)->default(0);

            // Time Period Filters
            $table->string('period_type')->nullable(); // 'day', 'week', 'month', 'year'
            $table->integer('period_value')->nullable(); // week number, month number, year

            $table->timestamps();

            $table->index(['metric_date', 'dimension_type']);
            $table->index(['dimension_type', 'dimension_value']);
            $table->index(['period_type', 'period_value']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_conversion_metrics');
    }
};
