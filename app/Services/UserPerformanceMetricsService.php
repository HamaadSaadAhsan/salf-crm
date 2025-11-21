<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\Task;
use App\Models\User;
use App\Models\UserPerformanceSnapshot;
use Carbon\Carbon;

class UserPerformanceMetricsService
{
    public function calculate(Carbon $date): void
    {
        // Get all users with their roles
        $users = User::with('roles')->get();

        foreach ($users as $user) {
            $userRole = $user->roles->first()?->name ?? 'user';

            // Lead Metrics
            $assignedLeads = Lead::where('assigned_to', $user->id)
                ->whereDate('created_at', '<=', $date)
                ->count();

            $currentActiveLeads = Lead::where('assigned_to', $user->id)
                ->whereNotIn('inquiry_status', ['won', 'lost', 'closed'])
                ->count();

            $qualifiedLeads = Lead::where('qualified_by', $user->id)
                ->whereDate('qualified_at', '<=', $date)
                ->count();

            $convertedLeads = Lead::where('assigned_to', $user->id)
                ->where('inquiry_status', 'won')
                ->whereDate('converted_at', '<=', $date)
                ->count();

            $conversionRate = $assignedLeads > 0 ? ($convertedLeads / $assignedLeads) * 100 : 0;
            $qualificationRate = $assignedLeads > 0 ? ($qualifiedLeads / $assignedLeads) * 100 : 0;

            // Task Metrics
            $totalTasks = Task::where('assigned_to_id', $user->id)
                ->whereDate('created_at', '<=', $date)
                ->count();

            $completedTasks = Task::where('assigned_to_id', $user->id)
                ->where('status', 'completed')
                ->whereDate('updated_at', '<=', $date)
                ->count();

            $overdueTasks = Task::where('assigned_to_id', $user->id)
                ->where('status', '!=', 'completed')
                ->where('due_at', '<', $date)
                ->count();

            $taskCompletionAccuracy = $totalTasks > 0 ? ($completedTasks / $totalTasks) * 100 : 0;

            // Response Times (in minutes)
            $avgFirstResponseTime = Lead::where('assigned_to', $user->id)
                ->whereNotNull('first_cro_contact_at')
                ->whereDate('created_at', '<=', $date)
                ->selectRaw('AVG(EXTRACT(EPOCH FROM (first_cro_contact_at - created_at))/60) as avg_time')
                ->value('avg_time');

            $avgQualificationTime = Lead::where('assigned_to', $user->id)
                ->whereNotNull('qualification_response_at')
                ->whereNotNull('first_cro_contact_at')
                ->whereDate('qualified_at', '<=', $date)
                ->selectRaw('AVG(EXTRACT(EPOCH FROM (qualification_response_at - first_cro_contact_at))/60) as avg_time')
                ->value('avg_time');

            $avgConversionTime = Lead::where('assigned_to', $user->id)
                ->where('inquiry_status', 'won')
                ->whereNotNull('converted_at')
                ->whereDate('converted_at', '<=', $date)
                ->selectRaw('AVG(EXTRACT(EPOCH FROM (converted_at - created_at))/60) as avg_time')
                ->value('avg_time');

            // Activity Metrics
            $totalActivities = LeadActivity::where('user_id', $user->id)
                ->whereDate('created_at', $date)
                ->count();

            $callsMade = LeadActivity::where('user_id', $user->id)
                ->where('type', 'call')
                ->whereDate('created_at', $date)
                ->count();

            $emailsSent = LeadActivity::where('user_id', $user->id)
                ->where('type', 'email')
                ->whereDate('created_at', $date)
                ->count();

            $meetingsHeld = LeadActivity::where('user_id', $user->id)
                ->where('type', 'meeting')
                ->whereDate('created_at', $date)
                ->count();

            UserPerformanceSnapshot::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'snapshot_date' => $date->toDateString(),
                ],
                [
                    'role' => $userRole,
                    'assigned_leads' => $assignedLeads,
                    'current_active_leads' => $currentActiveLeads,
                    'qualified_leads' => $qualifiedLeads,
                    'converted_leads' => $convertedLeads,
                    'conversion_rate' => round($conversionRate, 2),
                    'qualification_rate' => round($qualificationRate, 2),
                    'total_tasks' => $totalTasks,
                    'completed_tasks' => $completedTasks,
                    'overdue_tasks' => $overdueTasks,
                    'task_completion_accuracy' => round($taskCompletionAccuracy, 2),
                    'avg_first_response_time' => $avgFirstResponseTime ? (int) round($avgFirstResponseTime) : null,
                    'avg_qualification_time' => $avgQualificationTime ? (int) round($avgQualificationTime) : null,
                    'avg_conversion_time' => $avgConversionTime ? (int) round($avgConversionTime) : null,
                    'total_activities' => $totalActivities,
                    'calls_made' => $callsMade,
                    'emails_sent' => $emailsSent,
                    'meetings_held' => $meetingsHeld,
                    'performance_weight' => $user->performance_weight ?? 1.00,
                    'revenue_generated' => 0, // TODO: Calculate from deal values when implemented
                ]
            );
        }
    }
}
