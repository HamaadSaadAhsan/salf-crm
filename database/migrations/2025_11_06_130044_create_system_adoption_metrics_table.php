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
        Schema::create('system_adoption_metrics', function (Blueprint $table) {
            $table->id();
            $table->date('metric_date');

            // User Counts
            $table->integer('total_users')->default(0);
            $table->integer('active_users')->default(0); // logged in within 30 days
            $table->integer('very_active_users')->default(0); // logged in within 7 days
            $table->integer('inactive_users')->default(0); // not logged in within 30 days

            // Adoption Rates
            $table->decimal('adoption_rate', 5, 2)->default(0); // active/total * 100
            $table->decimal('engagement_rate', 5, 2)->default(0); // very active/total * 100

            // Role-specific Breakdown
            $table->json('users_by_role')->nullable(); // {'admin': 5, 'cro': 10, 'advisor': 15}
            $table->json('active_users_by_role')->nullable();

            // Activity Metrics
            $table->integer('total_logins')->default(0);
            $table->integer('total_activities_created')->default(0);
            $table->integer('total_leads_created')->default(0);
            $table->integer('total_tasks_created')->default(0);

            // Average Activity per User
            $table->decimal('avg_activities_per_user', 8, 2)->default(0);
            $table->decimal('avg_logins_per_user', 8, 2)->default(0);

            // Feature Usage
            $table->json('feature_usage')->nullable(); // track which features are used most

            $table->timestamps();

            $table->index('metric_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_adoption_metrics');
    }
};
