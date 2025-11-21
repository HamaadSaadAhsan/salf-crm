<?php

namespace Database\Seeders;

use App\Models\DailyMetric;
use App\Models\DepartmentHandoffMetric;
use App\Models\LeadConversionMetric;
use App\Models\SystemAdoptionMetric;
use App\Models\User;
use App\Models\UserPerformanceSnapshot;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class MetricsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding metrics data for the past 90 days...');

        // Get users for performance snapshots
        $users = User::all();

        if ($users->isEmpty()) {
            $this->command->warn('No users found. Please seed users first.');

            return;
        }

        // Generate data for past 90 days
        for ($i = 90; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);

            $this->command->info("Generating metrics for {$date->toDateString()}...");

            // Calculate progressive metrics (improving over time)
            $dayProgress = (90 - $i) / 90; // 0 to 1 over time
            $randomVariation = rand(80, 120) / 100; // ±20% variation

            // Daily Metrics
            $totalLeads = (int) (50 + ($dayProgress * 200) + rand(-10, 10));
            $newLeads = (int) (5 + ($dayProgress * 15) + rand(-2, 5));
            $qualifiedLeads = (int) ($totalLeads * (0.3 + $dayProgress * 0.2) * $randomVariation);
            $convertedLeads = (int) ($qualifiedLeads * (0.15 + $dayProgress * 0.15) * $randomVariation);
            $conversionRate = $totalLeads > 0 ? ($convertedLeads / $totalLeads) * 100 : 0;
            $activeUsers = (int) (max(1, $users->count() * (0.5 + $dayProgress * 0.4) * $randomVariation));

            DailyMetric::create([
                'metric_date' => $date,
                'total_leads' => $totalLeads,
                'new_leads_today' => $newLeads,
                'qualified_leads' => $qualifiedLeads,
                'converted_leads' => $convertedLeads,
                'overall_conversion_rate' => round($conversionRate, 2),
                'lead_conversion_score' => round(60 + ($dayProgress * 30) * $randomVariation, 2),
                'system_adoption_rate' => round((50 + $dayProgress * 40) * $randomVariation, 2),
                'active_users' => $activeUsers,
                'task_completion_rate' => round((60 + $dayProgress * 30) * $randomVariation, 2),
                'avg_first_response_time' => rand(30, 120), // minutes
                'avg_qualification_time' => rand(60, 240), // minutes
                'avg_conversion_time' => rand(2880, 14400), // minutes (2-10 days)
                'average_lifecycle_days' => rand(7, 30),
            ]);

            // System Adoption Metrics
            $totalUsers = $users->count();
            $activeUsersCount = $activeUsers;
            $veryActiveUsers = (int) ($activeUsersCount * (0.6 + rand(0, 40) / 100));
            $inactiveUsers = $totalUsers - $activeUsersCount;

            SystemAdoptionMetric::create([
                'metric_date' => $date,
                'total_users' => $totalUsers,
                'active_users' => $activeUsersCount,
                'very_active_users' => $veryActiveUsers,
                'inactive_users' => $inactiveUsers,
                'adoption_rate' => round(($activeUsersCount / max(1, $totalUsers)) * 100, 2),
                'engagement_rate' => round(($veryActiveUsers / max(1, $totalUsers)) * 100, 2),
                'total_logins' => $activeUsersCount * rand(1, 5),
                'total_activities_created' => rand(10, 100),
                'total_leads_created' => $newLeads,
                'total_tasks_created' => rand(5, 30),
                'avg_activities_per_user' => round(rand(5, 20) * $randomVariation, 2),
                'avg_logins_per_user' => round(rand(1, 5) * $randomVariation, 2),
            ]);

            // Lead Conversion Metrics by dimension
            $dimensions = [
                ['type' => 'source', 'value' => 'facebook'],
                ['type' => 'source', 'value' => 'google'],
                ['type' => 'source', 'value' => 'website'],
                ['type' => 'service', 'value' => 'dominica'],
                ['type' => 'service', 'value' => 'portugal'],
                ['type' => 'overall', 'value' => 'all'],
            ];

            foreach ($dimensions as $dimension) {
                $dimLeads = (int) ($totalLeads / 3 * $randomVariation);
                $dimConverted = (int) ($dimLeads * (0.1 + $dayProgress * 0.2) * $randomVariation);

                LeadConversionMetric::create([
                    'metric_date' => $date,
                    'dimension_type' => $dimension['type'],
                    'dimension_value' => $dimension['value'],
                    'total_leads' => $dimLeads,
                    'qualified_leads' => (int) ($dimLeads * 0.3),
                    'converted_leads' => $dimConverted,
                    'conversion_rate' => $dimLeads > 0 ? round(($dimConverted / $dimLeads) * 100, 2) : 0,
                ]);
            }

            // Department Handoff Metrics
            $handoffs = [
                ['from' => 'marketing', 'to' => 'cro'],
                ['from' => 'cro', 'to' => 'advisor'],
                ['from' => 'advisor', 'to' => 'processing'],
            ];

            foreach ($handoffs as $handoff) {

                $totalHandoffs = rand(5, 20);
                $returnedLeads = rand(0, 2);
                $successRate = $totalHandoffs > 0 ? (($totalHandoffs - $returnedLeads) / $totalHandoffs) * 100 : 0;
                $avgHandoffTime = rand(30, 240);

                DepartmentHandoffMetric::create([
                    'metric_date' => $date,
                    'from_department' => $handoff['from'],
                    'to_department' => $handoff['to'],
                    'total_handoffs' => $totalHandoffs,
                    'avg_handoff_time' => $avgHandoffTime,
                    'min_handoff_time' => (int) ($avgHandoffTime * 0.5),
                    'max_handoff_time' => (int) ($avgHandoffTime * 2),
                    'median_handoff_time' => $avgHandoffTime,
                    'handoffs_under_1hour' => (int) ($totalHandoffs * 0.6),
                    'handoffs_under_24hours' => (int) ($totalHandoffs * 0.9),
                    'handoffs_over_24hours' => (int) ($totalHandoffs * 0.1),
                    'success_rate' => round($successRate, 2),
                    'returned_leads' => $returnedLeads,
                ]);
            }

            // User Performance Snapshots
            foreach ($users as $user) {
                $role = $user->roles->first()?->name ?? 'user';

                // Skip if not a CRO or Advisor
                if (! in_array($role, ['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'])) {
                    continue;
                }

                $assignedLeads = rand(3, 15);
                $qualifiedByUser = (int) ($assignedLeads * (0.2 + $dayProgress * 0.3) * $randomVariation);
                $convertedByUser = (int) ($qualifiedByUser * (0.1 + $dayProgress * 0.2) * $randomVariation);

                $totalTasks = rand(5, 25);
                $completedTasks = rand(3, 20);

                UserPerformanceSnapshot::create([
                    'user_id' => $user->id,
                    'snapshot_date' => $date,
                    'role' => $role,
                    'assigned_leads' => $assignedLeads,
                    'current_active_leads' => rand(1, 5),
                    'qualified_leads' => $qualifiedByUser,
                    'converted_leads' => $convertedByUser,
                    'conversion_rate' => $assignedLeads > 0 ? round(($convertedByUser / $assignedLeads) * 100, 2) : 0,
                    'qualification_rate' => $assignedLeads > 0 ? round(($qualifiedByUser / $assignedLeads) * 100, 2) : 0,
                    'total_tasks' => $totalTasks,
                    'completed_tasks' => $completedTasks,
                    'overdue_tasks' => rand(0, 3),
                    'task_completion_accuracy' => round((70 + $dayProgress * 25) * $randomVariation, 2),
                    'avg_first_response_time' => rand(30, 120),
                    'avg_qualification_time' => rand(60, 240),
                    'avg_conversion_time' => rand(2880, 14400),
                    'total_activities' => rand(5, 25),
                    'calls_made' => rand(5, 15),
                    'emails_sent' => rand(10, 30),
                    'meetings_held' => rand(1, 5),
                    'performance_weight' => round(0.8 + ($dayProgress * 0.2) * $randomVariation, 2),
                    'revenue_generated' => round(rand(1000, 10000) * (1 + $dayProgress), 2),
                ]);
            }
        }

        $this->command->info('✓ Metrics data seeded successfully!');
    }
}
