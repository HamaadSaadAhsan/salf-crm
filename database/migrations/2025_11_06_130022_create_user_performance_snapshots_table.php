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
        Schema::create('user_performance_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->string('role')->nullable(); // CRO, Advisor, etc.

            // Lead Metrics
            $table->integer('assigned_leads')->default(0);
            $table->integer('current_active_leads')->default(0);
            $table->integer('qualified_leads')->default(0);
            $table->integer('converted_leads')->default(0);
            $table->decimal('conversion_rate', 5, 2)->default(0);
            $table->decimal('qualification_rate', 5, 2)->default(0);

            // Task Metrics
            $table->integer('total_tasks')->default(0);
            $table->integer('completed_tasks')->default(0);
            $table->integer('overdue_tasks')->default(0);
            $table->decimal('task_completion_accuracy', 5, 2)->default(0);

            // Response Times (in minutes)
            $table->integer('avg_first_response_time')->nullable();
            $table->integer('avg_qualification_time')->nullable();
            $table->integer('avg_conversion_time')->nullable();

            // Activity Metrics
            $table->integer('total_activities')->default(0);
            $table->integer('calls_made')->default(0);
            $table->integer('emails_sent')->default(0);
            $table->integer('meetings_held')->default(0);

            // Performance Score
            $table->decimal('performance_weight', 3, 2)->default(1.00);
            $table->decimal('revenue_generated', 15, 2)->default(0);

            $table->timestamps();

            $table->unique(['user_id', 'snapshot_date']);
            $table->index(['snapshot_date', 'role']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_performance_snapshots');
    }
};
